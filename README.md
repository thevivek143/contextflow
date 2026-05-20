# ContextFlow

> AI Memory Layer for the Modern Web  
> Capture, organize, search, and reuse conversations across ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and more.

![ContextFlow Banner](https://raw.githubusercontent.com/thevivek143/contextflow/blob/main/icons/icon128.png)



# 🚀 What is ContextFlow?

ContextFlow is an advanced Chrome Extension that transforms fragmented AI chats into a structured, searchable, reusable knowledge system.

Instead of losing valuable prompts and conversations across different AI platforms, ContextFlow lets you:

- Save AI conversations instantly
- Create reusable context capsules
- Generate AI summaries & smart tags
- Search across conversations
- Visualize relationships using knowledge graphs
- Build your own persistent AI memory system

Think of it as:

- 🧠 AI Second Brain
- 📚 Prompt & Context Manager
- 🔍 AI Conversation Search Engine
- 🌐 Knowledge Graph for AI Chats
- ⚡ Browser-native AI Workspace

---

# ✨ Features

## 📥 AI Conversation Capture

Automatically capture conversations from:

- ChatGPT
- Claude
- Gemini
- Perplexity
- DeepSeek
- Microsoft Copilot
- More platforms coming soon...

---

## 🧠 Smart Capsules

Convert conversations into reusable capsules containing:

- Title
- Content
- Summary
- Tags
- Metadata
- Version history
- Favorites

---

## 🔎 Powerful Search

Find conversations instantly using:

- Keyword search
- Smart filtering
- Tags
- Usage history
- Favorites

---

## 🏷️ AI-Powered Summaries & Tags

ContextFlow automatically:

- Generates summaries
- Detects topics
- Creates smart tags
- Organizes conversations

---

## 🌐 Advanced Knowledge Graph

Visualize connections between conversations using:

- Force-directed graphs
- Circular layouts
- Radial views
- Relationship mapping
- Interactive nodes

---

## 📌 Clipboard & Context Management

Save and reuse:

- Prompts
- AI outputs
- Clipboard history
- Frequently used contexts

---

## ⚡ Local-First Architecture

Your data stays local.

- No mandatory cloud backend
- Browser-native storage
- Privacy-first approach
- Fast performance

---

# 🏗️ Architecture

```text
AI Platforms
(ChatGPT / Claude / Gemini)
            │
            ▼
Content Script Layer
(content.js)
            │
            ▼
Background Service Worker
(background.js)
            │
            ▼
Chrome Local Storage
            │
 ┌──────────┴──────────┐
 ▼                     ▼
Popup UI          Side Panel UI
            │
            ▼
Knowledge Graph Engine
```

---

# 📂 Project Structure

```bash
contextflow/
│
├── manifest.json
├── background.js
├── content.js
│
├── popup.html
├── popup.js
├── popup.css
│
├── sidepanel.html
├── sidepanel.js
├── sidepanel.css
│
├── graph-advanced.html
├── graph-advanced.js
├── graph-advanced.css
│
├── ml.js
├── ml-bundle.js
│
├── package.json
└── README.md
```

---

# 🛠️ Tech Stack

## Frontend
- HTML
- CSS
- JavaScript

## Browser Extension
- Chrome Extension Manifest V3

## AI / ML
- Xenova Transformers
- Local AI inference

## Visualization
- Interactive graph rendering
- Dynamic layouts

---

# 🔥 Why ContextFlow?

AI conversations today are:

- Temporary
- Scattered
- Hard to search
- Impossible to organize properly

ContextFlow solves this by creating a persistent AI memory layer across platforms.

---

# 🎯 Vision

We believe future AI workflows need:

- Persistent memory
- Cross-model context
- Reusable intelligence
- Knowledge navigation
- AI-native workspaces

ContextFlow is building that future.

---

# 📸 Screenshots

## Popup UI
(Add screenshot here)

## Side Panel
(Add screenshot here)

## Knowledge Graph
(Add screenshot here)

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/thevivek143/contextflow.git
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Load Extension in Chrome

1. Open Chrome
2. Go to:

```text
chrome://extensions/
```

3. Enable:

- Developer Mode

4. Click:

```text
Load unpacked
```

5. Select the project folder

---

# 🚧 Current Status

ContextFlow is currently in active development.

### Planned Features

- Semantic search
- Embeddings-based retrieval
- Cross-device sync
- Cloud backup
- AI agents memory
- Team collaboration
- Voice workflows
- Smart context injection
- Multi-browser support

---

# 🔐 Privacy

ContextFlow is designed with a privacy-first architecture.

- Data stored locally
- No mandatory external servers
- User-controlled storage

---

# 🤝 Contributing

Contributions are welcome.

If you'd like to improve ContextFlow:

1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a pull request

---

# ⭐ Support

If you like this project:

- Star the repository
- Share feedback
- Suggest features
- Contribute improvements

---

# 📜 License

MIT License

---

# 👨‍💻 Creator

Built by Vivek Vardhan

GitHub:
https://github.com/thevivek143

---

# 🌍 Future of AI Workflows Starts Here

ContextFlow aims to become the operating system layer for AI conversations and memory.
