// Background service worker for ContextFlow

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('ContextFlow installed');
  
  // Create context menu items
  // chrome.contextMenus.create({
  //   id: 'capture-selection',
  //   title: 'Capture Selection as Capsule',
  //   contexts: ['selection']
  // });
  
  chrome.contextMenus.create({
    id: 'capture-page',
    title: 'Capture Page Context',
    contexts: ['page']
  });
  
  // Initialize storage with default settings
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          autoSummarize: true,
          autoTag: true,
          duplicateDetection: true,
          syncEnabled: false,
          theme: 'light',
          defaultFolder: 'Uncategorized'
        }
      });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'capture-selection') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'captureSelection',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'capture-page') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'capturePage'
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveCapsule') {
    saveCapsule(request.capsule).then(result => {
      sendResponse({ success: true, capsuleId: result.id, isDuplicate: result.isDuplicate });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getCapsules') {
    getCapsules(request.filters).then(capsules => {
      sendResponse({ capsules });
    });
    return true;
  }
  
  if (request.action === 'searchCapsules') {
    searchCapsules(request.query).then(results => {
      sendResponse({ results });
    });
    return true;
  }

  if (request.action === 'trackUsage') {
    trackUsage(request.capsuleId).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'toggleFavorite') {
    toggleFavorite(request.capsuleId).then(result => {
      sendResponse({ success: true, favorite: result });
    });
    return true;
  }

  if (request.action === 'deleteCapsule') {
    deleteCapsule(request.id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'generateSummary') {
    generateSummary(request.text).then(summary => {
      sendResponse({ summary });
    });
    return true;
  }
  
  if (request.action === 'generateTags') {
    generateTags(request.text).then(tags => {
      sendResponse({ tags });
    });
    return true;
  }

  if (request.action === 'saveClipboardItem') {
    saveClipboardItem(request.item).then(newItem => {
      sendResponse({ success: true, item: newItem });
    });
    return true;
  }

  if (request.action === 'getClipboardHistory') {
    getClipboardHistory().then(history => {
      sendResponse({ history });
    });
    return true;
  }

  if (request.action === 'deleteClipboardItem') {
    deleteClipboardItem(request.id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'clearClipboardHistory') {
    clearClipboardHistory().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Robust helper to retrieve capsules with automatic type-migration/recovery
async function getCapsulesFromStorage() {
  const result = await chrome.storage.local.get(['capsules']);
  let capsules = result.capsules;
  
  if (!capsules || typeof capsules !== 'object') {
    capsules = {};
  }
  
  if (Array.isArray(capsules)) {
    const migrated = {};
    capsules.forEach(cap => {
      if (cap && cap.id) {
        migrated[cap.id] = cap;
      }
    });
    await chrome.storage.local.set({ capsules: migrated });
    return migrated;
  }
  
  return capsules;
}

// Toggle favorite status
async function toggleFavorite(capsuleId) {
  const capsules = await getCapsulesFromStorage();
  
  if (capsules[capsuleId]) {
    capsules[capsuleId].favorite = !capsules[capsuleId].favorite;
    await chrome.storage.local.set({ capsules });
    return capsules[capsuleId].favorite;
  }
  return false;
}

// Delete specific capsule
async function deleteCapsule(capsuleId) {
  const capsules = await getCapsulesFromStorage();
  
  if (capsules[capsuleId]) {
    delete capsules[capsuleId];
    await chrome.storage.local.set({ capsules });
    return true;
  }
  return false;
}

// Save capsule to storage
async function saveCapsule(capsule) {
  const capsuleId = generateId();
  const timestamp = Date.now();
  
  const capsuleData = {
    id: capsuleId,
    ...capsule,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    versions: [{
      version: 1,
      content: capsule.content,
      timestamp: timestamp
    }],
    stats: {
      usageCount: 0,
      lastUsed: null
    }
  };
  
  // Get existing capsules
  const capsules = await getCapsulesFromStorage();
  
  // Fallback defaults if settings are empty
  const settingsResult = await chrome.storage.local.get(['settings']);
  const settings = settingsResult.settings || {
    autoSummarize: true,
    autoTag: true,
    duplicateDetection: true
  };
  
  const contentStr = String(capsuleData.content || '').trim();
  
  // Check for duplicates if enabled
  if (settings.duplicateDetection) {
    const duplicate = await findDuplicate(capsuleData, capsules);
    if (duplicate) {
      return { id: duplicate.id, isDuplicate: true };
    }
  }
  
  // Auto-generate summary if enabled
  if (settings.autoSummarize && !capsuleData.summary) {
    capsuleData.summary = await generateSummary(contentStr);
  }
  
  // Auto-generate tags if enabled
  if (settings.autoTag && (!capsuleData.tags || capsuleData.tags.length === 0)) {
    capsuleData.tags = await generateTags(contentStr);
  }
  
  capsules[capsuleId] = capsuleData;
  await chrome.storage.local.set({ capsules });
  
  return { id: capsuleId, isDuplicate: false };
}

// Get capsules with optional filters
async function getCapsules(filters = {}) {
  const capsulesObj = await getCapsulesFromStorage();
  let capsules = Object.values(capsulesObj);
  
  // Apply filters
  if (filters.folder) {
    capsules = capsules.filter(c => c.folder === filters.folder);
  }
  
  if (filters.tags && filters.tags.length > 0) {
    capsules = capsules.filter(c => 
      c.tags && c.tags.some(tag => filters.tags.includes(tag))
    );
  }
  
  if (filters.platform) {
    capsules = capsules.filter(c => c.platform === filters.platform);
  }
  
  if (filters.favorite) {
    capsules = capsules.filter(c => c.favorite === true);
  }
  
  // Sort by most recent
  capsules.sort((a, b) => b.updatedAt - a.updatedAt);
  
  return capsules;
}

// Search capsules
async function searchCapsules(query) {
  const capsulesObj = await getCapsulesFromStorage();
  const capsules = Object.values(capsulesObj);
  
  const lowerQuery = String(query || '').toLowerCase();
  
  return capsules.filter(capsule => {
    return (
      String(capsule.title || '').toLowerCase().includes(lowerQuery) ||
      String(capsule.content || '').toLowerCase().includes(lowerQuery) ||
      String(capsule.summary || '').toLowerCase().includes(lowerQuery) ||
      capsule.tags?.some(tag => String(tag || '').toLowerCase().includes(lowerQuery))
    );
  });
}

// Generate summary using simple extraction (can be enhanced with AI API)
async function generateSummary(text) {
  if (!text) return '';
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
}

// Generate tags using keyword extraction
async function generateTags(text) {
  if (!text) return [];
  const words = String(text).toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 4);
  
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  return sorted;
}

// Find duplicate capsules
async function findDuplicate(newCapsule, existingCapsules) {
  const threshold = 0.85; // 85% similarity
  const newContent = String(newCapsule.content || '').trim();
  if (!newContent) return null;
  
  for (const capsule of Object.values(existingCapsules)) {
    const existingContent = String(capsule.content || '').trim();
    const similarity = calculateSimilarity(newContent, existingContent);
    if (similarity > threshold) {
      return capsule;
    }
  }
  
  return null;
}

// Calculate text similarity (simple implementation)
function calculateSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w);
  
  if (words1.length === 0 && words2.length === 0) return 1.0;
  if (words1.length === 0 || words2.length === 0) return 0.0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Track capsule usage
async function trackUsage(capsuleId) {
  const capsules = await getCapsulesFromStorage();
  
  if (capsules[capsuleId]) {
    // Initialize stats if missing
    if (!capsules[capsuleId].stats) {
      capsules[capsuleId].stats = { usageCount: 0, lastUsed: null };
    }
    
    capsules[capsuleId].stats.usageCount++;
    capsules[capsuleId].stats.lastUsed = Date.now();
    capsules[capsuleId].updatedAt = Date.now();
    
    await chrome.storage.local.set({ capsules });
  }
}

// Save clipboard item to storage
async function saveClipboardItem(item) {
  const result = await chrome.storage.local.get(['clipboardHistory']);
  const history = result.clipboardHistory || [];
  
  const newItem = {
    id: generateId(),
    text: item.text,
    url: item.url,
    title: item.title,
    image: item.image || null, // Capture image data URL for multi-modal support
    timestamp: Date.now()
  };
  
  // Add to front of history list
  history.unshift(newItem);
  
  // Cap history at 25 items
  if (history.length > 25) {
    history.pop();
  }
  
  await chrome.storage.local.set({ clipboardHistory: history });
  return newItem;
}

// Retrieve clipboard history
async function getClipboardHistory() {
  const result = await chrome.storage.local.get(['clipboardHistory']);
  return result.clipboardHistory || [];
}

// Delete specific clipboard item
async function deleteClipboardItem(id) {
  const result = await chrome.storage.local.get(['clipboardHistory']);
  let history = result.clipboardHistory || [];
  history = history.filter(item => item.id !== id);
  await chrome.storage.local.set({ clipboardHistory: history });
}

// Clear all clipboard history
async function clearClipboardHistory() {
  await chrome.storage.local.set({ clipboardHistory: [] });
}
