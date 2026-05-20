let allCapsules = [];
let activeCapsule = null;
let currentView = 'folders'; // folders, timeline, smart
let isMLReady = false;
let searchDebounceTimer = null;

function handleContextInvalidated() {
  if (document.getElementById('cf-refresh-notice')) return;
  const overlay = document.createElement('div');
  overlay.id = 'cf-refresh-notice';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(9, 9, 11, 0.8);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999999;
    font-family: 'Inter', -apple-system, sans-serif;
    color: #fafafa;
    animation: cfFadeIn 0.3s ease;
  `;
  
  overlay.innerHTML = `
    <div style="background: rgba(24, 24, 27, 0.95); border: 1px solid #ef4444; padding: 32px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
      <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
      <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Extension Link Broken</h3>
      <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 24px;">The ContextFlow extension has been reloaded or updated in Chrome. Standalone explorer pages must be reloaded to reconnect.</p>
      <button onclick="window.location.reload()" style="background: #fafafa; color: #09090b; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; width: 100%;">Reload Page</button>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cfFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);
}

window.onMLProgress = function(data) {
  const statusEl = document.getElementById('ml-status');
  if (statusEl) {
    statusEl.style.display = 'block';
    if (typeof data === 'number') {
      statusEl.innerText = `Loading Neural Engine... ${data}%`;
    } else if (data.status === 'progress') {
      statusEl.innerText = `Loading Model (${Math.round(data.progress)}%)`;
    } else if (data.status === 'ready' || data.status === 'done') {
      statusEl.innerText = `Neural Engine Online ✨`;
      setTimeout(() => statusEl.style.display = 'none', 3000);
      isMLReady = true;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadCapsules();
});

function setupEventListeners() {
  document.getElementById('close-btn').addEventListener('click', () => {
    window.close();
  });

  // View switchers
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentView = e.target.dataset.view;
      renderTree();
    });
  });

  // Search with debounce
  document.getElementById('tree-search').addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    const term = e.target.value.toLowerCase();
    searchDebounceTimer = setTimeout(() => {
      renderTree(term);
    }, 400);
  });
  
  // Actions
  document.getElementById('btn-copy').addEventListener('click', () => {
    if (activeCapsule) {
      navigator.clipboard.writeText(`[Context: ${activeCapsule.title}]\n${activeCapsule.content}`);
      const btn = document.getElementById('btn-copy');
      const oldText = btn.innerText;
      btn.innerText = 'Copied!';
      setTimeout(() => btn.innerText = oldText, 2000);
    }
  });

  document.getElementById('btn-delete').addEventListener('click', () => {
    if (activeCapsule && confirm('Delete this memory permanently?')) {
      try {
        chrome.runtime.sendMessage({ action: 'deleteCapsule', id: activeCapsule.id }, (response) => {
          if (chrome.runtime.lastError) {
            handleContextInvalidated();
            return;
          }
          activeCapsule = null;
          document.getElementById('memory-viewer').classList.add('hidden');
          document.getElementById('viewer-empty').classList.remove('hidden');
          loadCapsules();
        });
      } catch (e) {
        handleContextInvalidated();
      }
    }
  });
  
  document.getElementById('btn-inject-chat').addEventListener('click', () => {
    if (activeCapsule) {
      try {
        // Query all windows to find the active AI tab
        chrome.tabs.query({ active: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            handleContextInvalidated();
            return;
          }
          // Filter out the popup window itself
          const targetTab = tabs.find(t => 
            t.url && (t.url.includes('chatgpt.com') || 
                      t.url.includes('claude.ai') || 
                      t.url.includes('gemini.google') ||
                      t.url.includes('perplexity.ai'))
          );
          
          if (!targetTab) {
            alert('Please open an AI chat tab (ChatGPT, Claude, etc.) to inject this memory.');
            return;
          }

          chrome.tabs.sendMessage(targetTab.id, {
            action: 'injectMemory',
            capsule: activeCapsule
          }, () => {
            if (chrome.runtime.lastError) {
              console.warn("Tab send failed:", chrome.runtime.lastError);
            }
            const btn = document.getElementById('btn-inject-chat');
            const oldText = btn.innerHTML;
            btn.innerHTML = '✨ Injected!';
            setTimeout(() => btn.innerHTML = oldText, 2000);
          });
        });
      } catch (e) {
        handleContextInvalidated();
      }
    }
  });

  const openGraphBtn = document.getElementById('open-graph-btn');
  if (openGraphBtn) {
    openGraphBtn.addEventListener('click', () => {
      window.location.href = 'graph.html';
    });
  }
}

function loadCapsules() {
  try {
    chrome.runtime.sendMessage({ action: 'getCapsules', filters: {} }, async (response) => {
      if (chrome.runtime.lastError) {
        handleContextInvalidated();
        return;
      }
      allCapsules = response ? (response.capsules || []) : [];
      renderTree();
      
      // Background ML embedding generation
      if (window.ML) {
        try {
          await window.ML.getEmbeddingPipeline();
          isMLReady = true;
          let needsSave = false;
          
          const statusEl = document.getElementById('ml-status');
          if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.innerText = 'Indexing memories...';
          }

          for (let cap of allCapsules) {
            if (!cap.embedding) {
              const textToEmbed = `${cap.title || ''} ${cap.content || ''}`;
              cap.embedding = await window.ML.computeEmbedding(textToEmbed);
              needsSave = true;
            }
          }
          
          if (needsSave) {
            const capsulesObj = {};
            allCapsules.forEach(cap => {
              if (cap.id) {
                capsulesObj[cap.id] = cap;
              }
            });
            chrome.storage.local.set({ capsules: capsulesObj }, () => {
              if (chrome.runtime.lastError) {
                handleContextInvalidated();
              }
            });
            if (statusEl) {
              statusEl.innerText = 'Index complete ✨';
              setTimeout(() => statusEl.style.display = 'none', 3000);
            }
          } else {
            if (statusEl) statusEl.style.display = 'none';
          }
        } catch (e) {
          console.error("ML Initialization failed:", e);
        }
      }
    });
  } catch (e) {
    handleContextInvalidated();
  }
}

async function renderTree(searchTerm = '') {
  const root = document.getElementById('tree-root');
  
  let capsules = allCapsules;
  if (searchTerm) {
    if (isMLReady && window.ML) {
       root.innerHTML = '<div class="tree-empty">Searching neural index...</div>';
       const searchEmbedding = await window.ML.computeEmbedding(searchTerm);
       const scored = capsules.map(c => {
         const score = c.embedding ? window.ML.cosineSimilarity(searchEmbedding, c.embedding) : 0;
         return { ...c, _score: score };
       });
       // Semantic filtering threshold
       capsules = scored.filter(c => c._score > 0.25).sort((a,b) => b._score - a._score);
    } else {
       capsules = capsules.filter(c => 
         (c.title || '').toLowerCase().includes(searchTerm) || 
         (c.content || '').toLowerCase().includes(searchTerm)
       );
    }
  }

  if (capsules.length === 0) {
    root.innerHTML = '<div class="tree-empty">No memories match.</div>';
    return;
  }

  let html = '';
  
  if (currentView === 'folders') {
    // Group by folder
    const groups = {};
    capsules.forEach(c => {
      const folder = c.folder || 'Uncategorized';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(c);
    });
    
    // Sort folders alphabetically
    Object.keys(groups).sort().forEach(folder => {
      html += `
        <div class="tree-folder open">
          <div class="tree-folder-header" onclick="this.parentElement.classList.toggle('open')">
            <span class="folder-icon">📁</span>
            ${folder} <span style="opacity:0.5; font-size:11px; margin-left:6px">(${groups[folder].length})</span>
          </div>
          <div class="tree-folder-content">
            ${groups[folder].map(c => `
              <div class="tree-item" onclick="openCapsule('${c.id}')" id="tree-node-${c.id}">
                <span class="item-icon">📄</span>
                ${c.title || 'Untitled Memory'}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
  } 
  else if (currentView === 'timeline') {
    // Group by Month/Year
    const groups = {};
    capsules.forEach(c => {
      const date = new Date(c.createdAt || Date.now());
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(c);
    });
    
    Object.keys(groups).forEach(period => {
      html += `
        <div class="tree-folder open">
          <div class="tree-folder-header" onclick="this.parentElement.classList.toggle('open')">
            <span class="folder-icon">🗓️</span>
            ${period}
          </div>
          <div class="tree-folder-content">
            ${groups[period].map(c => `
              <div class="tree-item" onclick="openCapsule('${c.id}')" id="tree-node-${c.id}">
                <span class="item-icon">📄</span>
                ${c.title || 'Untitled Memory'}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
  }
  else if (currentView === 'smart') {
    // Group by Platform
    const groups = {};
    capsules.forEach(c => {
      const platform = c.platform || 'Unknown Platform';
      if (!groups[platform]) groups[platform] = [];
      groups[platform].push(c);
    });
    
    Object.keys(groups).forEach(plat => {
      html += `
        <div class="tree-folder open">
          <div class="tree-folder-header" onclick="this.parentElement.classList.toggle('open')">
            <span class="folder-icon">🤖</span>
            ${plat}
          </div>
          <div class="tree-folder-content">
            ${groups[plat].map(c => `
              <div class="tree-item" onclick="openCapsule('${c.id}')" id="tree-node-${c.id}">
                <span class="item-icon">📄</span>
                ${c.title || 'Untitled Memory'}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
  }

  root.innerHTML = html;
  
  if (activeCapsule) {
    const el = document.getElementById(`tree-node-${activeCapsule.id}`);
    if (el) el.classList.add('active');
  }
}

// Ensure openCapsule is globally available for inline onclick
window.openCapsule = function(id) {
  const capsule = allCapsules.find(c => c.id === id);
  if (!capsule) return;
  
  activeCapsule = capsule;
  
  // Highlight in tree
  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`tree-node-${id}`);
  if (el) el.classList.add('active');
  
  // Show in viewer
  document.getElementById('viewer-empty').classList.add('hidden');
  document.getElementById('memory-viewer').classList.remove('hidden');
  
  document.getElementById('viewer-title').innerText = capsule.title || 'Untitled Memory';
  document.getElementById('viewer-folder').innerText = `📁 ${capsule.folder || 'Uncategorized'}`;
  document.getElementById('viewer-date').innerText = `🗓️ ${new Date(capsule.createdAt || Date.now()).toLocaleDateString()}`;
  document.getElementById('viewer-platform').innerText = `🤖 ${capsule.platform || 'System'}`;
  document.getElementById('viewer-text').innerText = capsule.content;
  
  renderRelatedMemories(capsule);
};

function renderRelatedMemories(currentCapsule) {
  const container = document.getElementById('related-memories');
  
  // Related Memory matching using Cosine Similarity instead of dumb keywords
  let related = [];
  if (isMLReady && window.ML && currentCapsule.embedding) {
    const scored = allCapsules.map(c => {
      if (c.id === currentCapsule.id) return { ...c, _score: -1 };
      const score = c.embedding ? window.ML.cosineSimilarity(currentCapsule.embedding, c.embedding) : 0;
      return { ...c, _score: score };
    });
    related = scored.filter(c => c._score > 0.4).sort((a,b) => b._score - a._score).slice(0, 4);
  } else {
    // Fallback heuristic
    const currentWords = (currentCapsule.title || '').toLowerCase().split(' ').filter(w => w.length > 3);
    related = allCapsules.filter(c => {
      if (c.id === currentCapsule.id) return false;
      if (c.folder && currentCapsule.folder && c.folder === currentCapsule.folder) return true;
      const cWords = (c.title || '').toLowerCase();
      for (let w of currentWords) {
        if (cWords.includes(w)) return true;
      }
      return false;
    }).slice(0, 4);
  }
  
  if (related.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size:12px">No neural connections found.</div>';
    return;
  }
  
  container.innerHTML = related.map(c => `
    <div class="related-card" onclick="openCapsule('${c.id}')">
      <h4>${c.title || 'Untitled Memory'}</h4>
      <p>📁 ${c.folder || 'Uncategorized'}</p>
    </div>
  `).join('');
}
