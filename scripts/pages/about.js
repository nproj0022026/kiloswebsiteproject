/* Project K.I.L.O.S. - About Page Script (includes FAQ accordion) */

document.addEventListener("click", (e) => {
  const toggle = e.target.closest("[data-faq-toggle]");
  if (!toggle) return;

  const item = toggle.closest("[data-faq-item]");
  const answer = item.querySelector("[data-faq-answer]");
  const icon = item.querySelector("[data-faq-icon]");

  const isOpen = !answer.classList.contains("hidden");
  answer.classList.toggle("hidden", isOpen);
  icon.classList.toggle("rotate-180", !isOpen);
});