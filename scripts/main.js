/* Project K.I.L.O.S. - Core Site Script (site-wide only) */

/* 1. TAILWIND CONFIG */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        "primary-container": "#ffdad4", "surface-tint": "#8a0000", "primary": "#8a0000",
        "secondary": "#8a0000", "on-primary-container": "#690000", "on-primary": "#ffffff",
        "inverse-primary": "#ffb4a8", "brand-maroon": "#8a0000", "brand-maroon-hover": "#6e0000",
        "secondary-fixed": "#a0f4c8", "surface": "#fcf9f8", "surface-container": "#f1f1f1",
        "on-secondary-fixed-variant": "#005236", "surface-dim": "#dcd9d9",
        "on-error-container": "#93000a", "error-container": "#ffdad6", "on-primary-fixed": "#410002",
        "on-secondary": "#ffffff", "secondary-container": "#a0f4c8", "on-surface-variant": "#404943",
        "on-secondary-fixed": "#002113", "outline-variant": "#bfc9c1", "surface-variant": "#e5e2e1",
        "background": "#fcf9f8", "on-error": "#ffffff", "inverse-on-surface": "#f3f0ef",
        "on-surface": "#1b1b1b", "on-secondary-container": "#19724f", "surface-container-low": "#f6f3f2",
        "primary-fixed": "#ffdad4", "on-tertiary": "#ffffff", "inverse-surface": "#313030",
        "outline": "#707973", "error": "#ba1a1a", "primary-fixed-dim": "#ffb4a8",
        "surface-container-lowest": "#ffffff", "surface-container-high": "#eae7e7",
        "surface-bright": "#fcf9f8", "on-primary-fixed-variant": "#690000",
        "surface-container-highest": "#e5e2e1", "on-background": "#1b1b1b",
        "secondary-fixed-dim": "#85d7ad", "warning": "#d32f2f", "tertiary": "#6f4a44",
        /* BP severity ramp (Elevated -> High Stage 1 -> High Stage 2), added
           to close the gap that forced pages/about.html to hardcode raw hex
           for these three table rows. Sits between "tertiary" (used for Low)
           and "error" (used for Crisis) on the visual scale — review the
           exact shades against brand guidelines before shipping. */
        "elevated": "#b45309", "elevated-container": "#fef3c7", "on-elevated-container": "#78350f",
        "high": "#c2410c", "high-container": "#fed7aa", "on-high-container": "#7c2d12",
        "high-2": "#9a3412", "high-2-container": "#fdba74", "on-high-2-container": "#5c1a06",
        "tertiary-container": "#8a5c55", "on-tertiary-container": "#ffffff",
        "tertiary-fixed": "#f0dedc", "tertiary-fixed-dim": "#d9bab5",
        "on-tertiary-fixed": "#2b1512", "on-tertiary-fixed-variant": "#5c4440",
        "maroon-soft": "#c65c4e", "maroon-tint": "#fbe9e5", "maroon-container": "#f6d4cd"
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: { gutter: "16px", "container-margin": "24px", "stack-md": "24px", "stack-sm": "12px", "stack-lg": "48px", base: "8px" },
      fontFamily: {
        "headline-lg-mobile": ["Lexend"], "data-display": ["Lexend"], "headline-md": ["Lexend"],
        "body-lg": ["Inter"], "label-caps": ["Inter"], "body-md": ["Inter"], "headline-lg": ["Lexend"]
      },
      fontSize: {
        "headline-lg-mobile": ["26px", { lineHeight: "32px", fontWeight: "700" }],
        "data-display": ["48px", { lineHeight: "56px", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "label-caps": ["14px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }]
      }
    }
  }
};

/* 2. ROUTER
   Each route points at a separate HTML file under pages/.
   render() fetches the file's markup and injects it into
   #page-content. Fetched pages are cached in memory.

   Requires being served over http(s) — fetch() of local files
   is blocked under file://. Fine for Live Preview / Vercel.

   Per-page init calls (initBpForm, etc.) are guarded with
   typeof checks so this file has no hard dependency on
   page-specific scripts like tracker.js — if one fails to
   load, the router still works for every other page. */
const ROUTES = {
  "/": { page: "home", title: "K.I.L.O.S.", file: "pages/home.html" },
  "/about": { page: "about", title: "K.I.L.O.S.", file: "pages/about.html" },
  "/tracker": { page: "tracker", title: "K.I.L.O.S.", file: "pages/tracker.html" },
  "/emergency": { page: "emergency", title: "K.I.L.O.S.", file: "pages/emergency.html" }
};

const pageCache = new Map();

function currentPath() {
  const path = window.location.pathname;
  return ROUTES[path] ? path : "/";
}

// Navigate to a route by pushing real history state (no "#").
function navigateTo(path, { replace = false } = {}) {
  if (!ROUTES[path]) path = "/";
  if (window.location.pathname !== path) {
    if (replace) history.replaceState(null, "", path);
    else history.pushState(null, "", path);
  }
  render();
}

// Intercept clicks on internal route links so navigation uses
// pushState instead of a full page reload. Any <a href="/about">
// (etc.) matching a known route is handled here; everything else
// (external links, downloads, mailto:, target=_blank) is left alone.
document.addEventListener("click", function (e) {
  const link = e.target.closest("a");
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || !ROUTES[href]) return;
  if (link.target === "_blank" || link.hasAttribute("download")) return;
  e.preventDefault();
  navigateTo(href);
});

window.addEventListener("popstate", render);

async function render() {
  const path = currentPath();
  const route = ROUTES[path];
  const mount = document.getElementById("page-content");
  if (!mount) return;

  // Close any page-specific open modals/states before swapping content out.
  if (typeof resetTrackerTransientUI === "function") resetTrackerTransientUI();

  try {
    let html = pageCache.get(route.file);
    if (!html) {
      const res = await fetch(route.file);
      if (!res.ok) throw new Error(`Failed to load ${route.file}: ${res.status}`);
      html = await res.text();
      pageCache.set(route.file, html);
    }

    mount.innerHTML = html;
    document.title = route.title;
    document.body.dataset.page = route.page;

    renderHeader();
    renderBottomNav();

    // Per-page init — guarded so a missing page script doesn't
    // break navigation for the rest of the site.
    if (route.page === "tracker" && typeof initBpForm === "function") initBpForm();
    if (route.page === "home") updateHomeGreeting();
    if (route.page === "about" && typeof initAboutPage === "function") initAboutPage();
    if (route.page === "emergency" && typeof initEmergencyPage === "function") initEmergencyPage();

    mount.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  } catch (err) {
    mount.innerHTML = `<p class="text-error p-6">Sorry, this page could not be loaded. Please check your connection and try again.</p>`;
    console.error(err);
  }
}

/* 3. SHARED CHROME (header, bottom nav) */
(function () {
  const NAV_ITEMS = [
    { key: "home", label: "Home", icon: "home", path: "/" },
    { key: "about", label: "About", icon: "menu_book", path: "/about" },
    { key: "tracker", label: "Tracker", icon: "monitor_heart", path: "/tracker" },
    { key: "emergency", label: "Emergency", icon: "emergency_share", path: "/emergency" }
  ];

  // Bottom nav mirrors NAV_ITEMS exactly today, but is kept as its own
  // reference (not a second literal array) so top nav and bottom nav
  // can never silently drift apart — see plan.md's stated intent.
  const BOTTOM_NAV_ITEMS = NAV_ITEMS;

  window.renderHeader = function renderHeader() {
    const mount = document.getElementById("site-header");
    if (!mount) return;
    const currentPage = document.body.dataset.page || "home";

    const links = NAV_ITEMS.map((item) => {
      const active = item.key === currentPage;
      const activeClasses = "text-brand-maroon border-b-2 border-brand-maroon font-bold";
      const inactiveClasses = "text-on-surface-variant font-medium hover:text-brand-maroon";
      return `<a class="font-label-caps text-label-caps ${active ? activeClasses : inactiveClasses} transition-colors py-2" href="${item.path}">${item.label}</a>`;
    }).join("\n      ");

    mount.innerHTML = `
  <header class="md:sticky md:top-0 w-full z-50 flex justify-between items-center px-container-margin py-4 bg-surface border-b border-outline-variant">
    <a class="flex items-center gap-3 " href="/">
      <img src="assets/logo/kilos-logo.png" alt="Project K.I.L.O.S. logo" class="h-10 w-10 object-contain shrink-0">
      <span class="font-headline-lg text-headline-lg font-bold text-brand-maroon">K.I.L.O.S.</span>
    </a>
    <nav class="hidden md:flex gap-6 items-center ml-auto">
        ${links}
    </nav>
  </header>`;
  };

  window.renderBottomNav = function renderBottomNav() {
    const mount = document.getElementById("site-bottom-nav");
    if (!mount) return;
    const currentPage = document.body.dataset.page || "home";

    const links = BOTTOM_NAV_ITEMS.map((item) => {
      const active = item.key === currentPage;
      const activeClasses = "bg-brand-maroon/15 text-brand-maroon";
      const inactiveClasses = "text-on-surface-variant";
      return `
    <a class="flex-1 flex flex-col items-center justify-center ${active ? activeClasses : inactiveClasses} rounded-full px-4 py-1 transition-transform active:scale-90 duration-150" href="${item.path}">
      <span class="material-symbols-outlined mb-1"${active ? ' data-weight="fill"' : ""}>${item.icon}</span>
      <span class="font-label-caps text-label-caps text-[10px] leading-tight">${item.label}</span>
    </a>`;
    }).join("");

    mount.innerHTML = `
  <nav class="w-full z-50 flex items-center px-4 py-3 md:hidden bg-surface border-t border-outline-variant shadow-lg">${links}
  </nav>`;
  };

  document.addEventListener("DOMContentLoaded", function () {
    render();
  });
})();

/*4. WELCOME MODAL */
document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("welcome-modal-overlay");
  if (!overlay) return;

  const input = document.getElementById("user-name-input");
  const okBtn = document.getElementById("modal-ok-btn");
  const skipBtn = document.getElementById("modal-skip-btn");
  const clearBtn = document.getElementById("clear-name-btn");

  function toggleClearBtn() {
    clearBtn.classList.toggle("hidden", input.value.length === 0);
  }

  function openModal() {
    input.value = localStorage.getItem("userName") || "";
    overlay.classList.remove("hidden");
    input.focus();
    toggleClearBtn();

    const modalGreeting = document.querySelector("[data-modal-greeting]");
    if (modalGreeting) {
      modalGreeting.textContent = `${getTimeGreeting()}!`;
    }
  }

  function closeModal() {
    overlay.classList.add("hidden");
    localStorage.setItem("hasVisited", "true");
  }

  input.addEventListener("input", toggleClearBtn);

  clearBtn.addEventListener("click", () => {
    input.value = "";
    toggleClearBtn();
    input.focus();
  });

  if (!localStorage.getItem("hasVisited")) {
    openModal();
  }

  okBtn.addEventListener("click", () => {
    const name = input.value.trim();
    if (name) {
      localStorage.setItem("userName", name);
    } else {
      localStorage.removeItem("userName");
    }
    closeModal();
    refreshGreetings();
  });

  skipBtn.addEventListener("click", () => {
    closeModal();
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-edit-name]")) {
      openModal();
    }
  });
});

/*5. TIME-BASED GREETING + NAME DISPLAY Shared across Home and Tracker pages.*/
function getTimeGreeting() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  if (mins >= 180 && mins <= 690) return "Magandang umaga";
  if (mins >= 691 && mins <= 779) return "Magandang tanghali";
  if (mins >= 780 && mins <= 1079) return "Magandang hapon";
  return "Magandang gabi";
}

function updateHomeGreeting() {
  const el = document.querySelector("[data-home-greeting]");
  if (!el) return;
  const name = localStorage.getItem("userName");
  el.textContent = name ? `Welcome, ${name}` : "Welcome";
}

function updateTrackerGreeting() {
  const el = document.querySelector("[data-greeting]");
  if (!el) return;
  const name = localStorage.getItem("userName");
  const timeGreeting = getTimeGreeting();
  el.textContent = name ? `${timeGreeting}, ${name}!` : `${timeGreeting}!`;
}

function refreshGreetings() {
  updateHomeGreeting();
  updateTrackerGreeting();
}