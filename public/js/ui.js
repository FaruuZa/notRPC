/**
 * ELEMENT CLASH: DOM MANAGER
 */

// UI Manager holding states and DOM bindings
const UI = {
  // Screen Elements
  get matchmakingScreen() { return document.getElementById('matchmaking-screen'); },
  get draftScreen() { return document.getElementById('draft-screen'); },
  get battleScreen() { return document.getElementById('battle-screen'); },
  get gameOverScreen() { return document.getElementById('game-over-screen'); },
  get roundResultOverlay() { return document.getElementById('round-result-overlay'); },
  get roundQuestRewardBanner() { return document.getElementById('round-quest-reward-banner'); },
  get roundQuestRewardText() { return document.getElementById('round-quest-reward-text'); },
  get bonusPickScreen() { return document.getElementById('bonus-pick-screen'); },
  get waitingScreen() { return document.getElementById('waiting-screen'); },
  get packSelectionScreen() { return document.getElementById('pack-selection-screen'); },
  get packRevealScreen() { return document.getElementById('pack-reveal-screen'); },
  get questSelectionScreen() { return document.getElementById('quest-selection-screen'); },
  get cardRemovalScreen() { return document.getElementById('card-removal-screen'); },
  get relicSelectionScreen() { return document.getElementById('relic-selection-screen'); },
  get relicChoicesGrid() { return document.getElementById('relic-choices-grid'); },
  get relicConfirmBtn() { return document.getElementById('relic-confirm-btn'); },
  get playerRelicsRow() { return document.getElementById('player-relics-row'); },
  get enemyRelicsRow() { return document.getElementById('enemy-relics-row'); },
  
  // Matchmaking elements
  get usernameInput() { return document.getElementById('username-input'); },
  get playBtn() { return document.getElementById('play-btn'); },
  get leaveQueueBtn() { return document.getElementById('leave-queue-btn'); },
  get statusText() { return document.getElementById('status-text'); },
  get queueStatusSub() { return document.getElementById('queue-status-sub'); },
  get queueCountDisplay() { return document.getElementById('queue-count-display'); },
  
  // Draft elements
  get draftTimerVal() { return document.getElementById('draft-timer-val'); },
  get draftCounterVal() { return document.getElementById('draft-counter-val'); },
  get draftCardsGrid() { return document.getElementById('draft-cards-grid'); },
  get draftLockBtn() { return document.getElementById('draft-lock-btn'); },
  get draftKeywordInfo() { return document.getElementById('draft-keyword-info'); },
  
  // Battle HUD elements
  get playerName() { return document.getElementById('player-name'); },
  get playerHpVal() { return document.getElementById('player-hp-val'); },
  get playerMaxHpVal() { return document.getElementById('player-max-hp-val'); },
  get playerHpFill() { return document.getElementById('player-hp-fill'); },
  get playerShieldVal() { return document.getElementById('player-shield-val'); },
  get playerShieldBox() { return document.getElementById('player-shield-box'); },
  get playerStatusContainer() { return document.getElementById('player-status-container'); },
  get playerPoints() { return document.getElementById('player-points'); },
  get playerTokensVal() { return document.getElementById('player-tokens-val'); },
  get playerTokenBadge() { return document.getElementById('player-token-badge'); },
  
  get enemyName() { return document.getElementById('enemy-name'); },
  get enemyHpVal() { return document.getElementById('enemy-hp-val'); },
  get enemyMaxHpVal() { return document.getElementById('enemy-max-hp-val'); },
  get enemyHpFill() { return document.getElementById('enemy-hp-fill'); },
  get enemyShieldVal() { return document.getElementById('enemy-shield-val'); },
  get enemyShieldBox() { return document.getElementById('enemy-shield-box'); },
  get enemyStatusContainer() { return document.getElementById('enemy-status-container'); },
  get enemyPoints() { return document.getElementById('enemy-points'); },
  
  get enemyCardDots() { return document.getElementById('enemy-card-dots'); },
  get battleKeywordInfo() { return document.getElementById('battle-keyword-info'); },
  
  // Arena elements
  get playerPlaySlot() { return document.getElementById('player-play-slot'); },
  get enemyPlaySlot() { return document.getElementById('enemy-play-slot'); },
  get vsBadge() { return document.getElementById('vs-badge'); },
  get arenaCombatText() { return document.getElementById('arena-combat-text'); },
  get damagePopupContainer() { return document.getElementById('damage-popup-container'); },
  
  // Player Interaction Hand
  get playerHand() { return document.getElementById('player-hand'); },
  get lockBtn() { return document.getElementById('lock-btn'); },
  
  // Draft Phase elements
  get bonusCardsFan() { return document.getElementById('bonus-cards-fan'); },
  get bonusConfirmBtn() { return document.getElementById('bonus-confirm-btn'); },
  get packsSelectionGrid() { return document.getElementById('packs-selection-grid'); },
  get revealedPackCard() { return document.getElementById('revealed-pack-card'); },
  get revealedPackName() { return document.getElementById('revealed-pack-name'); },
  get revealCardsFan() { return document.getElementById('reveal-cards-fan'); },
  get revealFooter() { return document.getElementById('reveal-footer'); },
  get packRevealConfirmBtn() { return document.getElementById('pack-reveal-confirm-btn'); },

  // Game Over Elements
  get gameOverTitle() { return document.getElementById('game-over-title'); },
  get gameOverMsg() { return document.getElementById('game-over-msg'); },
  get goFinalScore() { return document.getElementById('go-final-score'); },
  get goRounds() { return document.getElementById('go-rounds'); },
  get goLobbyBtn() { return document.getElementById('go-lobby-btn'); },
  
  // Selection States
  selectedCardInstanceId: null,
  isLocked: false,

  /**
   * Toggles active screens
   * @param {string} screenName 'lobby' | 'draft' | 'battle' | 'gameOver' | 'bonusPick' | 'waiting' | 'packSelection' | 'packReveal'
   */
  showGate(statusText = 'INITIALIZING ARENA DOSSIER...') {
    const gate = document.getElementById('gate-screen');
    const text = document.getElementById('gate-status-text');
    if (text) text.textContent = statusText;
    if (gate) {
      gate.classList.remove('hidden');
      gate.style.display = 'flex';
      gate.style.opacity = '1';
      gate.style.visibility = 'visible';
      gate.style.pointerEvents = 'auto';
    }
  },

  dismissGate() {
    const gate = document.getElementById('gate-screen');
    if (!gate || gate.classList.contains('hidden')) return;
    this.triggerSlashTransition(() => {
      gate.classList.add('hidden');
      setTimeout(() => {
        gate.style.display = 'none';
      }, 400);
    });
  },

  triggerSlashTransition(callback, isReverse = false) {
    const slash = document.getElementById('slash');
    if (!slash) {
      if (callback) callback();
      return;
    }
    slash.classList.remove('run', 'reverse');
    void slash.offsetWidth;
    if (isReverse) slash.classList.add('reverse');
    slash.classList.add('run');
    setTimeout(() => {
      if (callback) callback();
    }, 240);
    setTimeout(() => {
      slash.classList.remove('run', 'reverse');
    }, 540);
  },

  showScreen(screenName) {
    this.triggerSlashTransition(() => {
      document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
      });
      // Strictly dismiss all modal overlays during screen transitions
      document.querySelectorAll('.overlay').forEach(o => {
        o.classList.remove('active');
        o.style.display = 'none';
        o.style.opacity = '0';
      });
      if (typeof anime !== 'undefined') {
        if (this.gameOverScreen) anime.remove(this.gameOverScreen);
        if (this.roundResultOverlay) anime.remove(this.roundResultOverlay);
      }
      this.hideAuthScreen();

      if (screenName === 'lobby') {
        if (this.matchmakingScreen) this.matchmakingScreen.classList.add('active');
      } else if (screenName === 'draft') {
        if (this.draftScreen) this.draftScreen.classList.add('active');
      } else if (screenName === 'battle') {
        if (this.battleScreen) this.battleScreen.classList.add('active');
      } else if (screenName === 'gameOver') {
        if (this.gameOverScreen) {
          this.gameOverScreen.classList.add('active');
          this.gameOverScreen.style.display = 'flex';
          this.gameOverScreen.style.opacity = '1';
        }
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
      } else if (screenName === 'relicSelection') {
        if (this.relicSelectionScreen) this.relicSelectionScreen.classList.add('active');
      }
    });
    return;
  },
  _origShowScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
    });
    this.gameOverScreen.style.display = 'none';
    this.gameOverScreen.style.opacity = '0';
    this.hideAuthScreen();

    // Hide round overlay if switching screens
    if (this.roundResultOverlay) {
      this.roundResultOverlay.classList.remove('active');
      this.roundResultOverlay.style.display = 'none';
      this.roundResultOverlay.style.opacity = '0';
    }

    if (screenName === 'lobby') {
      if (this.matchmakingScreen) this.matchmakingScreen.classList.add('active');
    } else if (screenName === 'draft') {
      if (this.draftScreen) this.draftScreen.classList.add('active');
    } else if (screenName === 'battle') {
      if (this.battleScreen) this.battleScreen.classList.add('active');
    } else if (screenName === 'gameOver') {
      if (this.gameOverScreen) {
        this.gameOverScreen.classList.add('active');
        this.gameOverScreen.style.display = 'flex';
        this.gameOverScreen.style.opacity = '1';
      }
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
    } else if (screenName === 'relicSelection') {
      if (this.relicSelectionScreen) this.relicSelectionScreen.classList.add('active');
    }
  },

  showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('active');
  },

  hideAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.remove('active');
  },

  showReconnectBanner() {
    const banner = document.getElementById('reconnect-banner');
    if (banner) banner.classList.remove('hidden');
  },

  hideReconnectBanner() {
    const banner = document.getElementById('reconnect-banner');
    if (banner) banner.classList.add('hidden');
  },

  switchToTab(targetId) {
    const isReverse = (targetId === 'arena-tab');
    this.triggerSlashTransition(() => {
      document.querySelectorAll('#matchmaking-screen > .tab-content').forEach(tc => {
        tc.classList.add('hidden');
        tc.classList.remove('active');
      });

      document.querySelectorAll('.nav-tab').forEach(t => {
        if (t.getAttribute('data-tab') === targetId) t.classList.add('active');
        else t.classList.remove('active');
      });

      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
      }

      if (targetId === 'stats-tab') {
        this.loadUserStats();
      } else if (targetId === 'history-tab') {
        this.loadMatchHistory();
      } else if (targetId === 'library-tab') {
        const gm = window.gameManager || window.GameManager;
        const cards = (gm && gm.compendiumCards && gm.compendiumCards.length > 0) ? gm.compendiumCards : (window.cachedCompendiumData ? window.cachedCompendiumData.cards : []);
        const relics = (gm && gm.compendiumRelics && gm.compendiumRelics.length > 0) ? gm.compendiumRelics : (window.cachedCompendiumData ? window.cachedCompendiumData.relics : []);
        const grid = document.getElementById('compendium-cards-grid');
        const relicsGrid = document.getElementById('compendium-relics-grid');
        if ((cards && cards.length > 0) || (relics && relics.length > 0)) {
          if (!relicsGrid || relicsGrid.children.length === 0 || !grid || grid.children.length === 0) {
            this.renderCompendium(cards, relics);
          }
        } else if (window.SocketService && window.SocketService.socket) {
          window.SocketService.socket.emit('requestCompendium');
        }
      }
    }, isReverse);
  },

  initTabNavigation() {
    // Delegated click handler for .nav-tab
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.nav-tab');
      if (!tab) return;
      const targetId = tab.getAttribute('data-tab');
      if (targetId) {
        e.preventDefault();
        if (window.AudioSynth) window.AudioSynth.playClick();
        this.switchToTab(targetId);
      }
    });

    // Persona Menu Slot Toggles
    const playSlot = document.getElementById('play-slot');
    const playBtn = document.getElementById('play-btn');
    const customBtn = document.getElementById('custom-btn');
    const codeRow = document.getElementById('code-row');
    const quickplayBtn = document.getElementById('quickplay-btn');
    const codeGoBtn = document.getElementById('code-go-btn');
    const createRoomBtn = document.getElementById('create-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');

    if (playBtn && playSlot) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.AudioSynth) window.AudioSynth.playClick();
        const isOpen = playSlot.classList.toggle('open');
        playBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (!isOpen && codeRow) codeRow.classList.remove('show');
      });
    }

    // Close play dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (playSlot && playSlot.classList.contains('open') && !playSlot.contains(e.target)) {
        playSlot.classList.remove('open');
        if (playBtn) playBtn.setAttribute('aria-expanded', 'false');
        if (codeRow) codeRow.classList.remove('show');
      }
    });

    if (customBtn && codeRow) {
      customBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.AudioSynth) window.AudioSynth.playClick();
        codeRow.classList.toggle('show');
        if (roomCodeInput) roomCodeInput.focus();
      });
    }

    if (quickplayBtn) {
      quickplayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (quickplayBtn.disabled) return;
        if (roomCodeInput) roomCodeInput.value = '';
        const gm = window.gameManager || window.GameManager;
        if (gm && gm.startMatchmaking) {
          gm.startMatchmaking();
        }
      });
    }

    if (codeGoBtn) {
      codeGoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (codeGoBtn.disabled) return;
        const gm = window.gameManager || window.GameManager;
        if (gm && gm.startMatchmaking) {
          gm.startMatchmaking();
        }
      });
    }

    if (createRoomBtn) {
      createRoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (createRoomBtn.disabled) return;
        if (roomCodeInput) {
          const rand = Math.floor(1000 + Math.random() * 9000);
          roomCodeInput.value = `DUEL${rand}`;
        }
        const gm = window.gameManager || window.GameManager;
        if (gm && gm.startMatchmaking) {
          gm.startMatchmaking();
        }
      });
    }

    // Library tab internal switching
    const tabCards = document.getElementById('modal-compendium-tab-cards');
    const tabRelics = document.getElementById('modal-compendium-tab-relics');
    const tabMatchups = document.getElementById('modal-compendium-tab-matchups');
    const tabRules = document.getElementById('modal-compendium-tab-rules');
    const cardsContent = document.getElementById('modal-compendium-cards-content');
    const relicsContent = document.getElementById('modal-compendium-relics-content');
    const matchupsContent = document.getElementById('modal-compendium-matchups-content');
    const rulesContent = document.getElementById('modal-compendium-rules-content');

    const switchLibTab = (activeTab, activeContent) => {
      if (window.AudioSynth) window.AudioSynth.playClick();
      [tabCards, tabRelics, tabMatchups, tabRules].forEach(t => t && t.classList.remove('active'));
      [cardsContent, relicsContent, matchupsContent, rulesContent].forEach(c => {
        if (!c) return;
        c.classList.remove('active');
        c.classList.add('hidden');
        c.style.display = 'none';
      });
      if (activeTab) activeTab.classList.add('active');
      if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('active');
        activeContent.style.display = (activeContent === cardsContent || activeContent === relicsContent) ? 'flex' : 'block';
      }
    };

    if (tabCards) tabCards.addEventListener('click', () => switchLibTab(tabCards, cardsContent));
    if (tabRelics) tabRelics.addEventListener('click', () => switchLibTab(tabRelics, relicsContent));
    if (tabMatchups) tabMatchups.addEventListener('click', () => switchLibTab(tabMatchups, matchupsContent));
    if (tabRules) tabRules.addEventListener('click', () => switchLibTab(tabRules, rulesContent));

    // Element filter chips for Library
    const compFilters = document.getElementById('modal-compendium-filters');
    if (compFilters) {
      compFilters.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.AudioSynth) window.AudioSynth.playClick();
          compFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const element = btn.getAttribute('data-element');
          const gm = window.gameManager || window.GameManager;
          const cards = (gm && gm.compendiumCards) ? gm.compendiumCards : (window.cachedCompendiumData ? window.cachedCompendiumData.cards : []);
          if (window.UI) {
            window.UI.renderCompendiumCards(cards || [], element);
          }
        });
      });
    }
  },

  async loadUserStats() {
    const token = localStorage.getItem('element_clash_token');
    if (!token) {
      document.getElementById('stat-username').textContent = 'Guest Player';
      document.getElementById('stat-joined-date').textContent = 'Login to view statistics';
      document.getElementById('stat-total-matches').textContent = '0';
      document.getElementById('stat-wins').textContent = '0';
      document.getElementById('stat-losses').textContent = '0';
      document.getElementById('stat-winrate').textContent = '0%';
      document.getElementById('stat-win-streak').textContent = '0';
      document.getElementById('stat-total-damage').textContent = '0';
      return;
    }
    try {
      const res = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const s = data.stats;
      if (!s) return;

      document.getElementById('stat-username').textContent = s.username;
      document.getElementById('stat-joined-date').textContent = `Joined: ${new Date(s.created_at).toLocaleDateString()}`;
      document.getElementById('stat-total-matches').textContent = s.total_matches || 0;
      document.getElementById('stat-wins').textContent = s.wins || 0;
      document.getElementById('stat-losses').textContent = s.losses || 0;
      
      const winrate = s.total_matches > 0 ? Math.round((s.wins / s.total_matches) * 100) : 0;
      document.getElementById('stat-winrate').textContent = `${winrate}%`;
      document.getElementById('stat-win-streak').textContent = s.win_streak || 0;
      document.getElementById('stat-total-damage').textContent = s.total_damage_dealt || 0;

      let rank = 'BRONZE I';
      if (s.wins >= 50) rank = 'LEGEND';
      else if (s.wins >= 30) rank = 'DIAMOND I';
      else if (s.wins >= 15) rank = 'PLATINUM I';
      else if (s.wins >= 5) rank = 'GOLD I';
      else if (s.wins >= 1) rank = 'SILVER I';
      document.getElementById('stat-rank-name').textContent = rank;
    } catch (err) {
      console.warn('Failed to load stats:', err);
    }
  },

  async loadMatchHistory() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    const token = localStorage.getItem('element_clash_token');
    if (!token) {
      listEl.innerHTML = `
        <div class="hist-row empty-state">
          <div class="hist-result" style="color: var(--brass-light); font-size: 1.4rem;">GUEST</div>
          <div class="hist-mid history-details">
            <div class="hist-opp history-opponent" style="color: var(--ink);">Account sign-in required</div>
            <div class="hist-meta history-meta">Log in or create an account to record your match history across sessions.</div>
          </div>
          <div class="hist-score history-score">
            <button type="button" class="btn btn-sm btn-red nav-tab" data-tab="stats-tab">SIGN IN</button>
          </div>
        </div>
      `;
      return;
    }

    try {
      const res = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const history = data.history || [];

      if (history.length === 0) {
        listEl.innerHTML = `
          <div class="hist-row empty-state">
            <div class="hist-result" style="color: var(--faint); font-size: 1.4rem;">NO DUELS</div>
            <div class="hist-mid history-details">
              <div class="hist-opp history-opponent" style="color: var(--muted);">No combat records yet</div>
              <div class="hist-meta history-meta">Play your first duel in the Arena to view your match history here.</div>
            </div>
            <div class="hist-score history-score" style="color: var(--faint); font-size: 1.4rem;">0 <small>—</small> 0</div>
          </div>
        `;
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem('element_clash_user') || '{}');

      listEl.innerHTML = '';
      history.forEach(item => {
        const isP1 = item.p1_id === currentUser.id;
        const opponentName = isP1 ? item.p2_name : item.p1_name;
        const yourScore = isP1 ? item.p1_score : item.p2_score;
        const oppScore = isP1 ? item.p2_score : item.p1_score;
        const isVictory = item.winner_id === currentUser.id;
        const dateStr = new Date(item.created_at).toLocaleString();

        const row = document.createElement('div');
        row.className = `hist-row history-item ${isVictory ? 'win victory' : 'lose defeat'}`;
        row.innerHTML = `
          <div class="hist-result history-result-badge">${isVictory ? 'VICTORY' : 'DEFEAT'}</div>
          <div class="hist-mid history-details">
            <div class="hist-opp history-opponent">vs ${opponentName}</div>
            <div class="hist-meta history-meta">${dateStr}</div>
          </div>
          <div class="hist-score history-score">${yourScore} <small>—</small> ${oppScore}</div>
        `;
        listEl.appendChild(row);
      });
    } catch (err) {
      console.error('[UI] Failed to load match history:', err);
    }
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
   * Generates card HTML element (unified Persona design)
   */
  createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card game-card';
    cardDiv.setAttribute('data-element', card.element);
    const instId = card.instanceId || `library-${card.id || Math.random().toString(36).substr(2, 9)}`;
    cardDiv.setAttribute('data-instance-id', instId);
    cardDiv.id = `card-${instId}`;
    
    const iconClass = this.getElementIconClass(card.element);
    const formattedDesc = this.formatDescription(card.description);
    
    cardDiv.innerHTML = `
      <div class="card-face card-front">
        <div class="gc-header card-header">
          <span class="gc-name card-name" title="${card.name}">${card.name}</span>
        </div>
        <div class="gc-middle card-middle">
          <i class="gc-icon card-element-icon fa-solid ${iconClass}"></i>
          <p class="gc-desc card-desc">${formattedDesc}</p>
        </div>
        <div class="gc-footer card-footer">
          <span class="gc-elname card-element-name">${card.element}</span>
        </div>
      </div>
      <div class="card-face card-back"></div>
    `;

    return cardDiv;
  },

  renderStatuses(container, statuses = {}) {
    container.innerHTML = '';
    if (!statuses) return;

    // Toggle HUD aura classes on parent HUD panel
    const hudPanel = container.closest('.hud-panel');
    if (hudPanel) {
      hudPanel.classList.remove('status-active-burn', 'status-active-poison', 'status-active-buff', 'status-active-weak', 'status-active-leech');
      if (statuses.burn > 0) hudPanel.classList.add('status-active-burn');
      if (statuses.poison > 0) hudPanel.classList.add('status-active-poison');
      if (statuses.attackBuff > 0) hudPanel.classList.add('status-active-buff');
      if (statuses.weakness > 0) hudPanel.classList.add('status-active-weak');
      if (statuses.leech > 0) hudPanel.classList.add('status-active-leech');
      if (statuses.thorn > 0) hudPanel.classList.add('status-active-thorns');
    }

    // Burn status
    if (statuses.burn > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge burn';
      badge.innerHTML = `<i class="fa-solid fa-fire"></i> ${statuses.burn}`;
      container.appendChild(badge);
      this.bindTooltip(
        badge, 
        'BURNED', 
        `Takes <strong>${statuses.burn * 3}</strong> damage at the end of the round. (Burn damage is absorbed by shields first, and the status is fully consumed after ticking).`,
        `Stacks: ${statuses.burn}`
      );
    }

    // Poison status
    if (statuses.poison > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge poison';
      badge.innerHTML = `<i class="fa-solid fa-skull-crossbones"></i> ${statuses.poison}`;
      container.appendChild(badge);
      this.bindTooltip(
        badge, 
        'POISONED', 
        `Takes <strong>${statuses.poison}</strong> damage bypassing shields at start of turn. (Ticks down by 1 stack per round).`,
        `Stacks: ${statuses.poison}`
      );
    }

    // Attack Buff status
    if (statuses.attackBuff > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge attack-buff';
      badge.innerHTML = `<i class="fa-solid fa-bolt"></i>${statuses.attackBuff}`;
      container.appendChild(badge);
      this.bindTooltip(
        badge, 
        'ATTACK BUFF', 
        `Clash damage dealt is increased by <strong>+${statuses.attackBuff * 10}%</strong>. (Decays by 1 stack when player attacks).`,
        `Stacks: ${statuses.attackBuff}`
      );
    }

    // Weakness status
    if (statuses.weakness > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge weakness';
      badge.innerHTML = `<i class="fa-solid fa-arrow-down-long"></i> ${statuses.weakness}`;
      container.appendChild(badge);
      this.bindTooltip(
        badge, 
        'WEAKENED', 
        `Clash damage dealt is reduced by <strong>-${statuses.weakness * 10}%</strong>. (Decays by 1 stack when player attacks).`,
        `Stacks: ${statuses.weakness}`
      );
    }

    // Leech status
    if (statuses.leech > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge leech';
      badge.innerHTML = `<i class="fa-solid fa-droplet"></i> ${statuses.leech}`;
      container.appendChild(badge);
      this.bindTooltip(
        badge,
        'LEECH',
        `Heals <strong>${statuses.leech * 20}%</strong> of unblocked HP damage dealt (max 10 HP). (Consumes 1 stack per trigger).`,
        `Stacks: ${statuses.leech}`
      );
    }

    // Thorn status
    if (statuses.thorn > 0) {
      const badge = document.createElement('span');
      badge.className = 'status-badge thorns';
      badge.innerHTML = `<i class="fa-solid fa-shield-cat"></i> ${statuses.thorn}`;
      container.appendChild(badge);
      this.bindTooltip(
        badge,
        'THORN',
        `Reflects <strong>${statuses.thorn} damage</strong> back to attacker on clash HP damage. (Consumes 1 stack per trigger).`,
        `Stacks: ${statuses.thorn}`
      );
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
      this.lockBtn.classList.remove('ready-state', 'locked-state');
      this.lockBtn.disabled = true;
      this.lockBtn.innerHTML = '<span class="lock-btn-text">PILIH KARTU</span>';
      
      const selectedCard = this.playerHand.querySelector('.card.selected');
      if (selectedCard) selectedCard.classList.remove('selected');
      
      this.updateKeywordExplanations(this.battleKeywordInfo, '');
      window.SocketService.selectCard(null);
      return;
    }

    // Set new selection
    this.selectedCardInstanceId = instanceId;
    this.lockBtn.classList.remove('disabled', 'locked-state');
    this.lockBtn.classList.add('ready-state');
    this.lockBtn.disabled = false;
    this.lockBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span class="lock-btn-text">LOCK IN</span>';

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
    this.lockBtn.classList.remove('ready-state', 'disabled');
    this.lockBtn.classList.add('locked-state');
    this.lockBtn.disabled = true;
    this.lockBtn.innerHTML = '<span class="lock-waiting-dot"><i class="fa-solid fa-hourglass-half"></i></span> <span class="lock-btn-text">MENUNGGU LAWAN...</span>';
    
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
      const def = window.gameManager?.compendiumRelics?.find(r => r.id === relicId);
      if (!def) return;
      
      const badge = document.createElement('div');
      badge.className = `hud-relic-badge ${def.quality}`;
      
      badge.innerHTML = `
        <i class="fa-solid ${def.icon}"></i>
        ${count > 1 ? `<span class="relic-stack-indicator">${count}</span>` : ''}
      `;
      container.appendChild(badge);
      
      const isUnique = def.unique || def.maxStacks === 1;
      // Bind custom responsive tooltip
      this.bindTooltip(badge, def.name, def.description, `Quality: ${def.quality} ${isUnique ? 'Unique Relic' : 'Relic'} | Stacks: ${count}`);
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
      // Get relic definition from server data (compendiumRelics)
      const def = window.gameManager?.compendiumRelics?.find(r => r.id === relicId);
      if (!def) return;
      
      const isUnique = def.unique || def.maxStacks === 1;
      const stackLabel = isUnique ? 'UNIQUE' : `x${count}`;
      const tagText = isUnique ? `${def.quality} • UNIQUE` : `${def.quality} RELIC`;

      const itemEl = document.createElement('div');
      itemEl.className = `relic-card-item ${def.quality}`;
      
      itemEl.innerHTML = `
        <div class="relic-header-row">
          <div class="relic-title-name">
            <i class="fa-solid ${def.icon || 'fa-gem'}" style="margin-right: 0.5rem;"></i>
            ${def.name}
          </div>
          <span class="relic-stack-badge">${stackLabel}</span>
        </div>
        <div class="relic-quality-tag ${def.quality}">${tagText}</div>
        <p class="relic-card-desc">${def.description}</p>
      `;
      container.appendChild(itemEl);
    });
  },

  renderQuestTiers(tierOffers, onSelectTier, onInspectPool) {
    const grid = document.getElementById('quest-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const titleEl = document.getElementById('quest-screen-title');
    if (titleEl) titleEl.innerHTML = 'SELECT <span class="accent-text">QUEST TIER</span>';
    const subtitleEl = document.getElementById('quest-screen-subtitle');
    if (subtitleEl) subtitleEl.innerText = 'Choose your risk tier. Quests and rewards are drawn based on your choice.';

    const rerollBox = document.getElementById('quest-reroll-box');
    if (rerollBox) rerollBox.classList.add('hidden');
    const rerollBtn = document.getElementById('quest-reroll-btn');
    if (rerollBtn) rerollBtn.classList.add('hidden');
    const confirmBtn = document.getElementById('quest-confirm-btn');
    if (confirmBtn) confirmBtn.classList.add('hidden');

    tierOffers.forEach(offer => {
      const card = document.createElement('div');
      card.className = `quest-tier-card ${offer.tier}`;

      const tokensBadgeHtml = `<div class="quest-tier-token-badge"><i class="fa-solid fa-fire-flame-curved"></i> +${offer.removalTokens} Removal Token${offer.removalTokens > 1 ? 's' : ''}</div>`;

      const perksHtml = (offer.perks && offer.perks.length > 0)
        ? offer.perks.map(p => `
            <div class="quest-tier-perk-item">
              <i class="fa-solid ${p.icon}"></i>
              <span>${p.label}</span>
            </div>
          `).join('')
        : `<div class="quest-tier-perk-item"><i class="fa-solid fa-gift"></i><span>${offer.summaryText}</span></div>`;

      card.innerHTML = `
        <div class="quest-tier-header">
          <div class="quest-tier-name">${offer.tier} TIER</div>
          ${tokensBadgeHtml}
        </div>
        <div class="quest-tier-perks">
          ${perksHtml}
        </div>
        <div class="quest-tier-actions">
          <button class="btn btn-tier-pick ${offer.tier}">CHOOSE ${offer.tier}</button>
          <button class="btn-tier-inspect"><i class="fa-solid fa-circle-info"></i> View Pool Details</button>
        </div>
      `;

      card.querySelector('.btn-tier-pick').addEventListener('click', () => {
        window.AudioSynth.playClick();
        onSelectTier(offer.tier);
      });

      card.querySelector('.btn-tier-inspect').addEventListener('click', (e) => {
        e.stopPropagation();
        window.AudioSynth.playClick();
        if (typeof onInspectPool === 'function') {
          onInspectPool(offer);
        }
      });

      grid.appendChild(card);
    });
  },

  renderRevealedQuest(quest, tier, rerollsLeft, onLockIn, onReroll) {
    const grid = document.getElementById('quest-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const titleEl = document.getElementById('quest-screen-title');
    if (titleEl) titleEl.innerHTML = 'QUEST <span class="accent-text">REVEALED</span>';
    const subtitleEl = document.getElementById('quest-screen-subtitle');
    if (subtitleEl) subtitleEl.innerText = 'Review your objective. Lock in to commit, or reroll for another quest in this tier.';

    const rerollBox = document.getElementById('quest-reroll-box');
    if (rerollBox) rerollBox.classList.remove('hidden');
    const rerollsVal = document.getElementById('quest-rerolls-val');
    if (rerollsVal) rerollsVal.innerText = rerollsLeft;

    const rerollBtn = document.getElementById('quest-reroll-btn');
    if (rerollBtn) {
      rerollBtn.classList.remove('hidden');
      if (rerollsLeft > 0) {
        rerollBtn.classList.remove('disabled');
        rerollBtn.disabled = false;
      } else {
        rerollBtn.classList.add('disabled');
        rerollBtn.disabled = true;
      }
    }

    const confirmBtn = document.getElementById('quest-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.remove('hidden');
      confirmBtn.classList.remove('disabled');
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'LOCK IN QUEST';
    }

    const container = document.createElement('div');
    container.className = 'quest-revealed-container';

    const card = document.createElement('div');
    card.className = `quest-revealed-card ${tier || quest.difficulty}`;

    const tokens = quest.removalTokens !== undefined ? quest.removalTokens : (quest.difficulty === 'HARD' ? 3 : (quest.difficulty === 'MEDIUM' ? 2 : 1));
    const tokensBadgeHtml = `<div class="quest-token-bonus"><i class="fa-solid fa-fire-flame-curved"></i> +${tokens} Removal Token${tokens > 1 ? 's' : ''}</div>`;
    const rewardPoolDesc = quest.rewardPoolText || (quest.difficulty === 'HARD' ? '70% Epic/Legendary Relic · 30% Bonus Pack' : (quest.difficulty === 'MEDIUM' ? '70% Rare/Epic Relic · 30% Bonus Draft' : '80% Common Relic · 20% Bonus Draft'));

    card.innerHTML = `
      <div class="quest-revealed-header">
        <div class="quest-revealed-difficulty ${tier || quest.difficulty}">${tier || quest.difficulty} TIER</div>
        ${tokensBadgeHtml}
      </div>
      <div class="quest-revealed-target">${quest.text}</div>
      <div class="quest-card-reward-box">
        <div class="quest-card-reward-label">REWARD POOL (ON COMPLETION)</div>
        <div class="quest-card-reward-text">${rewardPoolDesc}</div>
        <div class="quest-card-reward-subnote"><i class="fa-solid fa-lock"></i> Rolled & revealed upon completion after round</div>
      </div>
    `;

    container.appendChild(card);
    grid.appendChild(container);
  },

  showQuestPoolModal(offer, allRelics = []) {
    const modal = document.getElementById('quest-pool-modal');
    if (!modal) return;

    const relicsList = (allRelics && allRelics.length > 0)
      ? allRelics
      : (window.gameManager?.compendiumRelics || []);

    const titleEl = document.getElementById('quest-pool-modal-title');
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-gift"></i> ${offer.tier} REWARD POOL`;
    const subtitleEl = document.getElementById('quest-pool-modal-subtitle');
    if (subtitleEl) subtitleEl.innerText = offer.summaryText;

    const contentEl = document.getElementById('quest-pool-modal-content');
    if (contentEl) {
      contentEl.innerHTML = '';
      const pool = offer.pool || {};
      const qualities = (pool.relicQualities || []).map(q => q.quality);
      const eligibleRelics = (relicsList || []).filter(r => qualities.includes(r.quality));

      if (eligibleRelics.length > 0) {
        eligibleRelics.forEach(relic => {
          const item = document.createElement('div');
          item.className = `relic-card-item ${relic.quality}`;
          item.innerHTML = `
            <div class="relic-item-header">
              <span class="relic-quality-badge ${relic.quality}">${relic.quality}</span>
              <strong class="relic-card-name">${relic.name}</strong>
            </div>
            <p class="relic-card-desc">${relic.description}</p>
          `;
          contentEl.appendChild(item);
        });
      } else {
        contentEl.innerHTML = `<div style="padding: 1.5rem; color: var(--text-secondary); text-align: center;">${qualities.join(' / ')} Relics eligible from library. Non-relic reward: ${pool.nonRelicText || 'Bonus'}.</div>`;
      }
    }

    modal.classList.add('active');

    const closeBtn = document.getElementById('quest-pool-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        window.AudioSynth.playClick();
        modal.classList.remove('active');
      };
    }

    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    };
  },

  renderQuestCards(quests, onQuestClick) {
    const grid = document.getElementById('quest-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    quests.forEach(q => {
      const card = document.createElement('div');
      card.className = `quest-card ${q.difficulty}`;
      card.dataset.questId = q.id;
      
      const tokens = q.removalTokens !== undefined ? q.removalTokens : (q.difficulty === 'HARD' ? 2 : (q.difficulty === 'MEDIUM' ? 1 : 0));
      const tokensBadgeHtml = tokens > 0 
        ? `<div class="quest-token-bonus"><i class="fa-solid fa-fire-flame-curved"></i> +${tokens} Removal Token${tokens > 1 ? 's' : ''}</div>`
        : `<div class="quest-token-bonus zero"><i class="fa-solid fa-fire-flame-curved"></i> +0 Removal Tokens</div>`;

      card.innerHTML = `
        <div class="quest-card-difficulty ${q.difficulty}">${q.difficulty}</div>
        <div class="quest-card-text">${q.text}</div>
        <div class="quest-card-reward-box">
          <div class="quest-card-reward-label">MAIN REWARD</div>
          <div class="quest-card-reward-text">${q.reward.text}</div>
          <div class="quest-card-token-label">GUARANTEED BONUS</div>
          ${tokensBadgeHtml}
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
    
    if (progressTextEl) {
      if (progress >= target) {
        progressTextEl.innerText = 'COMPLETED';
        progressTextEl.style.color = 'var(--color-primary)';
        progressTextEl.style.fontWeight = 'bold';
      } else {
        progressTextEl.innerText = `${progress} / ${target}`;
        progressTextEl.style.color = '';
        progressTextEl.style.fontWeight = '';
      }
    }
    
    if (rewardEl) {
      const tokens = activeQuest.removalTokens !== undefined ? activeQuest.removalTokens : (activeQuest.difficulty === 'HARD' ? 3 : (activeQuest.difficulty === 'MEDIUM' ? 2 : 1));
      const tokenBonusStr = tokens > 0 ? ` & +${tokens} Token${tokens > 1 ? 's' : ''}` : '';
      const mainRewardText = activeQuest.reward?.text || activeQuest.rewardPoolText || `${activeQuest.tier || activeQuest.difficulty} Tier Reward`;
      rewardEl.innerText = `Reward: ${mainRewardText}${tokenBonusStr}`;
    }
  },

  renderRemovalCards(deck, onCardClick) {
    const grid = document.getElementById('removal-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const minDeckSize = 4;
    const isLockedOut = deck.length <= minDeckSize;

    deck.forEach(card => {
      const cardEl = this.createCardElement(card);
      if (isLockedOut) {
        cardEl.classList.add('locked-card');
        cardEl.style.opacity = '0.45';
        cardEl.style.cursor = 'not-allowed';
        cardEl.title = 'Deck is at minimum size (4 cards). Cannot remove.';
      } else {
        cardEl.addEventListener('click', () => {
          window.AudioSynth.playClick();
          grid.querySelectorAll('.card').forEach(c => {
            c.classList.remove('selected');
          });
          cardEl.classList.add('selected');
          onCardClick(card.instanceId);
        });
      }
      grid.appendChild(cardEl);
    });
  },

  renderRelicChoices(relicOptions, onRelicClick) {
    if (!this.relicChoicesGrid) return;
    this.relicChoicesGrid.innerHTML = '';

    relicOptions.forEach(relic => {
      const itemEl = document.createElement('div');
      itemEl.className = `relic-card-item ${relic.quality}`;
      itemEl.dataset.relicId = relic.id;

      const isUnique = relic.unique || relic.maxStacks === 1;
      const tagText = isUnique ? `${relic.quality} • UNIQUE` : `${relic.quality} RELIC`;

      itemEl.innerHTML = `
        <div class="relic-header-row">
          <div class="relic-title-name">
            <i class="fa-solid ${relic.icon || 'fa-gem'}" style="margin-right: 0.5rem;"></i>
            ${relic.name}
          </div>
        </div>
        <div class="relic-quality-tag ${relic.quality}">${tagText}</div>
        <p class="relic-card-desc">${relic.description}</p>
      `;

      itemEl.addEventListener('click', () => {
        window.AudioSynth.playClick();
        this.relicChoicesGrid.querySelectorAll('.relic-card-item').forEach(el => {
          el.classList.remove('selected');
        });
        itemEl.classList.add('selected');
        onRelicClick(relic.id);
      });

      this.relicChoicesGrid.appendChild(itemEl);
    });
  },

  bindTooltip(element, title, description, subText = '') {
    if (!element) return;
    
    element.addEventListener('mouseenter', (e) => {
      const tooltip = document.getElementById('game-tooltip');
      if (!tooltip) return;
      
      const titleEl = tooltip.querySelector('.tooltip-title');
      const descEl = tooltip.querySelector('.tooltip-desc');
      const subEl = tooltip.querySelector('.tooltip-sub');
      
      if (titleEl) titleEl.innerText = title;
      if (descEl) descEl.innerHTML = description;
      if (subEl) {
        if (subText) {
          subEl.innerText = subText;
          subEl.style.display = 'block';
        } else {
          subEl.style.display = 'none';
        }
      }
      
      tooltip.classList.remove('hidden');
      tooltip.offsetHeight; // force repaint
      tooltip.classList.add('visible');
      
      this.positionTooltip(e, tooltip);
    });
    
    element.addEventListener('mousemove', (e) => {
      const tooltip = document.getElementById('game-tooltip');
      if (tooltip && tooltip.classList.contains('visible')) {
        this.positionTooltip(e, tooltip);
      }
    });
    
    element.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('game-tooltip');
      if (tooltip) {
        tooltip.classList.remove('visible');
        setTimeout(() => {
          if (!tooltip.classList.contains('visible')) {
            tooltip.classList.add('hidden');
          }
        }, 150);
      }
    });
  },

  positionTooltip(e, tooltip) {
    const margin = 15;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    let x = e.clientX + margin;
    let y = e.clientY + margin;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Check horizontal overflow: right boundary
    if (x + tooltipWidth > windowWidth - 10) {
      x = e.clientX - tooltipWidth - margin;
    }
    
    // Check vertical overflow: bottom boundary
    if (y + tooltipHeight > windowHeight - 10) {
      y = e.clientY - tooltipHeight - margin;
    }
    
    // Safety check boundaries
    if (x < 10) x = 10;
    if (y < 10) y = 10;
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  },

  renderCompendium(cards, relics) {
    this.compendiumCardsList = cards;
    this.renderCompendiumCards(cards);
    this.renderCompendiumRelics(relics);
  },

  renderCompendiumCards(cards, filterElement = 'ALL') {
    const grid = document.getElementById('compendium-cards-grid');
    if (!grid) return;
    
    const filtered = filterElement === 'ALL' ? cards : cards.filter(c => c.element === filterElement);
    
    if (filtered.length === 0) {
      grid.innerHTML = `<div class="compendium-loading">No cards found for this filter.</div>`;
      return;
    }
    
    const ELEMENT_ORDER = ['FIRE', 'WATER', 'NATURE', 'NEUTRAL', 'CHAOS'];
    const sorted = [...filtered].sort((a, b) => {
      const ea = ELEMENT_ORDER.indexOf(a.element);
      const eb = ELEMENT_ORDER.indexOf(b.element);
      if (ea !== eb) return ea - eb;
      return a.name.localeCompare(b.name);
    });
    
    const fragment = document.createDocumentFragment();
    sorted.forEach(card => {
      // Create standard in-game card element
      const cardEl = this.createCardElement(card);
      
      let outcomesDesc = '<div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 0.3rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.15rem;">CLASH OUTCOMES:</div>';
      if (card.outcomes) {
        Object.entries(card.outcomes).forEach(([outcome, data]) => {
          let details = [];
          if (data.damage) details.push(`<span class="accent-text" style="color: #e74c3c;">${data.damage} DMG</span>`);
          if (data.shield) details.push(`<span class="accent-text" style="color: #3498db;">${data.shield} SHIELD</span>`);
          if (data.heal) details.push(`<span class="accent-text" style="color: #2ecc71;">${data.heal} HEAL</span>`);
          if (data.selfDamage) details.push(`<span class="accent-text" style="color: #e67e22;">${data.selfDamage} SELF DMG</span>`);
          
          if (data.applyStatus) {
            if (data.applyStatus.opponent) {
              Object.entries(data.applyStatus.opponent).forEach(([stat, val]) => {
                const statName = stat === 'thorns' ? 'THORN' : stat.toUpperCase();
                if (typeof val === 'boolean') {
                  details.push(`<span style="color: #e74c3c; font-weight: bold;">Opponent ${statName}</span>`);
                } else if (stat === 'dispel' || stat === 'cleanse') {
                  details.push(`<span style="color: #e74c3c; font-weight: bold;">Opponent ${statName}</span>`);
                } else {
                  details.push(`<span style="color: #e74c3c; font-weight: bold;">+${val} Opponent ${statName}</span>`);
                }
              });
            }
            if (data.applyStatus.self) {
              Object.entries(data.applyStatus.self).forEach(([stat, val]) => {
                const statName = stat === 'thorns' ? 'THORN' : stat.toUpperCase();
                if (typeof val === 'boolean') {
                  details.push(`<span style="color: #f1c40f; font-weight: bold;">Self ${statName}</span>`);
                } else if (stat === 'cleanse' || stat === 'dispel') {
                  details.push(`<span style="color: #f1c40f; font-weight: bold;">Self ${statName}</span>`);
                } else {
                  details.push(`<span style="color: #f1c40f; font-weight: bold;">+${val} Self ${statName}</span>`);
                }
              });
            }
            if (data.applyStatus.both) {
              Object.entries(data.applyStatus.both).forEach(([stat, val]) => {
                const statName = stat === 'thorns' ? 'THORN' : stat.toUpperCase();
                if (typeof val === 'boolean') {
                  details.push(`<span style="color: #c084fc; font-weight: bold;">Both ${statName}</span>`);
                } else if (stat === 'cleanse' || stat === 'dispel') {
                  details.push(`<span style="color: #c084fc; font-weight: bold;">Both ${statName}</span>`);
                } else {
                  details.push(`<span style="color: #c084fc; font-weight: bold;">+${val} Both ${statName}</span>`);
                }
              });
            }
          }
          
          outcomesDesc += `<div style="margin-top: 0.25rem;"><strong>${outcome}:</strong> ${details.length > 0 ? details.join(' & ') : 'No Effect'}</div>`;
        });
      }
      
      this.bindTooltip(cardEl, card.name, outcomesDesc, `Element: ${card.element}`);
      
      fragment.appendChild(cardEl);
    });
    grid.innerHTML = '';
    grid.appendChild(fragment);
    this._lastRenderedFilter = filterElement;
  },

  renderCompendiumRelics(relics) {
    const grid = document.getElementById('compendium-relics-grid');
    if (!grid) return;
    
    if (relics.length === 0) {
      grid.innerHTML = `<div class="compendium-loading">No relics found.</div>`;
      return;
    }
    
    const QUALITY_ORDER = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
    const sortedRelics = [...relics].sort((a, b) => {
      const qa = QUALITY_ORDER.indexOf(a.quality);
      const qb = QUALITY_ORDER.indexOf(b.quality);
      if (qa !== qb) return qa - qb;
      return a.name.localeCompare(b.name);
    });
    
    const fragment = document.createDocumentFragment();
    sortedRelics.forEach(relic => {
      const itemEl = document.createElement('div');
      itemEl.className = `compendium-relic-item ${relic.quality}`;
      
      itemEl.innerHTML = `
        <div class="compendium-relic-name">
          <i class="fa-solid ${relic.icon || 'fa-gem'}" style="margin-right: 0.35rem;"></i>
          ${relic.name}
        </div>
        <div class="compendium-relic-quality ${relic.quality}">${relic.quality} RELIC</div>
        <div class="compendium-relic-desc">${relic.description}</div>
      `;
      
      this.bindTooltip(itemEl, relic.name, relic.description, `Quality: ${relic.quality}`);
      
      fragment.appendChild(itemEl);
    });
    grid.innerHTML = '';
    grid.appendChild(fragment);
  },

  /**
   * Starts live 20s authoritative turn countdown
   */
  startTurnTimer(duration = 20) {
    if (this._turnTimerInterval) {
      clearInterval(this._turnTimerInterval);
      this._turnTimerInterval = null;
    }
    const timerBadge = document.getElementById('battle-turn-timer');
    const timerVal = document.getElementById('turn-timer-val');
    if (!timerBadge || !timerVal) return;

    let remaining = duration;
    timerVal.innerText = remaining;
    timerBadge.classList.remove('hidden', 'urgent');

    this._turnTimerInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        clearInterval(this._turnTimerInterval);
        this._turnTimerInterval = null;
      }
      timerVal.innerText = remaining;
      if (remaining <= 5) {
        timerBadge.classList.add('urgent');
      }
    }, 1000);
  },

  /**
   * Stops and hides turn timer countdown
   */
  stopTurnTimer() {
    if (this._turnTimerInterval) {
      clearInterval(this._turnTimerInterval);
      this._turnTimerInterval = null;
    }
    const timerBadge = document.getElementById('battle-turn-timer');
    if (timerBadge) {
      timerBadge.classList.add('hidden');
      timerBadge.classList.remove('urgent');
    }
  },

  /**
   * Visually locks the card auto-played by server timeout
   */
  handleAutoPlay(cardInstanceId) {
    this.stopTurnTimer();
    if (!cardInstanceId) return;

    const cardEl = this.playerHand ? this.playerHand.querySelector(`.card[data-instance-id="${cardInstanceId}"]`) : null;
    if (cardEl && this.selectedCardInstanceId !== cardInstanceId) {
      this.selectCard(cardEl, cardInstanceId);
    }
    this.lockSelection();
    this.showToast('Time expired! Card auto-played.');
  },

  /**
   * Displays 30s countdown overlay for opponent disconnection
   */
  showOpponentDcOverlay(playerName, timeoutSeconds = 30) {
    if (this._dcCountdownInterval) {
      clearInterval(this._dcCountdownInterval);
      this._dcCountdownInterval = null;
    }
    const overlay = document.getElementById('opponent-dc-overlay');
    const nameEl = document.getElementById('dc-player-name');
    const countdownEl = document.getElementById('dc-countdown-val');
    if (!overlay) return;

    if (nameEl) nameEl.innerText = playerName || 'Opponent';
    let remaining = timeoutSeconds;
    if (countdownEl) countdownEl.innerText = remaining;
    overlay.classList.remove('hidden');

    this._dcCountdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        clearInterval(this._dcCountdownInterval);
        this._dcCountdownInterval = null;
      }
      if (countdownEl) countdownEl.innerText = remaining;
    }, 1000);
  },

  /**
   * Hides opponent disconnection overlay
   */
  hideOpponentDcOverlay() {
    if (this._dcCountdownInterval) {
      clearInterval(this._dcCountdownInterval);
      this._dcCountdownInterval = null;
    }
    const overlay = document.getElementById('opponent-dc-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  /**
   * Renders the last 5-10 clash history logs in the drawer
   */
  updateClashLog(history = []) {
    const list = document.getElementById('clash-log-list');
    if (!list) return;

    if (!history || history.length === 0) {
      list.innerHTML = '<div class="clash-log-empty">No clashes recorded yet this match.</div>';
      return;
    }

    list.innerHTML = '';
    const reversed = [...history].reverse();
    reversed.forEach(entry => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'clash-log-entry';

      const p1OutcomeClass = (entry.p1.outcome || '').toLowerCase();
      entryDiv.innerHTML = `
        <div class="clash-log-meta">
          <span class="clash-turn-badge">ROUND ${entry.round} &bull; TURN ${entry.turn}</span>
          <span class="clash-outcome-badge ${p1OutcomeClass}">${entry.p1.outcome}</span>
        </div>
        <div class="clash-cards-row">
          <div class="clash-card-side you">
            <span class="clash-card-name">${entry.p1.cardName} (${entry.p1.element})</span>
            <div class="clash-stat-line">Dmg: ${entry.p1.dmgDealt} &bull; Shield: +${entry.p1.shieldGain}</div>
          </div>
          <span class="clash-vs-sep">VS</span>
          <div class="clash-card-side opponent">
            <span class="clash-card-name">${entry.p2.cardName} (${entry.p2.element})</span>
            <div class="clash-stat-line">Dmg: ${entry.p2.dmgDealt} &bull; Shield: +${entry.p2.shieldGain}</div>
          </div>
        </div>
      `;
      list.appendChild(entryDiv);
    });
  },

  /**
   * Displays a stylized floating combat toast near HUD on relic activation
   */
  showRelicCombatToast(isPlayer, relicName, message) {
    const container = isPlayer ? document.querySelector('.player-hud') : document.querySelector('.enemy-hud');
    if (!container) {
      this.showToast(message || `${relicName} activated!`);
      return;
    }

    // Remove existing toast in this container to prevent overlapping clutter
    const existing = container.querySelector('.relic-combat-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `relic-combat-toast ${isPlayer ? 'player-toast' : 'enemy-toast'}`;
    toast.innerHTML = `<i class="fa-solid fa-sparkles"></i> <strong>${relicName}</strong>: ${message || 'Activated!'}`;

    // Player toast is anchored safely to the right of the player HUD, completely clear of the left sidebar & quest tracker
    if (isPlayer) {
      toast.style.top = '8px';
      toast.style.left = 'calc(100% + 12px)';
    } else {
      toast.style.top = '100%';
      toast.style.right = '10px';
    }

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2400);
  }
};

// Listen globally to hide tooltips on touch screens when tapping outside
window.addEventListener('click', (e) => {
  const tooltip = document.getElementById('game-tooltip');
  if (tooltip && tooltip.classList.contains('visible')) {
    if (!e.target.closest('.status-badge') && 
        !e.target.closest('.hud-relic-badge') && 
        !e.target.closest('.relic-card-item') &&
        !e.target.closest('.card') &&
        !e.target.closest('.compendium-relic-item')) {
      tooltip.classList.remove('visible');
      setTimeout(() => {
        if (!tooltip.classList.contains('visible')) {
          tooltip.classList.add('hidden');
        }
      }, 150);
    }
  }
});

// Expose globally
window.UI = UI;
