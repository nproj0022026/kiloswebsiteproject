/* Project K.I.L.O.S. - BP Tracker Page Script */

/* ============================================================
   1. BP HISTORY
   ============================================================ */
const BP_HISTORY_KEY = "bpHistory";
const MAX_HISTORY = 10;

function getBpHistory() {
  try {
    const raw = localStorage.getItem(BP_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBpHistory(history) {
  localStorage.setItem(BP_HISTORY_KEY, JSON.stringify(history));
}

function getBpStatus(systolic, diastolic) {
  if (systolic > 180 || diastolic > 120) {
    return { label: "Crisis", icon: "priority_high", classes: "bg-error text-on-error" };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { label: "High", icon: "priority_high", classes: "bg-error-container text-on-error-container" };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return { label: "High", icon: "warning", classes: "bg-error-container text-on-error-container" };
  }
  if (systolic >= 120 && diastolic < 80) {
    return { label: "Elevated", icon: "warning", classes: "bg-[#ffecb3] text-[#795548]" };
  }
  return { label: "Normal", icon: "check", classes: "bg-secondary-container text-on-secondary-container" };
}

function formatHistoryTimestamp(iso) {
  const date = new Date(iso);
  const now = new Date();
  const timeStr = date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });

  if (date.toDateString() === now.toDateString()) return `Ngayon, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Kahapon, ${timeStr}`;

  const dateStr = date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  return `${dateStr}, ${timeStr}`;
}

function renderBpHistory() {
  const tbody = document.querySelector("[data-history-body]");
  const clearBtn = document.querySelector("[data-clear-history]");
  const history = getBpHistory();

  if (clearBtn) {
    clearBtn.disabled = history.length === 0;
  }

  if (!tbody) return;

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="p-6 text-center text-on-surface-variant align-middle" style="height: 300px;">Wala pang naitatalang BP reading.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = history.map((entry, i) => {
    const status = getBpStatus(entry.systolic, entry.diastolic);
    const rowBg = i % 2 === 0 ? "bg-surface" : "bg-surface-container-lowest";
    return `
      <tr class="${rowBg}">
        <td class="p-4 border-b border-outline-variant text-on-surface-variant">${formatHistoryTimestamp(entry.timestamp)}</td>
        <td class="p-4 border-b border-outline-variant font-medium">${entry.systolic} / ${entry.diastolic}</td>
        <td class="p-4 border-b border-outline-variant">
          <span class="inline-flex items-center gap-1 ${status.classes} px-2 py-1 rounded-full text-xs font-label-caps">
            <span class="material-symbols-outlined text-[14px]">${status.icon}</span> ${status.label}
          </span>
        </td>
      </tr>`;
  }).join("");
}

/* ============================================================
   2. URGENT CARD (Crisis)
   Visibility must reflect the most recent saved reading at all
   times, not just right after a fresh submit — otherwise
   navigating away and back to /tracker makes it vanish even
   though the last recorded reading is still Crisis.
   ============================================================ */
function syncUrgentCard() {
  const urgentCard = document.querySelector("[data-urgent-card]");
  if (!urgentCard) return;

  const history = getBpHistory();
  const latest = history[0];
  const isCrisis = latest && getBpStatus(latest.systolic, latest.diastolic).label === "Crisis";

  urgentCard.classList.toggle("hidden", !isCrisis);
}

function drawAttentionToUrgentCard() {
  const urgentCard = document.querySelector("[data-urgent-card]");
  if (!urgentCard) return;

  urgentCard.scrollIntoView({ behavior: "smooth", block: "center" });
  urgentCard.classList.add("animate-pulse");
  setTimeout(() => urgentCard.classList.remove("animate-pulse"), 1500);
}

/* ============================================================
   3. DASH MODAL (Elevated & High)
   Fully replaces the success state for these two categories.
   No countdown — stays open until the user closes it or
   downloads the PDF.
   ============================================================ */
function buildDashHtml(cfg) {
  const doItems = cfg.dos.map((d) => `
    <li class="flex items-start gap-2">
      <span class="material-symbols-outlined text-[18px] text-[#2e7d32] shrink-0">check_circle</span>
      <span>${d}</span>
    </li>`).join("");

  const dontItems = cfg.donts.map((d) => `
    <li class="flex items-start gap-2">
      <span class="material-symbols-outlined text-[18px] text-error shrink-0">cancel</span>
      <span>${d}</span>
    </li>`).join("");

  const mealRows = cfg.meals.map((m) => `
    <div class="flex items-start gap-3">
      <span class="material-symbols-outlined text-lg text-primary shrink-0">${m.icon}</span>
      <div><span class="font-label-caps text-label-caps text-on-surface">${m.label}:</span> <span>${m.text}</span></div>
    </div>`).join("");

  const chartGood = cfg.chartGood.map((f) => `
    <span class="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full text-xs">
      <span class="material-symbols-outlined text-[14px]">check</span>${f}
    </span>`).join("");

  const chartBad = cfg.chartBad.map((f) => `
    <span class="inline-flex items-center gap-1 bg-error-container text-on-error-container px-2 py-1 rounded-full text-xs">
      <span class="material-symbols-outlined text-[14px]">close</span>${f}
    </span>`).join("");

  return `
    <p>${cfg.intro}</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
      <div>
        <p class="font-label-caps text-label-caps text-[#2e7d32] mb-2">GAWIN</p>
        <ul class="flex flex-col gap-2 text-sm">${doItems}</ul>
      </div>
      <div>
        <p class="font-label-caps text-label-caps text-error mb-2">IWASAN</p>
        <ul class="flex flex-col gap-2 text-sm">${dontItems}</ul>
      </div>
    </div>

    <div class="mt-2">
      <p class="font-label-caps text-label-caps text-primary mb-2">HALIMBAWANG MEAL PLAN</p>
      <div class="flex flex-col gap-3 text-sm bg-surface-container-low rounded-lg p-4 border border-outline-variant">
        ${mealRows}
      </div>
    </div>

    <div class="mt-2">
      <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">MABILIS NA GUIDE</p>
      <div class="flex flex-wrap gap-2">${chartGood}${chartBad}</div>
    </div>
  `;
}

const ELEVATED_CONFIG = {
  intro: "Medyo tumaas ang BP mo. Maagang pag-iwas na ngayon ang pinakamabisang gagawin — hindi pa kailangan ng gamot, pero kailangan nang ayusin ang kinakain.",
  dos: [
    "Kumain ng gulay at prutas araw-araw, kahit konti lang",
    "Pumili ng sariwang isda o manok kaysa de-lata o processed",
    "Uminom ng sapat na tubig, 6–8 baso kada araw",
    "Gumamit ng kalamansi, luya, o bawang bilang panlasa kaysa dagdag na asin"
  ],
  donts: [
    "Iwasan ang instant noodles at de-latang pagkain",
    "Huwag magdagdag pa ng patis, toyo, o asin sa luto na",
    "Iwasan ang softdrinks at masyadong matamis na inumin",
    "Bawasan ang chips at iba pang maalat na meryenda"
  ],
  meals: [
    { icon: "breakfast_dining", label: "Almusal", text: "Oatmeal na may prutas, at nilagang itlog" },
    { icon: "lunch_dining", label: "Tanghalian", text: "Sinigang na isda (konting asin), kanin, gulay" },
    { icon: "cookie", label: "Meryenda", text: "Saging o mani na walang asin" },
    { icon: "dinner_dining", label: "Hapunan", text: "Inihaw na manok, ensaladang gulay, kanin" }
  ],
  chartGood: ["Malunggay", "Kalabasa", "Sitaw", "Saging", "Kamatis", "Tilapia", "Bangus", "Mani (unsalted)"],
  chartBad: ["Instant noodles", "Corned beef", "Sardinas", "Softdrinks", "Chichirya", "Toyo (sobra)"]
};

const HIGH_CONFIG = {
  intro: "Mataas na ang BP mo. Kailangan nang seryosohin ang pagbabago sa kinakain, simula ngayon — at kung may reseta kang gamot, ipagpatuloy ito.",
  dos: [
    "Sundin ang low-sodium na pagluluto araw-araw — max 1 kutsaritang asin (~2,300mg sodium)",
    "Palitan ang de-lata o processed na karne ng sariwang gulay at isda",
    "Kumain ng maliit na porsyon, mas madalas (5–6x) kaysa malaking kainan",
    "Magpatingin sa BHW o health center kung magpapatuloy ang mataas na reading"
  ],
  donts: [
    "Iwasan nang husto ang tuyo, bagoong, at patis",
    "Huwag kumain ng hotdog, longganisa, tocino, o corned beef",
    "Iwasan ang softdrinks, alak, at sobrang caffeine",
    "Huwag laktawan ang gamot o ang pagpapatingin sa health center"
  ],
  meals: [
    { icon: "breakfast_dining", label: "Almusal", text: "Nilagang itlog, kaunting pandesal, prutas" },
    { icon: "lunch_dining", label: "Tanghalian", text: "Nilagang gulay at isda, kanin (kalahating tasa)" },
    { icon: "cookie", label: "Meryenda", text: "Prutas o mani na walang asin" },
    { icon: "dinner_dining", label: "Hapunan", text: "Inihaw na isda o manok (walang toyo), maraming gulay" }
  ],
  chartGood: ["Malunggay", "Ampalaya", "Kalabasa", "Saging", "Tilapia", "Bangus", "Dalag", "Mani (unsalted)"],
  chartBad: ["Tuyo", "Bagoong", "Hotdog", "Longganisa", "Tocino", "Corned beef", "Softdrinks", "Alak"]
};

const DASH_CONTENT = {
  Elevated: {
    title: "Simulan ang DASH Diet",
    body: buildDashHtml(ELEVATED_CONFIG),
    pdf: "assets/dash-pdf-files/dash-elevated.pdf"
  },
  High: {
    title: "DASH Diet — Kailangan Mo Ito",
    body: buildDashHtml(HIGH_CONFIG),
    pdf: "assets/dash-pdf-files/dash-high.pdf"
  }
};

function openDashModal(category, systolic, diastolic) {
  const overlay = document.getElementById("dash-modal-overlay");
  if (!overlay) return;

  const content = DASH_CONTENT[category];
  if (!content) return;

  const status = getBpStatus(systolic, diastolic);

  document.querySelector("[data-dash-reading]").textContent = `${systolic} / ${diastolic}`;

  const badge = document.querySelector("[data-dash-status-badge]");
  badge.innerHTML = `<span class="material-symbols-outlined text-[14px]">${status.icon}</span>${status.label}`;
  badge.className = `ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-label-caps ${status.classes}`;

  document.querySelector("[data-dash-title]").textContent = content.title;
  document.querySelector("[data-dash-body]").innerHTML = content.body;
  document.getElementById("dash-download-link").href = content.pdf;

  overlay.classList.remove("hidden");
}

function closeDashModal() {
  const overlay = document.getElementById("dash-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
}

/* ============================================================
   3a2. CRISIS MODAL (Crisis readings only)
   Same visual theme as the other status modals, but urgent
   styling and a direct call-to-action to contact the BHW.
   Manual close only — deliberately no auto-close, this is the
   highest-risk tier and shouldn't be easy to dismiss by accident.
   ============================================================ */
function openCrisisModal(systolic, diastolic) {
  const overlay = document.getElementById("crisis-modal-overlay");
  if (!overlay) return;

  document.querySelector("[data-crisis-reading]").textContent = `${systolic} / ${diastolic}`;

  overlay.classList.remove("hidden");
  drawAttentionToUrgentCard();
}

function closeCrisisModal() {
  const overlay = document.getElementById("crisis-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
  const form = document.getElementById("bpForm");
  if (form) form.reset();
}

/* ============================================================
   3b. NORMAL MODAL (Normal readings only)
   Same visual theme as the DASH modal, but no PDF download.
   Manual close only — via the ISARA button or clicking outside
   the modal. No auto-close/countdown.
   ============================================================ */
function openNormalModal(systolic, diastolic) {
  const overlay = document.getElementById("normal-modal-overlay");
  if (!overlay) return;

  const status = getBpStatus(systolic, diastolic); // always Normal here

  document.querySelector("[data-normal-reading]").textContent = `${systolic} / ${diastolic}`;

  const badge = document.querySelector("[data-normal-status-badge]");
  badge.innerHTML = `<span class="material-symbols-outlined text-[14px]">${status.icon}</span>${status.label}`;
  badge.className = `ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-label-caps ${status.classes}`;

  overlay.classList.remove("hidden");
}

function closeNormalModal() {
  const overlay = document.getElementById("normal-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
  const form = document.getElementById("bpForm");
  if (form) form.reset();
}

/* ============================================================
   3c. NAVIGATION CLEANUP
   Called by main.js's router before swapping #page-content out,
   so no open modal/state carries over stale if the user
   navigates away from /tracker mid-flow.
   ============================================================ */
function resetTrackerTransientUI() {
  closeCrisisModal();
  closeDashModal();
  closeNormalModal();
}

/* ============================================================
   4. BP TRACKER FORM
   Called by main.js's router on every navigation to /tracker,
   since fresh innerHTML has no listeners attached.
   ============================================================ */
function initBpForm() {
  updateTrackerGreeting();
  renderBpHistory();
  syncUrgentCard();

  const form = document.getElementById("bpForm");
  if (!form) return;

  const clearHistoryBtn = document.querySelector("[data-clear-history]");

  const crisisModalClose = document.getElementById("crisis-modal-close");
  const crisisModalOverlay = document.getElementById("crisis-modal-overlay");

  const dashModalClose = document.getElementById("dash-modal-close");
  const dashModalOverlay = document.getElementById("dash-modal-overlay");
  const dashDownloadLink = document.getElementById("dash-download-link");

  const normalModalClose = document.getElementById("normal-modal-close");
  const normalModalOverlay = document.getElementById("normal-modal-overlay");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const systolic = parseInt(document.getElementById("systolic").value, 10);
    const diastolic = parseInt(document.getElementById("diastolic").value, 10);
    if (isNaN(systolic) || isNaN(diastolic)) return;

    const history = getBpHistory();
    history.unshift({ systolic, diastolic, timestamp: new Date().toISOString() });
    history.length = Math.min(history.length, MAX_HISTORY);
    saveBpHistory(history);
    renderBpHistory();
    syncUrgentCard();

    const status = getBpStatus(systolic, diastolic);

    if (status.label === "Normal") {
      openNormalModal(systolic, diastolic);
    } else if (status.label === "Elevated" || status.label === "High") {
      openDashModal(status.label, systolic, diastolic);
    } else if (status.label === "Crisis") {
      openCrisisModal(systolic, diastolic);
    }
  });

  if (crisisModalClose) {
    crisisModalClose.addEventListener("click", closeCrisisModal);
  }

  if (crisisModalOverlay) {
    crisisModalOverlay.addEventListener("click", (e) => {
      if (e.target === crisisModalOverlay) closeCrisisModal();
    });
  }

  if (normalModalClose) {
    normalModalClose.addEventListener("click", closeNormalModal);
  }

  if (normalModalOverlay) {
    normalModalOverlay.addEventListener("click", (e) => {
      if (e.target === normalModalOverlay) closeNormalModal();
    });
  }

  if (dashModalClose) {
    dashModalClose.addEventListener("click", () => {
      closeDashModal();
      form.reset();
    });
  }

  if (dashDownloadLink) {
    dashDownloadLink.addEventListener("click", () => {
      // Leave modal open — user may want to re-read guidance after
      // downloading. They close it manually via dashModalClose.
    });
  }

  if (dashModalOverlay) {
    dashModalOverlay.addEventListener("click", (e) => {
      if (e.target === dashModalOverlay) {
        closeDashModal();
        form.reset();
      }
    });
  }

  if (clearHistoryBtn) {
    const deleteOverlay = document.getElementById("delete-confirm-overlay");
    const confirmBtn = document.getElementById("confirm-delete-btn");
    const cancelBtn = document.getElementById("cancel-delete-btn");

    clearHistoryBtn.addEventListener("click", () => {
      deleteOverlay.classList.remove("hidden");
    });

    cancelBtn.addEventListener("click", () => {
      deleteOverlay.classList.add("hidden");
    });

    deleteOverlay.addEventListener("click", (e) => {
      if (e.target === deleteOverlay) deleteOverlay.classList.add("hidden");
    });

    confirmBtn.addEventListener("click", () => {
      saveBpHistory([]);
      renderBpHistory();
      syncUrgentCard();
      deleteOverlay.classList.add("hidden");
    });
  }
}