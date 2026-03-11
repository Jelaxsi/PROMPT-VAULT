# PROMPT-VAULT

PromptVault is a simple, responsive web app where students can **discover, copy, save, and organize AI prompts** for studying, essay writing, coding, and research.

Built with **HTML, CSS, and vanilla JavaScript** – no backend required.

---

## Features

- **Multi-page UI**
  - **Landing page** with hero, feature cards, and CTAs.
  - **Prompt Library** with search, category filter, and responsive card grid.
  - **Categories** overview with chips (Study, Writing, Coding, Research, Productivity, Language Learning).
  - **Submit Prompt** page for adding your own prompts.
  - **My Vault** page listing all saved prompts.

- **Prompt actions**
  - **Copy** prompts to clipboard with one click.
  - **Save** prompts into **localStorage**.
  - View, copy, and remove prompts from **My Vault**.

- **AI Helper**
  - Floating **“Ask Prompt AI”** button on every page.
  - Type what you need (e.g. _“I need to write an essay on AI”_).
  - Suggests the best matching prompts from the library (plus a custom essay prompt for essay-like queries).
  - Suggestions can be **copied** or **saved** directly.

- **Theming & UI**
  - **Light / Dark mode** toggle in the navbar with preference stored in localStorage.
  - Glass-style cards, subtle background gradients, and entrance animations.
  - Mobile-friendly navbar with hamburger menu.
  - Accessible focus styles and semantic markup.

---

## Tech Stack

- **HTML5** – static pages
- **CSS3** – responsive layout, theming, animations
- **JavaScript (ES6+)** – interactivity, localStorage, AI-like suggestions
- **JSON** – initial prompt data (`data/prompts.json`)

No frameworks or build tools are required.

---

## Project Structure

```text
promptvault/
├── index.html          # Landing page
├── library.html        # Prompt Library
├── categories.html     # Categories overview
├── submit.html         # Submit Prompt
├── vault.html          # My Vault (saved prompts)
│
├── css/
│   └── styles.css      # Global styles & theming
│
├── js/
│   └── app.js          # App logic, AI helper, localStorage
│
├── data/
│   └── prompts.json    # Example prompt data
│
└── assets/
    └── icon.svg        # App icon / favicon
