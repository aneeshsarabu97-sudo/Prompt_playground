/* ════════════════════════════════════════════════
   PROMPT PLAYGROUND — script.js
   Google Gemini API integration · Vanilla JavaScript
   ════════════════════════════════════════════════

   HOW TO USE:
   1. Replace YOUR_GEMINI_API_KEY below with your key from
      https://aistudio.google.com/app/apikey
   2. Open index.html in your browser
   3. Type a topic and click "Run Prompts"

   STRUCTURE:
   - CONFIG          → API key, model, settings
   - PROMPT BUILDERS → The 3 different prompt styles
   - API FUNCTION    → Reusable fetch() wrapper (Gemini)
   - DISPLAY         → DOM rendering helpers
   - CONSOLE LOGGER  → In-page debug console
   - MAIN RUNNER     → Orchestrates everything
   - HELPERS         → Utility functions
   ════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════
   SECTION 1: CONFIGURATION
   Paste your Google AI Studio key below.
   Get one free at: https://aistudio.google.com/app/apikey
══════════════════════════════════════════════════ */

const CONFIG = {
  API_KEY:   "AIzaSyA-8LmOIN1kYzBcxlK-ROrQH9_VDDJUiSE",   // ← Paste your Google AI Studio key here
  MODEL:     "gemini-2.5-flash-lite",      // Fast, capable Gemini model
  MAX_TOKENS: 2000,                    // Max output tokens per response

  // Gemini endpoint — API key is passed as a query param (not a header)
  get API_URL() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${this.API_KEY}`;
  }
};


/* ══════════════════════════════════════════════════
   SECTION 2: SMART PROMPT BUILDERS (DYNAMIC)
══════════════════════════════════════════════════ */

/**
 * Detect input type
 */
function detectType(input) {
  const text = input.toLowerCase();

  if (
    text.includes("code") ||
    text.includes("program") ||
    text.includes("c++") ||
    text.includes("java") ||
    text.includes("python")
  ) return "coding";

  if (
    text.includes("explain") ||
    text.includes("what is") ||
    text.includes("define")
  ) return "theory";

  return "general";
}


/**
 * BASIC PROMPT (dynamic)
 */
function buildBasicPrompt(input) {
  const type = detectType(input);

  if (type === "coding") {
    return `Write code for: ${input}`;
  }

  if (type === "theory") {
    return `Explain: ${input}`;
  }

  return `Answer the following: ${input}`;
}


/**
 * IMPROVED PROMPT (dynamic)
 */
function buildImprovedPrompt(input) {
  const type = detectType(input);

  if (type === "coding") {
    return `Write clean and efficient code for the following:
${input}

- Add comments
- Explain the logic briefly`;
  }

  if (type === "theory") {
    return `Explain the following in simple words:
${input}

- Use bullet points
- Give one example`;
  }

  return `Answer the following clearly:
${input}

- Keep it simple
- Add example if possible`;
}


/**
 * STRUCTURED PROMPT (dynamic)
 */
function buildStructuredPrompt(input) {
  const type = detectType(input);

  if (type === "coding") {
    return `Solve the following problem and return JSON:
{
  "code": "",
  "explanation": "",
  "time_complexity": ""
}

Problem: ${input}

Return ONLY JSON`;
  }

  if (type === "theory") {
    return `Explain in JSON format:
{
  "definition": "",
  "key_points": [],
  "example": ""
}

Topic: ${input}

Return ONLY JSON`;
  }

  return `Answer in JSON:
{
  "answer": "",
  "example": ""
}

Question: ${input}

Return ONLY JSON`;
}


/* ══════════════════════════════════════════════════
   SECTION 3: API CALL FUNCTION (Gemini)
   Calls the Google Gemini generateContent endpoint.
   Pass a different prompt each time.
══════════════════════════════════════════════════ */

/**
 * Calls the Google Gemini API with a given prompt.
 * This is a reusable async function — used 3 times in runPrompts().
 *
 * @param {string} promptText - The full prompt to send to the AI
 * @returns {Promise<string>} - The AI's text response
 */
async function callGemini(promptText) {

  console.log("📤 Sending Gemini API request...");
  console.log("   Prompt preview:", promptText.slice(0, 80) + "...");

  // Build the Gemini request body
  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: CONFIG.MAX_TOKENS
    }
  };

  // Make the HTTP POST request to Gemini
  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
      // Note: Gemini uses ?key= in the URL, NOT an Authorization header
    },
    body: JSON.stringify(requestBody)
  });

  console.log("📥 Gemini response status:", response.status, response.statusText);

  // If the server returned an error status (4xx, 5xx), throw an error
  if (!response.ok) {
    const errorData = await response.json();
    const errorMsg =
      errorData?.error?.message ||
      `HTTP error ${response.status}`;
    throw new Error(errorMsg);
  }

  // Parse the JSON response from Gemini
  const data = await response.json();

  console.log("✅ Gemini API call successful.");

  // Extract the text from Gemini's response structure:
  // data.candidates[0].content.parts[0].text
  const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!replyText) {
    throw new Error("No text content in Gemini response. Check the console for details.");
  }

  return replyText;
}


/* ══════════════════════════════════════════════════
   SECTION 4: DISPLAY HELPERS
   These functions update the DOM to show different
   states: loading, result, and error.
══════════════════════════════════════════════════ */

/**
 * Shows an animated loading state inside an output panel.
 * @param {string} elementId - The id of the output-body div
 * @param {string} label     - "basic", "improved", or "structured"
 */
function showLoading(elementId, label) {
  const el = document.getElementById(elementId);
  el.innerHTML = `
    <div class="loading-state">
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
      <div class="loading-text">Analyzing with ${label} prompt...</div>
    </div>
  `;
}

/**
 * Displays the AI text response in an output panel.
 * If the output is structured (JSON), renders it as formatted JSON.
 * @param {string} elementId  - The id of the output-body div
 * @param {string} text       - The raw text from the API
 * @param {boolean} isJson    - Whether to try rendering as formatted JSON
 */
function showResult(elementId, text, isJson = false) {
  const el = document.getElementById(elementId);

  if (isJson) {
    // Strip ALL markdown code fences Gemini may add (```json, ```JSON, ``` etc.)
    // Also handles cases where there's text before/after the JSON block
    let cleaned = text.trim();

    // Extract content from inside a code fence if present
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    } else {
      // No fences — strip any leading/trailing backtick lines just in case
      cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      const pretty  = JSON.stringify(parsed, null, 2);
      el.innerHTML = `<pre class="output-json">${escapeHtml(pretty)}</pre>`;
      consoleLog("success", "Structured JSON parsed successfully.");
    } catch (e) {
      console.warn("⚠️ Structured output was not valid JSON:", e.message);
      consoleLog("warn", "Structured output was not valid JSON — showing raw text.");
      el.innerHTML = `
        <div class="output-error" style="margin-bottom:0.8rem">
          ⚠️ Response was not valid JSON. Showing raw output:
        </div>
        <div class="output-text">${escapeHtml(text)}</div>
      `;
    }
  } else {
    // Plain text output
    el.innerHTML = `<div class="output-text">${escapeHtml(text)}</div>`;
  }
}

/**
 * Displays an error message in an output panel.
 * @param {string} elementId - The id of the output-body div
 * @param {string} message   - The error message to show
 */
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  el.innerHTML = `
    <div class="output-error">
      ❌ <strong>Error:</strong> ${escapeHtml(message)}
      <br><br>
      <span style="opacity:0.7;">Check your API key and internet connection. Open the browser console (F12) for details.</span>
    </div>
  `;
}

/**
 * Resets an output panel back to its placeholder state.
 * @param {string} elementId - The id of the output-body div
 */
function showPlaceholder(elementId) {
  const el = document.getElementById(elementId);
  el.innerHTML = `
    <div class="output-placeholder">
      <div class="placeholder-icon">💬</div>
      <p>Output will appear here after you run the prompts.</p>
    </div>
  `;
}


/* ══════════════════════════════════════════════════
   SECTION 5: IN-PAGE CONSOLE LOGGER
   Logs messages to the visible debug console panel
   AND to the browser's real console (F12).
══════════════════════════════════════════════════ */

/**
 * Adds a log line to the in-page debug console panel.
 * @param {"info"|"success"|"warn"|"error"|"log"} level - Log level
 * @param {string} message - The message to log
 */
function consoleLog(level, message) {
  const realConsole = {
    info:    console.info,
    success: console.log,
    warn:    console.warn,
    error:   console.error,
    log:     console.log
  };
  (realConsole[level] || console.log)(`[${level.toUpperCase()}] ${message}`);

  const consoleBody = document.getElementById("consoleBody");
  const line = document.createElement("div");
  line.className = `console-line console-${level}`;

  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour12: false });
  line.textContent = `[${time}] ${message}`;

  consoleBody.appendChild(line);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

/**
 * Clears all lines from the in-page console panel.
 */
function clearConsole() {
  const consoleBody = document.getElementById("consoleBody");
  consoleBody.innerHTML = '<div class="console-line console-info">Console cleared.</div>';
  console.clear();
}


/* ══════════════════════════════════════════════════
   SECTION 6: MAIN RUNNER FUNCTION
   This is called when the user clicks "Run Prompts".
   It orchestrates all 3 API calls in parallel.
══════════════════════════════════════════════════ */

/**
 * Main function — triggered by the "Run Prompts" button.
 * Reads input, fires 3 Gemini API calls in parallel, displays results.
 */
async function runPrompts() {
  // ── Step 1: Get user input ──
  const input = document.getElementById("userInput").value.trim();

  if (!input) {
    consoleLog("warn", "No input provided. Please type a topic first.");
    flashInput();
    return;
  }

  consoleLog("info", `▶ Starting prompt run for: "${input}"`);

  // ── Step 2: UI — set running state ──
  setRunningState(true);
  setStatusDot(true);

  // ── Step 3: Show loading in all 3 panels ──
  showLoading("output-basic",      "Basic");
  showLoading("output-improved",   "Improved");
  showLoading("output-structured", "Structured");

  // ── Step 4: Build the 3 prompts ──
  const basicPrompt      = buildBasicPrompt(input);
  const improvedPrompt   = buildImprovedPrompt(input);
  const structuredPrompt = buildStructuredPrompt(input);

  consoleLog("log", "📝 Basic prompt built.");
  consoleLog("log", "🎯 Improved prompt built.");
  consoleLog("log", "🗂 Structured prompt built.");

  // ── Step 5: Fire all 3 Gemini API calls in parallel ──
  consoleLog("info", "Sending 3 Gemini API requests in parallel...");

  const [basicResult, improvedResult, structuredResult] = await Promise.allSettled([
    callGemini(basicPrompt),
    callGemini(improvedPrompt),
    callGemini(structuredPrompt)
  ]);

  // ── Step 6: Display results ──

  // --- Basic ---
  if (basicResult.status === "fulfilled") {
    consoleLog("success", "Basic prompt: response received ✓");
    showResult("output-basic", basicResult.value, false);
  } else {
    consoleLog("error", `Basic prompt failed: ${basicResult.reason.message}`);
    showError("output-basic", basicResult.reason.message);
  }

  // --- Improved ---
  if (improvedResult.status === "fulfilled") {
    consoleLog("success", "Improved prompt: response received ✓");
    showResult("output-improved", improvedResult.value, false);
  } else {
    consoleLog("error", `Improved prompt failed: ${improvedResult.reason.message}`);
    showError("output-improved", improvedResult.reason.message);
  }

  // --- Structured (JSON) ---
  if (structuredResult.status === "fulfilled") {
    consoleLog("success", "Structured prompt: response received ✓");
    showResult("output-structured", structuredResult.value, true);  // isJson = true
  } else {
    consoleLog("error", `Structured prompt failed: ${structuredResult.reason.message}`);
    showError("output-structured", structuredResult.reason.message);
  }

  // ── Step 7: Restore UI ──
  setRunningState(false);
  setStatusDot(false);
  consoleLog("success", "All prompts complete! ✅");
}


/* ══════════════════════════════════════════════════
   SECTION 7: UTILITY / HELPER FUNCTIONS
══════════════════════════════════════════════════ */

function setRunningState(isRunning) {
  const btn     = document.getElementById("runBtn");
  const icon    = document.getElementById("runBtnIcon");
  const btnText = document.getElementById("runBtnText");

  btn.disabled        = isRunning;
  icon.textContent    = isRunning ? "⏳" : "▶";
  btnText.textContent = isRunning ? "Running..." : "Run Prompts";
}

function setStatusDot(isRunning) {
  const dot = document.getElementById("statusDot");
  if (isRunning) {
    dot.classList.add("running");
    dot.title = "Running...";
  } else {
    dot.classList.remove("running");
    dot.title = "Idle";
  }
}

function flashInput() {
  const ta = document.getElementById("userInput");
  ta.style.outline   = "2px solid rgba(239, 68, 68, 0.6)";
  ta.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.12)";
  setTimeout(() => {
    ta.style.outline   = "";
    ta.style.boxShadow = "";
  }, 800);
  ta.focus();
}

function updateCounter() {
  const ta    = document.getElementById("userInput");
  const count = document.getElementById("charCounter");
  count.textContent = `${ta.value.length} / 500`;
}

function fillExample(text) {
  const ta = document.getElementById("userInput");
  ta.value = text;
  updateCounter();
  ta.focus();
  consoleLog("log", `Example loaded: "${text}"`);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}


/* ══════════════════════════════════════════════════
   SECTION 8: INIT
══════════════════════════════════════════════════ */

console.log("=== Prompt Playground loaded (Gemini edition) ===");
console.log("Model:", CONFIG.MODEL);
console.log("Tip: Replace YOUR_GEMINI_API_KEY in CONFIG to enable live calls.");

consoleLog("info", `Model: ${CONFIG.MODEL} · Ready.`);

if (CONFIG.API_KEY === "YOUR_GEMINI_API_KEY") {
  consoleLog("warn", "API key not set. Paste your Google AI Studio key into script.js.");
} else {
  consoleLog("success", "Gemini API key detected. Live mode active.");
}