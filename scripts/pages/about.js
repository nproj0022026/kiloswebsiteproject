/* Project K.I.L.O.S. - About Page Script */

/* One click handler covers two distinct patterns that both show/hide
   a hidden answer block:
   - data-faq-toggle / data-faq-item / data-faq-answer / data-faq-icon
     -> the real FAQ accordion (has a rotating chevron)
   - data-translate-toggle / data-translate-item / data-translate-answer
     -> "Basahin sa Tagalog" inline reveals on the hero, complications,
        and myths/facts cards (no chevron)
   The toggle behavior itself is identical, so one delegated handler
   covers both instead of duplicating the logic. */
document.addEventListener("click", (e) => {
  const toggle = e.target.closest("[data-faq-toggle], [data-translate-toggle]");
  if (!toggle) return;

  const item = toggle.closest("[data-faq-item], [data-translate-item]");
  const answer = item ? item.querySelector("[data-faq-answer], [data-translate-answer]") : null;
  if (!answer) return;

  const icon = item.querySelector("[data-faq-icon]");

  const isOpen = !answer.classList.contains("hidden");
  answer.classList.toggle("hidden", isOpen);
  toggle.setAttribute("aria-expanded", String(!isOpen));
  if (icon) icon.classList.toggle("rotate-180", !isOpen);
});

/* Called from main.js's router after the About fragment is injected
   (fresh innerHTML each swap, so this needs to re-run every time -
   see the route.page === "about" check in render()).

   Wires up aria-controls/aria-expanded on every toggle button so
   screen readers get the same open/closed signal sighted users get
   from the chevron rotation or revealed text. IDs are assigned here
   at runtime rather than hardcoded in the fragment, since the fragment
   has ~40 toggle/answer pairs and hand-numbering ids in the markup is
   an easy way to introduce a duplicate. */
function initAboutPage() {
  document.querySelectorAll("[data-faq-toggle], [data-translate-toggle]").forEach((toggle, i) => {
    const item = toggle.closest("[data-faq-item], [data-translate-item]");
    const answer = item ? item.querySelector("[data-faq-answer], [data-translate-answer]") : null;
    if (!answer) return;

    if (!answer.id) answer.id = `about-toggle-answer-${i}`;
    toggle.setAttribute("aria-controls", answer.id);
    toggle.setAttribute("aria-expanded", "false");
  });
}