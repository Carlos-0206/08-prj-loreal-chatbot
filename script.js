/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Keep the conversation focused on L'Oréal topics.
const systemPrompt =
  "You are a L'Oréal beauty assistant. Only answer questions about L'Oréal products, beauty routines, and product recommendations. If the user asks about anything else, politely say you can only help with L'Oréal-related topics.";

// Store the conversation so each new request includes prior turns.
const conversationHistory = [];

// Get the API URL from secrets.js.
const apiUrl = window.OPENAI_API_URL || "";

function addMessage(text, type) {
  const message = document.createElement("div");
  message.className = `msg ${type}`;
  message.textContent = text;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Set initial message
addMessage("👋 Hello! How can I help you today?", "ai");

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const messageText = userInput.value.trim();

  if (!messageText) {
    return;
  }

  if (!apiUrl) {
    addMessage(
      "Set OPENAI_API_URL in secrets.js to connect this page to your Cloudflare Worker.",
      "ai"
    );
    return;
  }

  // Show the user's message right away.
  addMessage(messageText, "user");
  conversationHistory.push({ role: "user", content: messageText });
  userInput.value = "";

  // Build the messages array for OpenAI.
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
  ];

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Something went wrong.");
    }

    const assistantMessage = data.choices[0].message.content;
    addMessage(assistantMessage, "ai");
    conversationHistory.push({ role: "assistant", content: assistantMessage });
  } catch (error) {
    addMessage(
      "I couldn't reach the API right now. Check your worker URL and try again.",
      "ai"
    );
    console.error(error);
  }

  userInput.focus();
});
