# ContextFlow - Advanced AI Context Manager

A powerful Chrome extension that captures, organizes, and reuses AI conversations with advanced features like auto-summarization, smart tagging, and interactive knowledge graphs.

## 🚀 Features

### Core Features
- **Capture Conversations** - Save AI conversations from ChatGPT, Claude, Gemini, and more
- **Smart Organization** - Organize capsules with folders and tags
- **Search & Filter** - Full-text search across all capsules
- **Auto-Summarization** - AI-powered summaries of conversations
- **Auto-Tagging** - Intelligent tag suggestions
- **Duplicate Detection** - Avoid saving similar content
- **Usage Tracking** - Track how often you use each capsule
- **Drag & Drop** - Inject capsules into AI chats easily

### Advanced Knowledge Graph
- **3D Visualization** - Explore your knowledge in 3D space
- **Multiple Layouts** - Force-directed, Hierarchical, Circular, Radial, Grid
- **Visual Effects** - Particle effects, glow, gradients, arrows
- **Smooth Animations** - Professional transitions
- **Real-time Statistics** - Node and connection analytics

### Export Options
- **Export as JSON** - Structured data format
- **Export as TXT** - Human-readable format

## 🎯 Supported Platforms

- ChatGPT (chat.openai.com, chatgpt.com)
- Claude (claude.ai)
- Google Gemini (gemini.google.com)
- Perplexity AI (perplexity.ai)
- DeepSeek (deepseek.com)
- Microsoft Copilot (copilot.microsoft.com)
- Gmail (gmail.com)

## 📦 Installation

### From Source (Development)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/contextflow.git
cd contextflow
```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" (top right)

4. Click "Load unpacked" and select the project folder

5. The ContextFlow icon should appear in your extensions toolbar

### From Chrome Web Store

Coming soon!

## 🎮 Usage

### Capturing Conversations

1. Visit any supported AI platform (ChatGPT, Claude, etc.)
2. Have a conversation
3. Click the ContextFlow extension icon
4. Click "+ New Capsule" to capture the current page
5. The conversation is saved with auto-generated summary and tags

### Organizing Capsules

- **Folders** - Organize by project or topic
- **Tags** - Add multiple tags for better searchability
- **Favorites** - Star important capsules for quick access
- **Search** - Find capsules by title, content, or tags

### Using Capsules

1. Click a capsule to copy it to clipboard
2. Paste into any AI chat with Ctrl+V
3. Or drag capsules directly into chat inputs

### Viewing Knowledge Graph

1. Click the "📊 Graph" button
2. Explore your knowledge visually
3. Try different layouts and effects
4. Click nodes to see details

## 📁 Project Structure

```
contextflow/
├── manifest.json           # Extension configuration
├── background.js           # Service worker
├── content.js             # Content script
├── content.css            # Content styles
├── popup.html             # Popup UI
├── popup.js               # Popup logic
├── popup.css              # Popup styles
├── sidepanel.html         # Side panel UI
├── sidepanel.js           # Side panel logic
├── sidepanel.css          # Side panel styles
├── graph-advanced.html    # Knowledge graph UI
├── graph-advanced.js      # Graph logic
├── graph-advanced.css     # Graph styles
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── LICENSE
```

## 🔧 Development

### Requirements
- Chrome/Chromium browser
- Text editor or IDE
- Git (for version control)

### Building for Distribution

1. **Chrome Web Store:**
   - Zip the project folder
   - Go to Chrome Web Store Developer Dashboard
   - Upload the zip file
   - Fill in store listing details

2. **Firefox Add-ons:**
   - Update manifest.json for Firefox compatibility
   - Submit to Firefox Add-ons store

3. **Edge Add-ons:**
   - Update manifest.json for Edge compatibility
   - Submit to Microsoft Edge Add-ons

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Bug Reports

Found a bug? Please open an issue with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

## 🎉 Acknowledgments

- Inspired by Capsule Hub
- Built with modern web technologies
- Icons from system design

---

**Made with ❤️ for the AI community**

**Version 1.2.0**
