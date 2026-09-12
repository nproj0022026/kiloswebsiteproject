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
  const suggestionsEl = document.getElementById("chatbot-suggestions");

  if (!launcher || !panel || !form || !input) return; // markup missing; fail quiet

  // Kept short and resent each call, per the Chatbot Plan
  // ("History kept short and client-side, e.g. last 6-10 messages").
  // Matches api/chat.js's MAX_HISTORY_MESSAGES on the server side.
  const MAX_HISTORY_MESSAGES = 10;
  const history = []; // { role: "user" | "model", text: string }

  // Shown once, attached to the greeting bubble, on first open only.
  // Tapping one sends it as if the user typed and submitted it.
  const SUGGESTED_QUESTIONS = [
    "Anong mga pagkain ang dapat kainin kung may hypertension?",
    "Anong ehersisyo ang ligtas para sa may hypertension?",
    "Ano ang gagawin kapag nakalimutan kong inumin ang gamot?"
  ];

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
      ? "self-end max-w-[85%] bg-primary text-on-primary font-body-md text-sm leading-snug px-3 py-2 rounded-xl rounded-br-sm whitespace-pre-wrap break-words"
      : "self-start max-w-[85%] bg-surface text-on-surface border border-outline-variant font-body-md text-sm leading-snug px-3 py-2 rounded-xl rounded-bl-sm whitespace-pre-wrap break-words";

    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  // Greeting is a normal message bubble in the scrolling list. The FAQ
  // suggestions live in the FIXED dock above the input (#chatbot-suggestions
  // in index.html) instead of the message list — so they read as an
  // attachment to the input box itself (like an autocomplete dropdown),
  // not another chat bubble that scrolls away.
  function appendGreetingWithSuggestions(greetingText) {
    appendMessage("model", greetingText);
    showSuggestions();
  }

  function showSuggestions() {
    if (!suggestionsEl || !SUGGESTED_QUESTIONS.length) return;

    suggestionsEl.innerHTML = "";
    SUGGESTED_QUESTIONS.forEach((question, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isLast = i === SUGGESTED_QUESTIONS.length - 1;
      btn.className = `text-left px-3 py-2 font-body-md text-sm leading-snug text-brand-maroon hover:bg-surface-container-low transition-colors ${isLast ? "" : "border-b border-outline-variant"}`;
      btn.textContent = question;
      btn.addEventListener("click", () => {
        hideSuggestions();
        sendMessage(question);
      });
      suggestionsEl.appendChild(btn);
    });

    suggestionsEl.classList.remove("hidden");
    suggestionsEl.classList.add("flex");
  }

  function hideSuggestions() {
    if (!suggestionsEl) return;
    suggestionsEl.classList.add("hidden");
    suggestionsEl.classList.remove("flex");
    suggestionsEl.innerHTML = "";
  }

  function appendErrorMessage(text) {
    const bubble = document.createElement("div");
    bubble.className = "self-start max-w-[85%] bg-error-container text-on-error-container font-body-md text-sm leading-snug px-3 py-2 rounded-xl rounded-bl-sm whitespace-pre-wrap break-words";
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
    // Fade/scale the FAB out instead of turning it into a second close
    // button — the panel's own header X is the single close affordance
    // while open, so there's never two visible "X"s at once.
    launcher.classList.add("opacity-0", "scale-75", "pointer-events-none");

    if (!hasGreeted) {
      hasGreeted = true;
      appendGreetingWithSuggestions(
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
    launcher.classList.remove("opacity-0", "scale-75", "pointer-events-none");
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

  // Shared send path for both the form submit and the FAQ suggestion
  // buttons, so a tapped suggestion behaves exactly like a typed
  // message (appended, sent, added to history) rather than duplicating
  // that logic in two places.
  async function sendMessage(message) {
    if (isSending || !message) return;

    hideSuggestions();
    appendMessage("user", message);
    history.push({ role: "user", text: message });

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
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    input.style.height = "auto";
    await sendMessage(message);
  });
});