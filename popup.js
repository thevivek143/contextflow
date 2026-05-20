// Popup script for ContextFlow

let allCapsules = [];
let filteredCapsules = [];
let currentFilters = {
  folder: '',
  favorite: false,
  search: ''
};
let viewMode = 'list'; // 'list' or 'tree'

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadCapsules();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('search-input').addEventListener('input', handleSearch);
  document.getElementById('folder-filter').addEventListener('change', handleFolderFilter);
  document.getElementById('favorites-filter').addEventListener('click', handleFavoritesFilter);
  document.getElementById('new-capsule-btn').addEventListener('click', createNewCapsule);
  document.getElementById('tree-btn').addEventListener('click', openMemoryTree);

  document.getElementById('export-btn').addEventListener('click', showExportMenu);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  
  // Tab switching event listeners
  document.getElementById('tab-memories-btn').addEventListener('click', () => switchTab('memories'));
  document.getElementById('tab-clipboard-btn').addEventListener('click', () => switchTab('clipboard'));
  
  // Clipboard specific listeners
  const clipSearch = document.getElementById('clipboard-search-input');
  if (clipSearch) clipSearch.addEventListener('input', handleClipboardSearch);
  
  const clipClear = document.getElementById('clear-clipboard-btn');
  if (clipClear) clipClear.addEventListener('click', handleClearClipboard);
}

// Load capsules from storage
async function loadCapsules() {
  safeSendMessage({ action: 'getCapsules', filters: {} }, (response) => {
    allCapsules = (response && response.capsules) || [];
    applyFilters();
    updateStats();
  });
}

// Apply current filters
function applyFilters() {
  filteredCapsules = allCapsules.filter(capsule => {
    // Folder filter
    if (currentFilters.folder && capsule.folder !== currentFilters.folder) {
      return false;
    }
    
    // Favorite filter
    if (currentFilters.favorite && !capsule.favorite) {
      return false;
    }
    
    // Search filter
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      const matchesTitle = capsule.title?.toLowerCase().includes(searchLower);
      const matchesContent = capsule.content?.toLowerCase().includes(searchLower);
      const matchesTags = capsule.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      
      if (!matchesTitle && !matchesContent && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });
  
  renderCapsules();
}

// Render capsules list
function renderCapsules() {
  const container = document.getElementById('capsules-list');
  
  if (filteredCapsules.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 12px; display: block; opacity: 0.3;">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
        <div class="empty-state-text">
          No memories found.<br>
          Start capturing context to build your library!
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredCapsules.map(capsule => `
    <div class="capsule-card" data-id="${capsule.id}" draggable="true">
      <div class="capsule-header">
        <div class="capsule-title">${escapeHtml(capsule.title)}</div>
        <div class="capsule-card-actions">
          <button class="card-action-btn capsule-favorite" title="${capsule.favorite ? 'Unfavorite Capsule' : 'Favorite Capsule'}" data-id="${capsule.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${capsule.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color: ${capsule.favorite ? 'var(--warning)' : 'inherit'}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>
          <button class="card-action-btn capsule-delete-btn danger-hover" title="Delete Capsule" data-id="${capsule.id}">
            ✕
          </button>
        </div>
      </div>
      
      <div class="capsule-meta">
        <span class="capsule-platform">${capsule.platform || 'Unknown'}</span>
        <span class="capsule-folder">${capsule.folder || 'Uncategorized'}</span>
        <span>${formatDate(capsule.createdAt)}</span>
      </div>
      
      ${capsule.content && capsule.content.startsWith('data:image/') ? `
        <div class="capsule-card-img-container"><img src="${capsule.content}" class="capsule-card-img" /></div>
      ` : (capsule.summary ? `
        <div class="capsule-summary">${escapeHtml(capsule.summary)}</div>
      ` : '')}
      
      ${capsule.tags && capsule.tags.length > 0 ? `
        <div class="capsule-tags">
          ${capsule.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="capsule-stats">
        <span>Used ${capsule.stats?.usageCount || 0} times</span>
        <span>v${capsule.version}</span>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to capsule cards
  container.querySelectorAll('.capsule-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.capsule-favorite') && !e.target.closest('.capsule-delete-btn')) {
        viewCapsule(card.dataset.id);
      }
    });
    
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
  
  // Add event listeners to favorite buttons
  container.querySelectorAll('.capsule-favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.id);
    });
  });

  // Add event listeners to delete buttons
  container.querySelectorAll('.capsule-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm('Delete this memory capsule permanently?')) {
        safeSendMessage({ action: 'deleteCapsule', id: id }, (response) => {
          if (response && response.success) {
            loadCapsules();
            showNotification('Memory deleted successfully', 'success');
          }
        });
      }
    });
  });
}

// Handle search
function handleSearch() {
  currentFilters.search = document.getElementById('search-input').value;
  applyFilters();
}

// Handle folder filter
function handleFolderFilter(e) {
  currentFilters.folder = e.target.value;
  applyFilters();
}

// Handle favorites filter
function handleFavoritesFilter() {
  const btn = document.getElementById('favorites-filter');
  currentFilters.favorite = !currentFilters.favorite;
  btn.classList.toggle('active', currentFilters.favorite);
  applyFilters();
}

// Toggle favorite status
async function toggleFavorite(capsuleId) {
  safeSendMessage({ action: 'toggleFavorite', capsuleId }, (response) => {
    if (response && response.success) {
      loadCapsules();
    }
  });
}

// View capsule details
function viewCapsule(capsuleId) {
  const capsule = allCapsules.find(c => c.id === capsuleId);
  if (!capsule) return;
  
  if (capsule.content && capsule.content.startsWith('data:image/')) {
    copyImageToClipboard(capsule.content);
  } else {
    navigator.clipboard.writeText(capsule.content).then(() => {
      showNotification('Capsule copied to clipboard!', 'success');
    }).catch(err => {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy capsule', 'error');
    });
  }
}

// Handle drag start
function handleDragStart(e) {
  const capsuleId = e.currentTarget.dataset.id;
  const capsule = allCapsules.find(c => c.id === capsuleId);
  
  if (capsule) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/contextflow-capsule', JSON.stringify(capsule));
    e.currentTarget.classList.add('dragging');
  }
}

// Handle drag end
function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
}

// Create new capsule
function createNewCapsule() {
  try {
    // Open current tab and trigger capture
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        showNotification('Extension connection broken. Please reopen the popup.', 'error');
        return;
      }
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'capturePage' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script is not loaded on this tab — inform the user
            showNotification('Open ChatGPT, Claude, or another supported platform to capture.', 'error');
          } else {
            // Close popup so the user can interact with the in-page capture dialog
            window.close();
          }
        });
      } else {
        showNotification('Please open a supported AI platform first.', 'error');
      }
    });
  } catch (e) {
    console.warn(e);
    showNotification('Extension connection error. Please reload.', 'error');
  }
}

// Open Memory Tree canvas
function openMemoryTree() {
  try {
    chrome.windows.create({
      url: chrome.runtime.getURL('graph-advanced.html'),
      type: 'popup',
      width: 1400,
      height: 900
    });
  } catch (e) {
    console.warn(e);
    showNotification('Failed to open memory tree. Extension context invalidated.', 'error');
  }
}

// Show export menu
function showExportMenu() {
  const menu = document.createElement('div');
  menu.className = 'export-menu';
  menu.innerHTML = `
    <div class="export-menu-content">
      <h3>Export Capsules</h3>
      <button id="export-json-btn" class="export-option-btn">📄 Export as JSON</button>
      <button id="export-txt-btn" class="export-option-btn">📝 Export as TXT</button>
      <button id="export-cancel-btn" class="export-option-btn cancel">❌ Cancel</button>
    </div>
  `;
  
  document.body.appendChild(menu);
  
  // Add event listeners
  document.getElementById('export-json-btn').addEventListener('click', () => {
    exportAsJSON();
    menu.remove();
  });
  
  document.getElementById('export-txt-btn').addEventListener('click', () => {
    exportAsTXT();
    menu.remove();
  });
  
  document.getElementById('export-cancel-btn').addEventListener('click', () => {
    menu.remove();
  });
  
  // Close on background click
  menu.addEventListener('click', (e) => {
    if (e.target === menu) {
      menu.remove();
    }
  });
}

// Export as JSON
async function exportAsJSON() {
  try {
    const result = await chrome.storage.local.get(['capsules']);
    const capsules = result.capsules || {};
    
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      capsules: Object.values(capsules)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `contextflow-export-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    showNotification('Export failed: storage access error', 'error');
  }
}

// Export as TXT
async function exportAsTXT() {
  try {
    const result = await chrome.storage.local.get(['capsules']);
    const capsules = Object.values(result.capsules || {});
    
    if (capsules.length === 0) {
      alert('No capsules to export!');
      return;
    }
    
    // Create formatted text content
    let txtContent = '='.repeat(80) + '\n';
    txtContent += 'CONTEXTFLOW CAPSULES EXPORT\n';
    txtContent += '='.repeat(80) + '\n\n';
    txtContent += `Export Date: ${new Date().toLocaleString()}\n`;
    txtContent += `Total Capsules: ${capsules.length}\n`;
    txtContent += '='.repeat(80) + '\n\n';
    
    capsules.forEach((capsule, index) => {
      txtContent += `\n${'='.repeat(80)}\n`;
      txtContent += `CAPSULE #${index + 1}\n`;
      txtContent += '='.repeat(80) + '\n\n';
      
      txtContent += `Title: ${capsule.title}\n`;
      txtContent += `Platform: ${capsule.platform || 'Unknown'}\n`;
      txtContent += `Folder: ${capsule.folder || 'Uncategorized'}\n`;
      txtContent += `Created: ${new Date(capsule.createdAt).toLocaleString()}\n`;
      txtContent += `Favorite: ${capsule.favorite ? 'Yes' : 'No'}\n`;
      txtContent += `Usage Count: ${capsule.stats?.usageCount || 0}\n`;
      txtContent += `Version: ${capsule.version}\n`;
      
      if (capsule.tags && capsule.tags.length > 0) {
        txtContent += `Tags: ${capsule.tags.join(', ')}\n`;
      }
      
      if (capsule.summary) {
        txtContent += `\nSummary:\n${'-'.repeat(40)}\n${capsule.summary}\n`;
      }
      
      txtContent += `\nContent:\n${'-'.repeat(40)}\n${capsule.content}\n`;
      txtContent += '\n';
    });
    
    txtContent += '\n' + '='.repeat(80) + '\n';
    txtContent += 'END OF EXPORT\n';
    txtContent += '='.repeat(80) + '\n';
    
    // Create and download file
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `contextflow-export-${Date.now()}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    showNotification('Export failed: storage access error', 'error');
  }
}

// Open settings
function openSettings() {
  // For now, show a simple alert
  alert('Settings feature coming soon!\n\nCurrent settings:\n- Auto-summarize: Enabled\n- Auto-tag: Enabled\n- Duplicate detection: Enabled');
}

// Update statistics
function updateStats() {
  const totalCapsules = allCapsules.length;
  let totalWords = 0;
  
  allCapsules.forEach(cap => {
    if (cap.content) {
      totalWords += cap.content.split(/\s+/).length;
    }
  });
  
  let wordsDisplay = totalWords;
  if (totalWords > 1000) {
    wordsDisplay = (totalWords / 1000).toFixed(1) + 'k';
  }
  
  document.getElementById('total-capsules').textContent = totalCapsules;
  document.getElementById('total-usage').textContent = wordsDisplay;
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

// Settings Modal Logic
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');

// Toggle Elements
const chatgptToggle = document.getElementById('setting-chatgpt-pro');
const claudeToggle = document.getElementById('setting-claude-pro');
const geminiToggle = document.getElementById('setting-gemini-pro');

// Load saved settings
function loadSettings() {
  try {
    chrome.storage.sync.get({
      chatgptPro: false,
      claudePro: false,
      geminiPro: false
    }, (items) => {
      if (chrome.runtime.lastError) {
        console.warn("loadSettings sync storage error:", chrome.runtime.lastError.message);
        return;
      }
      if (items) {
        chatgptToggle.checked = !!items.chatgptPro;
        claudeToggle.checked = !!items.claudePro;
        geminiToggle.checked = !!items.geminiPro;
      }
    });
  } catch (e) {
    console.warn("loadSettings sync exception:", e);
  }
}

// Save settings when toggled
function saveSettings() {
  try {
    chrome.storage.sync.set({
      chatgptPro: chatgptToggle.checked,
      claudePro: claudeToggle.checked,
      geminiPro: geminiToggle.checked
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn("saveSettings sync storage error:", chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.warn("saveSettings sync exception:", e);
  }
}

[chatgptToggle, claudeToggle, geminiToggle].forEach(toggle => {
  if (toggle) {
    toggle.addEventListener('change', saveSettings);
  }
});

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsModal.classList.remove('hidden');
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
}

if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });
}



// === TAB SWITCHING & CLIPBOARD HISTORY MANAGEMENT ===
let currentTab = 'memories';
let allClipboardItems = [];
let filteredClipboardItems = [];
let clipboardSearchQuery = '';

function switchTab(tab) {
  currentTab = tab;
  
  const memoriesBtn = document.getElementById('tab-memories-btn');
  const clipboardBtn = document.getElementById('tab-clipboard-btn');
  const memoriesContent = document.getElementById('memories-tab-content');
  const clipboardContent = document.getElementById('clipboard-tab-content');
  
  if (tab === 'memories') {
    memoriesBtn.classList.add('active');
    clipboardBtn.classList.remove('active');
    memoriesContent.classList.remove('hidden');
    clipboardContent.classList.add('hidden');
    loadCapsules();
  } else {
    clipboardBtn.classList.add('active');
    memoriesBtn.classList.remove('active');
    clipboardContent.classList.remove('hidden');
    memoriesContent.classList.add('hidden');
    loadClipboardHistory();
  }
}

async function loadClipboardHistory() {
  safeSendMessage({ action: 'getClipboardHistory' }, (response) => {
    allClipboardItems = (response && response.history) || [];
    applyClipboardFilter();
  });
}

function handleClipboardSearch() {
  clipboardSearchQuery = document.getElementById('clipboard-search-input').value;
  applyClipboardFilter();
}

function applyClipboardFilter() {
  if (!clipboardSearchQuery) {
    filteredClipboardItems = allClipboardItems;
  } else {
    const q = clipboardSearchQuery.toLowerCase();
    filteredClipboardItems = allClipboardItems.filter(item => 
      (item.text && item.text.toLowerCase().includes(q)) ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q))
    );
  }
  renderClipboardHistory();
}

// Helper to copy a Base64 data URL as a raw image blob back to system clipboard
async function copyImageToClipboard(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    showNotification('Image copied to clipboard!', 'success');
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
    showNotification('Failed to copy image', 'error');
  }
}

function renderClipboardHistory() {
  const container = document.getElementById('clipboard-list');
  if (!container) return;
  
  if (filteredClipboardItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 12px; display: block; opacity: 0.3;">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        <div class="empty-state-text">
          No clipboard history found.<br>
          Select and copy text on AI chat sites to capture automatically!
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredClipboardItems.map(item => {
    const dateString = formatDate(item.timestamp) + ' ' + new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const domain = item.url ? new URL(item.url).hostname.replace('www.', '') : 'AI Chat';
    
    const bodyContent = item.image 
      ? `<div class="clipboard-card-img-container"><img src="${item.image}" class="clipboard-card-img" /></div>`
      : `<div class="capsule-summary clipboard-text-body">${escapeHtml(item.text)}</div>`;
      
    return `
      <div class="capsule-card clipboard-card" data-id="${item.id}">
        <div class="capsule-header">
          <div class="capsule-title text-truncate">${escapeHtml(item.title || 'Copied Snippet')}</div>
          <div class="clipboard-card-actions">
            <button class="clip-action-btn clip-copy-btn" title="Copy back to system clipboard" data-id="${item.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="clip-action-btn clip-promote-btn" title="Save permanently as Memory Capsule" data-id="${item.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            </button>
            <button class="clip-action-btn clip-delete-btn danger-hover" title="Delete copy" data-id="${item.id}">
              ✕
            </button>
          </div>
        </div>
        
        <div class="capsule-meta">
          <span class="capsule-platform">${escapeHtml(domain)}</span>
          <span>${dateString}</span>
        </div>
        
        ${bodyContent}
      </div>
    `;
  }).join('');
  
  // Wire events
  container.querySelectorAll('.clip-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = allClipboardItems.find(i => i.id === id);
      if (item) {
        if (item.image) {
          copyImageToClipboard(item.image);
        } else {
          navigator.clipboard.writeText(item.text).then(() => {
            showNotification('Snippet copied to clipboard!', 'success');
          });
        }
      }
    });
  });
  
  container.querySelectorAll('.clip-promote-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      promoteClipboardItem(id);
    });
  });
  
  container.querySelectorAll('.clip-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      safeSendMessage({ action: 'deleteClipboardItem', id }, () => {
        loadClipboardHistory();
      });
    });
  });
  
  // Entire card click copies it too
  container.querySelectorAll('.clipboard-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.clip-action-btn')) {
        const id = card.dataset.id;
        const item = allClipboardItems.find(i => i.id === id);
        if (item) {
          if (item.image) {
            copyImageToClipboard(item.image);
          } else {
            navigator.clipboard.writeText(item.text).then(() => {
              showNotification('Copied to clipboard!', 'success');
            });
          }
        }
      }
    });
  });
}

function handleClearClipboard() {
  if (confirm('Clear all clipboard history?')) {
    safeSendMessage({ action: 'clearClipboardHistory' }, () => {
      loadClipboardHistory();
      showNotification('Clipboard history cleared', 'success');
    });
  }
}

function promoteClipboardItem(id) {
  const item = allClipboardItems.find(i => i.id === id);
  if (!item) return;
  
  // Prompt for Title
  const suggestedTitle = item.image ? 'Copied Visual Asset' : (item.text.split('\n')[0].substring(0, 35).trim() || 'Copied Memory');
  const title = prompt('Enter a Title for this Memory Capsule:', suggestedTitle);
  
  if (title === null) return; // User cancelled
  
  const finalTitle = title.trim() || suggestedTitle;
  
  // Prompt for Folder
  const folder = prompt('Enter Folder name (e.g. Engineering, Research, Marketing, Product):', 'Uncategorized');
  if (folder === null) return; // User cancelled
  
  const finalFolder = folder.trim() || 'Uncategorized';
  
  safeSendMessage({
    action: 'saveCapsule',
    capsule: {
      title: finalTitle,
      content: item.image || item.text,
      platform: item.url ? new URL(item.url).hostname.replace('www.', '') : 'Clipboard',
      url: item.url,
      tags: item.image ? ['copied', 'clipboard', 'image'] : ['copied', 'clipboard'],
      folder: finalFolder
    }
  }, (response) => {
    if (response && response.success) {
      if (response.isDuplicate) {
        showNotification('Already saved in memories! (Duplicate)', 'info');
      } else {
        showNotification('Promoted to Permanent Memory! ✨', 'success');
      }
    } else {
      const errMsg = (response && response.error) ? `Failed: ${response.error}` : 'Failed to save memory capsule.';
      showNotification(errMsg, 'error');
    }
    switchTab('memories');
  });
}

function safeSendMessage(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("safeSendMessage: connection failed,", chrome.runtime.lastError.message);
        if (callback) callback(null);
      } else {
        if (callback) callback(response);
      }
    });
  } catch (e) {
    console.warn("safeSendMessage exception thrown:", e);
    if (callback) callback(null);
  }
}

function showNotification(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `cf-toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('visible'), 50);
  
  // Remove
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
