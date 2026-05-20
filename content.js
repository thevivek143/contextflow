// Content script for ContextFlow - Injected into AI chat pages

let captureButton = null;
let dragOverlay = null;
let selectionMenu = null;

// Settings Cache
let userSettings = {
  chatgptPro: false,
  claudePro: false,
  geminiPro: false
};

// Initialize on page load
function initialize() {
  try {
    console.log('ContextFlow: Initializing on', window.location.hostname);
    
    const platform = detectPlatform();
    console.log('ContextFlow: Detected platform:', platform);
    
    // Load Settings
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get({
        chatgptPro: false,
        claudePro: false,
        geminiPro: false
      }, (items) => {
        userSettings = items;
      });
      
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
          if (changes.chatgptPro) userSettings.chatgptPro = changes.chatgptPro.newValue;
          if (changes.claudePro) userSettings.claudePro = changes.claudePro.newValue;
          if (changes.geminiPro) userSettings.geminiPro = changes.geminiPro.newValue;
        }
      });
    }
    
    // Wait a bit for the page to fully load
    setTimeout(() => {
      try {
        injectAdvancedDock();
        setupDragAndDrop();
        // setupSelectionCapture(); // Disabled per user request to remove selection capture feature
        observePageChanges();
        setupClipboardInterceptor();
        console.log('ContextFlow: Advanced features initialized successfully');
      } catch (error) {
        console.error('ContextFlow: Error during initialization:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('ContextFlow: Fatal initialization error:', error);
  }
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function showRefreshNotice() {
  if (document.getElementById('cf-refresh-notice')) return;

  const notice = document.createElement('div');
  notice.id = 'cf-refresh-notice';
  notice.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 320px;
    background: rgba(9, 9, 11, 0.95);
    backdrop-filter: blur(16px);
    border: 1px solid #ef4444;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    padding: 16px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fafafa;
    animation: cfNoticeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes cfNoticeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .cf-notice-reload-btn {
      background: #fafafa !important;
      color: #09090b !important;
      border: none !important;
      padding: 8px 16px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      margin-top: 12px !important;
      width: 100% !important;
      text-align: center !important;
    }
    .cf-notice-reload-btn:hover {
      background: #e4e4e7 !important;
    }
  `;
  document.head.appendChild(styleSheet);

  notice.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: flex-start;">
      <div style="font-size: 18px; color: #ef4444;">⚠️</div>
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 600; color: #fafafa; margin-bottom: 4px;">ContextFlow Link Interrupted</div>
        <div style="font-size: 11px; color: #a1a1aa; line-height: 1.4;">The extension was reloaded or updated. Please refresh this tab to reconnect.</div>
        <button class="cf-notice-reload-btn" onclick="window.location.reload()">Reload Tab</button>
      </div>
      <button style="background: none; border: none; color: #71717a; font-size: 12px; cursor: pointer; padding: 0 4px;" onclick="this.closest('#cf-refresh-notice').remove()">✕</button>
    </div>
  `;

  document.body.appendChild(notice);
}

function safeSendMessage(message, callback) {
  if (!chrome.runtime || !chrome.runtime.id) {
    showRefreshNotice();
    if (callback) {
      try { callback({ success: false, error: 'context_invalidated' }); } catch(e) {}
    }
    return;
  }
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message.includes("context invalidated")) {
          showRefreshNotice();
        } else {
          console.warn("Message error:", chrome.runtime.lastError);
        }
        if (callback) {
          try { callback({ success: false, error: chrome.runtime.lastError.message }); } catch(e) {}
        }
      } else if (callback) {
        try { callback(response); } catch(e) {}
      }
    });
  } catch (e) {
    if (e.message.includes("context invalidated")) {
      showRefreshNotice();
    } else {
      console.error("Failed to send message:", e);
    }
    if (callback) {
      try { callback({ success: false, error: e.message }); } catch(e) {}
    }
  }
}

function safeStorageLocalGet(keys, callback) {
  if (!chrome.storage || !chrome.storage.local) {
    showRefreshNotice();
    if (callback) callback({});
    return;
  }
  try {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message.includes("context invalidated")) {
          showRefreshNotice();
        }
        if (callback) callback({});
      } else if (callback) {
        callback(result);
      }
    });
  } catch (e) {
    if (e.message.includes("context invalidated")) {
      showRefreshNotice();
    } else {
      console.error("Failed to get storage:", e);
    }
    if (callback) callback({});
  }
}

// Detect which AI platform we're on
function detectPlatform() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) return 'ChatGPT';
  if (hostname.includes('claude.ai')) return 'Claude';
  if (hostname.includes('gemini.google.com')) return 'Gemini';
  if (hostname.includes('perplexity.ai')) return 'Perplexity';
  if (hostname.includes('deepseek.com')) return 'DeepSeek';
  if (hostname.includes('mail.google.com')) return 'Gmail';
  if (hostname.includes('copilot.microsoft.com')) return 'Copilot';
  
  return 'Unknown';
}

// The Advanced Dock replaces the old capture button and token tracker
let dockElement = null;
let activeInputElement = null;

function injectAdvancedDock() {
  if (dockElement) return;
  
  dockElement = document.createElement('div');
  dockElement.id = 'contextflow-advanced-dock';
  
  dockElement.innerHTML = `
    <div class="cf-dock-container">
      <div class="cf-dock-section cf-capture-btn" title="Capture Context">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <span>Capture</span>
      </div>
      <div class="cf-dock-divider"></div>
      <div class="cf-dock-section cf-memory-btn" title="Quick Inject Memory">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        <span>Inject</span>
      </div>
      <div class="cf-dock-divider"></div>
      <div class="cf-dock-section cf-agent-btn" title="Run Autonomous Workflows">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12 2.1 7.1"></path><path d="M12 12l9.9 4.9"></path></svg>
        <span>Agents</span>
      </div>
      <div class="cf-dock-divider"></div>
      <div class="cf-dock-section cf-clipboard-btn" title="Clipboard History (Win+V Style)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        <span>Clipboard</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(dockElement);
  
  // Event listeners
  dockElement.querySelector('.cf-capture-btn').addEventListener('click', handleCapture);
  dockElement.querySelector('.cf-memory-btn').addEventListener('click', showQuickMemoryMenu);
  dockElement.querySelector('.cf-agent-btn').addEventListener('click', showAgentMenu);
  dockElement.querySelector('.cf-clipboard-btn').addEventListener('click', toggleClipboardPanel);
  
  // Start the positioning and tracking engine
  startDockEngine();
}

// Engine for buttery smooth positioning and tracking
let lastTextContent = null;

function startDockEngine() {
  // Check for input less frequently to save CPU
  setInterval(() => {
    findActiveInput();
  }, 500);

  // Position updates smoothly
  const updatePosition = () => {
    positionDock();
    requestAnimationFrame(updatePosition);
  };
  requestAnimationFrame(updatePosition);
}

function findActiveInput() {
  const platform = detectPlatform();
  const selectors = {
    'ChatGPT': ['#prompt-textarea', 'textarea[placeholder*="Message"]', 'textarea', '[contenteditable="true"]'],
    'Claude': ['[contenteditable="true"]', 'div[role="textbox"]', '.ProseMirror'],
    'Gemini': ['.ql-editor', '[contenteditable="true"]', 'textarea'],
    'Perplexity': ['textarea', '[contenteditable="true"]'],
    'DeepSeek': ['.chat-input', 'textarea', '[contenteditable="true"]'],
    'Copilot': ['#userInput', 'textarea', '[contenteditable="true"]']
  };
  
  const platformSelectors = selectors[platform] || ['textarea', '[contenteditable="true"]'];
  
  for (const selector of platformSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      activeInputElement = el;
      return;
    }
  }
  activeInputElement = null;
}

function positionDock() {
  if (!dockElement) return;
  
  dockElement.style.position = 'fixed';
  dockElement.style.zIndex = '999999';
  dockElement.style.opacity = '1';
  dockElement.style.pointerEvents = 'auto';

  // Always keep it rightside bottom
  dockElement.style.top = 'auto';
  dockElement.style.bottom = '24px';
  dockElement.style.left = 'auto';
  dockElement.style.right = '24px';
}

function updateMessageCount() {
  const platform = detectPlatform();
  let count = 0;
  
  try {
    if (platform === 'ChatGPT') {
      count = document.querySelectorAll('[data-message-author-role="user"]').length;
    } else if (platform === 'Claude') {
      // Claude specific class estimation
      count = document.querySelectorAll('.font-user-message').length || 
              Math.floor(document.querySelectorAll('[data-test-render-count]').length / 2);
    } else {
      // Generic fallback
      const elements = document.querySelectorAll('article, .message, .chat-message, .message-content');
      count = Math.floor(elements.length / 2);
    }
    
    // Also try to detect explicit "limit" warnings
    const pageText = document.body.innerText;
    const limitMatch = pageText.match(/(\d+)\s+messages?\s+(left|remaining)/i);
    let limitWarning = '';
    if (limitMatch && limitMatch[1]) {
      limitWarning = ' (' + limitMatch[1] + ' left!)';
    }
    
    const msgEl = document.getElementById('cf-messages-count');
    if (msgEl) {
      msgEl.textContent = count + limitWarning;
    }
  } catch (e) {}
}

function showQuickMemoryMenu() {
  const existing = document.getElementById('cf-quick-inject-menu');
  if (existing) {
    existing.remove();
    return;
  }
  
  // Fetch capsules from storage
  safeStorageLocalGet(['capsules'], (result) => {
    const capsules = Object.values(result.capsules || {});
    renderQuickInjectMenu(capsules);
  });
}

function renderQuickInjectMenu(capsules) {
  const menu = document.createElement('div');
  menu.id = 'cf-quick-inject-menu';
  
  let capsulesHtml = '';
  if (capsules.length === 0) {
    capsulesHtml = '<div class="cf-empty-menu">No memories captured yet.</div>';
  } else {
    // Show top 8 most recent
    const recent = capsules.slice(0, 8);
    recent.forEach((cap) => {
      const preview = cap.content.length > 60 ? cap.content.substring(0, 60) + '...' : cap.content;
      capsulesHtml += `
        <div class="cf-menu-item" data-id="${cap.id}">
          <div class="cf-menu-title">${cap.title || 'Untitled Memory'}</div>
          <div class="cf-menu-preview">${preview}</div>
        </div>
      `;
    });
  }
  
  menu.innerHTML = `
    <div class="cf-menu-header">
      <span>Inject Memory</span>
      <input type="text" id="cf-quick-search" placeholder="Search memories...">
    </div>
    <div class="cf-menu-list">
      ${capsulesHtml}
    </div>
  `;
  
  document.body.appendChild(menu);
  
  // Position it right above the dock
  const dock = document.getElementById('contextflow-advanced-dock');
  if (dock) {
    menu.style.bottom = '80px';
    menu.style.right = '24px';
  }
  
  // Add click listeners to inject
  menu.querySelectorAll('.cf-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const capsule = capsules.find(c => c.id === id);
      if (capsule) {
        injectTextToActiveInput(`[Context: ${capsule.title}]\n${capsule.content}\n\n`);
        menu.remove();
      }
    });
  });
  
  // Search filtering
  const searchInput = menu.querySelector('#cf-quick-search');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    menu.querySelectorAll('.cf-menu-item').forEach(item => {
      const id = item.getAttribute('data-id');
      const capsule = capsules.find(c => c.id === id);
      if (capsule) {
        const matches = (capsule.title && capsule.title.toLowerCase().includes(term)) || 
                        (capsule.content && capsule.content.toLowerCase().includes(term));
        item.style.display = matches ? 'block' : 'none';
      }
    });
  });
  
  // Focus the search input automatically
  searchInput.focus();
  
  // Click outside to close
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && (!dock || !dock.contains(e.target))) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

function injectTextToActiveInput(text) {
  if (!activeInputElement) return;
  
  try {
    // Focus the element first
    activeInputElement.focus();
    
    // Attempt execCommand first (best for Prosemirror / ContentEditable like Claude)
    const success = document.execCommand('insertText', false, text);
    
    // Fallback for standard Textareas (like older ChatGPT or other sites)
    if (!success && (activeInputElement.tagName.toLowerCase() === 'textarea' || activeInputElement.tagName.toLowerCase() === 'input')) {
      const start = activeInputElement.selectionStart;
      const end = activeInputElement.selectionEnd;
      const currentText = activeInputElement.value;
      
      activeInputElement.value = currentText.substring(0, start) + text + currentText.substring(end);
      
      // Trigger React/Vue input events
      activeInputElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeInputElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    showNotification('Memory injected!', 'success');
  } catch (error) {
    console.error('ContextFlow: Injection failed', error);
    showNotification('Failed to inject memory', 'error');
  }
}

// === EXPORT ENGINE ===
function exportChatToMarkdown() {
  const platform = detectPlatform();
  let chatElements = [];
  let markdown = `# Chat Export - ${platform}\nDate: ${new Date().toLocaleString()}\n\n`;
  
  if (platform === 'ChatGPT') {
    chatElements = Array.from(document.querySelectorAll('[data-message-author-role]'));
    chatElements.forEach(el => {
      const role = el.getAttribute('data-message-author-role');
      const text = el.innerText || el.textContent;
      if (role === 'user') {
        markdown += `### 👤 You:\n${text}\n\n---\n\n`;
      } else {
        markdown += `### 🤖 ChatGPT:\n${text}\n\n---\n\n`;
      }
    });
  } else if (platform === 'Claude') {
    chatElements = Array.from(document.querySelectorAll('.font-user-message, .font-claude-message'));
    chatElements.forEach(el => {
      const isUser = el.classList.contains('font-user-message');
      const text = el.innerText || el.textContent;
      if (isUser) {
        markdown += `### 👤 You:\n${text}\n\n---\n\n`;
      } else {
        markdown += `### 🤖 Claude:\n${text}\n\n---\n\n`;
      }
    });
  } else {
    // Fallback: Just grab the whole body
    markdown += `### Content:\n${document.body.innerText}`;
  }

  if (chatElements.length === 0) {
    showNotification('No chat messages found to export.', 'error');
    return;
  }

  // Download as file
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ContextFlow-Export-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Chat Exported to Markdown!', 'success');
}

// === AUTONOMOUS AGENT ENGINE ===
function showAgentMenu() {
  const existing = document.getElementById('cf-agent-menu');
  if (existing) {
    existing.remove();
    return;
  }
  
  const menu = document.createElement('div');
  menu.id = 'cf-agent-menu';
  
  menu.innerHTML = `
    <div class="cf-menu-header">
      <span>🤖 Run AI Agent Workflow</span>
    </div>
    <div class="cf-menu-list">
      <div class="cf-menu-item cf-agent-action" data-prompt="Please review the entire conversation above and extract a concise checklist of all TODOs and action items. Format as markdown checkboxes.">
        <div class="cf-menu-title">☑️ Extract TODOs</div>
        <div class="cf-menu-preview">Auto-generates an action item checklist</div>
      </div>
      <div class="cf-menu-item cf-agent-action" data-prompt="Please convert the core insights from this conversation into a highly engaging, viral 5-part Twitter/X thread.">
        <div class="cf-menu-title">🐦 Social Repurpose</div>
        <div class="cf-menu-preview">Transforms chat into a viral thread</div>
      </div>
      <div class="cf-menu-item cf-agent-action" data-prompt="Please generate professional meeting minutes based on this conversation, highlighting decisions made and next steps.">
        <div class="cf-menu-title">📄 Meeting Notes</div>
        <div class="cf-menu-preview">Creates formal meeting documentation</div>
      </div>
      <div class="cf-menu-item cf-export-action">
        <div class="cf-menu-title">💾 Export as Markdown</div>
        <div class="cf-menu-preview">Downloads chat to a clean .md file</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(menu);
  
  const dock = document.getElementById('contextflow-advanced-dock');
  if (dock) {
    menu.style.bottom = '80px';
    menu.style.right = '24px';
  }
  
  menu.querySelectorAll('.cf-agent-action').forEach(item => {
    item.addEventListener('click', (e) => {
      const prompt = e.currentTarget.getAttribute('data-prompt');
      runAgentWorkflow(prompt);
      menu.remove();
    });
  });

  menu.querySelector('.cf-export-action').addEventListener('click', () => {
    exportChatToMarkdown();
    menu.remove();
  });
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && (!dock || !dock.contains(e.target))) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

function runAgentWorkflow(promptText) {
  // 1. Inject text
  injectTextToActiveInput(promptText);
  
  // 2. Auto submit after a tiny delay
  setTimeout(() => {
    const platform = detectPlatform();
    let sendBtn = null;
    
    if (platform === 'ChatGPT') {
      sendBtn = document.querySelector('[data-testid="send-button"]');
    } else if (platform === 'Claude') {
      sendBtn = document.querySelector('button[aria-label="Send Message"]');
    }
    
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      showNotification('Agent Workflow Initiated!', 'success');
    } else {
      showNotification('Prompt ready. Press Enter to run.', 'info');
    }
  }, 300);
}

// Handle capture button click
async function handleCapture() {
  const platform = detectPlatform();
  const content = extractConversation(platform);
  
  if (!content) {
    showNotification('No conversation found to capture', 'error');
    return;
  }
  
  // Show capture dialog
  showCaptureDialog(content, platform);
}

// Extract conversation based on platform
function extractConversation(platform) {
  let messages = [];
  
  switch (platform) {
    case 'ChatGPT':
      messages = extractChatGPT();
      break;
    case 'Claude':
      messages = extractClaude();
      break;
    case 'Gemini':
      messages = extractGemini();
      break;
    case 'Perplexity':
      messages = extractPerplexity();
      break;
    case 'DeepSeek':
      messages = extractDeepSeek();
      break;
    case 'Gmail':
      messages = extractGmail();
      break;
    case 'Copilot':
      messages = extractCopilot();
      break;
  }
  
  return messages.length > 0 ? messages.join('\n\n') : null;
}

// Platform-specific extractors
function extractChatGPT() {
  const messages = [];
  
  // Try multiple selectors for ChatGPT (they change their DOM frequently)
  const selectors = [
    '[data-message-author-role]',
    '.text-message',
    '[class*="message"]',
    'article',
    '.group'
  ];
  
  let messageElements = null;
  for (const selector of selectors) {
    messageElements = document.querySelectorAll(selector);
    if (messageElements.length > 0) break;
  }
  
  if (messageElements && messageElements.length > 0) {
    messageElements.forEach(el => {
      const role = el.getAttribute('data-message-author-role') || 'message';
      const text = el.textContent.trim();
      if (text && text.length > 10) { // Filter out very short text
        messages.push(`[${role}]: ${text}`);
      }
    });
  }
  
  // Fallback: get all text from main content area
  if (messages.length === 0) {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      const text = mainContent.textContent.trim();
      if (text) {
        messages.push(text);
      }
    }
  }
  
  return messages;
}

function extractClaude() {
  const messages = [];
  const messageElements = document.querySelectorAll('[data-test-render-count]');
  
  messageElements.forEach(el => {
    const text = el.textContent.trim();
    if (text) {
      messages.push(text);
    }
  });
  
  return messages;
}

function extractGemini() {
  const messages = [];
  const messageElements = document.querySelectorAll('.conversation-container message-content');
  
  messageElements.forEach(el => {
    const text = el.textContent.trim();
    if (text) {
      messages.push(text);
    }
  });
  
  return messages;
}

function extractPerplexity() {
  const messages = [];
  const messageElements = document.querySelectorAll('[class*="message"]');
  
  messageElements.forEach(el => {
    const text = el.textContent.trim();
    if (text && text.length > 10) {
      messages.push(text);
    }
  });
  
  return messages;
}

function extractDeepSeek() {
  const messages = [];
  const messageElements = document.querySelectorAll('.chat-message');
  
  messageElements.forEach(el => {
    const text = el.textContent.trim();
    if (text) {
      messages.push(text);
    }
  });
  
  return messages;
}

function extractGmail() {
  const subject = document.querySelector('.hP')?.textContent || '';
  const body = document.querySelector('.a3s')?.textContent || '';
  
  return subject || body ? [`Subject: ${subject}`, body] : [];
}

function extractCopilot() {
  const messages = [];
  const messageElements = document.querySelectorAll('.message-content');
  
  messageElements.forEach(el => {
    const text = el.textContent.trim();
    if (text) {
      messages.push(text);
    }
  });
  
  return messages;
}

// Show capture dialog
function showCaptureDialog(content, platform) {
  // Prevent duplicate dialogs
  if (document.getElementById('contextflow-dialog')) {
    document.getElementById('contextflow-dialog').remove();
  }

  const dialog = document.createElement('div');
  dialog.id = 'contextflow-dialog';
  dialog.innerHTML = `
    <div class="contextflow-dialog-content">
      <div class="contextflow-dialog-header">
        <h2>Save Capsule</h2>
        <button class="contextflow-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="contextflow-dialog-body">
        <div class="cf-input-group">
          <label>Title</label>
          <input type="text" id="capsule-title" placeholder="e.g. Database Architecture Discussion" />
        </div>
        <div class="cf-input-group">
          <label>Content</label>
          <textarea id="capsule-content" rows="8">${content}</textarea>
        </div>
        <div class="cf-row">
          <div class="cf-input-group">
            <label>Tags</label>
            <input type="text" id="capsule-tags" placeholder="react, design, database" />
          </div>
          <div class="cf-input-group">
            <label>Folder</label>
            <select id="capsule-folder">
              <option value="Uncategorized">Uncategorized</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="Product">Product</option>
            </select>
          </div>
        </div>
        <label class="cf-checkbox-wrapper">
          <input type="checkbox" id="capsule-favorite" />
          <span>Mark as favorite</span>
        </label>
        <div class="contextflow-dialog-actions">
          <button id="cancel-capsule" class="cf-btn-secondary">Cancel</button>
          <button id="save-capsule" class="cf-btn-primary">Save to Knowledge</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Event listeners
  dialog.querySelector('.contextflow-close').addEventListener('click', () => dialog.remove());
  dialog.querySelector('#cancel-capsule').addEventListener('click', () => dialog.remove());
  dialog.querySelector('#save-capsule').addEventListener('click', async () => {
    await saveCapsuleFromDialog(platform);
    dialog.remove();
  });
}

// Save capsule from dialog
async function saveCapsuleFromDialog(platform) {
  const dialog = document.getElementById('contextflow-dialog');
  if (!dialog) {
    showNotification('Capture dialog was closed before saving', 'error');
    return;
  }

  const titleEl = dialog.querySelector('#capsule-title');
  const contentEl = dialog.querySelector('#capsule-content');
  const tagsEl = dialog.querySelector('#capsule-tags');
  const folderEl = dialog.querySelector('#capsule-folder');
  const favoriteEl = dialog.querySelector('#capsule-favorite');

  if (!contentEl) {
    showNotification('Capture dialog content element not found', 'error');
    return;
  }

  const title = titleEl ? titleEl.value : '';
  const content = contentEl.value;
  const tags = tagsEl ? tagsEl.value.split(',').map(t => t.trim()).filter(t => t) : [];
  const folder = folderEl ? folderEl.value : 'Uncategorized';
  const favorite = favoriteEl ? favoriteEl.checked : false;

  if (!content || content.trim().length === 0) {
    showNotification('Cannot save empty capsule', 'error');
    return;
  }

  const capsule = {
    title: title || `${platform} Conversation - ${new Date().toLocaleDateString()}`,
    content,
    tags,
    folder,
    favorite,
    platform,
    url: window.location.href
  };

  return new Promise((resolve) => {
    safeSendMessage({ action: 'saveCapsule', capsule }, (response) => {
      if (response && response.success) {
        if (response.isDuplicate) {
          showNotification('Already saved in Knowledge! (Duplicate)', 'info');
        } else {
          showNotification('Capsule saved successfully!', 'success');
        }
      } else {
        const errMsg = (response && response.error) ? `Failed: ${response.error}` : 'Failed to save capsule';
        showNotification(errMsg, 'error');
      }
      resolve();
    });
  });
}


// Setup drag and drop functionality
function setupDragAndDrop() {
  // Listen for drag events from extension
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('drop', handleDrop);
}

function handleDragOver(e) {
  e.preventDefault();
  
  // Check if dragging a capsule
  if (e.dataTransfer.types.includes('application/contextflow-capsule')) {
    e.dataTransfer.dropEffect = 'copy';
    
    // Show drop zone indicator
    if (!dragOverlay) {
      dragOverlay = document.createElement('div');
      dragOverlay.id = 'contextflow-drop-overlay';
      dragOverlay.textContent = 'Drop capsule here to inject context';
      document.body.appendChild(dragOverlay);
    }
  }
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (dragOverlay) {
    dragOverlay.remove();
    dragOverlay = null;
  }
  
  const capsuleData = e.dataTransfer.getData('application/contextflow-capsule');
  if (capsuleData) {
    try {
      const capsule = JSON.parse(capsuleData);
      injectCapsule(capsule);
    } catch (error) {
      console.error('ContextFlow: Error parsing capsule data', error);
      showNotification('Error loading capsule', 'error');
    }
  }
}

// Inject capsule content into chat input
function injectCapsule(capsule) {
  const platform = detectPlatform();
  let inputElement = null;
  
  // Try multiple selectors for each platform
  const selectors = {
    'ChatGPT': [
      '#prompt-textarea',
      'textarea[placeholder*="Message"]',
      'textarea',
      '[contenteditable="true"]'
    ],
    'Claude': [
      '[contenteditable="true"]',
      'div[role="textbox"]',
      '.ProseMirror'
    ],
    'Gemini': [
      '.ql-editor',
      '[contenteditable="true"]',
      'textarea'
    ],
    'Perplexity': [
      'textarea',
      '[contenteditable="true"]'
    ],
    'DeepSeek': [
      '.chat-input',
      'textarea',
      '[contenteditable="true"]'
    ],
    'Copilot': [
      '#userInput',
      'textarea',
      '[contenteditable="true"]'
    ]
  };
  
  // Try each selector for the current platform
  const platformSelectors = selectors[platform] || ['textarea', '[contenteditable="true"]'];
  
  for (const selector of platformSelectors) {
    inputElement = document.querySelector(selector);
    if (inputElement) break;
  }
  
  if (inputElement) {
    const contextText = `[Context from capsule: ${capsule.title}]\n\n${capsule.content}\n\n`;
    
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      inputElement.value = contextText + (inputElement.value || '');
      // Trigger input event for React/Vue apps
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // For contenteditable elements
      inputElement.textContent = contextText + (inputElement.textContent || '');
      // Trigger input event
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputElement);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    inputElement.focus();
    showNotification('Capsule injected successfully!', 'success');
    
    // Track usage
    safeSendMessage({
      action: 'trackUsage',
      capsuleId: capsule.id
    });
  } else {
    showNotification('Could not find input field. Try copying to clipboard instead.', 'error');
    
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(capsule.content).then(() => {
      showNotification('Capsule copied to clipboard! Paste it manually.', 'info');
    });
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `contextflow-notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Observe page changes for dynamic content
function observePageChanges() {
  const observer = new MutationObserver(() => {
    if (!document.getElementById('contextflow-advanced-dock')) {
      injectAdvancedDock();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   // if (request.action === 'captureSelection') {
//   //   showCaptureDialog(request.text, detectPlatform());
//   //   sendResponse({ success: true });
//   // }
  
  if (request.action === 'capturePage') {
    handleCapture();
    sendResponse({ success: true });
  }
});

// Auto-detect if the user is on a Free or Pro/Plus subscription
function detectSubscriptionTier(platform) {
  try {
    const pageText = document.body.innerText.toLowerCase();
    
    if (platform === 'ChatGPT') {
      // Look for explicit upgrade buttons
      if (pageText.includes('upgrade plan') || document.querySelector('a[href*="/#pricing"]')) {
        return 'Free';
      }
      // Look for Pro indicators
      if (pageText.includes('chatgpt plus') || pageText.includes('chatgpt team') || pageText.includes('chatgpt enterprise')) {
        return 'Pro';
      }
      // If no explicit signals, assume Free as a safe fallback
      return 'Free';
    }
    
    if (platform === 'Claude') {
      if (pageText.includes('upgrade to claude pro')) {
        return 'Free';
      }
      if (pageText.includes('claude pro')) {
        return 'Pro';
      }
      return 'Free';
    }
    
    if (platform === 'Gemini') {
      if (pageText.includes('upgrade to gemini advanced') || pageText.includes('try gemini advanced')) {
        return 'Free';
      }
      if (pageText.includes('gemini advanced')) {
        return 'Pro';
      }
      return 'Free';
    }
  } catch (e) {
    console.error('ContextFlow: Error detecting tier', e);
  }
  
  return 'Free';
}

function updateTokenTracker() {
  if (!document.getElementById('contextflow-advanced-dock')) return;
  
  let text = '';
  
  // If we have an active input, get its text
  if (activeInputElement) {
    text = activeInputElement.value !== undefined ? activeInputElement.value : (activeInputElement.textContent || '');
  }
  
  // Skip DOM updates if text hasn't changed
  if (text === lastTextContent) return;
  lastTextContent = text;
  
  const platform = detectPlatform();
  let tier = detectSubscriptionTier(platform);
  
  // Apply manual Settings overrides
  if (platform === 'ChatGPT' && userSettings.chatgptPro) tier = 'Pro';
  if (platform === 'Claude' && userSettings.claudePro) tier = 'Pro';
  if (platform === 'Gemini' && userSettings.geminiPro) tier = 'Pro';
  
  // Simple token approximation: ~4 characters per token
  const tokensUsed = Math.ceil(text.length / 4);
  
  // Intelligent Limits: Adjust context window based on Auto-Detected Tier
  let maxTokens = 8192;
  if (platform === 'ChatGPT') {
    maxTokens = tier === 'Pro' ? 128000 : 32000;
  } else if (platform === 'Claude') {
    maxTokens = tier === 'Pro' ? 200000 : 100000; // Claude Free has a variable dynamic limit, but 100k is a safe visual proxy
  } else if (platform === 'Gemini') {
    maxTokens = tier === 'Pro' ? 1048576 : 32000; // 1M for Advanced, 32k for Standard
  } else if (platform === 'DeepSeek') {
    maxTokens = 64000;
  }
  
  const remaining = Math.max(0, maxTokens - tokensUsed);

  const usedEl = document.getElementById('cf-tokens-used');
  const remEl = document.getElementById('cf-tokens-remaining');
  const dotEl = document.getElementById('cf-status-dot');
  
  if (usedEl) usedEl.textContent = tokensUsed > 1000 ? (tokensUsed / 1000).toFixed(1) + 'k' : tokensUsed;
  if (remEl) {
    remEl.textContent = (remaining >= 1000 ? (remaining / 1000).toFixed(1) + 'k' : remaining) + (tier === 'Pro' ? ' ⭐' : '');
    remEl.title = `Detected Tier: ${tier}`;
  }
  if (dotEl) {
    const usagePercent = tokensUsed / maxTokens;
    if (usagePercent > 0.9) {
      dotEl.style.backgroundColor = '#ef4444'; // Red danger
    } else if (usagePercent > 0.7) {
      dotEl.style.backgroundColor = '#f59e0b'; // Yellow warning
    } else {
      dotEl.style.backgroundColor = '#10b981'; // Green success
    }
  }
}

// Listen for messages from the popup or Neural Memory Tree
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'injectMemory' && request.capsule) {
    const textToInject = `[Context: ${request.capsule.title || 'Memory'}]\n${request.capsule.content}\n\n`;
    injectTextToActiveInput(textToInject);
    sendResponse({ success: true });
  }
  return true;
});

// === OS COMMAND PALETTE (CMD+K / CTRL+K) ===
let paletteCapsules = [];
let paletteSelectedIndex = 0;

document.addEventListener('keydown', (e) => {
  // Trigger on Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault(); // Prevent browser search focus
    openCommandPalette();
  }
});

function openCommandPalette() {
  if (document.getElementById('cf-command-palette')) return;
  
  safeStorageLocalGet(['capsules'], (result) => {
    paletteCapsules = Object.values(result.capsules || {});
    paletteSelectedIndex = 0;
    
    const palette = document.createElement('div');
    palette.id = 'cf-command-palette';
    palette.innerHTML = `
      <div class="cf-palette-overlay"></div>
      <div class="cf-palette-modal">
        <div class="cf-palette-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="cf-palette-search" placeholder="Search Memory OS..." autocomplete="off" spellcheck="false">
          <div class="cf-palette-badge">CMD+K</div>
        </div>
        <div class="cf-palette-results" id="cf-palette-results">
          <!-- Populated dynamically -->
        </div>
        <div class="cf-palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>Enter</kbd> to inject</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(palette);
    
    const searchInput = document.getElementById('cf-palette-search');
    searchInput.focus();
    
    renderPaletteResults('');
    
    // Search input listener
    searchInput.addEventListener('input', (e) => {
      paletteSelectedIndex = 0;
      renderPaletteResults(e.target.value.toLowerCase());
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      const resultsEl = document.getElementById('cf-palette-results');
      const items = resultsEl.querySelectorAll('.cf-palette-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (paletteSelectedIndex < items.length - 1) {
          paletteSelectedIndex++;
          updatePaletteSelection();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (paletteSelectedIndex > 0) {
          paletteSelectedIndex--;
          updatePaletteSelection();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeItem = items[paletteSelectedIndex];
        if (activeItem) {
          activeItem.click();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeCommandPalette();
      }
    });
    
    // Click outside to close
    palette.querySelector('.cf-palette-overlay').addEventListener('click', closeCommandPalette);
  });
}

function closeCommandPalette() {
  const palette = document.getElementById('cf-command-palette');
  if (palette) palette.remove();
}

function renderPaletteResults(term) {
  const resultsEl = document.getElementById('cf-palette-results');
  let filtered = paletteCapsules;
  
  if (term) {
    filtered = filtered.filter(c => 
      (c.title && c.title.toLowerCase().includes(term)) || 
      (c.content && c.content.toLowerCase().includes(term)) ||
      (c.folder && c.folder.toLowerCase().includes(term))
    );
  }
  
  filtered = filtered.slice(0, 8); // Show top 8
  
  if (filtered.length === 0) {
    resultsEl.innerHTML = '<div class="cf-palette-empty">No neural memories found matching your query.</div>';
    return;
  }
  
  resultsEl.innerHTML = filtered.map((cap, index) => {
    const preview = cap.content.length > 80 ? cap.content.substring(0, 80) + '...' : cap.content;
    return `
      <div class="cf-palette-item ${index === 0 ? 'selected' : ''}" data-id="${cap.id}" data-index="${index}">
        <div class="cf-palette-item-icon">📄</div>
        <div class="cf-palette-item-content">
          <div class="cf-palette-item-title">${cap.title || 'Untitled Memory'} <span class="cf-palette-item-folder">${cap.folder || ''}</span></div>
          <div class="cf-palette-item-preview">${preview}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Add click listeners
  resultsEl.querySelectorAll('.cf-palette-item').forEach(item => {
    // Mouse hover updates selection
    item.addEventListener('mouseenter', (e) => {
      paletteSelectedIndex = parseInt(e.currentTarget.getAttribute('data-index'));
      updatePaletteSelection();
    });
    
    item.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const capsule = paletteCapsules.find(c => c.id === id);
      if (capsule) {
        injectTextToActiveInput(`[Context: ${capsule.title || 'Memory'}]\n${capsule.content}\n\n`);
        closeCommandPalette();
      }
    });
  });
}

function updatePaletteSelection() {
  const items = document.querySelectorAll('.cf-palette-item');
  items.forEach((item, index) => {
    if (index === paletteSelectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Helper to convert base64 Data URL to a native File object
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// Find hidden file input for AI platforms
function findFileInputForPlatform() {
  const platform = detectPlatform();
  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  if (fileInputs.length === 0) return null;
  
  if (activeInputElement) {
    const container = activeInputElement.closest('form') || activeInputElement.closest('div') || document;
    const localInput = container.querySelector('input[type="file"]');
    if (localInput) return localInput;
  }
  
  return fileInputs[0];
}

// Inject copied image programmatically
function injectImageToPlatform(dataUrl) {
  try {
    const platform = detectPlatform();
    const mimeMatch = dataUrl.match(/data:(image\/\w+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const ext = mime.split('/')[1] || 'png';
    const filename = `cf-upload-${Date.now()}.${ext}`;
    
    const file = dataURLtoFile(dataUrl, filename);
    const fileInput = findFileInputForPlatform();
    
    if (fileInput) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      showNotification('Image uploaded successfully!', 'success');
      return true;
    } else {
      console.warn('ContextFlow: Could not find file input element');
      if (activeInputElement) {
        activeInputElement.focus();
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer
        });
        activeInputElement.dispatchEvent(pasteEvent);
        showNotification('Image pasted successfully!', 'success');
        return true;
      }
    }
  } catch (error) {
    console.error('ContextFlow: Error during image injection:', error);
  }
  showNotification('Failed to upload image.', 'error');
  return false;
}

// Setup clipboard copy interceptor
function setupClipboardInterceptor() {
  document.addEventListener('copy', (e) => {
    let imageCaptured = false;

    // Try synchronous extraction of clipboard images first
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            imageCaptured = true;
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target.result;
              safeSendMessage({
                action: 'saveClipboardItem',
                item: {
                  text: '[Copied Image]',
                  image: dataUrl,
                  url: window.location.href,
                  title: document.title
                }
              }, (response) => {
                const panel = document.getElementById('cf-clipboard-history-panel');
                if (panel && !panel.classList.contains('cf-hidden')) {
                  renderClipboardHistoryPanel();
                }
              });
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }

    // Fallback to text copy if no image was captured
    if (!imageCaptured) {
      setTimeout(() => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText && selectedText.length > 0) {
          safeSendMessage({
            action: 'saveClipboardItem',
            item: {
              text: selectedText,
              url: window.location.href,
              title: document.title
            }
          }, (response) => {
            if (response && response.success) {
              console.log('ContextFlow: Captured clipboard copy successfully');
              const panel = document.getElementById('cf-clipboard-history-panel');
              if (panel && !panel.classList.contains('cf-hidden')) {
                renderClipboardHistoryPanel();
              }
            }
          });
        }
      }, 100);
    }
  });
}

// === IN-CHAT WIN+V STYLE CLIPBOARD HISTORY PANEL ===
let clipboardPanelElement = null;

function toggleClipboardPanel() {
  if (!clipboardPanelElement) {
    injectClipboardHistoryPanel();
  }
  
  const isHidden = clipboardPanelElement.classList.contains('cf-hidden');
  if (isHidden) {
    // Render before showing to ensure up-to-date data
    renderClipboardHistoryPanel();
    clipboardPanelElement.classList.remove('cf-hidden');
    
    // Close other quick panels if open
    const quickInjectMenu = document.getElementById('cf-quick-inject-menu');
    if (quickInjectMenu) quickInjectMenu.remove();
    
    const agentMenu = document.getElementById('cf-agent-menu');
    if (agentMenu) agentMenu.remove();
  } else {
    clipboardPanelElement.classList.add('cf-hidden');
  }
}

function injectClipboardHistoryPanel() {
  if (clipboardPanelElement) return;
  
  clipboardPanelElement = document.createElement('div');
  clipboardPanelElement.id = 'cf-clipboard-history-panel';
  clipboardPanelElement.className = 'cf-hidden';
  
  clipboardPanelElement.innerHTML = `
    <div class="cf-clip-header">
      <div class="cf-clip-header-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        <span>Clipboard History (Win+V)</span>
      </div>
      <div class="cf-clip-header-actions">
        <button id="cf-clip-clear-btn" class="cf-clip-action-btn-text" title="Clear All History">Clear All</button>
        <button id="cf-clip-close-btn" class="cf-clip-close-x" title="Close Panel">✕</button>
      </div>
    </div>
    <div id="cf-clip-list-container" class="cf-clip-list">
      <div class="cf-clip-empty">Loading history...</div>
    </div>
  `;
  
  document.body.appendChild(clipboardPanelElement);
  
  // Position panel near floating dock
  const dock = document.getElementById('contextflow-advanced-dock');
  if (dock) {
    clipboardPanelElement.style.bottom = '80px';
    clipboardPanelElement.style.right = '24px';
  }
  
  // Event listeners
  document.getElementById('cf-clip-close-btn').addEventListener('click', () => {
    clipboardPanelElement.classList.add('cf-hidden');
  });
  
  document.getElementById('cf-clip-clear-btn').addEventListener('click', () => {
    if (confirm('Clear all clipboard history?')) {
      safeSendMessage({ action: 'clearClipboardHistory' }, (response) => {
        if (response && response.success) {
          renderClipboardHistoryPanel();
          showNotification('Clipboard history cleared', 'success');
        }
      });
    }
  });
}

function renderClipboardHistoryPanel() {
  const listContainer = document.getElementById('cf-clip-list-container');
  if (!listContainer) return;
  
  safeSendMessage({ action: 'getClipboardHistory' }, (response) => {
    const history = response ? (response.history || []) : [];
    
    if (history.length === 0) {
      listContainer.innerHTML = `
        <div class="cf-clip-empty">
          <span>No clipboard snippets found.</span>
          <span style="font-size:10px; margin-top:4px; opacity:0.6;">Select and copy text on this page to build history!</span>
        </div>
      `;
      return;
    }
    
    listContainer.innerHTML = history.map(item => {
      const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      const textPreview = item.text.length > 120 ? item.text.substring(0, 120) + '...' : item.text;
      const dateString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const bodyContent = item.image 
        ? `<div class="cf-clip-card-img-container"><img src="${item.image}" class="cf-clip-card-img" /></div>`
        : `<div class="cf-clip-card-body">${escape(textPreview)}</div>`;
        
      return `
        <div class="cf-clip-card" data-id="${item.id}">
          <div class="cf-clip-card-header">
            <span class="cf-clip-time">${dateString}</span>
            <div class="cf-clip-card-actions">
              <button class="cf-clip-card-btn cf-clip-inject-btn" title="Inject snippet" data-id="${item.id}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                Inject
              </button>
              <button class="cf-clip-card-btn cf-clip-delete-btn" title="Delete copy" data-id="${item.id}">✕</button>
            </div>
          </div>
          ${bodyContent}
        </div>
      `;
    }).join('');
    
    // Wire up events for each card
    listContainer.querySelectorAll('.cf-clip-inject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = history.find(i => i.id === id);
        if (item) {
          if (item.image) {
            injectImageToPlatform(item.image);
          } else {
            injectTextToActiveInput(item.text);
          }
          clipboardPanelElement.classList.add('cf-hidden');
        }
      });
    });
    
    listContainer.querySelectorAll('.cf-clip-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        safeSendMessage({ action: 'deleteClipboardItem', id }, (response) => {
          if (response && response.success) {
            renderClipboardHistoryPanel();
          }
        });
      });
    });
  });
}
