/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");

// Keep the conversation focused on L'Oréal topics.
const systemPrompt =
  "You are a L'Oréal beauty assistant. Only answer questions about L'Oréal products, beauty routines, and product recommendations. If the user asks about anything else, politely say you can only help with L'Oréal-related topics.";

// Store the conversation so each new request includes prior turns.
const conversationHistory = [];

// Store lightweight user context for more natural multi-turn responses.
const userProfile = {
  name: "",
};

const userQuestions = [];

// Read the API URL from secrets.js when needed.
function getApiUrl() {
  const configuredUrl = (window.OPENAI_API_URL || "").trim();

  // Keep validation simple for beginners: require a secure URL.
  if (!configuredUrl || !configuredUrl.startsWith("https://")) {
    return "";
  }

  return configuredUrl;
}

function addMessage(text, type) {
  const message = document.createElement("div");
  message.className = `msg ${type}`;
  message.textContent = text;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractUserName(text) {
  // Basic beginner-friendly patterns for common name introductions.
  const patterns = [
    /my name is\s+([a-zA-Z][a-zA-Z\s'-]{0,30})/i,
    /i am\s+([a-zA-Z][a-zA-Z\s'-]{0,30})/i,
    /i'm\s+([a-zA-Z][a-zA-Z\s'-]{0,30})/i,
    /call me\s+([a-zA-Z][a-zA-Z\s'-]{0,30})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanedName = match[1].trim().replace(/[.,!?]+$/g, "");
      return toTitleCase(cleanedName);
    }
  }

  return "";
}

function buildConversationContext() {
  const contextParts = [];

  if (userProfile.name) {
    contextParts.push(`The user's name is ${userProfile.name}.`);
  }

  if (userQuestions.length > 0) {
    const recentQuestions = userQuestions.slice(-5).join(" | ");
    contextParts.push(`Recent user questions: ${recentQuestions}`);
  }

  if (contextParts.length === 0) {
    return "";
  }

  return `${contextParts.join(" ")} Use this context to respond naturally across turns.`;
}

function setLatestQuestion(questionText) {
  latestQuestion.textContent = `Latest question: ${questionText}`;
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

  // Show the latest user question above the chat responses.
  setLatestQuestion(messageText);

  // Update context memory from the current user message.
  const detectedName = extractUserName(messageText);
  if (detectedName) {
    userProfile.name = detectedName;
  }

  userQuestions.push(messageText);

  const apiUrl = getApiUrl();

  if (!apiUrl) {
    addMessage(
      "Set OPENAI_API_URL in secrets.js to connect this page to your Cloudflare Worker.",
      "ai",
    );
    return;
  }

  // Show the user's message right away.
  addMessage(messageText, "user");
  conversationHistory.push({ role: "user", content: messageText });
  userInput.value = "";

  // Build the messages array for OpenAI.
  const messages = [{ role: "system", content: systemPrompt }];

  const conversationContext = buildConversationContext();
  if (conversationContext) {
    messages.push({ role: "system", content: conversationContext });
  }

  messages.push(...conversationHistory);

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
      "ai",
    );
    console.error(error);
  }

  userInput.focus();
});
