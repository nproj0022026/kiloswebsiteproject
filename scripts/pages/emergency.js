/* Project K.I.L.O.S. - Emergency Page Script
   Two-step flow for the Nearest Facility card:
     1. "Locate Nearest Health Center" button (#locateBtn) requests the
        user's current location via geolocation and stores it.
     2. "Start Directions" button (#directionsBtn) is disabled until step 1
        succeeds, then opens turn-by-turn directions from that stored
        location to the Barangay Health Center. If geolocation fails or
        is unsupported, directions still work — just without a pre-filled
        origin (falls back to the static destination-only link).

   Follows the same per-page init pattern as initBpForm / initAboutPage —
   called by main.js's router after the emergency.html fragment is
   injected, guarded there with a typeof check so a load failure here
   never breaks navigation for the rest of the site. */

const KILOS_HEALTH_CENTER = { lat: 13.9473138, lng: 123.0792718 };
const KILOS_STATIC_DIRECTIONS_URL = "https://maps.app.goo.gl/vc6iRRMYNYtF5GBXA";
// Legacy no-key embed endpoint (same one the static iframe already uses via
// ?q=...&output=embed) also supports a directions mode via saddr/daddr, so
// the in-page map can show a route once we have the user's coordinates —
// no API key or billing required. Kept as its own builder so the fallback
// (no coords) can just leave the iframe on the static place view below.
const KILOS_DEFAULT_MAP_SRC = `https://www.google.com/maps?q=${KILOS_HEALTH_CENTER.lat},${KILOS_HEALTH_CENTER.lng}&z=17&output=embed`;

function buildRouteEmbedUrl(origin) {
  return `https://www.google.com/maps?saddr=${origin.lat},${origin.lng}` +
    `&daddr=${KILOS_HEALTH_CENTER.lat},${KILOS_HEALTH_CENTER.lng}` +
    `&dirflg=d&output=embed`;
}

function initEmergencyPage() {
  const locateBtn = document.getElementById("locateBtn");
  const directionsBtn = document.getElementById("directionsBtn");
  const mapFrame = document.getElementById("facilityMapFrame");
  const mapOverlay = document.getElementById("mapLoadingOverlay");
  if (!locateBtn || !directionsBtn) return;

  let userCoords = null;
  let locating = false;

  // The overlay markup in emergency.html is written for the "locating"
  // state (spinner + "Locating your position..."). Save it so we can
  // restore it once the user actually taps Locate, and show a neutral
  // idle message in its place until then.
  const locatingOverlayHTML = mapOverlay ? mapOverlay.innerHTML : "";
  const idleOverlayHTML = `
    <span class="material-symbols-outlined text-primary text-3xl">map</span>
    <p class="font-label-caps text-label-caps text-on-surface-variant text-center px-4">Tap "Locate Health Center" to view the map</p>`;

  // Start in fallback mode: no map/pin shown yet, directions already usable
  // (just without a pre-filled origin). Locating is manual only — we never
  // request geolocation, and never render any location on the map, until
  // the user explicitly taps the button. This avoids both an unexpected
  // permission prompt and a map/pin appearing before the user asked for it.
  setDirectionsEnabled(directionsBtn, true);
  if (mapOverlay) {
    mapOverlay.innerHTML = idleOverlayHTML;
    mapOverlay.classList.remove("hidden");
  }

  function attemptLocate() {
    if (locating) return;

    if (mapOverlay) {
      mapOverlay.innerHTML = locatingOverlayHTML;
      mapOverlay.classList.remove("hidden");
    }

    if (!("geolocation" in navigator)) {
      // No geolocation support — let directions work in fallback mode.
      setDirectionsEnabled(directionsBtn, true);
      if (mapFrame) mapFrame.src = KILOS_DEFAULT_MAP_SRC;
      if (mapOverlay) mapOverlay.classList.add("hidden");
      return;
    }

    locating = true;
    setLocateButtonState(locateBtn, "locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
        locating = false;
        setLocateButtonState(locateBtn, "found");
        setDirectionsEnabled(directionsBtn, true);
        if (mapFrame) mapFrame.src = buildRouteEmbedUrl(userCoords);
        if (mapOverlay) mapOverlay.classList.add("hidden");
      },
      () => {
        // Permission denied, position unavailable, or any other error.
        locating = false;
        setLocateButtonState(locateBtn, "default");
        // Directions still usable, just without a pre-filled origin.
        setDirectionsEnabled(directionsBtn, true);
        // No coords to route from — fall back to the static place view.
        if (mapFrame) mapFrame.src = KILOS_DEFAULT_MAP_SRC;
        if (mapOverlay) mapOverlay.classList.add("hidden");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  }

  locateBtn.addEventListener("click", (e) => {
    e.preventDefault();
    attemptLocate();
  });

  directionsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (directionsBtn.getAttribute("aria-disabled") === "true") return;

    if (userCoords) {
      openDirectionsFrom(userCoords.lat, userCoords.lng);
    } else {
      openStaticDirections();
    }
  });
}

function openDirectionsFrom(lat, lng) {
  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${lat},${lng}` +
    `&destination=${KILOS_HEALTH_CENTER.lat},${KILOS_HEALTH_CENTER.lng}` +
    `&travelmode=driving`;
  window.open(url, "_blank", "noopener");
}

function openStaticDirections() {
  window.open(KILOS_STATIC_DIRECTIONS_URL, "_blank", "noopener");
}

function setLocateButtonState(btn, state) {
  if (state === "locating") {
    btn.dataset.originalLabel = btn.dataset.originalLabel || btn.innerHTML;
    btn.innerHTML = `
      <span class="inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-current animate-bounce"></span>
      </span>`;
    btn.setAttribute("aria-busy", "true");
  } else {
    // Covers both "found" and "default" — the button always returns to its
    // original label ("Locate Health Center") rather than a
    // permanent "Location Found" state, so it's clear the user can tap it
    // again any time to re-locate (e.g. if they've moved, or GPS drifted).
    if (btn.dataset.originalLabel) btn.innerHTML = btn.dataset.originalLabel;
    btn.removeAttribute("aria-busy");
  }
}

function setDirectionsEnabled(btn, enabled) {
  if (enabled) {
    btn.removeAttribute("aria-disabled");
    btn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    btn.setAttribute("aria-disabled", "true");
    btn.classList.add("opacity-50", "cursor-not-allowed");
  }
}