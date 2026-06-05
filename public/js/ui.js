/**
 * ELEMENT CLASH: DOM MANAGER & WEBAUDIO SYNTHESIZER
 */

// Native Web Audio Synthesizer for retro arcade sound effects
const AudioSynth = {
  ctx: null,
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  },

  playLock() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.setValueAtTime(150, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  },

  playClash(outcome) {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    let freqStart = 300;
    let freqEnd = 100;
    let type = 'sine';
    let vol = 0.08;

    if (outcome === 'SUPERIOR') {
      freqStart = 580;
      freqEnd = 200;
      type = 'sawtooth';
      vol = 0.06;
    } else if (outcome === 'INFERIOR') {
      freqStart = 180;
      freqEnd = 50;
      type = 'sawtooth';
      vol = 0.08;
    } else {
      // Neutral
      freqStart = 250;
      freqEnd = 120;
      type = 'sine';
      vol = 0.08;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + 0.35);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  },

  playMatchFound() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // Upbeat retro arcade arpeggio
    playTone(392.00, 0.0, 0.2);   // G4
    playTone(523.25, 0.08, 0.2);  // C5
    playTone(659.25, 0.16, 0.2);  // E5
    playTone(783.99, 0.24, 0.45); // G5
  },

  playVictory() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + delay + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // Triumphant melody
    playTone(392.00, 0.0, 0.15); // G4
    playTone(392.00, 0.15, 0.15); // G4
    playTone(392.00, 0.3, 0.15); // G4
    playTone(523.25, 0.45, 0.4); // C5
    playTone(659.25, 0.85, 0.2); // E5
    playTone(783.99, 1.05, 0.6); // G5
  },

  playDefeat() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // Somber dropping notes
    playTone(220.00, 0.0, 0.4); // A3
    playTone(207.65, 0.4, 0.4); // G#3
    playTone(196.00, 0.8, 0.7); // G3
  }
};

// UI Manager holding states and DOM bindings
const UI = {
  // Screen Elements
  matchmakingScreen: document.getElementById('matchmaking-screen'),
  draftScreen: document.getElementById('draft-screen'),
  battleScreen: document.getElementById('battle-screen'),
  gameOverScreen: document.getElementById('game-over-screen'),
  
  // Matchmaking elements
  usernameInput: document.getElementById('username-input'),
  playBtn: document.getElementById('play-btn'),
  leaveQueueBtn: document.getElementById('leave-queue-btn'),
  statusText: document.getElementById('status-text'),
  queueStatusSub: document.getElementById('queue-status-sub'),
  queueCountDisplay: document.getElementById('queue-count-display'),
  
  // Draft elements
  draftTimerVal: document.getElementById('draft-timer-val'),
  draftCounterVal: document.getElementById('draft-counter-val'),
  draftCardsGrid: document.getElementById('draft-cards-grid'),
  draftLockBtn: document.getElementById('draft-lock-btn'),
  draftKeywordInfo: document.getElementById('draft-keyword-info'),
  
  // Battle HUD elements
  playerName: document.getElementById('player-name'),
  playerHpVal: document.getElementById('player-hp-val'),
  playerHpFill: document.getElementById('player-hp-fill'),
  playerShieldVal: document.getElementById('player-shield-val'),
  playerShieldBox: document.getElementById('player-shield-box'),
  playerStatusContainer: document.getElementById('player-status-container'),
  
  enemyName: document.getElementById('enemy-name'),
  enemyHpVal: document.getElementById('enemy-hp-val'),
  enemyHpFill: document.getElementById('enemy-hp-fill'),
  enemyShieldVal: document.getElementById('enemy-shield-val'),
  enemyShieldBox: document.getElementById('enemy-shield-box'),
  enemyStatusContainer: document.getElementById('enemy-status-container'),
  
  enemyCardDots: document.getElementById('enemy-card-dots'),
  battleKeywordInfo: document.getElementById('battle-keyword-info'),
  
  // Arena elements
  playerPlaySlot: document.getElementById('player-play-slot'),
  enemyPlaySlot: document.getElementById('enemy-play-slot'),
  vsBadge: document.getElementById('vs-badge'),
  arenaCombatText: document.getElementById('arena-combat-text'),
  damagePopupContainer: document.getElementById('damage-popup-container'),
  
  // Player Interaction Hand
  playerHand: document.getElementById('player-hand'),
  lockBtn: document.getElementById('lock-btn'),
  
  // Game Over Elements
  gameOverTitle: document.getElementById('game-over-title'),
  gameOverMsg: document.getElementById('game-over-msg'),
  goFinalHp: document.getElementById('go-final-hp'),
  goRounds: document.getElementById('go-rounds'),
  goLobbyBtn: document.getElementById('go-lobby-btn'),
  
  // Selection States
  selectedCardInstanceId: null,
  isLocked: false,

  /**
   * Toggles active screens
   * @param {string} screenName 'lobby' | 'draft' | 'battle' | 'gameOver'
   */
  showScreen(screenName) {
    this.matchmakingScreen.classList.remove('active');
    if (this.draftScreen) this.draftScreen.classList.remove('active');
    this.battleScreen.classList.remove('active');
    this.gameOverScreen.classList.remove('active');

    if (screenName === 'lobby') {
      this.matchmakingScreen.classList.add('active');
    } else if (screenName === 'draft') {
      if (this.draftScreen) this.draftScreen.classList.add('active');
    } else if (screenName === 'battle') {
      this.battleScreen.classList.add('active');
    } else if (screenName === 'gameOver') {
      this.gameOverScreen.classList.add('active');
    }
  },

  /**
   * Renders the 8 cards in the draft pool
   * @param {Array} pool List of card templates
   * @param {Function} onCardClick Callback when a draft card is clicked (passed instanceId, cardEl)
   */
  renderDraftPool(pool, onCardClick) {
    this.draftCardsGrid.innerHTML = '';
    pool.forEach(card => {
      const cardEl = this.createCardElement(card);
      this.draftCardsGrid.appendChild(cardEl);
      cardEl.addEventListener('click', () => {
        onCardClick(card.instanceId, cardEl);
      });
    });
  },

  /**
   * Parses card description for keywords and renders the explanations
   * @param {HTMLElement} container DOM element for keyword explanations
   * @param {string} cardDescription InnerHTML or string description of card
   */
  updateKeywordExplanations(container, cardDescription = '') {
    if (!container) return;
    container.innerHTML = '';
    
    const keywords = [];
    if (cardDescription.includes('kw-burn')) {
      keywords.push({
        title: 'BURN',
        class: 'burn',
        desc: 'Takes damage equal to stack x2 (bypassing shields). All stacks expire at the end of the round.'
      });
    }
    if (cardDescription.includes('kw-poison')) {
      keywords.push({
        title: 'POISON',
        class: 'poison',
        desc: 'Takes damage equal to stack count (bypassing shields). Stack decreases by 1 each round.'
      });
    }
    if (cardDescription.includes('kw-buff')) {
      keywords.push({
        title: 'BUFF',
        class: 'buff',
        desc: 'Increases card clash damage by +10% per stack (max 5 stacks). Stack decreases by 1 only when attacking.'
      });
    }
    if (cardDescription.includes('kw-weak')) {
      keywords.push({
        title: 'WEAK',
        class: 'weak',
        desc: 'Reduces card clash damage by -10% per stack (max 5 stacks). Stack decreases by 1 only when attacking.'
      });
    }
    if (cardDescription.includes('kw-shield')) {
      keywords.push({
        title: 'SHIELD',
        class: 'shield',
        desc: 'Blocks incoming attack damage. Remaining shield carries over to the next round.'
      });
    }
    if (cardDescription.includes('kw-cleanse')) {
      keywords.push({
        title: 'CLEANSE',
        class: 'cleanse',
        desc: 'Immediately removes all active debuffs (Poison, Burn, and Weakness).'
      });
    }
    if (cardDescription.includes('kw-heal')) {
      keywords.push({
        title: 'HEAL',
        class: 'heal',
        desc: 'Restores HP to the player (up to 100 max HP).'
      });
    }
    
    if (keywords.length === 0) {
      container.classList.add('hidden');
    } else {
      keywords.forEach(kw => {
        const div = document.createElement('div');
        div.className = 'keyword-entry';
        div.innerHTML = `<span class="keyword-title ${kw.class}">${kw.title}</span>: ${kw.desc}`;
        container.appendChild(div);
      });
      container.classList.remove('hidden');
    }
  },

  /**
   * Displays details of active status effects for a player
   */
  showPlayerStatusExplanations(statuses, username) {
    if (!this.battleKeywordInfo) return;
    this.battleKeywordInfo.innerHTML = '';
    
    const keywords = [];
    if (statuses && statuses.burn > 0) {
      keywords.push({
        title: 'BURN',
        class: 'burn',
        desc: `Currently active stack: ${statuses.burn}. Takes damage equal to stack x2 (bypassing shields). All stacks expire at the end of the round.`
      });
    }
    if (statuses && statuses.poison > 0) {
      keywords.push({
        title: 'POISON',
        class: 'poison',
        desc: `Currently active stack: ${statuses.poison}. Takes damage equal to stack count (bypassing shields). Stack decreases by 1 each round.`
      });
    }
    if (statuses && statuses.attackBuff > 0) {
      keywords.push({
        title: 'BUFF',
        class: 'buff',
        desc: `Currently active stack: ${statuses.attackBuff}. Increases card clash damage by +10% per stack (max 5 stacks). Stack decreases by 1 only when attacking.`
      });
    }
    if (statuses && statuses.weakness > 0) {
      keywords.push({
        title: 'WEAK',
        class: 'weak',
        desc: `Currently active stack: ${statuses.weakness}. Reduces card clash damage by -10% per stack (max 5 stacks). Stack decreases by 1 only when attacking.`
      });
    }

    if (keywords.length === 0) {
      const div = document.createElement('div');
      div.className = 'keyword-entry';
      div.innerHTML = `<span style="color: var(--text-secondary); font-style: italic;">${username} has no active status effects.</span>`;
      this.battleKeywordInfo.appendChild(div);
    } else {
      keywords.forEach(kw => {
        const div = document.createElement('div');
        div.className = 'keyword-entry';
        div.innerHTML = `<span class="keyword-title ${kw.class}">${kw.title}</span>: ${kw.desc}`;
        this.battleKeywordInfo.appendChild(div);
      });
    }
    this.battleKeywordInfo.classList.remove('hidden');
  },

  /**
   * Maps element name to font-awesome icons
   */
  getElementIconClass(elementName) {
    switch(elementName) {
      case 'FIRE': return 'fa-fire';
      case 'WATER': return 'fa-droplet';
      case 'NATURE': return 'fa-leaf';
      case 'NEUTRAL': return 'fa-cube';
      case 'CHAOS': return 'fa-wand-magic-sparkles';
      default: return 'fa-circle-question';
    }
  },

  /**
   * Generates card HTML string (without element badge in header)
   */
  createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.setAttribute('data-element', card.element);
    cardDiv.setAttribute('data-instance-id', card.instanceId);
    cardDiv.id = `card-${card.instanceId}`;
    
    const iconClass = this.getElementIconClass(card.element);
    
    cardDiv.innerHTML = `
      <div class="card-face card-front">
        <div class="card-header">
          <span class="card-name">${card.name}</span>
        </div>
        <div class="card-middle">
          <i class="card-element-icon fa-solid ${iconClass}"></i>
          <p class="card-desc">${card.description}</p>
        </div>
        <div class="card-footer">
          <span class="card-element-name">${card.element}</span>
        </div>
      </div>
      <div class="card-face card-back"></div>
    `;

    return cardDiv;
  },

  /**
   * Renders active status effect badges in player HUDs
   */
  renderStatuses(container, statuses = {}) {
    container.innerHTML = '';
    if (!statuses) return;

    // Burn status
    if (statuses.burn > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge burn';
      badge.innerHTML = `<i class="fa-solid fa-fire"></i> ${statuses.burn}`;
      badge.title = `Burned: Takes ${statuses.burn * 2} damage bypassing shields (expires after this round)`;
      container.appendChild(badge);
    }

    // Poison status
    if (statuses.poison > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge poison';
      badge.innerHTML = `<i class="fa-solid fa-skull-crossbones"></i> ${statuses.poison}`;
      badge.title = `Poisoned: Takes ${statuses.poison} damage bypassing shields (${statuses.poison} rounds left)`;
      container.appendChild(badge);
    }

    // Attack Buff status
    if (statuses.attackBuff > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge attack-buff';
      badge.innerHTML = `<i class="fa-solid fa-bolt"></i> +${statuses.attackBuff * 10}%`;
      badge.title = `Buff: Clash damage increased by +${statuses.attackBuff * 10}% (decays when attacking: ${statuses.attackBuff} stacks left)`;
      container.appendChild(badge);
    }

    // Weakness status
    if (statuses.weakness > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge weakness';
      badge.innerHTML = `<i class="fa-solid fa-arrow-down-long"></i> -${statuses.weakness * 10}%`;
      badge.title = `Weakness: Clash damage reduced by -${statuses.weakness * 10}% (decays when attacking: ${statuses.weakness} stacks left)`;
      container.appendChild(badge);
    }
  },

  /**
   * Renders the cards in the player's hand with Hearthstone fan layout
   * @param {Array} hand List of card objects
   * @param {boolean} animate Whether to stagger draw animations
   */
  renderHand(hand, animate = false) {
    this.playerHand.innerHTML = '';
    
    if (hand.length === 0) return;

    const total = hand.length;

    hand.forEach((card, index) => {
      const cardEl = this.createCardElement(card);
      this.playerHand.appendChild(cardEl);

      // Set CSS variables for CSS-only layout calculation (stable & hover-spreadable)
      cardEl.style.setProperty('--index', index);
      cardEl.style.setProperty('--total', total);
      cardEl.style.zIndex = index + 1;

      // Bind events to cards (unless hand locked)
      if (!this.isLocked) {
        cardEl.addEventListener('click', () => {
          AudioSynth.playClick();
          this.selectCard(card.instanceId);
        });
      }
    });

    if (animate) {
      const cardEls = this.playerHand.querySelectorAll('.card');
      Animations.animateCardDraw(cardEls);
    }
  },

  /**
   * Updates opponent hand indicator card count dots
   * @param {number} size Hand size count
   */
  updateOpponentHandSize(size) {
    this.enemyCardDots.innerHTML = '';
    for (let i = 0; i < size; i++) {
      const dot = document.createElement('span');
      this.enemyCardDots.appendChild(dot);
    }
  },

  /**
   * Selects a card from the hand
   */
  selectCard(instanceId) {
    if (this.isLocked) return;

    // Deselect if clicking already selected
    if (this.selectedCardInstanceId === instanceId) {
      this.selectedCardInstanceId = null;
      this.lockBtn.classList.add('disabled');
      this.lockBtn.disabled = true;
      this.lockBtn.querySelector('.lock-btn-text').innerText = 'SELECT CARD';
      
      const selectedCard = this.playerHand.querySelector('.card.selected');
      if (selectedCard) selectedCard.classList.remove('selected');
      
      this.updateKeywordExplanations(this.battleKeywordInfo, '');
      window.SocketService.selectCard(null);
      return;
    }

    // Set new selection
    this.selectedCardInstanceId = instanceId;
    this.lockBtn.classList.remove('disabled');
    this.lockBtn.disabled = false;
    this.lockBtn.querySelector('.lock-btn-text').innerText = 'LOCK SELECTION';

    // Remove selection glow from all others
    const cards = this.playerHand.querySelectorAll('.card');
    cards.forEach(card => {
      card.classList.remove('selected');
      if (card.getAttribute('data-instance-id') === instanceId) {
        card.classList.add('selected');
        
        // Render keyword definitions for selected card (overrides status panel)
        const descEl = card.querySelector('.card-desc');
        const desc = descEl ? descEl.innerHTML : '';
        this.battleKeywordInfo.dataset.source = ''; // Reset status panel source
        this.updateKeywordExplanations(this.battleKeywordInfo, desc);
        
        // Also close legend if it was open
        const legendPanel = document.getElementById('element-legend-panel');
        const legendBtn = document.getElementById('element-legend-btn');
        if (legendPanel && !legendPanel.classList.contains('hidden')) {
          legendPanel.classList.add('hidden');
          if (legendBtn) legendBtn.classList.remove('active');
        }
      }
    });

    // Notify opponent
    window.SocketService.selectCard(instanceId);
  },

  /**
   * Locks player selection
   */
  lockSelection() {
    if (!this.selectedCardInstanceId || this.isLocked) return;
    
    this.isLocked = true;
    this.lockBtn.classList.add('locked-state');
    this.lockBtn.disabled = true;
    this.lockBtn.querySelector('.lock-btn-text').innerText = 'LOCKED';
    
    // Add locked state border to card
    const selectedCard = this.playerHand.querySelector('.card.selected');
    if (selectedCard) {
      selectedCard.classList.add('locked');
    }

    // Disable clicks on all hand cards
    const cards = this.playerHand.querySelectorAll('.card');
    cards.forEach(c => c.style.pointerEvents = 'none');

    // Hide keyword panel when locked
    this.updateKeywordExplanations(this.battleKeywordInfo, '');

    AudioSynth.playLock();
    window.SocketService.lockSelection();
  },

  /**
   * Updates player/enemy shield indicators
   */
  updateShield(elementBox, elementText, val) {
    elementText.innerText = val;
    if (val > 0) {
      elementBox.classList.remove('empty');
    } else {
      elementBox.classList.add('empty');
    }
  },

  /**
   * Sets the HUD player/enemy name while preserving the info icon element
   * @param {HTMLElement} nameEl The .hud-name span element
   * @param {string} name The player name text to set
   */
  setHudName(nameEl, name) {
    // Find or keep info icon if present
    const existingIcon = nameEl.querySelector('.hud-info-icon');
    nameEl.textContent = name + ' ';
    if (existingIcon) {
      nameEl.appendChild(existingIcon);
    } else {
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-circle-info hud-info-icon';
      nameEl.appendChild(icon);
    }
  },

  /**
   * Resets battle arena visual slots back to blank state
   */
  clearArenaSlots() {
    this.playerPlaySlot.innerHTML = '';
    this.enemyPlaySlot.innerHTML = '';
    this.playerPlaySlot.classList.remove('filled');
    this.enemyPlaySlot.classList.remove('filled');
    this.arenaCombatText.innerText = 'Select your card!';
    this.vsBadge.style.opacity = '1';
    
    // Reset legend button state (but keep panel hidden - round transition)
    const legendBtn = document.getElementById('element-legend-btn');
    if (legendBtn) legendBtn.classList.remove('active');
    const legendPanel = document.getElementById('element-legend-panel');
    if (legendPanel) legendPanel.classList.add('hidden');
  }
};

// Expose globally
window.AudioSynth = AudioSynth;
window.UI = UI;
