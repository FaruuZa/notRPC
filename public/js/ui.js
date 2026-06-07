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
  },

  playShieldBreak() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High metal clink / shield sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.18);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  },

  playQuestComplete() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur, type = 'sine') => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // A sparkling, rewarding sound
    playTone(523.25, 0.0, 0.25, 'triangle');  // C5
    playTone(659.25, 0.08, 0.25, 'triangle'); // E5
    playTone(783.99, 0.16, 0.25, 'triangle'); // G5
    playTone(1046.50, 0.24, 0.5, 'sine');    // C6
  }
};

const RELIC_DATABASE = {
  steady_resolve: {
    name: 'Steady Resolve',
    quality: 'COMMON',
    icon: 'fa-shield-halved',
    description: 'When obtaining Neutral outcome: gain 3 Shield per stack.'
  },
  nature_affinity: {
    name: 'Nature Affinity',
    quality: 'COMMON',
    icon: 'fa-heart-pulse',
    description: 'All Nature cards: +2 Heal per stack.'
  },
  frozen_shield: {
    name: 'Frozen Shield',
    quality: 'COMMON',
    icon: 'fa-snowflake',
    description: 'All Water cards: gain 2 Shield on Superior outcome per stack.'
  },
  iron_grit: {
    name: 'Iron Grit',
    quality: 'COMMON',
    icon: 'fa-dumbbell',
    description: 'All Neutral cards: gain 2 Shield on Neutral outcome per stack.'
  },
  fire_mastery: {
    name: 'Fire Mastery',
    quality: 'RARE',
    icon: 'fa-fire',
    description: 'All Fire cards: +2 Damage per stack.'
  },
  water_mastery: {
    name: 'Water Mastery',
    quality: 'RARE',
    icon: 'fa-droplet',
    description: 'All Water cards: +2 Damage per stack.'
  },
  nature_mastery: {
    name: 'Nature Mastery',
    quality: 'RARE',
    icon: 'fa-leaf',
    description: 'All Nature cards: +2 Damage per stack.'
  },
  ember_spark: {
    name: 'Ember Spark',
    quality: 'RARE',
    icon: 'fa-fire-flame-curved',
    description: 'All Fire cards apply +1 Burn on Superior outcome per stack.'
  },
  venomous_brambles: {
    name: 'Venomous Brambles',
    quality: 'RARE',
    icon: 'fa-wheat-awn-circle-exclamation',
    description: 'All Nature cards apply +1 Poison on Superior outcome per stack.'
  },
  tidal_wisdom: {
    name: 'Tidal Wisdom',
    quality: 'EPIC',
    icon: 'fa-water',
    description: 'At the start of each round: gain 4 Shield per stack.'
  },
  burning_core: {
    name: 'Burning Core',
    quality: 'EPIC',
    icon: 'fa-sun',
    description: 'Burn deals +1 damage per stack of burn, per stack of relic.'
  },
  toxic_catalyst: {
    name: 'Toxic Catalyst',
    quality: 'EPIC',
    icon: 'fa-biohazard',
    description: 'Poison deals +1 damage per stack of poison, per stack of relic.'
  },
  aggressive_momentum: {
    name: 'Aggressive Momentum',
    quality: 'EPIC',
    icon: 'fa-bolt',
    description: 'When obtaining Superior outcome: deal 2 extra damage per stack.'
  },
  elemental_harmony: {
    name: 'Elemental Harmony',
    quality: 'EPIC',
    icon: 'fa-circle-nodes',
    description: 'All Fire, Water, and Nature cards: +1 Damage per stack.'
  },
  chaos_engine: {
    name: 'Chaos Engine',
    quality: 'LEGENDARY',
    icon: 'fa-gear',
    description: 'Chaos cards: +3 Damage per stack. Inferior outcome: take 3 self damage per stack.'
  },
  last_stand: {
    name: 'Last Stand',
    quality: 'LEGENDARY',
    icon: 'fa-shield-heart',
    description: 'When obtaining Inferior outcome: gain Buff(1) per stack.'
  },
  relic_vitality_common: {
    name: 'Vitality Boost',
    quality: 'COMMON',
    icon: 'fa-heart-pulse',
    description: 'Permanent +15 Max HP and HP per stack.'
  },
  relic_shield_regen_common: {
    name: 'Fortress Shell',
    quality: 'COMMON',
    icon: 'fa-shield',
    description: 'At the start of each turn: gain 3 Shield per stack.'
  },
  relic_vitality_rare: {
    name: 'Iron Vitality',
    quality: 'RARE',
    icon: 'fa-heart-circle-plus',
    description: 'Permanent +25 Max HP and HP per stack.'
  },
  relic_shield_regen_rare: {
    name: 'Bastion Shield',
    quality: 'RARE',
    icon: 'fa-shield-halved',
    description: 'At the start of each turn: gain 5 Shield per stack.'
  },
  relic_vitality_epic: {
    name: 'Godly Vitality',
    quality: 'EPIC',
    icon: 'fa-heart-circle-bolt',
    description: 'Permanent +40 Max HP and HP per stack.'
  },
  relic_shield_regen_epic: {
    name: 'Aegis Shield',
    quality: 'EPIC',
    icon: 'fa-shield-halved',
    description: 'At the start of each turn: gain 8 Shield per stack.'
  },
  relic_focused_soul: {
    name: 'Focused Soul',
    quality: 'EPIC',
    icon: 'fa-bolt',
    description: 'At the start of each round: gain 1 Attack Buff per stack.'
  }
};


// UI Manager holding states and DOM bindings
const UI = {
  // Screen Elements
  matchmakingScreen: document.getElementById('matchmaking-screen'),
  draftScreen: document.getElementById('draft-screen'),
  battleScreen: document.getElementById('battle-screen'),
  gameOverScreen: document.getElementById('game-over-screen'),
  roundResultOverlay: document.getElementById('round-result-overlay'),
  roundQuestRewardBanner: document.getElementById('round-quest-reward-banner'),
  roundQuestRewardText: document.getElementById('round-quest-reward-text'),
  bonusPickScreen: document.getElementById('bonus-pick-screen'),
  waitingScreen: document.getElementById('waiting-screen'),
  packSelectionScreen: document.getElementById('pack-selection-screen'),
  packRevealScreen: document.getElementById('pack-reveal-screen'),
  questSelectionScreen: document.getElementById('quest-selection-screen'),
  cardRemovalScreen: document.getElementById('card-removal-screen'),
  playerRelicsRow: document.getElementById('player-relics-row'),
  enemyRelicsRow: document.getElementById('enemy-relics-row'),
  
  
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
  playerMaxHpVal: document.getElementById('player-max-hp-val'),
  playerHpFill: document.getElementById('player-hp-fill'),
  playerShieldVal: document.getElementById('player-shield-val'),
  playerShieldBox: document.getElementById('player-shield-box'),
  playerStatusContainer: document.getElementById('player-status-container'),
  playerPoints: document.getElementById('player-points'),
  
  enemyName: document.getElementById('enemy-name'),
  enemyHpVal: document.getElementById('enemy-hp-val'),
  enemyMaxHpVal: document.getElementById('enemy-max-hp-val'),
  enemyHpFill: document.getElementById('enemy-hp-fill'),
  enemyShieldVal: document.getElementById('enemy-shield-val'),
  enemyShieldBox: document.getElementById('enemy-shield-box'),
  enemyStatusContainer: document.getElementById('enemy-status-container'),
  enemyPoints: document.getElementById('enemy-points'),
  
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
  
  // Draft Phase elements
  bonusCardsFan: document.getElementById('bonus-cards-fan'),
  bonusConfirmBtn: document.getElementById('bonus-confirm-btn'),
  packsSelectionGrid: document.getElementById('packs-selection-grid'),
  revealedPackCard: document.getElementById('revealed-pack-card'),
  revealedPackName: document.getElementById('revealed-pack-name'),
  revealCardsFan: document.getElementById('reveal-cards-fan'),
  revealFooter: document.getElementById('reveal-footer'),
  packRevealConfirmBtn: document.getElementById('pack-reveal-confirm-btn'),

  // Game Over Elements
  gameOverTitle: document.getElementById('game-over-title'),
  gameOverMsg: document.getElementById('game-over-msg'),
  goFinalScore: document.getElementById('go-final-score'),
  goRounds: document.getElementById('go-rounds'),
  goLobbyBtn: document.getElementById('go-lobby-btn'),
  
  // Selection States
  selectedCardInstanceId: null,
  isLocked: false,

  /**
   * Toggles active screens
   * @param {string} screenName 'lobby' | 'draft' | 'battle' | 'gameOver' | 'bonusPick' | 'waiting' | 'packSelection' | 'packReveal'
   */
  showScreen(screenName) {
    this.matchmakingScreen.classList.remove('active');
    if (this.draftScreen) this.draftScreen.classList.remove('active');
    this.battleScreen.classList.remove('active');
    this.gameOverScreen.classList.remove('active');
    this.gameOverScreen.style.display = 'none';
    this.gameOverScreen.style.opacity = '0';
    if (this.bonusPickScreen) this.bonusPickScreen.classList.remove('active');
    if (this.waitingScreen) this.waitingScreen.classList.remove('active');
    if (this.packSelectionScreen) this.packSelectionScreen.classList.remove('active');
    if (this.packRevealScreen) this.packRevealScreen.classList.remove('active');
    if (this.questSelectionScreen) this.questSelectionScreen.classList.remove('active');
    if (this.cardRemovalScreen) this.cardRemovalScreen.classList.remove('active');


    // Hide round overlay if switching screens
    if (this.roundResultOverlay) {
      this.roundResultOverlay.classList.remove('active');
      this.roundResultOverlay.style.display = 'none';
      this.roundResultOverlay.style.opacity = '0';
    }

    if (screenName === 'lobby') {
      this.matchmakingScreen.classList.add('active');
    } else if (screenName === 'draft') {
      if (this.draftScreen) this.draftScreen.classList.add('active');
    } else if (screenName === 'battle') {
      this.battleScreen.classList.add('active');
    } else if (screenName === 'gameOver') {
      this.gameOverScreen.classList.add('active');
    } else if (screenName === 'bonusPick') {
      if (this.bonusPickScreen) this.bonusPickScreen.classList.add('active');
    } else if (screenName === 'waiting') {
      if (this.waitingScreen) this.waitingScreen.classList.add('active');
    } else if (screenName === 'packSelection') {
      if (this.packSelectionScreen) this.packSelectionScreen.classList.add('active');
    } else if (screenName === 'packReveal') {
      if (this.packRevealScreen) this.packRevealScreen.classList.add('active');
    } else if (screenName === 'questSelection') {
      if (this.questSelectionScreen) this.questSelectionScreen.classList.add('active');
    } else if (screenName === 'cardRemoval') {
      if (this.cardRemovalScreen) this.cardRemovalScreen.classList.add('active');
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
        desc: 'Takes damage equal to stack x3 (absorbed by shields first). All stacks are consumed at the end of the round.'
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
        desc: 'Increases card clash damage by +10% per stack. Stack decreases by 1 only when attacking.'
      });
    }
    if (cardDescription.includes('kw-weak')) {
      keywords.push({
        title: 'WEAK',
        class: 'weak',
        desc: 'Reduces card clash damage by -10% per stack. Stack decreases by 1 only when attacking.'
      });
    }
    if (cardDescription.includes('kw-shield')) {
      keywords.push({
        title: 'SHIELD',
        class: 'shield',
        desc: 'Blocks incoming attack damage. Decays by 50% at the end of the round, and the remainder carries over.'
      });
    }
    if (cardDescription.includes('kw-cleanse')) {
      keywords.push({
        title: 'CLEANSE',
        class: 'cleanse',
        desc: 'Immediately removes all active debuffs (Poison, Burn, and Weakness).'
      });
    }
    if (cardDescription.includes('kw-dispel')) {
      keywords.push({
        title: 'DISPEL',
        class: 'dispel',
        desc: 'Immediately removes all active buffs (Attack Buffs) from the opponent.'
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
        desc: `Currently active stack: ${statuses.burn}. Takes damage equal to stack x3 (absorbed by shields first). All stacks are consumed at the end of the round.`
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
        desc: `Currently active stack: ${statuses.attackBuff}. Increases card clash damage by +10% per stack. Stack decreases by 1 when attacking.`
      });
    }
    if (statuses && statuses.weakness > 0) {
      keywords.push({
        title: 'WEAK',
        class: 'weak',
        desc: `Currently active stack: ${statuses.weakness}. Reduces card clash damage by -10% per stack. Stack decreases by 1 when attacking.`
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
   * Helper to format card descriptions dynamically, wrapping outcomes in spans
   */
  formatDescription(desc) {
    if (!desc) return '';
    let formattedDesc = desc;
    // Wrap Superior outcome
    formattedDesc = formattedDesc.replace(/(Superior:.*?)(?=(Neutral:|Inferior:|$))/g, '<span class="outcome-text superior-outcome">$1</span>');
    // Wrap Neutral outcome
    formattedDesc = formattedDesc.replace(/(Neutral:.*?)(?=(Superior:|Inferior:|$))/g, '<span class="outcome-text neutral-outcome">$1</span>');
    // Wrap Inferior outcome
    formattedDesc = formattedDesc.replace(/(Inferior:.*?)(?=(Superior:|Neutral:|$))/g, '<span class="outcome-text inferior-outcome">$1</span>');
    return formattedDesc;
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
    const formattedDesc = this.formatDescription(card.description);
    
    cardDiv.innerHTML = `
      <div class="card-face card-front">
        <div class="card-header">
          <span class="card-name">${card.name}</span>
        </div>
        <div class="card-middle">
          <i class="card-element-icon fa-solid ${iconClass}"></i>
          <p class="card-desc">${formattedDesc}</p>
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
  /**
   * Renders active status effect badges in player HUDs and toggles HUD aura classes
   */
  renderStatuses(container, statuses = {}) {
    container.innerHTML = '';
    if (!statuses) return;

    // Toggle HUD aura classes on parent HUD panel
    const hudPanel = container.closest('.hud-panel');
    if (hudPanel) {
      hudPanel.classList.remove('status-active-burn', 'status-active-poison', 'status-active-buff', 'status-active-weak');
      if (statuses.burn > 0) hudPanel.classList.add('status-active-burn');
      if (statuses.poison > 0) hudPanel.classList.add('status-active-poison');
      if (statuses.attackBuff > 0) hudPanel.classList.add('status-active-buff');
      if (statuses.weakness > 0) hudPanel.classList.add('status-active-weak');
    }

    // Burn status
    if (statuses.burn > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge burn';
      badge.innerHTML = `<i class="fa-solid fa-fire"></i> ${statuses.burn}`;
      badge.title = `Burned: Takes ${statuses.burn * 3} damage (absorbed by shields first, consumed at the end of the round)`;
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
      badge.innerHTML = `<i class="fa-solid fa-bolt"></i>${statuses.attackBuff}`;
      badge.title = `Buff: Clash damage increased by +${statuses.attackBuff * 10}% (decays when attacking: ${statuses.attackBuff} stacks left)`;
      container.appendChild(badge);
    }

    // Weakness status
    if (statuses.weakness > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge weakness';
      badge.innerHTML = `<i class="fa-solid fa-arrow-down-long"></i> ${statuses.weakness}`;
      badge.title = `Weakness: Clash damage reduced by -${statuses.weakness * 10}% (decays when attacking: ${statuses.weakness} stacks left)`;
      container.appendChild(badge);
    }
  },

  /**
   * Renders the cards in the player's hand with Hearthstone fan layout
   * @param {Array} hand List of card objects
   * @param {boolean} animate Whether to stagger draw animations
   */
  renderHand(hand, animate = false, isNewRound = false) {
    if (hand.length === 0) {
      this.playerHand.innerHTML = '';
      return;
    }

    // If it's a new round, clear hand completely and animate drawing
    if (isNewRound) {
      this.playerHand.innerHTML = '';
      const total = hand.length;
      hand.forEach((card, index) => {
        const cardEl = this.createCardElement(card);
        this.playerHand.appendChild(cardEl);
        cardEl.style.setProperty('--index', index);
        cardEl.style.setProperty('--total', total);
        cardEl.style.zIndex = index + 1;
        if (!this.isLocked) {
          let lastClickTime = 0;
          cardEl.addEventListener('click', (e) => {
            const currentTime = new Date().getTime();
            const clickDelay = currentTime - lastClickTime;
            lastClickTime = currentTime;

            if (clickDelay < 300) {
              AudioSynth.playClick();
              this.selectCard(card.instanceId, true);
              this.lockSelection();
            } else {
              AudioSynth.playClick();
              this.selectCard(card.instanceId);
            }
          });
        }
      });
      if (animate) {
        const cardEls = this.playerHand.querySelectorAll('.card');
        Animations.animateCardDraw(cardEls);
      }
      return;
    }

    // Incremental turn progression (non-disruptive update)
    // 1. Remove cards that are not in the new hand
    const existingCardEls = Array.from(this.playerHand.querySelectorAll('.card'));
    const newHandIds = hand.map(c => c.instanceId);
    
    existingCardEls.forEach(cardEl => {
      const instId = cardEl.getAttribute('data-instance-id');
      if (!newHandIds.includes(instId)) {
        cardEl.remove();
      }
    });

    // 2. Add cards that are in the new hand but not in the DOM
    const currentDomIds = Array.from(this.playerHand.querySelectorAll('.card')).map(el => el.getAttribute('data-instance-id'));
    
    hand.forEach(card => {
      if (!currentDomIds.includes(card.instanceId)) {
        const cardEl = this.createCardElement(card);
        this.playerHand.appendChild(cardEl);
        if (!this.isLocked) {
          let lastClickTime = 0;
          cardEl.addEventListener('click', () => {
            const currentTime = new Date().getTime();
            const clickDelay = currentTime - lastClickTime;
            lastClickTime = currentTime;

            if (clickDelay < 300) {
              AudioSynth.playClick();
              this.selectCard(card.instanceId, true);
              this.lockSelection();
            } else {
              AudioSynth.playClick();
              this.selectCard(card.instanceId);
            }
          });
        }
      }
    });

    // 3. Sort DOM elements to match the hand array order
    const finalCardEls = Array.from(this.playerHand.querySelectorAll('.card'));
    finalCardEls.sort((a, b) => {
      const idA = a.getAttribute('data-instance-id');
      const idB = b.getAttribute('data-instance-id');
      return newHandIds.indexOf(idA) - newHandIds.indexOf(idB);
    });

    // Re-append in sorted order to maintain proper DOM stacking and index variables
    finalCardEls.forEach(el => this.playerHand.appendChild(el));

    const total = finalCardEls.length;
    finalCardEls.forEach((cardEl, index) => {
      cardEl.style.setProperty('--index', index);
      cardEl.style.setProperty('--total', total);
      cardEl.style.zIndex = index + 1;
      cardEl.style.opacity = '1';
      cardEl.style.pointerEvents = 'auto';
    });
  },

  /**
   * Realigns index and total properties of remaining hand cards in DOM immediately when a card is locked
   */
  realignRemainingHand(lockedCardEl) {
    const remainingCards = Array.from(this.playerHand.querySelectorAll('.card')).filter(c => c !== lockedCardEl && c.style.display !== 'none');
    const total = remainingCards.length;
    remainingCards.forEach((cardEl, index) => {
      cardEl.style.setProperty('--index', index);
      cardEl.style.setProperty('--total', total);
      cardEl.style.zIndex = index + 1;
    });
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
  selectCard(instanceId, forceSelect = false) {
    if (this.isLocked) return;

    // Deselect if clicking already selected
    if (!forceSelect && this.selectedCardInstanceId === instanceId) {
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
    this.lockBtn.querySelector('.lock-btn-text').innerText = 'WAITING FOR OPPONENT';
    
    // Add locked state border to card and animate it to play slot
    const selectedCard = this.playerHand.querySelector('.card.selected');
    if (selectedCard) {
      selectedCard.classList.add('locked');

      const cardRect = selectedCard.getBoundingClientRect();
      const slotRect = this.playerPlaySlot.getBoundingClientRect();

      if (cardRect.width > 0 && slotRect.width > 0) {
        // Create flight clone
        const clone = selectedCard.cloneNode(true);
        clone.removeAttribute('id');
        clone.style.cssText = `
          position: fixed;
          left: ${cardRect.left}px;
          top: ${cardRect.top}px;
          width: ${cardRect.width}px;
          height: ${cardRect.height}px;
          margin: 0;
          z-index: 200;
          pointer-events: none;
          transform: none;
          transition: none;
        `;
        document.body.appendChild(clone);

        // Hide original card
        selectedCard.style.opacity = '0';
        selectedCard.style.pointerEvents = 'none';
        selectedCard.style.display = 'none';
        this.realignRemainingHand(selectedCard);

        const targetX = slotRect.left + slotRect.width / 2 - cardRect.left - cardRect.width / 2;
        const targetY = slotRect.top + slotRect.height / 2 - cardRect.top - cardRect.height / 2;
        const scaleVal = Math.min(slotRect.width / cardRect.width, slotRect.height / cardRect.height);

        window.cardFlightPromise = new Promise(resolve => {
          anime({
            targets: clone,
            translateX: targetX,
            translateY: targetY,
            scale: scaleVal,
            duration: 300,
            easing: 'easeOutQuint',
            complete: () => {
              clone.remove();

              // Place clean card node in the slot
              const slotCard = selectedCard.cloneNode(true);
              slotCard.removeAttribute('id'); // Remove duplicate ID in slot card
              slotCard.classList.remove('selected', 'hovered', 'locked');
              slotCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default; pointer-events: none; z-index: 1;';
              this.playerPlaySlot.innerHTML = '';
              this.playerPlaySlot.appendChild(slotCard);
              this.playerPlaySlot.classList.add('filled');
              
              window.cardFlightPromise = null;
              resolve();
            }
          });
        });
      } else {
        // Fallback: place instantly
        const slotCard = selectedCard.cloneNode(true);
        slotCard.removeAttribute('id'); // Remove duplicate ID in slot card
        slotCard.classList.remove('selected', 'hovered', 'locked');
        slotCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default; pointer-events: none; z-index: 1;';
        this.playerPlaySlot.innerHTML = '';
        this.playerPlaySlot.appendChild(slotCard);
        this.playerPlaySlot.classList.add('filled');
        selectedCard.style.opacity = '0';
        selectedCard.style.pointerEvents = 'none';
        selectedCard.style.display = 'none';
        this.realignRemainingHand(selectedCard);
      }
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
    const oldVal = parseInt(elementText.innerText) || 0;
    elementText.innerText = val;
    
    if (val > 0) {
      elementBox.classList.remove('empty');
    }

    if (val < oldVal) {
      // Shield took damage! Play flash & shake animation
      elementBox.classList.remove('shield-flash');
      // trigger reflow
      void elementBox.offsetWidth;
      elementBox.classList.add('shield-flash');
      
      if (val === 0) {
        // Keep visible during the flash animation
        elementBox.classList.remove('empty');
        setTimeout(() => {
          elementBox.classList.remove('shield-flash');
          elementBox.classList.add('empty');
        }, 350);
      } else {
        setTimeout(() => {
          elementBox.classList.remove('shield-flash');
        }, 300);
      }
      
      // Play shield damage sound
      if (window.AudioSynth && window.AudioSynth.playShieldBreak) {
        window.AudioSynth.playShieldBreak();
      }
    } else if (val === 0) {
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
  },

  /**
   * Lights up the round win point indicators on HUD
   */
  renderPoints(container, score) {
    if (!container) return;
    const dots = container.querySelectorAll('.point-dot');
    dots.forEach((dot, idx) => {
      if (idx < score) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  },

  /**
   * Shows a premium, non-blocking floating notification toast
   */
  showToast(message) {
    let toast = document.getElementById('game-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'game-toast';
      toast.className = 'glass';
      toast.style.position = 'fixed';
      toast.style.top = '1.5rem';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%) translateY(-100px)';
      toast.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
      toast.style.opacity = '0';
      toast.style.padding = '0.75rem 2rem';
      toast.style.borderRadius = '4px';
      toast.style.border = '2.5px solid var(--border-brass)';
      toast.style.background = 'rgba(21, 24, 33, 0.95)';
      toast.style.color = '#fff';
      toast.style.fontFamily = 'var(--font-title)';
      toast.style.fontWeight = '700';
      toast.style.fontSize = '0.9rem';
      toast.style.zIndex = '99999';
      toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.8)';
      toast.style.textAlign = 'center';
      toast.style.minWidth = '280px';
      document.body.appendChild(toast);
    }
    
    toast.innerText = message;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
    
    if (this._toastTimeout) {
      clearTimeout(this._toastTimeout);
    }
    this._toastTimeout = setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(-120px)';
      toast.style.opacity = '0';
    }, 3200);
  },

  renderRelicsHUD(container, relics = {}) {
    if (!container) return;
    container.innerHTML = '';
    
    Object.entries(relics).forEach(([relicId, count]) => {
      if (count <= 0) return;
      const def = RELIC_DATABASE[relicId];
      if (!def) return;
      
      const badge = document.createElement('div');
      badge.className = `hud-relic-badge ${def.quality}`;
      badge.setAttribute('title', `${def.name} (Stack: ${count})\n${def.description}`);
      
      badge.innerHTML = `
        <i class="fa-solid ${def.icon}"></i>
        ${count > 1 ? `<span class="relic-stack-indicator">${count}</span>` : ''}
      `;
      container.appendChild(badge);
    });
  },

  renderRelicsGrid(container, relics = {}) {
    if (!container) return;
    container.innerHTML = '';
    
    const activeEntries = Object.entries(relics).filter(([_, count]) => count > 0);
    
    if (activeEntries.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic; grid-column: 1/-1; text-align: center;">You do not own any relics yet.</p>';
      return;
    }
    
    activeEntries.forEach(([relicId, count]) => {
      const def = RELIC_DATABASE[relicId];
      if (!def) return;
      
      const itemEl = document.createElement('div');
      itemEl.className = `relic-card-item ${def.quality}`;
      
      itemEl.innerHTML = `
        <div class="relic-header-row">
          <div class="relic-title-name">
            <i class="fa-solid ${def.icon}" style="margin-right: 0.5rem;"></i>
            ${def.name}
          </div>
          <span class="relic-stack-badge">x${count}</span>
        </div>
        <div class="relic-quality-tag ${def.quality}">${def.quality} RELIC</div>
        <p class="relic-card-desc">${def.description}</p>
      `;
      container.appendChild(itemEl);
    });
  },

  renderQuestCards(quests, onQuestClick) {
    const grid = document.getElementById('quest-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    quests.forEach(q => {
      const card = document.createElement('div');
      card.className = `quest-card ${q.difficulty}`;
      card.dataset.questId = q.id;
      
      card.innerHTML = `
        <div class="quest-card-difficulty ${q.difficulty}">${q.difficulty}</div>
        <div class="quest-card-text">${q.text}</div>
        <div class="quest-card-reward-box">
          <div class="quest-card-reward-label">REWARD</div>
          <div class="quest-card-reward-text">${q.reward.text}</div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        window.AudioSynth.playClick();
        grid.querySelectorAll('.quest-card').forEach(c => {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
        onQuestClick(q.id);
      });
      
      grid.appendChild(card);
    });
  },

  updateQuestTracker(activeQuest) {
    const tracker = document.getElementById('battle-quest-tracker');
    if (!tracker) return;
    
    if (!activeQuest) {
      tracker.classList.add('hidden');
      return;
    }
    
    tracker.classList.remove('hidden');
    
    const textEl = document.getElementById('tracker-quest-text');
    const fillEl = document.getElementById('tracker-progress-fill');
    const progressTextEl = document.getElementById('tracker-progress-text');
    const rewardEl = document.getElementById('tracker-reward-text');
    
    if (textEl) textEl.innerText = activeQuest.text;
    
    const progress = activeQuest.progress || 0;
    const target = activeQuest.target || 1;
    const percent = Math.min(100, Math.floor((progress / target) * 100));
    
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (progressTextEl) progressTextEl.innerText = `${progress} / ${target}`;
    if (rewardEl) rewardEl.innerText = `Reward: ${activeQuest.reward.text}`;
  },

  renderRemovalCards(deck, onCardClick) {
    const grid = document.getElementById('removal-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    deck.forEach(card => {
      const cardEl = this.createCardElement(card);
      
      cardEl.addEventListener('click', () => {
        window.AudioSynth.playClick();
        grid.querySelectorAll('.card').forEach(c => {
          c.classList.remove('selected');
        });
        cardEl.classList.add('selected');
        onCardClick(card.instanceId);
      });
      
      grid.appendChild(cardEl);
    });
  }
};

// Expose globally
window.AudioSynth = AudioSynth;
window.UI = UI;
