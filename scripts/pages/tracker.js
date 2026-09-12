/* Project K.I.L.O.S. - BP Tracker Page Script */

/* 1. BP HISTORY */
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
  // Severe hypotension — most urgent, checked first
  if (systolic < 70 || diastolic < 40) {
    return { label: "Severe Low", icon: "priority_high", classes: "bg-tertiary text-on-tertiary" };
  }
  if (systolic > 180 || diastolic > 120) {
    return { label: "Crisis", icon: "priority_high", classes: "bg-error text-on-error" };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { label: "High (Stage 2)", icon: "priority_high", classes: "bg-error text-on-error" };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return { label: "High (Stage 1)", icon: "warning", classes: "bg-error-container text-on-error-container" };
  }
  // Hypotension — checked after high tiers so an unusual combo (e.g. low
  // systolic with elevated diastolic) still flags the higher-risk side
  if (systolic < 90 || diastolic < 60) {
    return { label: "Low", icon: "trending_down", classes: "bg-tertiary-container text-on-tertiary-container" };
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

/* 2. URGENT CARDS (Crisis + Severe Low)
   Visibility must reflect the most recent saved reading at all
   times, not just right after a fresh submit — otherwise
   navigating away and back to /tracker makes it vanish even
   though the last recorded reading is still urgent. Only one of
   the two cards can be visible at a time, since they reflect the
   single latest reading. */
function syncUrgentCard() {
  const urgentCardHigh = document.querySelector("[data-urgent-card]");
  const urgentCardLow = document.querySelector("[data-urgent-card-low]");

  const history = getBpHistory();
  const latest = history[0];
  const latestLabel = latest ? getBpStatus(latest.systolic, latest.diastolic).label : null;

  if (urgentCardHigh) {
    urgentCardHigh.classList.toggle("hidden", latestLabel !== "Crisis");
  }
  if (urgentCardLow) {
    urgentCardLow.classList.toggle("hidden", latestLabel !== "Severe Low");
  }
}

function drawAttentionToUrgentCard(selector = "[data-urgent-card]") {
  const urgentCard = document.querySelector(selector);
  if (!urgentCard) return;

  urgentCard.scrollIntoView({ behavior: "smooth", block: "center" });
  urgentCard.classList.add("animate-pulse");
  setTimeout(() => urgentCard.classList.remove("animate-pulse"), 1500);
}

/* 3. DASH-STYLE MODAL (Elevated, High, & Low)
   Fully replaces the success state for these categories.
   No countdown — stays open until the user closes it or
   downloads the PDF (Low has no PDF yet, so that button is hidden
   for it). */
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

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      <div>
        <p class="font-label-caps text-label-caps text-[#2e7d32] mb-2">GAWIN</p>
        <ul class="flex flex-col gap-2 text-sm">${doItems}</ul>
      </div>
      <div>
        <p class="font-label-caps text-label-caps text-error mb-2">IWASAN</p>
        <ul class="flex flex-col gap-2 text-sm">${dontItems}</ul>
      </div>
    </div>

    ${cfg.showSodiumGuidance ? buildDashServingHtml() : ""}

    ${cfg.showSodiumGuidance ? buildSodiumTipsHtml() : ""}

    ${cfg.meals && cfg.meals.length ? buildMealPlanHtml(cfg.meals) : ""}

    <div class="mt-6">
      <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">MABILIS NA GUIDE</p>
      <div class="flex flex-wrap gap-2">${chartGood}${chartBad}</div>
    </div>
  `;
}

/* Sample meal plan (Almusal/Tanghalian/Meryenda/Hapunan) — authored per
   category in ELEVATED_CONFIG/HIGH_CONFIG/LOW_CONFIG. Rendered after the
   DASH serving-size table and sodium limits section so the concrete meal
   examples follow the numbers and limits they're built from. */
function buildMealPlanHtml(meals) {
  const rows = meals.map((m, i) => `
    <div class="flex items-start gap-3 px-4 py-3 ${i < meals.length - 1 ? "border-b border-outline-variant" : ""}">
      <span class="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">${m.icon}</span>
      <p class="text-sm leading-relaxed">
        <span class="font-semibold text-on-surface">${m.label}:</span>
        <span class="text-on-surface-variant">${m.text}</span>
      </p>
    </div>`).join("");

  return `
    <div class="mt-6">
      <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">SAMPLE MEAL PLAN</p>
      <div class="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">${rows}</div>
    </div>`;
}

/* Shared DASH serving-size table + sodium guidance, shown for
   Elevated and High (not Low — hypotension guidance is unrelated
   to sodium restriction). Counts sourced from the client's revisions
   doc (1,800–2,000-cal/day reference plan). servingSize definitions added
   from the client's own NHLBI "What's on Your Plate?" PDFs — these
   definitions are identical across all NHLBI calorie tiers, only the
   daily/weekly COUNT changes per tier. Sodium has no serving size
   (it's a limit, not a food group serving). */
const DASH_SERVING_TABLE = [
  { group: "Grains", amount: "6–8", period: "araw-araw", servingSize: "1 slice tinapay, 1 oz dry cereal, o ½ cup lutong kanin/pasta/cereal" },
  { group: "Gulay (Vegetables)", amount: "4–5", period: "araw-araw", servingSize: "1 cup sariwang dahon, ½ cup hiniwang gulay (raw o luto), o ½ cup vegetable juice" },
  { group: "Prutas (Fruit)", amount: "4–5", period: "araw-araw", servingSize: "1 katamtamang prutas, ¼ cup dried fruit, o ½ cup fresh/frozen/de-latang prutas o juice" },
  { group: "Low-fat o fat-free dairy", amount: "2–3", period: "araw-araw", servingSize: "1 cup gatas, 1 cup yogurt, o 1½ oz keso" },
  { group: "Karne, manok, at isda", amount: "6 pababa", period: "araw-araw", servingSize: "1 oz lutong karne/isda/manok, o 1 itlog" },
  { group: "Mantika at taba", amount: "2–3", period: "araw-araw", servingSize: "1 tsp margarine, 1 tsp mantika, 1 tbsp mayonnaise, o 2 tbsp salad dressing" },
  { group: "Sodium", amount: "2,300mg (1,500mg para mas malaking bawas sa BP)", period: "araw-araw", servingSize: null },
  { group: "Mani, buto, dry beans, at monggo", amount: "4–5", period: "lingguhan", servingSize: "⅓ cup o 1½ oz mani (unsalted), 2 tbsp peanut butter, 2 tbsp buto, o ½ cup lutong beans" },
  { group: "Matamis", amount: "5 pababa", period: "lingguhan", servingSize: "1 tbsp asukal, 1 tbsp jam, ½ cup sorbet/gulaman, o 1 cup lemonade" }
];

const SODIUM_TIPS = {
  shopping: [
    "Basahin ang food labels — pumili ng mas mababa sa sodium/asin, lalo na sa convenience foods at condiments",
    "Pumili ng sariwang manok, isda, at lean meat kaysa cured tulad ng bacon at ham",
    "Sariwa o frozen na prutas at gulay kaysa de-lata",
    "Iwasan ang mga pagkaing may dagdag na asin tulad ng pickles, olives, at sauerkraut",
    "Iwasan ang instant o flavored rice at pasta"
  ],
  cooking: [
    "Huwag magdagdag ng asin kapag nagluluto ng kanin, pasta, o hot cereal",
    "Gumamit ng salt-free seasoning, sariwa o dried herbs at spices, o kalamansi/lemon juice",
    "Banlawan ang de-latang pagkain o mga naka-brine bago lutuin",
    "Bawasan ang asin na idinaragdag sa luto"
  ],
  eatingOut: [
    "Hilingin na lutuin nang walang dagdag na asin o MSG",
    "Iwasan ang mga menu item na maalat tulad ng bacon, pickles, olives, at cheese",
    "Iwasan ang pickled, cured, smoked, o may toyo/broth na pagkain",
    "Pumili ng prutas o gulay bilang side dish kaysa chips o fries"
  ]
};

function buildDashServingHtml() {
  const rows = DASH_SERVING_TABLE.map((r) => `
    <tr class="border-b border-outline-variant">
      <td class="py-2 pr-2">${r.group}</td>
      <td class="py-2 pr-2 font-medium">${r.amount}</td>
      <td class="py-2 text-on-surface-variant whitespace-nowrap">${r.period}</td>
    </tr>`).join("");

  const servingSizeRows = DASH_SERVING_TABLE
    .filter((r) => r.servingSize)
    .map((r) => `
      <li class="flex flex-col gap-0.5">
        <span class="font-medium text-on-surface">${r.group}</span>
        <span class="text-on-surface-variant">${r.servingSize}</span>
      </li>`).join("");

  return `
    <div class="mt-6">
      <p class="font-label-caps text-label-caps text-primary mb-2">DASH SERVING SIZES (1,800–2,000 cal/araw)</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="text-on-surface-variant font-label-caps text-[11px]">
              <th class="pb-1 pr-2">Food Group</th>
              <th class="pb-1 pr-2">Servings</th>
              <th class="pb-1 whitespace-nowrap">Kailan</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="mt-6">
        <p class="font-label-caps text-label-caps text-primary">ANO ANG 1 SERVING?</p>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs pl-1">${servingSizeRows}</ul>
      </div>
    </div>`;
}

function buildSodiumTipsHtml() {
  const tipList = (items) => items.map((t) => `<li class="flex items-start gap-2"><span class="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">chevron_right</span><span>${t}</span></li>`).join("");

  return `
    <div class="mt-6">
      <p class="font-label-caps text-label-caps text-primary mb-2">SODIUM LIMITS</p>
      <p class="text-sm">Karaniwang limitasyon: <span class="font-medium">2,300mg</span> ng sodium kada araw (mga 1 kutsaritang asin). Para sa mas malaking bawas sa BP: <span class="font-medium">1,500mg</span> kada araw.</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
        <div>
          <p class="font-label-caps text-label-caps text-on-surface-variant mb-1 min-h-10 text-center">SHOPPING</p>
          <ul class="flex flex-col gap-1">${tipList(SODIUM_TIPS.shopping)}</ul>
        </div>
        <div>
          <p class="font-label-caps text-label-caps text-on-surface-variant mb-1 min-h-10 text-center">PAGLULUTO</p>
          <ul class="flex flex-col gap-1">${tipList(SODIUM_TIPS.cooking)}</ul>
        </div>
        <div>
          <p class="font-label-caps text-label-caps text-on-surface-variant mb-1 min-h-10 text-center">KAPAG KUMAKAIN SA LABAS</p>
          <ul class="flex flex-col gap-1">${tipList(SODIUM_TIPS.eatingOut)}</ul>
        </div>
      </div>
    </div>`;
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
  chartBad: ["Instant noodles", "Corned beef", "Sardinas", "Softdrinks", "Chichirya", "Toyo (sobra)"],
  showSodiumGuidance: true
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
  chartBad: ["Tuyo", "Bagoong", "Hotdog", "Longganisa", "Tocino", "Corned beef", "Softdrinks", "Alak"],
  showSodiumGuidance: true
};

/* Draft copy — client's revisions doc only lists a "HYPOTENSION" heading
   with no body content yet, unlike the Hypertension DASH sections which
   came fully written. Replace with the client's official wording once
   provided. */
const LOW_CONFIG = {
  intro: "Medyo mababa ang BP mo. Kadalasan ay hindi ito agad delikado, pero mahalagang bantayan ang katawan mo at umiwas sa biglaang paggalaw.",
  dos: [
    "Tumayo nang dahan-dahan mula sa pagkakahiga o pagkakaupo",
    "Uminom ng sapat na tubig araw-araw",
    "Kumain nang regular, huwag magpalampas ng kanin",
    "Magpahinga at umupo agad kung nahihilo o nanghihina"
  ],
  donts: [
    "Iwasan ang biglaang pagtayo, lalo na pagkagising",
    "Huwag magtagal na nakatayo sa mainit na lugar",
    "Iwasan ang pag-inom ng alak",
    "Huwag laktawan ang kainan, lalo na ang almusal"
  ],
  meals: [
    { icon: "breakfast_dining", label: "Almusal", text: "Kanin, itlog, at prutas — huwag laktawan" },
    { icon: "lunch_dining", label: "Tanghalian", text: "Sabaw na may gulay at protina, sapat na tubig" },
    { icon: "cookie", label: "Meryenda", text: "Prutas o crackers, at tubig" },
    { icon: "dinner_dining", label: "Hapunan", text: "Regular na kainan, huwag paglaktawan" }
  ],
  chartGood: ["Sabaw", "Prutas", "Tubig", "Regular na kainan", "Itlog"],
  chartBad: ["Biglaang pagtayo", "Mahabang pagtayo", "Alak", "Paglaktaw ng kainan"],
  showSodiumGuidance: false
};

/* No "pdf" field anymore — the DASH PDF is generated client-side from
   this same title/body content via downloadDashPdf() (html2pdf.js), so
   there's no separate static file to keep in sync. See
   Project-KILOS-DASH-PDF-Plan.md. */
const DASH_CONTENT = {
  Elevated: {
    title: "Simulan ang DASH Diet",
    body: buildDashHtml(ELEVATED_CONFIG)
  },
  "High (Stage 1)": {
    title: "DASH Diet — Kailangan Mo Ito",
    body: buildDashHtml(HIGH_CONFIG)
  },
  "High (Stage 2)": {
    title: "DASH Diet — Kailangan Mo Ito",
    body: buildDashHtml(HIGH_CONFIG)
  },
  Low: {
    title: "Alagaan ang Mababang BP",
    body: buildDashHtml(LOW_CONFIG)
  }
};

/* 3a0. SCROLL RESET HELPER
   Each modal's inner content box (max-h-[85vh] overflow-y-auto) is
   toggled via the "hidden" class rather than rebuilt, so the browser
   remembers wherever the user last scrolled it. Without this, reopening
   a modal after scrolling down in a previous one jumps straight back
   to that old scroll position instead of starting at the top. */
function resetModalScroll(overlay) {
  if (!overlay) return;
  const scrollable = overlay.firstElementChild;
  if (scrollable) scrollable.scrollTop = 0;
}

/* Tracks the reading currently shown in the DASH modal, so the download
   handler (wired once in initBpForm) knows what to render into the PDF
   without needing the click handler itself to take arguments. Set every
   time the modal opens; cleared on close is unnecessary since it's only
   ever read while the modal is open. */
let currentDashReading = null;

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

  // PDF is now generated client-side from the modal's own content on
  // click (see downloadDashPdf), not linked to a static pre-made file —
  // so the button is always shown for every DASH category.
  currentDashReading = { category, systolic, diastolic };
  document.getElementById("dash-download-link").classList.remove("hidden");

  overlay.classList.remove("hidden");
  resetModalScroll(overlay);
}

/* Builds "MM-DD-YYYY-Category" — slashes aren't valid in filenames, and
   the category label ("High (Stage 1)") has spaces/parens that need
   stripping down to something filename-safe. */
function buildDashPdfFilename(category) {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();

  const safeCategory = category
    .replace(/[()]/g, "")   // "High (Stage 1)" -> "High Stage 1"
    .trim()
    .replace(/\s+/g, "-");  // "High Stage 1" -> "High-Stage-1"

  return `${mm}-${dd}-${yyyy}-${safeCategory}.pdf`;
}

/* PDF-only header — just the logo + "K.I.L.O.S." wordmark. (No title line
   here — the category's own heading, e.g. "Alagaan ang Mababang BP",
   already appears in the body just below, so repeating it up top was
   redundant.) Wrapped in a marked container so it can be found and
   stripped back out after generation — this never touches the on-screen
   modal, only what html2canvas captures. */
function buildDashPdfHeader() {
  const wrapper = document.createElement("div");
  wrapper.dataset.pdfHeaderTemp = "true";
  wrapper.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <img src="assets/logo/kilos-logo.png" alt="" style="width:28px;height:28px;object-fit:contain;">
      <span style="color:#8a0000;font-weight:700;font-size:13px;letter-spacing:0.05em;">K.I.L.O.S.</span>
    </div>
  `;
  return wrapper;
}

/* PDF-only footer — divider + fixed disclaimer, specific to this pilot
   (Barangay Tarum, Mercedes, Camarines Norte). */
function buildDashPdfFooter() {
  const wrapper = document.createElement("div");
  wrapper.dataset.pdfFooterTemp = "true";
  wrapper.innerHTML = `
    <hr style="border:none;border-top:1px solid #bfc9c1;margin-top:24px;margin-bottom:12px;">
    <p style="text-align:center;color:#404943;font-size:11px;line-height:1.5;">
      Project K.I.L.O.S. — Barangay Tarum, Mercedes, Camarines Norte. Ang gabay na ito ay para sa impormasyon lamang; kumonsulta pa rin sa BHW o health center kung may katanungan.
    </p>
  `;
  return wrapper;
}

/* Resolves once the logo image has actually loaded (or immediately if
   it's already cached — likely, since the same image is used in the
   site header). html2canvas can render a broken/blank image if the
   capture fires before the browser finishes loading it. Falls back to
   resolving after 1.5s regardless, so a slow/broken image can't hang
   the whole download. */
function waitForImage(img) {
  return new Promise((resolve) => {
    if (img.complete) return resolve();
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
    setTimeout(resolve, 1500);
  });
}

/* Toggles the download button between its normal and "generating" state.
   A brief disabled/spinner state matters here specifically because
   html2canvas rendering the longer Elevated/High content (serving table +
   sodium tips + meal plan) isn't instant — without feedback the button
   looks unresponsive and invites a double-click, which would otherwise
   kick off two PDF generations at once. */
function setDashDownloadLoading(isLoading) {
  const link = document.getElementById("dash-download-link");
  if (!link) return;

  if (isLoading) {
    link.dataset.originalText = link.textContent.trim();
    link.textContent = "Ginagawa ang PDF…";
    link.classList.add("opacity-50", "pointer-events-none");
  } else {
    link.textContent = link.dataset.originalText || "I-download ang DASH Guide (PDF)";
    link.classList.remove("opacity-50", "pointer-events-none");
  }
}

/* Generates the PDF from a COPY of the DASH modal's content, not the
   live modal itself.

   Earlier version inserted the header/footer directly into the visible
   [data-dash-pdf-capture] element, then removed them after html2pdf
   finished. That's rendering, not capture — html2canvas isn't instant,
   so for that brief window the header/footer were genuinely part of the
   on-screen DOM and visibly flashed in the real modal.

   Fix: clone the capture target, inject the header/footer into the
   clone only, park the clone off-screen (position:fixed, left:-9999px —
   still fully rendered/laid out by the browser, just not in the visible
   viewport, which is required for html2canvas to measure it correctly),
   generate the PDF from the clone, then discard the whole off-screen
   container. The real modal is never modified. */
async function downloadDashPdf() {
  if (!currentDashReading) return;
  if (typeof html2pdf === "undefined") {
    console.error("html2pdf.js failed to load — check the CDN script tag in index.html.");
    return;
  }

  const captureTarget = document.querySelector("[data-dash-pdf-capture]");
  if (!captureTarget) return;

  const filename = buildDashPdfFilename(currentDashReading.category);

  setDashDownloadLoading(true);

  const clone = captureTarget.cloneNode(true);
  clone.style.backgroundColor = "#ffffff"; // override bg-surface's cream tint (#fcf9f8) — PDF should be pure white
  const header = buildDashPdfHeader();
  const footer = buildDashPdfFooter();
  clone.prepend(header);
  clone.append(footer);

  const offscreen = document.createElement("div");
  offscreen.style.position = "fixed";
  offscreen.style.left = "-9999px";
  offscreen.style.top = "0";
  offscreen.style.width = `${captureTarget.offsetWidth}px`; // match on-screen width so text wraps the same
  offscreen.style.backgroundColor = "#ffffff";
  offscreen.appendChild(clone);
  document.body.appendChild(offscreen);

  try {
    await waitForImage(header.querySelector("img"));

    // Auto-size the page to the content instead of a fixed A4 sheet — this
    // is a digital-only guide (never printed on a physical tray), so there's
    // no benefit to a standard paper size, and a fixed A4 height either left
    // the short "Low" guide with an empty near-blank second page or cut the
    // longer "High"/"Elevated" guides (serving table + sodium tips + meal
    // plan) mid-list at the page break.
    //
    // Measured from the clone's own layout box (post-image-load, so the
    // logo doesn't shift the height after we measure) rather than the
    // on-screen modal, since the clone is what's actually being captured —
    // it has the header/footer appended and a fixed pixel width already.
    const marginMm = 10;
    // Small safety buffer added to the measured height only — absorbs
    // sub-pixel rounding between this measurement and html2pdf's own
    // internal re-render (it deep-clones this element again into its own
    // container before capture), so Math.ceil() in html2pdf's page-count
    // calculation can't tip a borderline height into a spurious 2nd page.
    const heightBufferMm = 4;
    const pxToMm = (px) => (px * 25.4) / 96; // CSS px (96/in) -> mm
    const pageWidthMm = pxToMm(clone.offsetWidth) + marginMm * 2;
    const pageHeightMm = pxToMm(clone.offsetHeight) + marginMm * 2 + heightBufferMm;

    await html2pdf()
      .set({
        filename,
        margin: marginMm,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: [pageWidthMm, pageHeightMm], orientation: "portrait" },
        // NOTE: mode "avoid-all" was removed on purpose — it doesn't mean
        // "never add a page", it means "never let a page-break land inside
        // any element" (applied via querySelectorAll('*'), i.e. every node,
        // even icon spans and bullets). Combined with a page height sized
        // to fit content exactly, ordinary sub-pixel rounding makes a
        // handful of trailing elements (a chip, the <hr>, the footer <p>)
        // register as "straddling" the boundary, and each one gets pushed
        // onto the next page via an inserted padding <div> — and because
        // that insertion loop mutates the DOM while it iterates, each push
        // shifts every later element down too, cascading into the
        // blank-page / content-page / stranded-footer-page pattern we saw.
        // An empty mode array disables that logic entirely — with the
        // buffered page height above, everything should land on one page
        // through the plain page-count math in html2pdf's core (toPdf()),
        // with no per-element break-avoidance running at all.
        pagebreak: { mode: [] }
      })
      .from(clone)
      .save();
  } catch (err) {
    console.error("PDF generation failed:", err);
  } finally {
    offscreen.remove();
    setDashDownloadLoading(false);
  }
}

function closeDashModal() {
  const overlay = document.getElementById("dash-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
}

/* 3a2. CRISIS MODAL (Crisis readings only) */
function openCrisisModal(systolic, diastolic) {
  const overlay = document.getElementById("crisis-modal-overlay");
  if (!overlay) return;

  document.querySelector("[data-crisis-reading]").textContent = `${systolic} / ${diastolic}`;

  overlay.classList.remove("hidden");
  resetModalScroll(overlay);
  drawAttentionToUrgentCard("[data-urgent-card]");
}

function closeCrisisModal() {
  const overlay = document.getElementById("crisis-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
  const form = document.getElementById("bpForm");
  if (form) form.reset();
}

/* 3a3. SEVERE LOW MODAL (Severe Low readings only)
   Mirrors the Crisis modal — tertiary styling, direct CTA to
   contact the BHW, manual close only. */
function openSevereLowModal(systolic, diastolic) {
  const overlay = document.getElementById("severe-low-modal-overlay");
  if (!overlay) return;

  document.querySelector("[data-severe-low-reading]").textContent = `${systolic} / ${diastolic}`;

  overlay.classList.remove("hidden");
  resetModalScroll(overlay);
  drawAttentionToUrgentCard("[data-urgent-card-low]");
}

function closeSevereLowModal() {
  const overlay = document.getElementById("severe-low-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
  const form = document.getElementById("bpForm");
  if (form) form.reset();
}

/* 3b. NORMAL MODAL (Normal readings only) */
function openNormalModal(systolic, diastolic) {
  const overlay = document.getElementById("normal-modal-overlay");
  if (!overlay) return;

  const status = getBpStatus(systolic, diastolic); // always Normal here

  document.querySelector("[data-normal-reading]").textContent = `${systolic} / ${diastolic}`;

  const badge = document.querySelector("[data-normal-status-badge]");
  badge.innerHTML = `<span class="material-symbols-outlined text-[14px]">${status.icon}</span>${status.label}`;
  badge.className = `ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-label-caps ${status.classes}`;

  overlay.classList.remove("hidden");
  resetModalScroll(overlay);
}

function closeNormalModal() {
  const overlay = document.getElementById("normal-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
  const form = document.getElementById("bpForm");
  if (form) form.reset();
}

/* 3c. NAVIGATION CLEANUP */
function resetTrackerTransientUI() {
  closeCrisisModal();
  closeDashModal();
  closeNormalModal();
  closeSevereLowModal();
}

/* 4. BP TRACKER FORM */
function initBpForm() {
  updateTrackerGreeting();
  renderBpHistory();
  syncUrgentCard();

  const form = document.getElementById("bpForm");
  if (!form) return;

  const clearHistoryBtn = document.querySelector("[data-clear-history]");

  const crisisModalClose = document.getElementById("crisis-modal-close");
  const severeLowModalClose = document.getElementById("severe-low-modal-close");
  const dashModalClose = document.getElementById("dash-modal-close");
  const dashDownloadLink = document.getElementById("dash-download-link");
  const normalModalClose = document.getElementById("normal-modal-close");

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
    } else if (status.label === "Elevated" || status.label === "High (Stage 1)" || status.label === "High (Stage 2)" || status.label === "Low") {
      openDashModal(status.label, systolic, diastolic);
    } else if (status.label === "Crisis") {
      openCrisisModal(systolic, diastolic);
    } else if (status.label === "Severe Low") {
      openSevereLowModal(systolic, diastolic);
    }
  });

  if (crisisModalClose) {
    crisisModalClose.addEventListener("click", closeCrisisModal);
  }

  if (severeLowModalClose) {
    severeLowModalClose.addEventListener("click", closeSevereLowModal);
  }

  if (normalModalClose) {
    normalModalClose.addEventListener("click", closeNormalModal);
  }

  if (dashModalClose) {
    dashModalClose.addEventListener("click", () => {
      closeDashModal();
      form.reset();
    });
  }

  if (dashDownloadLink) {
    dashDownloadLink.addEventListener("click", (e) => {
      e.preventDefault(); // no static href to follow anymore
      // Leave modal open — user may want to re-read guidance after
      // downloading. They close it manually via dashModalClose.
      downloadDashPdf();
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