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
   from the client's own NHLBI "What's on Your Plate?" PDFs (1,200 /
   1,400-1,600 / 1,800-2,000 / 2,600 cal) — these definitions are
   identical across all four calorie tiers, only the daily/weekly
   COUNT changes per tier, so they're safe to use regardless of which
   calorie link the user ultimately follows. Sodium has no serving
   size (it's a limit, not a food group serving). */
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

const DASH_CALORIE_LINKS = [
  { label: "1,200 calories/araw", url: "https://www.nhlbi.nih.gov/resources/whats-your-plate-1200-caloriesday" },
  { label: "1,400–1,600 calories/araw", url: "https://www.nhlbi.nih.gov/resources/whats-your-plate-1400-1600-caloriesday" },
  { label: "1,800–2,000 calories/araw", url: "https://www.nhlbi.nih.gov/resources/whats-your-plate-1800-2000-caloriesday" },
  { label: "2,600 calories/araw", url: "https://www.nhlbi.nih.gov/resources/whats-your-plate-2600-caloriesday" }
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

  const links = DASH_CALORIE_LINKS.map((l) => `
    <a href="${l.url}" target="_blank" rel="noopener" class="text-primary underline text-xs hover:text-secondary transition-colors">${l.label}</a>`).join("");

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
      <p class="text-xs text-on-surface-variant mt-6">Iba-iba ang kailangan mong serving depende sa iyong pang-araw-araw na calorie needs:</p>
      <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1">${links}</div>

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

const DASH_CONTENT = {
  Elevated: {
    title: "Simulan ang DASH Diet",
    body: buildDashHtml(ELEVATED_CONFIG),
    pdf: "assets/dash-pdf-files/dash-elevated.pdf"
  },
  "High (Stage 1)": {
    title: "DASH Diet — Kailangan Mo Ito",
    body: buildDashHtml(HIGH_CONFIG),
    pdf: "assets/dash-pdf-files/dash-high.pdf"
  },
  "High (Stage 2)": {
    title: "DASH Diet — Kailangan Mo Ito",
    body: buildDashHtml(HIGH_CONFIG),
    pdf: "assets/dash-pdf-files/dash-high.pdf"
  },
  Low: {
    title: "Alagaan ang Mababang BP",
    body: buildDashHtml(LOW_CONFIG),
    pdf: "assets/dash-pdf-files/dash-low.pdf"
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

  const downloadLink = document.getElementById("dash-download-link");
  if (content.pdf) {
    downloadLink.href = content.pdf;
    downloadLink.classList.remove("hidden");
  } else {
    downloadLink.classList.add("hidden");
  }

  overlay.classList.remove("hidden");
  resetModalScroll(overlay);
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
    dashDownloadLink.addEventListener("click", () => {
      // Leave modal open — user may want to re-read guidance after
      // downloading. They close it manually via dashModalClose.
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