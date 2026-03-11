// Shared helpers
function $(selector, scope = document) {
  return scope.querySelector(selector);
}

function $all(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function setYear() {
  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// Theme (light / dark) handling
const THEME_KEY = "promptvault_theme";

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = $(".pv-theme-toggle");
  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀" : "🌙";
    toggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }
}

function initTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// Navigation toggle for mobile + theme button
function initNav() {
  const toggle = $(".pv-nav-toggle");
  const navLinks = $(".pv-nav-links");
  if (!toggle || !navLinks) return;

  toggle.addEventListener("click", () => {
    navLinks.classList.toggle("is-open");
  });

  const themeBtn = $(".pv-theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }
}

// Clipboard helpers
function copyPrompt(text) {
  if (!navigator.clipboard) {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    alert("Prompt copied!");
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => alert("Prompt copied!"))
    .catch(() => alert("Unable to copy prompt."));
}

// Vault (localStorage) helpers
const VAULT_KEY = "promptvault_vault";

function readVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Simple AI-like suggester that recommends prompts
// based on what the user types (keyword similarity).
async function initAISuggester() {
  const body = document.body;
  if (!body) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "pv-btn pv-ai-toggle";
  toggle.textContent = "Ask Prompt AI";

  const panel = document.createElement("section");
  panel.className = "pv-ai-panel";
  panel.innerHTML = `
    <header class="pv-ai-header">
      <h2>Prompt Suggestions</h2>
      <button type="button" class="pv-btn pv-btn-secondary pv-ai-close">Close</button>
    </header>
    <div class="pv-ai-body">
      <p class="pv-ai-message">
        Describe what you want help with (e.g. "I need help planning my exam revision" or "I am writing an essay"). I’ll suggest the best prompts from the library.
      </p>
    </div>
    <div class="pv-ai-input">
      <textarea
        rows="2"
        placeholder="What do you want to do with AI?"
      ></textarea>
      <button type="button" class="pv-btn">Suggest</button>
    </div>
  `;

  body.appendChild(toggle);
  body.appendChild(panel);

  const closeBtn = panel.querySelector(".pv-ai-close");
  const textarea = panel.querySelector("textarea");
  const suggestBtn = panel.querySelector(".pv-ai-input .pv-btn");
  const bodyEl = panel.querySelector(".pv-ai-body");

  function togglePanel() {
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open") && textarea) {
      textarea.focus();
    }
  }

  toggle.addEventListener("click", togglePanel);
  closeBtn?.addEventListener("click", togglePanel);

  const prompts = await loadPromptData();

  function scorePrompt(prompt, query) {
    const text = `${prompt.title} ${prompt.category} ${prompt.prompt} ${
      prompt.description || ""
    }`.toLowerCase();
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    let score = 0;
    for (const word of words) {
      if (text.includes(word)) score += 1;
    }
    return score;
  }

  function handleSuggest() {
    const query = textarea.value.trim();
    if (!query) return;

    // Rank existing prompts by keyword overlap
    let ranked = prompts
      .map((p) => ({ prompt: p, score: scorePrompt(p, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Special handling for essay-style requests so:
    // "I need to write an essay on AI" produces
    // a clear, tailored essay-writing prompt.
    const lowerQuery = query.toLowerCase();
    const looksLikeEssay =
      lowerQuery.includes("essay") || lowerQuery.includes("write");

    if (looksLikeEssay) {
      let topic = "";
      const match = lowerQuery.match(/\b(?:on|about)\s+(.+)/);
      if (match && match[1]) {
        topic = match[1].trim();
      }

      const customEssayPrompt = {
        title: "Custom Essay Writer",
        category: "Writing",
        prompt: `Act as an academic essay writer and help me write a clear, well-structured essay about ${
          topic || "the topic I give you"
        }. Start by proposing an outline (introduction, 2–3 main body paragraphs, conclusion), then help me draft each section step by step.`,
        description:
          "Best for assignments where you need a complete essay with structure and guidance.",
        userCreated: false,
      };

      ranked = [{ prompt: customEssayPrompt, score: 999 }, ...ranked].slice(
        0,
        3
      );
    }

    bodyEl.innerHTML = "";

    if (ranked.length === 0) {
      const msg = document.createElement("p");
      msg.className = "pv-ai-message";
      msg.textContent =
        "I could not find a close match. Try using a few more keywords like “essay”, “coding”, “study”, or “research”.";
      bodyEl.appendChild(msg);
      return;
    }

    const intro = document.createElement("p");
    intro.className = "pv-ai-message";
    intro.textContent = "Here are some prompts that match what you typed:";
    bodyEl.appendChild(intro);

    ranked.forEach(({ prompt }) => {
      const card = document.createElement("article");
      card.className = "pv-ai-suggestion";
      card.innerHTML = `
        <div class="pv-ai-suggestion-title">${prompt.title}</div>
        <div class="pv-ai-suggestion-category">${prompt.category || "Uncategorized"}</div>
        <p class="pv-meta">${prompt.prompt}</p>
        <div class="pv-ai-suggestion-actions">
          <button class="pv-btn pv-btn-secondary" data-action="copy">Copy</button>
          <button class="pv-btn" data-action="save">Save</button>
        </div>
      `;

      card.querySelector('[data-action="copy"]').addEventListener("click", () => {
        copyPrompt(prompt.prompt);
      });
      card.querySelector('[data-action="save"]').addEventListener("click", () => {
        savePromptToVault(prompt);
      });

      bodyEl.appendChild(card);
    });
  }

  suggestBtn?.addEventListener("click", handleSuggest);
  textarea?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSuggest();
    }
  });
}
function writeVault(items) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(items));
}

function savePromptToVault(prompt) {
  const vault = readVault();
  vault.push(prompt);
  writeVault(vault);
  alert("Prompt saved to your vault!");
}

function removePromptFromVault(index) {
  const vault = readVault();
  vault.splice(index, 1);
  writeVault(vault);
}

// Built-in fallback prompt data so the app works even
// when running directly from the filesystem (where fetch can fail)
const DEFAULT_PROMPTS = [
  {
    title: "Essay Writer",
    category: "Writing",
    prompt:
      "Act as an academic essay writer and help me write an essay about climate change.",
  },
  {
    title: "Study Notes",
    category: "Study",
    prompt: "Explain this topic in simple bullet points.",
  },
  {
    title: "Coding Debugger",
    category: "Coding",
    prompt:
      "Act as a senior software engineer and help me debug the following code. Explain what is wrong and propose a fix.",
  },
  {
    title: "Research Assistant",
    category: "Research",
    prompt:
      "Help me research this topic by outlining key questions, sources to check, and a short summary of the current state of knowledge.",
  },
  {
    title: "Productivity Coach",
    category: "Productivity",
    prompt:
      "Act as a productivity coach and help me design a realistic study schedule for the next 7 days based on my tasks.",
  },
  {
    title: "Language Tutor",
    category: "Language Learning",
    prompt:
      "Help me practice this language by creating example sentences, short dialogues, and simple quizzes around the topic I give you.",
  },
];

// Load prompt data from JSON (with fallback)
async function loadPromptData() {
  try {
    const res = await fetch("data/prompts.json");
    if (!res.ok) throw new Error("Failed to load prompts.json");
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return DEFAULT_PROMPTS;
    }
    return data;
  } catch (e) {
    console.warn("Falling back to built-in prompt data.", e);
    return DEFAULT_PROMPTS;
  }
}

// Library page
async function initLibraryPage() {
  const grid = $("#promptGrid");
  if (!grid) return;

  const searchInput = $("#searchInput");
  const categoryFilter = $("#categoryFilter");
  const emptyState = $("#emptyState");

  const basePrompts = await loadPromptData();

  // Also include user-submitted prompts in library view
  const userPrompts = readVault().map((p) => ({ ...p, fromVault: true }));
  const allPrompts = [...basePrompts, ...userPrompts];

  const categories = Array.from(
    new Set(allPrompts.map((p) => p.category).filter(Boolean))
  ).sort();

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  function renderList() {
    const term = (searchInput.value || "").toLowerCase();
    const cat = categoryFilter.value;

    const filtered = allPrompts.filter((p) => {
      const matchesCategory = !cat || p.category === cat;
      const textBlob = `${p.title} ${p.category} ${p.prompt} ${p.description || ""}`.toLowerCase();
      const matchesSearch = !term || textBlob.includes(term);
      return matchesCategory && matchesSearch;
    });

    grid.innerHTML = "";
    emptyState.hidden = filtered.length > 0;

    filtered.forEach((prompt) => {
      const card = document.createElement("article");
      card.className = "pv-card";
      card.innerHTML = `
        <h3>${prompt.title}</h3>
        <p class="pv-meta">${prompt.category || "Uncategorized"}</p>
        <p>${prompt.description || ""}</p>
        <pre class="pv-meta">${prompt.prompt}</pre>
        <div class="pv-card-footer">
          <button class="pv-btn pv-btn-secondary" data-action="copy">Copy</button>
          <button class="pv-btn" data-action="save">Save</button>
        </div>
      `;

      card.querySelector('[data-action="copy"]').addEventListener("click", () => {
        copyPrompt(prompt.prompt);
      });
      card.querySelector('[data-action="save"]').addEventListener("click", () => {
        savePromptToVault(prompt);
      });

      grid.appendChild(card);
    });
  }

  searchInput.addEventListener("input", renderList);
  categoryFilter.addEventListener("change", renderList);

  renderList();
}

// Categories page
async function initCategoriesPage() {
  const grid = $("#categoryGrid");
  if (!grid) return;

  const prompts = await loadPromptData();
  const categories = Array.from(
    new Set(prompts.map((p) => p.category).filter(Boolean))
  );

  categories.forEach((cat) => {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-category-chip">
        <span>${
          cat === "Study"
            ? "📚"
            : cat === "Writing"
            ? "✍"
            : cat === "Coding"
            ? "💻"
            : cat === "Research"
            ? "🔍"
            : cat === "Productivity"
            ? "⏱"
            : cat === "Language Learning"
            ? "🌐"
            : "✨"
        }</span>
        <span>${cat}</span>
      </div>
      <h3>${cat} prompts</h3>
      <p class="pv-meta">Browse ${cat.toLowerCase()} prompts in the library.</p>
      <div class="pv-card-footer">
        <a class="pv-btn pv-btn-secondary" href="library.html?category=${encodeURIComponent(
          cat
        )}">View ${cat}</a>
      </div>
    `;
    grid.appendChild(card);
  });

  // If the library page is opened with a category query param, library.js will handle filtering
}

// Submit page
function initSubmitPage() {
  const form = $("#submitForm");
  if (!form) return;

  const message = $("#submitMessage");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#title").value.trim();
    const category = $("#category").value.trim();
    const promptText = $("#promptText").value.trim();
    const description = $("#description").value.trim();

    if (!title || !category || !promptText) {
      message.textContent = "Please fill in all required fields.";
      message.className = "pv-message pv-message--error";
      return;
    }

    savePromptToVault({
      title,
      category,
      prompt: promptText,
      description,
      userCreated: true,
    });

    message.textContent = "Prompt saved! You can find it in your vault and library.";
    message.className = "pv-message pv-message--success";
    form.reset();
  });
}

// Vault page
function initVaultPage() {
  const list = $("#vaultList");
  if (!list) return;

  const emptyState = $("#vaultEmptyState");

  function renderVault() {
    const items = readVault();
    list.innerHTML = "";
    emptyState.style.display = items.length ? "none" : "block";

    items.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "pv-card-row";
      row.innerHTML = `
        <div class="pv-card-row-header">
          <div>
            <div class="pv-card-row-title">${item.title}</div>
            <div class="pv-meta">${item.category || "Uncategorized"}</div>
          </div>
          <div class="pv-card-row-actions">
            <button class="pv-btn pv-btn-secondary" data-action="copy">Copy</button>
            <button class="pv-btn" data-action="remove">Remove</button>
          </div>
        </div>
        ${
          item.description
            ? `<p class="pv-meta">${item.description}</p>`
            : ""
        }
        <pre class="pv-meta">${item.prompt}</pre>
      `;

      row.querySelector('[data-action="copy"]').addEventListener("click", () => {
        copyPrompt(item.prompt);
      });

      row.querySelector('[data-action="remove"]').addEventListener("click", () => {
        if (confirm("Remove this prompt from your vault?")) {
          removePromptFromVault(index);
          renderVault();
        }
      });

      list.appendChild(row);
    });
  }

  renderVault();
}

// Automatically apply category filter if present in query string (used from Categories page)
function applyCategoryFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  if (!category) return;

  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.value = category;
    const event = new Event("change");
    categoryFilter.dispatchEvent(event);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setYear();
  initNav();
  initLibraryPage().then(applyCategoryFromQuery);
  initCategoriesPage();
  initSubmitPage();
  initVaultPage();
  initAISuggester();
});

