// Knowledge Graph visualization for ContextFlow
// Re-engineered into a premium 3D Orbital Constellation Model

class KnowledgeGraph {
  constructor() {
    this.canvas = document.getElementById('graph-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Core node and simulation state
    this.allCapsules = []; // full loaded database list
    this.nodes = [];       // active rendering nodes
    this.folderCores = []; // active folder center nuclei
    this.capsuleNodes = []; // active capsule electron nodes
    this.edges = [];       // capsule-to-capsule similarity edges
    this.stars = [];       // dynamic background 3D neural dust
    
    // Camera / 3D Space State
    this.angleX = -0.3; // initial grid tilt
    this.angleY = 0.5;
    this.velocityX = 0.001; // initial momentum spin
    this.velocityY = 0.002;
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    
    // Interaction states
    this.isDragging = false;
    this.dragNode = null;
    this.selectedNode = null;
    this.hoveredNode = null;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // 3D Perspective Parameters
    this.focalLength = 400;
    this.cameraDistance = 600;
    
    // Animation frame handle
    this.animationFrameId = null;
    
    this.init();
  }
  
  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.setupEventListeners();
    this.loadData();
  }
  
  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }
  
  setupEventListeners() {
    // Mouse events for 3D navigation
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    
    // Control buttons
    document.getElementById('zoom-in-btn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out-btn').addEventListener('click', () => this.zoomOut());
    document.getElementById('reset-btn').addEventListener('click', () => this.reset());
    document.getElementById('close-btn').addEventListener('click', () => window.close());
    
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'graph-advanced.html';
      });
    }
    
    // Sidebar Filters
    document.getElementById('filter-favorites').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-recent').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-unused').addEventListener('change', () => this.applyFilters());
  }
  
  async loadData() {
    // Show premium Loading Overlay
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
      <div class="loading-spinner-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">Synthesizing Neural Constellation...</div>
      </div>
    `;
    document.body.appendChild(loading);
    
    try {
      const result = await chrome.storage.local.get(['capsules']);
      this.allCapsules = Object.values(result.capsules || {});
      
      this.populateFilterControls();
      this.buildGraph(this.allCapsules, true); // true to initialize camera & starfield
      this.updateStats();
      
      // Kick off continuous rendering loop
      this.startAnimationLoop();
    } catch (error) {
      console.error('Error loading graph data:', error);
      handleContextInvalidated();
    } finally {
      if (loading.parentElement) {
        loading.remove();
      }
    }
  }
  
  populateFilterControls() {
    const foldersDiv = document.getElementById('folder-filters');
    const platformsDiv = document.getElementById('platform-filters');
    
    if (!foldersDiv || !platformsDiv) return;
    
    // Clear and populate Folder checklist
    foldersDiv.innerHTML = '';
    const uniqueFolders = [...new Set(this.allCapsules.map(c => c.folder || 'Uncategorized'))];
    uniqueFolders.forEach(folder => {
      const label = document.createElement('label');
      label.className = 'filter-label';
      label.innerHTML = `
        <input type="checkbox" class="folder-filter-cb" value="${folder}" checked>
        <span class="custom-cb"></span>
        <span class="label-text">📁 ${folder}</span>
      `;
      label.querySelector('input').addEventListener('change', () => this.applyFilters());
      foldersDiv.appendChild(label);
    });
    
    // Clear and populate Platform checklist
    platformsDiv.innerHTML = '';
    const uniquePlatforms = [...new Set(this.allCapsules.map(c => c.platform || 'Unknown'))];
    uniquePlatforms.forEach(plat => {
      const label = document.createElement('label');
      label.className = 'filter-label';
      label.innerHTML = `
        <input type="checkbox" class="platform-filter-cb" value="${plat}" checked>
        <span class="custom-cb"></span>
        <span class="label-text">🤖 ${plat}</span>
      `;
      label.querySelector('input').addEventListener('change', () => this.applyFilters());
      platformsDiv.appendChild(label);
    });
  }
  
  buildGraph(capsules, resetEnvironment = false) {
    const uniqueFolders = [...new Set(capsules.map(c => c.folder || 'Uncategorized'))];
    const N = uniqueFolders.length;
    
    // 1. Setup Folder Core Nodes (Nuclei)
    this.folderCores = uniqueFolders.map((folderName, index) => {
      let ax = 0, ay = 0, az = 0;
      
      if (N > 1) {
        // Spherical distribution via Fibonacci spiral
        const phi = Math.acos(-1 + (2 * index) / (N - 1 || 1));
        const theta = Math.sqrt(N * Math.PI) * phi;
        const sphereRadius = 150;
        
        ax = sphereRadius * Math.sin(phi) * Math.cos(theta);
        ay = sphereRadius * Math.sin(phi) * Math.sin(theta);
        az = sphereRadius * Math.cos(phi);
      } else {
        ax = 0; ay = 0; az = 0;
      }
      
      // HSL color palette tailored by folder indices
      const hue = (index * (360 / Math.max(1, N))) % 360;
      const color = `hsl(${hue}, 85%, 65%)`;
      
      return {
        id: `folder-${folderName}`,
        isFolderCore: true,
        name: folderName,
        title: folderName,
        anchorX: ax,
        anchorY: ay,
        anchorZ: az,
        x: ax,
        y: ay,
        z: az,
        color: color,
        radius: 16,
        capsulesCount: 0
      };
    });
    
    // 2. Setup Capsule Nodes (Electrons) orbiting their parent folder cores
    const folderCapsulesCount = {};
    this.folderCores.forEach(core => {
      folderCapsulesCount[core.name] = 0;
    });
    
    this.capsuleNodes = capsules.map(capsule => {
      const folderName = capsule.folder || 'Uncategorized';
      const core = this.folderCores.find(c => c.name === folderName) || this.folderCores[0];
      
      const indexInFolder = folderCapsulesCount[folderName]++;
      core.capsulesCount++;
      
      // Keplerian Orbit dimensions: outer nodes orbit slower than inner ones
      const orbitRadius = 45 + (indexInFolder % 6) * 16 + Math.random() * 4;
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitSpeed = (0.003 + (1 / orbitRadius) * 0.12) * (Math.random() > 0.5 ? 1 : -1);
      
      // Random tilt orientations in 3D Space
      const tiltX = (Math.random() - 0.5) * 0.9;
      const tiltY = (Math.random() - 0.5) * 0.9;
      
      return {
        id: capsule.id,
        isFolderCore: false,
        title: capsule.title || 'Untitled Memory',
        content: capsule.content || '',
        tags: capsule.tags || [],
        folder: folderName,
        platform: capsule.platform || 'Unknown',
        favorite: capsule.favorite || false,
        usageCount: capsule.stats?.usageCount || 0,
        createdAt: capsule.createdAt,
        parentCore: core,
        orbitRadius: orbitRadius,
        orbitAngle: orbitAngle,
        orbitSpeed: orbitSpeed,
        tiltX: tiltX,
        tiltY: tiltY,
        x: 0,
        y: 0,
        z: 0,
        radius: this.getNodeRadius(capsule),
        color: this.getNodeColor(capsule)
      };
    });
    
    // Combine for collision calculations
    this.nodes = [...this.folderCores, ...this.capsuleNodes];
    
    // 3. Setup Similarity Edges (Constellation links between nodes)
    this.edges = [];
    for (let i = 0; i < this.capsuleNodes.length; i++) {
      for (let j = i + 1; j < this.capsuleNodes.length; j++) {
        const similarity = this.calculateSimilarity(this.capsuleNodes[i], this.capsuleNodes[j]);
        if (similarity > 0.35) {
          this.edges.push({
            source: this.capsuleNodes[i],
            target: this.capsuleNodes[j],
            strength: similarity
          });
        }
      }
    }
    
    // 4. Reset environment coordinates if required (e.g. startup)
    if (resetEnvironment) {
      this.stars = [];
      const starfieldSize = 90;
      for (let i = 0; i < starfieldSize; i++) {
        const r = 150 + Math.random() * 550;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        this.stars.push({
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
          brightness: 0.15 + Math.random() * 0.75
        });
      }
      
      this.angleX = -0.3;
      this.angleY = 0.5;
      this.velocityX = 0.001;
      this.velocityY = 0.0025;
      this.zoom = 1.0;
      this.pan = { x: 0, y: 0 };
    }
  }
  
  calculateSimilarity(node1, node2) {
    let score = 0;
    if (node1.folder === node2.folder) score += 0.35;
    if (node1.platform === node2.platform) score += 0.15;
    
    const sharedTags = node1.tags.filter(t => node2.tags.includes(t));
    score += sharedTags.length * 0.15;
    
    const w1 = new Set(node1.content.toLowerCase().split(/\s+/).slice(0, 35));
    const w2 = new Set(node2.content.toLowerCase().split(/\s+/).slice(0, 35));
    const intersection = new Set([...w1].filter(x => w2.has(x)));
    score += (intersection.size / Math.max(w1.size, w2.size || 1)) * 0.35;
    
    return Math.min(score, 1.0);
  }
  
  getNodeRadius(capsule) {
    const baseRadius = 5.5;
    const usageBonus = Math.min((capsule.stats?.usageCount || 0) * 1.2, 7.5);
    return baseRadius + usageBonus;
  }
  
  getNodeColor(capsule) {
    if (capsule.favorite) return '#818cf8'; // Soft premium Indigo
    const usage = capsule.stats?.usageCount || 0;
    if (usage > 5) return '#34d399'; // Emerald
    if (usage > 0) return '#fbbf24'; // Amber
    return '#a1a1aa'; // Zinc grey for unused
  }
  
  startAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    const frame = () => {
      this.updatePhysics();
      this.render();
      this.animationFrameId = requestAnimationFrame(frame);
    };
    this.animationFrameId = requestAnimationFrame(frame);
  }
  
  updatePhysics() {
    const time = Date.now() * 0.0006;
    
    // 1. Slow drift floating motion for Folder Core Nuclei
    this.folderCores.forEach((core, idx) => {
      const drift = 12; // slow drift range
      core.x = core.anchorX + Math.sin(time + idx * 1.7) * drift;
      core.y = core.anchorY + Math.cos(time + idx * 1.3) * drift;
      core.z = core.anchorZ + Math.sin(time * 0.8 + idx * 2.1) * drift;
      
      // Floating mutual repulsion in 3D space to prevent overlapping cores
      for (let j = idx + 1; j < this.folderCores.length; j++) {
        const other = this.folderCores[j];
        const dx = other.x - core.x;
        const dy = other.y - core.y;
        const dz = other.z - core.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
        const minSpacing = 130;
        
        if (dist < minSpacing) {
          const force = (minSpacing - dist) * 0.005;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;
          
          core.x -= fx;
          core.y -= fy;
          core.z -= fz;
          other.x += fx;
          other.y += fy;
          other.z += fz;
        }
      }
    });
    
    // 2. Drive Keplerian electron orbital motion
    this.capsuleNodes.forEach(node => {
      node.orbitAngle += node.orbitSpeed;
      
      // Orbital plane vector coordinate calculation
      const rx = Math.cos(node.orbitAngle) * node.orbitRadius;
      const rz = Math.sin(node.orbitAngle) * node.orbitRadius;
      const ry = 0;
      
      // Project tiltX (around X-axis)
      const cosTX = Math.cos(node.tiltX), sinTX = Math.sin(node.tiltX);
      const ry1 = ry * cosTX - rz * sinTX;
      const rz1 = rz * cosTX + ry * sinTX;
      
      // Project tiltY (around Y-axis)
      const cosTY = Math.cos(node.tiltY), sinTY = Math.sin(node.tiltY);
      const rx2 = rx * cosTY - rz1 * sinTY;
      const rz2 = rz1 * cosTY + rx * sinTY;
      
      // Translate in relation to active nucleus core
      node.x = node.parentCore.x + rx2;
      node.y = node.parentCore.y + ry1;
      node.z = node.parentCore.z + rz2;
    });
    
    // 3. Decay camera rotation velocities
    if (this.isDragging) {
      // handled dynamically in handleMouseMove
    } else {
      this.angleX += this.velocityX;
      this.angleY += this.velocityY;
      
      this.velocityX *= 0.96;
      this.velocityY *= 0.96;
      
      // Gentle infinite background rotation engage
      const speed = Math.sqrt(this.velocityX*this.velocityX + this.velocityY*this.velocityY);
      if (speed < 0.0006) {
        this.velocityY = 0.0006;
      }
    }
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 3D Point Spatial Rotation & Perspective Projection Engine
    const project = (point) => {
      // Rotation Y
      const cosY = Math.cos(this.angleY), sinY = Math.sin(this.angleY);
      const x1 = point.x * cosY - point.z * sinY;
      const z1 = point.z * cosY + point.x * sinY;
      
      // Rotation X
      const cosX = Math.cos(this.angleX), sinX = Math.sin(this.angleX);
      const y2 = point.y * cosX - z1 * sinX;
      const z2 = z1 * cosX + point.y * sinX;
      
      // Depth focal calculation
      const zDepth = this.cameraDistance + z2;
      const scale = this.focalLength / Math.max(1.0, zDepth);
      
      const px = centerX + (x1 * scale * this.zoom) + this.pan.x;
      const py = centerY + (y2 * scale * this.zoom) + this.pan.y;
      
      return {
        px,
        py,
        rz: z2,
        scale
      };
    };
    
    // Project neural star dust
    this.stars.forEach(star => {
      const proj = project(star);
      star.projX = proj.px;
      star.projY = proj.py;
      star.rz = proj.rz;
      star.projScale = proj.scale;
    });
    
    // Project graph nodes
    this.nodes.forEach(node => {
      const proj = project(node);
      node.projX = proj.px;
      node.projY = proj.py;
      node.rz = proj.rz;
      node.projScale = proj.scale;
      node.projRadius = node.radius * proj.scale * this.zoom;
    });
    
    // Instantiate painters depth sorting queue
    const queue = [];
    
    // 1. Push background stars
    this.stars.forEach(star => {
      queue.push({
        z: star.rz,
        draw: () => {
          const alpha = Math.max(0.05, Math.min(0.7, (1.0 - star.rz / 650) * star.brightness));
          this.ctx.beginPath();
          this.ctx.arc(star.projX, star.projY, 1.2 * star.projScale * this.zoom, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(161, 161, 170, ${alpha})`;
          this.ctx.fill();
        }
      });
    });
    
    // Helper to draw orbital guide ellipses in 3D
    const drawOrbitGuide = (node) => {
      this.ctx.beginPath();
      const core = node.parentCore;
      const steps = 36;
      
      for (let s = 0; s <= steps; s++) {
        const theta = (s / steps) * Math.PI * 2;
        const rx = Math.cos(theta) * node.orbitRadius;
        const rz = Math.sin(theta) * node.orbitRadius;
        const ry = 0;
        
        const cosTX = Math.cos(node.tiltX), sinTX = Math.sin(node.tiltX);
        const ry1 = ry * cosTX - rz * sinTX;
        const rz1 = rz * cosTX + ry * sinTX;
        
        const cosTY = Math.cos(node.tiltY), sinTY = Math.sin(node.tiltY);
        const rx2 = rx * cosTY - rz1 * sinTY;
        const rz2 = rz1 * cosTY + rx * sinTY;
        
        const pt = {
          x: core.x + rx2,
          y: core.y + ry1,
          z: core.z + rz2
        };
        
        const proj = project(pt);
        if (s === 0) {
          this.ctx.moveTo(proj.px, proj.py);
        } else {
          this.ctx.lineTo(proj.px, proj.py);
        }
      }
      
      // Translucent guide path using matching core color system
      this.ctx.strokeStyle = core.color.replace('hsl', 'hsla').replace(')', ', 0.08)');
      this.ctx.lineWidth = 0.8;
      this.ctx.setLineDash([3, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    };
    
    // 2. Push Orbit Paths
    this.capsuleNodes.forEach(node => {
      queue.push({
        z: node.parentCore.rz + 15, // slightly in the background
        draw: () => drawOrbitGuide(node)
      });
    });
    
    // 3. Push Filament Lines from Capsule to parent nuclei
    this.capsuleNodes.forEach(node => {
      queue.push({
        z: (node.rz + node.parentCore.rz) / 2 + 5,
        draw: () => {
          this.ctx.beginPath();
          this.ctx.moveTo(node.projX, node.projY);
          this.ctx.lineTo(node.parentCore.projX, node.parentCore.projY);
          
          const alpha = Math.max(0.03, Math.min(0.24, (1.0 - node.rz / 500) * 0.22));
          this.ctx.strokeStyle = node.parentCore.color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
          this.ctx.lineWidth = 0.7 * node.projScale;
          this.ctx.stroke();
        }
      });
    });
    
    // 4. Push similarity links between capsules
    this.edges.forEach(edge => {
      queue.push({
        z: (edge.source.rz + edge.target.rz) / 2 + 2,
        draw: () => {
          // Avoid rendering out-of-screen links
          if (isNaN(edge.source.projX) || isNaN(edge.target.projX)) return;
          
          this.ctx.beginPath();
          this.ctx.moveTo(edge.source.projX, edge.source.projY);
          this.ctx.lineTo(edge.target.projX, edge.target.projY);
          
          const avgScale = (edge.source.projScale + edge.target.projScale) / 2;
          const alpha = Math.max(0.015, Math.min(0.18, (1.0 - (edge.source.rz + edge.target.rz) / 1200) * edge.strength * 0.22));
          
          this.ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`; // Soft indigo filaments
          this.ctx.lineWidth = edge.strength * 1.2 * avgScale;
          this.ctx.stroke();
        }
      });
    });
    
    // 5. Push Nodes themselves (Cores and Electrons)
    this.nodes.forEach(node => {
      queue.push({
        z: node.rz,
        draw: () => {
          this.ctx.save();
          const opacity = Math.max(0.15, Math.min(1.0, 1.0 - node.rz / 450));
          
          if (node.isFolderCore) {
            // Render Folder Nuclei Core
            this.ctx.beginPath();
            this.ctx.arc(node.projX, node.projY, node.projRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = node.color;
            
            // Neon drop shadow glow
            this.ctx.shadowColor = node.color;
            this.ctx.shadowBlur = 16 * node.projScale * this.zoom;
            this.ctx.fill();
            
            // Structural outer halo ring
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.arc(node.projX, node.projY, node.projRadius + 6 * node.projScale * this.zoom, 0, Math.PI * 2);
            this.ctx.strokeStyle = node.color.replace('hsl', 'hsla').replace(')', ', 0.35)');
            this.ctx.lineWidth = 1.0 * node.projScale;
            this.ctx.stroke();
            
            // Glow rings for hovered or selected folder centers
            if (node === this.selectedNode) {
              this.ctx.strokeStyle = '#ffffff';
              this.ctx.lineWidth = 2.0 * node.projScale;
              this.ctx.beginPath();
              this.ctx.arc(node.projX, node.projY, node.projRadius + 10 * node.projScale, 0, Math.PI * 2);
              this.ctx.stroke();
            } else if (node === this.hoveredNode) {
              this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
              this.ctx.lineWidth = 1.2 * node.projScale;
              this.ctx.beginPath();
              this.ctx.arc(node.projX, node.projY, node.projRadius + 10 * node.projScale, 0, Math.PI * 2);
              this.ctx.stroke();
            }
            
            // Folder title label text
            this.ctx.fillStyle = `rgba(244, 244, 245, ${opacity})`;
            this.ctx.font = `bold ${Math.round(11 * node.projScale * this.zoom)}px 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(node.name, node.projX, node.projY - node.projRadius - 12 * node.projScale);
            
          } else {
            // Render Capsule Electron
            this.ctx.beginPath();
            this.ctx.arc(node.projX, node.projY, node.projRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = node.color;
            
            if (node.favorite) {
              this.ctx.shadowColor = '#818cf8';
              this.ctx.shadowBlur = 8 * node.projScale;
            }
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Draw rings for hovered or selected capsules
            if (node === this.selectedNode) {
              this.ctx.strokeStyle = '#ffffff';
              this.ctx.lineWidth = 2.0 * node.projScale;
              this.ctx.stroke();
            } else if (node === this.hoveredNode) {
              this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
              this.ctx.lineWidth = 1.2 * node.projScale;
              this.ctx.stroke();
            }
            
            // Display label if hovered/selected or is relatively prominent
            if (node.projRadius > 6.5 || node === this.selectedNode || node === this.hoveredNode) {
              this.ctx.fillStyle = `rgba(212, 212, 216, ${opacity})`;
              this.ctx.font = `${Math.round(10 * node.projScale)}px 'Inter', sans-serif`;
              this.ctx.textAlign = 'center';
              
              const label = node.title.substring(0, 18) + (node.title.length > 18 ? '...' : '');
              this.ctx.fillText(label, node.projX, node.projY + node.projRadius + 12 * node.projScale);
            }
          }
          
          this.ctx.restore();
        }
      });
    });
    
    // Sort from deep-background to foreground (painters algorithm depth sort)
    queue.sort((a, b) => b.z - a.z);
    
    // Render every visual layer in order
    queue.forEach(item => item.draw());
  }
  
  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const node = this.getNodeAt(mx, my);
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    
    if (node) {
      this.dragNode = node;
      this.selectedNode = node;
      if (!node.isFolderCore) {
        this.showNodeDetails(node);
      } else {
        this.showFolderDetails(node);
      }
    } else {
      this.dragNode = null;
    }
  }
  
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    
    if (this.isDragging) {
      if (e.shiftKey || e.button === 1 || e.button === 2) {
        // Shift key drags pan the viewport
        this.pan.x += dx;
        this.pan.y += dy;
      } else {
        // Dragging revolves camera rotation angles in 3D
        this.angleY += dx * 0.005;
        this.angleX -= dy * 0.005;
        
        // Clamp X tilt range to prevent disorienting flip
        this.angleX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.angleX));
        
        // Inertia track velocity vectors
        this.velocityY = dx * 0.005;
        this.velocityX = -dy * 0.005;
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else {
      // Hover hit testing
      const node = this.getNodeAt(mx, my);
      if (node !== this.hoveredNode) {
        this.hoveredNode = node;
      }
    }
  }
  
  handleMouseUp() {
    this.isDragging = false;
    this.dragNode = null;
  }
  
  handleClick(e) {
    // Only register click if drag movement is negligible
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const node = this.getNodeAt(mx, my);
    if (node) {
      this.selectedNode = node;
      if (node.isFolderCore) {
        this.showFolderDetails(node);
      } else {
        this.showNodeDetails(node);
      }
    }
  }
  
  handleWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    this.zoom *= factor;
    this.zoom = Math.max(0.15, Math.min(2.5, this.zoom));
  }
  
  getNodeAt(mx, my) {
    // Traverse from front to back using depth index coordinates
    const sorted = [...this.nodes].sort((a, b) => a.rz - b.rz);
    
    for (let node of sorted) {
      if (node.projX === undefined || node.projY === undefined) continue;
      
      const dx = mx - node.projX;
      const dy = my - node.projY;
      
      // Touch targets are slightly expanded on screen for fluid interaction
      const targetRadius = Math.max(12, node.projRadius || node.radius);
      
      if (dx * dx + dy * dy <= targetRadius * targetRadius) {
        return node;
      }
    }
    return null;
  }
  
  showNodeDetails(node) {
    const details = document.getElementById('node-details');
    if (!details) return;
    
    details.innerHTML = `
      <div class="selected-capsule-card">
        <h4 class="capsule-detail-title">${node.title}</h4>
        
        <div class="capsule-meta-grid">
          <div class="meta-item">
            <span class="meta-label">Folder</span>
            <span class="meta-value">📁 ${node.folder}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Platform</span>
            <span class="meta-value">🤖 ${node.platform}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Usage</span>
            <span class="meta-value">📈 ${node.usageCount} times</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Type</span>
            <span class="meta-value">${node.favorite ? '⭐ Favorite' : '📄 Capsule'}</span>
          </div>
        </div>

        <div class="capsule-content-preview">
          <pre>${node.content}</pre>
        </div>
        
        ${node.tags.length > 0 ? `
          <div class="capsule-detail-tags">
            ${node.tags.map(tag => `<span class="detail-tag">#${tag}</span>`).join('')}
          </div>
        ` : ''}

        <div class="capsule-detail-actions">
          <button id="detail-copy-btn" class="action-btn primary">Copy Text</button>
        </div>
      </div>
    `;
    
    // Bind copy action natively
    document.getElementById('detail-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(node.content);
      const btn = document.getElementById('detail-copy-btn');
      btn.innerText = 'Copied! ✓';
      btn.style.background = '#10b981';
      setTimeout(() => {
        btn.innerText = 'Copy Text';
        btn.style.background = '';
      }, 1500);
    });
  }
  
  showFolderDetails(node) {
    const details = document.getElementById('node-details');
    if (!details) return;
    
    const folderCapsules = this.capsuleNodes.filter(c => c.folder === node.name);
    
    details.innerHTML = `
      <div class="selected-folder-card">
        <h4 class="folder-detail-title">📁 ${node.name}</h4>
        <div class="folder-meta">
          Contains <strong>${folderCapsules.length}</strong> memory capsules
        </div>
        
        <div class="folder-capsules-list">
          ${folderCapsules.map(c => `
            <div class="folder-capsule-item" data-id="${c.id}">
              <span class="capsule-bullet" style="background: ${node.color}"></span>
              <span class="capsule-name">${c.title}</span>
            </div>
          `).join('')}
          ${folderCapsules.length === 0 ? `
            <p class="empty-state">No active memories in folder</p>
          ` : ''}
        </div>
      </div>
    `;
    
    // Interactive capsule click navigation directly inside folder list cards
    details.querySelectorAll('.folder-capsule-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const capsule = this.capsuleNodes.find(c => c.id === id);
        if (capsule) {
          this.selectedNode = capsule;
          this.showNodeDetails(capsule);
        }
      });
    });
  }
  
  updateStats() {
    document.getElementById('total-nodes').textContent = this.capsuleNodes.length;
    document.getElementById('total-edges').textContent = this.edges.length;
    document.getElementById('total-clusters').textContent = this.folderCores.length;
  }
  
  zoomIn() {
    this.zoom = Math.min(2.5, this.zoom * 1.2);
  }
  
  zoomOut() {
    this.zoom = Math.max(0.15, this.zoom * 0.8);
  }
  
  reset() {
    this.angleX = -0.3;
    this.angleY = 0.5;
    this.velocityX = 0.001;
    this.velocityY = 0.0025;
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.selectedNode = null;
    this.hoveredNode = null;
    
    const details = document.getElementById('node-details');
    if (details) {
      details.innerHTML = '<p class="empty-state">Click a node to see details</p>';
    }
  }
  
  applyFilters() {
    const showFav = document.getElementById('filter-favorites').checked;
    const showRecent = document.getElementById('filter-recent').checked;
    const showUnused = document.getElementById('filter-unused').checked;
    
    // Extract filter choices
    const checkedFolders = Array.from(document.querySelectorAll('.folder-filter-cb:checked')).map(cb => cb.value);
    const checkedPlatforms = Array.from(document.querySelectorAll('.platform-filter-cb:checked')).map(cb => cb.value);
    
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const filtered = this.allCapsules.filter(c => {
      // 1. Favorites check
      if (c.favorite && !showFav) return false;
      
      // 2. Recent check
      const isRecent = c.createdAt && (c.createdAt > thirtyDaysAgo);
      if (isRecent && !showRecent) return false;
      
      // 3. Unused check
      const isUnused = (c.stats?.usageCount || 0) === 0;
      if (isUnused && !showUnused) return false;
      
      // 4. Folder checklist
      const folderName = c.folder || 'Uncategorized';
      if (!checkedFolders.includes(folderName)) return false;
      
      // 5. Platform checklist
      const platformName = c.platform || 'Unknown';
      if (!checkedPlatforms.includes(platformName)) return false;
      
      return true;
    });
    
    this.buildGraph(filtered, false); // false preserves camera spin and momentum
    this.updateStats();
  }
}

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

// Initialise KnowledgeGraph on document ready
document.addEventListener('DOMContentLoaded', () => {
  new KnowledgeGraph();
});
