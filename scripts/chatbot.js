/* Project K.I.L.O.S. — Chatbot Widget (site-wide, shell-level)
   Markup lives in index.html (launcher button + panel), mounted once
   and never re-created on route changes — same pattern as the welcome
   modal. This script only needs to run once on DOMContentLoaded; it
   does not need a per-page init like tracker.js/about.js, since its
   markup isn't part of any pages/*.html fragment.

   Talks only to /api/chat (Vercel Serverless Function — see
   api/chat.js and Project-KILOS-Chatbot-Plan.md). Never calls Gemini
   directly and never sees GEMINI_API_KEY.
*/

document.addEventListener("DOMContentLoaded", function () {
  const launcher = document.getElementById("chatbot-launcher");
  const panel = document.getElementById("chatbot-panel");
  const closeBtn = document.getElementById("chatbot-close-btn");
  const messagesEl = document.getElementById("chatbot-messages");
  const typingEl = document.getElementById("chatbot-typing");
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send-btn");

  if (!launcher || !panel || !form || !input) return; // markup missing; fail quiet

  // Kept short and resent each call, per the Chatbot Plan
  // ("History kept short and client-side, e.g. last 6-10 messages").
  // Matches api/chat.js's MAX_HISTORY_MESSAGES on the server side.
  const MAX_HISTORY_MESSAGES = 10;
  const history = []; // { role: "user" | "model", text: string }

  let isOpen = false;
  let isSending = false;
  let hasGreeted = false;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendMessage(role, text) {
    const bubble = document.createElement("div");
    const isUser = role === "user";

    bubble.className = isUser
      ? "self-end max-w-[85%] bg-primary text-on-primary font-body-md text-body-md px-3 py-2 rounded-xl rounded-br-sm whitespace-pre-wrap break-words"
      : "self-start max-w-[85%] bg-surface text-on-surface border border-outline-variant font-body-md text-body-md px-3 py-2 rounded-xl rounded-bl-sm whitespace-pre-wrap break-words";

    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function appendErrorMessage(text) {
    const bubble = document.createElement("div");
    bubble.className = "self-start max-w-[85%] bg-error-container text-on-error-container font-body-md text-body-md px-3 py-2 rounded-xl rounded-bl-sm whitespace-pre-wrap break-words";
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function setSending(sending) {
    isSending = sending;
    sendBtn.disabled = sending;
    input.disabled = sending;
    typingEl.classList.toggle("hidden", !sending);
    if (sending) scrollToBottom();
  }

  function openPanel() {
    isOpen = true;
    panel.classList.remove("hidden");
    panel.classList.add("flex");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    launcher.querySelector("#chatbot-launcher-icon").textContent = "close";

    if (!hasGreeted) {
      hasGreeted = true;
      appendMessage(
        "model",
        "Kumusta! Ako ang K.I.L.O.S. Assistant. Puwede kitang tulungan tungkol sa hypertension, DASH diet, o kung paano gamitin ang site na ito. Ano ang gusto mong itanong?"
      );
    }

    // Defer focus slightly so the panel's own transition/visibility
    // change doesn't fight the focus call on some mobile browsers.
    setTimeout(() => input.focus(), 50);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.add("hidden");
    panel.classList.remove("flex");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.querySelector("#chatbot-launcher-icon").textContent = "chat";
  }

  launcher.addEventListener("click", () => {
    if (isOpen) closePanel();
    else openPanel();
  });

  closeBtn.addEventListener("click", closePanel);

  // Auto-resize the textarea up to its max-h-24 cap.
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  });

  // Enter sends; Shift+Enter inserts a newline.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSending) return;

    const message = input.value.trim();
    if (!message) return;

    appendMessage("user", message);
    history.push({ role: "user", text: message });

    input.value = "";
    input.style.height = "auto";
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.slice(-MAX_HISTORY_MESSAGES)
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || typeof data.reply !== "string") {
        const errText = (data && data.error) || "Sorry, I couldn't respond right now.";
        appendErrorMessage(errText);
        setSending(false);
        return;
      }

      appendMessage("model", data.reply);
      history.push({ role: "model", text: data.reply });
    } catch (err) {
      console.error("Chatbot request failed:", err);
      appendErrorMessage("Sorry, I couldn't respond right now. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  });
});