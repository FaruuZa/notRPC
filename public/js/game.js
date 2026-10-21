const GameManager = {
  currentRoomId: null,
  myId: null,
  myName: null,
  opponentId: null,
  opponentName: null,
  
  // Game states
  round: 0,
  hand: [],
  myHp: 100,
  myMaxHp: 100,
  myShield: 0,
  opponentHp: 100,
  opponentMaxHp: 100,
  opponentShield: 0,
  myStatuses: {},
  opponentStatuses: {},
  
  // Rework score states
  myPoints: 0,
  opponentPoints: 0,
  selectedBonusCardTemplateId: null,
  
  // Relics & Quests states
  myRelics: {},
  opponentRelics: {},
  activeQuest: null,
  offeredQuests: [],
  selectedQuestId: null,
  myRemovalTokens: 0,
  selectedRemovalCardInstanceId: null,
  compendiumCards: [],
  compendiumRelics: [],
  compendiumQuestTemplates: [],
  
  // Animation sync helpers
  currentRoundReveal: null,
  currentRoundResult: null,
  pendingRelicTriggers: [],
  pendingRoundFinished: null,
  pendingGameOver: null,
  pendingDraftPhase: null,
  roundFinishedShowing: false,
  isVisualPipelineRunning: false,

  init() {
    // Logo floating animations in lobby
    if (window.Animations) {
      window.Animations.animateLogoPulse();
    }

    // Initialize Tab Navigation in Lobby
    if (window.UI && window.UI.initTabNavigation) {
      window.UI.initTabNavigation();
    }

    // Initialize Auth UI & Sessions
    this.initAuth();

    // Bind event listeners to UI components
    this.bindEvents();

    // Process buffered pendingReconnect event if received before init
    if (window.pendingReconnectData) {
      console.log('[GameManager] Processing buffered pendingReconnect:', window.pendingReconnectData);
      const data = window.pendingReconnectData;
      window.pendingReconnectData = null;
      this.onPendingReconnect(data);
    }

    console.log('[GameManager] Game initialized.');
  },

  initAuth() {
    const UI = window.UI;
    const authTabLogin = document.getElementById('auth-tab-login');
    const authTabRegister = document.getElementById('auth-tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const guestPlayBtn = document.getElementById('guest-play-btn');
    const authActionBtn = document.getElementById('auth-action-btn');
    const reconnectBtn = document.getElementById('reconnect-btn');

    if (authTabLogin && authTabRegister) {
      authTabLogin.addEventListener('click', (e) => {
        e.preventDefault();
        authTabLogin.classList.add('active');
        authTabRegister.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      });
      authTabRegister.addEventListener('click', (e) => {
        e.preventDefault();
        authTabRegister.classList.add('active');
        authTabLogin.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errEl = document.getElementById('auth-error-login');
        if (errEl) errEl.classList.add('hidden');

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            if (errEl) {
              errEl.textContent = data.error || 'Login failed.';
              errEl.classList.remove('hidden');
            }
            return;
          }

          localStorage.setItem('element_clash_token', data.token);
          localStorage.setItem('element_clash_user', JSON.stringify(data.user));

          if (window.updateSocketAuthToken) {
            window.updateSocketAuthToken(data.token);
          }

          this.updateUserSessionState(data.user);
          if (UI) UI.hideAuthScreen();
          if (UI && UI.showToast) UI.showToast(`Welcome back, ${data.user.username}!`);
        } catch (err) {
          if (errEl) {
            errEl.textContent = 'Server connection error. Please try again.';
            errEl.classList.remove('hidden');
          }
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const errEl = document.getElementById('auth-error-register');
        if (errEl) errEl.classList.add('hidden');

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            if (errEl) {
              errEl.textContent = data.error || 'Registration failed.';
              errEl.classList.remove('hidden');
            }
            return;
          }

          localStorage.setItem('element_clash_token', data.token);
          localStorage.setItem('element_clash_user', JSON.stringify(data.user));

          if (window.updateSocketAuthToken) {
            window.updateSocketAuthToken(data.token);
          }

          this.updateUserSessionState(data.user);
          if (UI) UI.hideAuthScreen();
          if (UI && UI.showToast) UI.showToast(`Account created! Welcome, ${data.user.username}!`);
        } catch (err) {
          if (errEl) {
            errEl.textContent = 'Server connection error. Please try again.';
            errEl.classList.remove('hidden');
          }
        }
      });
    }

    const guestLoginLink = document.getElementById('guest-login-link');
    if (guestLoginLink) {
      guestLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (UI) UI.showAuthScreen();
      });
    }

    if (guestPlayBtn) {
      guestPlayBtn.addEventListener('click', () => {
        if (UI) UI.hideAuthScreen();
      });
    }

    if (authActionBtn) {
      authActionBtn.addEventListener('click', () => {
        const token = localStorage.getItem('element_clash_token');
        if (token) {
          localStorage.removeItem('element_clash_token');
          localStorage.removeItem('element_clash_user');
          if (window.updateSocketAuthToken) window.updateSocketAuthToken(null);
          this.updateUserSessionState(null);
          if (UI && UI.showToast) UI.showToast('Logged out successfully.');
        } else {
          if (UI) UI.showAuthScreen();
        }
      });
    }

    if (reconnectBtn) {
      reconnectBtn.addEventListener('click', () => {
        const token = localStorage.getItem('element_clash_token');
        if (!token) {
          if (window.UI && window.UI.showToast) window.UI.showToast('Login required to reconnect to a match.');
          return;
        }
        if (!window.SocketService) return;
        // Ensure socket is connected before sending
        if (socket.connected) {
          window.SocketService.reconnectMatch(token);
        } else {
          socket.once('connect', () => {
            window.SocketService.reconnectMatch(token);
          });
          socket.connect();
        }
      });
    }

    const storedUser = localStorage.getItem('element_clash_user');
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        this.updateUserSessionState(userObj);
      } catch (e) {
        this.updateUserSessionState(null);
      }
    } else {
      this.updateUserSessionState(null);
    }
  },

  updateUserSessionState(user) {
    const userDisplayName = document.getElementById('user-display-name');
    const authBtnLabel = document.getElementById('auth-btn-label');
    const guestGroup = document.getElementById('guest-username-group');
    const guestHint = document.getElementById('guest-login-hint');
    const statJoinedDate = document.getElementById('stat-joined-date');
    const statUsername = document.getElementById('stat-username');

    if (user && user.username) {
      if (userDisplayName) userDisplayName.textContent = user.username;
      if (statUsername && !userDisplayName) statUsername.textContent = user.username;
      if (authBtnLabel) authBtnLabel.textContent = 'LOGOUT';
      if (guestGroup) guestGroup.classList.add('hidden');
      if (guestHint) guestHint.classList.add('hidden');
      if (statJoinedDate) {
        statJoinedDate.textContent = user.createdAt ? `Joined: ${new Date(user.createdAt).toLocaleDateString()}` : 'Registered Player';
      }
      this.myName = user.username;
    } else {
      if (userDisplayName) userDisplayName.textContent = 'Guest Player';
      if (statUsername && !userDisplayName) statUsername.textContent = 'Guest Player';
      if (authBtnLabel) authBtnLabel.textContent = 'LOGIN';
      if (guestGroup) guestGroup.classList.remove('hidden');
      if (guestHint) guestHint.classList.remove('hidden');
      if (statJoinedDate) statJoinedDate.textContent = 'Playing as Guest';
      this.myName = 'Guest Player';
    }
  },

  onPendingReconnect(data) {
    if (window.UI) {
      window.UI.showReconnectBanner();
    }
  },

  onReconnectSuccess(data) {
    const UI = window.UI;
    if (UI) {
      UI.hideReconnectBanner();
    }
    console.log('[GameManager] Reconnect successful! Restoring match state...', data);

    try {
      this.currentRoomId = data.roomId;
      this.myId = data.yourId;
      this.myName = data.yourName || 'Player';
      this.opponentId = data.opponentId;
      this.opponentName = data.opponentName || 'Opponent';
      this.myHp = data.yourHp;
      this.myMaxHp = data.yourMaxHp || 100;
      this.myShield = data.yourShield || 0;
      this.myPoints = data.yourPoints || 0;
      this.hand = data.yourHand || [];
      this.myStatuses = data.yourStatuses || {};
      this.myRelics = data.yourRelics || {};
      this.activeQuest = data.yourActiveQuest || null;
      this.myRemovalTokens = data.yourRemovalTokens || 0;

      const hudTokensVal = document.getElementById('player-tokens-val');
      if (hudTokensVal) hudTokensVal.innerText = this.myRemovalTokens;

      this.opponentHp = data.opponentHp;
      this.opponentMaxHp = data.opponentMaxHp || 100;
      this.opponentShield = data.opponentShield || 0;
      this.opponentPoints = data.opponentPoints || 0;
      this.opponentStatuses = data.opponentStatuses || {};
      this.opponentRelics = data.opponentRelics || {};

      if (UI) {
        // 1. Set HUD player names
        if (UI.playerName && this.myName) {
          UI.setHudName(UI.playerName, this.myName);
        }
        if (UI.enemyName && this.opponentName) {
          UI.setHudName(UI.enemyName, this.opponentName);
        }

        // 2. Set Max HP numbers
        if (UI.playerMaxHpVal) UI.playerMaxHpVal.innerText = this.myMaxHp;
        if (UI.enemyMaxHpVal) UI.enemyMaxHpVal.innerText = this.opponentMaxHp;

        // 3. Update HP and Shield bars
        UI.updateHp('player', this.myHp, this.myMaxHp);
        UI.updateHp('opponent', this.opponentHp, this.opponentMaxHp);
        if (UI.updateShield) {
          UI.updateShield('player', this.myShield);
          UI.updateShield('opponent', this.opponentShield);
        }

        // 4. Update Statuses
        if (UI.renderStatuses) {
          UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
          UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
        }

        // 5. Update Points and Active Quest
        if (UI.renderPoints) {
          UI.renderPoints(UI.playerPoints, this.myPoints);
          UI.renderPoints(UI.enemyPoints, this.opponentPoints);
        }
        if (UI.updateQuestTracker) {
          UI.updateQuestTracker(this.activeQuest);
        }

        // 6. Always switch away from Lobby screen immediately to Battle screen
        UI.showScreen('battle');
        UI.renderHand(this.hand, true, true);

        // If reconnecting during Quest Phase and quest is not yet locked, show Quest Selection
        if (data.state === 'QUEST_PHASE' && !data.questLocked) {
          this.onQuestSelectionStart({
            quests: data.offeredQuests || [],
            rerollsLeft: 1 - (data.questRerollCount || 0)
          });
        } else if (data.state === 'PREPARATION_PHASE' && data.pendingRelicChoices && data.pendingRelicChoices.length > 0) {
          this.onRelicChoiceStart({ relics: data.pendingRelicChoices });
        }

        if (data.clashHistory && UI.updateClashLog) {
          UI.updateClashLog(data.clashHistory);
        }

        UI.showToast('Reconnected to active match!');
      }
    } catch (err) {
      console.error('[GameManager] Error during onReconnectSuccess:', err);
    }
  },

  onOpponentDisconnected(data) {
    if (window.UI) {
      if (window.UI.showOpponentDcOverlay) {
        window.UI.showOpponentDcOverlay(data.disconnectedPlayerName, data.timeoutSeconds || 30);
      }
      if (window.UI.showToast) {
        window.UI.showToast(`Opponent ${data.disconnectedPlayerName} disconnected. Waiting 30s for reconnect...`);
      }
    }
  },

  onOpponentReconnected(data) {
    if (window.UI) {
      if (window.UI.hideOpponentDcOverlay) {
        window.UI.hideOpponentDcOverlay();
      }
      if (window.UI.showToast) {
        window.UI.showToast(`Opponent ${data.reconnectedPlayerName} has reconnected!`);
      }
    }
  },

  onTurnTimerStarted(data) {
    if (window.UI && window.UI.startTurnTimer) {
      window.UI.startTurnTimer(data.duration || 20);
    }
  },

  onAutoPlayTriggered(data) {
    if (window.UI && window.UI.handleAutoPlay) {
      window.UI.handleAutoPlay(data.cardInstanceId);
    }
  },

  bindEvents() {
    const UI = window.UI;

    // Play button triggers matchmaking
    const playBtnEl = document.getElementById('play-btn');
    if (playBtnEl) {
      const handlePlayClick = (e) => {
        console.log('[GameManager] Play button clicked!');
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput ? usernameInput.value.trim() : '';
        const roomCodeInput = document.getElementById('room-code-input');
        const roomCode = roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : '';
        this.myName = username || 'Player';
        
        // Unlock AudioContext on user gesture
        if (window.AudioSynth) {
          try {
            window.AudioSynth.init();
            window.AudioSynth.playClick();
          } catch (audioErr) {
            console.warn('[AudioSynth Warning]', audioErr);
          }
        }
        
        // Request immersive fullscreen on mobile to hide toolbars
        try {
          const docEl = document.documentElement;
          if (docEl && docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          }
        } catch (e) {
          console.warn('Fullscreen request blocked or unsupported:', e);
        }
        
        // Submit connection queue
        if (window.SocketService) {
          window.SocketService.joinQueue(this.myName, roomCode);
        }
        
        // Update UI matching controls
        const leaveQueueBtn = document.getElementById('leave-queue-btn');
        const queueStatusSub = document.getElementById('queue-status-sub');
        const statusText = document.getElementById('status-text');

        if (usernameInput) usernameInput.disabled = true;
        playBtnEl.classList.add('hidden');
        if (leaveQueueBtn) leaveQueueBtn.classList.remove('hidden');
        if (queueStatusSub) queueStatusSub.classList.remove('hidden');
        if (statusText) statusText.innerText = '';
      };

      playBtnEl.addEventListener('click', handlePlayClick);
    }

    // Leave queue button triggers matchmaking cancellation
    if (UI.leaveQueueBtn) {
      UI.leaveQueueBtn.addEventListener('click', () => {
        if (window.AudioSynth) window.AudioSynth.playClick();
        if (window.SocketService) window.SocketService.leaveQueue();
        
        // Reset matching controls
        if (UI.usernameInput) UI.usernameInput.disabled = false;
        if (UI.playBtn) UI.playBtn.classList.remove('hidden');
        if (UI.leaveQueueBtn) UI.leaveQueueBtn.classList.add('hidden');
        if (UI.queueStatusSub) UI.queueStatusSub.classList.add('hidden');
        if (UI.statusText) UI.statusText.innerText = 'Ready to enter the arena...';
      });
    }

    // Lock selection button
    if (UI.lockBtn) {
      UI.lockBtn.addEventListener('click', () => {
        UI.lockSelection();
      });
    }

    // Element legend toggle button
    const legendBtn = document.getElementById('element-legend-btn');
    const legendPanel = document.getElementById('element-legend-panel');
    if (legendBtn && legendPanel) {
      legendBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        const isHidden = legendPanel.classList.contains('hidden');
        legendPanel.classList.toggle('hidden');
        legendBtn.classList.toggle('active', isHidden);
        // Also close the keyword info panel when legend opens
        if (isHidden) {
          UI.battleKeywordInfo.classList.add('hidden');
          UI.battleKeywordInfo.dataset.source = '';
        }
      });
    }

    // Loser Bonus pick confirm button
    if (UI.bonusConfirmBtn) {
      UI.bonusConfirmBtn.addEventListener('click', () => {
        if (this.selectedBonusCardTemplateId) {
          window.AudioSynth.playClick();
          UI.bonusConfirmBtn.classList.add('disabled');
          UI.bonusConfirmBtn.disabled = true;
          window.SocketService.selectBonusCard(this.selectedBonusCardTemplateId);
        }
      });
    }

    // Pack reveal confirm button
    if (UI.packRevealConfirmBtn) {
      UI.packRevealConfirmBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        UI.packRevealConfirmBtn.classList.add('disabled');
        UI.packRevealConfirmBtn.disabled = true;
        // Animate cards acquisition sliding down
        const cards = UI.revealCardsFan.querySelectorAll('.card');
        window.Animations.animateCardsAcquisition(cards, () => {
          window.SocketService.packRevealConfirm();
        });
      });
    }

    // Game over replay return button
    if (UI.goLobbyBtn) {
      UI.goLobbyBtn.addEventListener('click', () => {
        if (window.AudioSynth) window.AudioSynth.playClick();
        this.resetLobby();
      });
    }

    // Surrender button click handler
    const surrenderBtn = document.getElementById('surrender-btn');
    const surrenderModal = document.getElementById('surrender-modal');
    const surrenderConfirmBtn = document.getElementById('surrender-confirm-btn');
    const surrenderCancelBtn = document.getElementById('surrender-cancel-btn');

    if (surrenderBtn && surrenderModal) {
      surrenderBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        surrenderModal.classList.add('active');
      });
    }

    if (surrenderConfirmBtn) {
      surrenderConfirmBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        if (surrenderModal) surrenderModal.classList.remove('active');
        window.SocketService.surrender();
      });
    }

    if (surrenderCancelBtn) {
      surrenderCancelBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        if (surrenderModal) surrenderModal.classList.remove('active');
      });
    }

    // Clash log toggle & close handlers
    const clashLogToggle = document.getElementById('clash-log-toggle');
    const clashLogDrawer = document.getElementById('clash-log-drawer');
    const clashLogClose = document.getElementById('clash-log-close');
    if (clashLogToggle && clashLogDrawer) {
      clashLogToggle.addEventListener('click', () => {
        if (window.AudioSynth) window.AudioSynth.playClick();
        clashLogDrawer.classList.toggle('hidden');
      });
    }
    if (clashLogClose && clashLogDrawer) {
      clashLogClose.addEventListener('click', () => {
        if (window.AudioSynth) window.AudioSynth.playClick();
        clashLogDrawer.classList.add('hidden');
      });
    }

    // Deck view button click handler
    const viewDeckBtn = document.getElementById('view-deck-btn');
    const deckModal = document.getElementById('deck-modal');
    const deckCloseBtn = document.getElementById('deck-close-btn');

    // Tabs in inventory modal
    const tabCardsBtn = document.getElementById('tab-cards-btn');
    const tabRelicsBtn = document.getElementById('tab-relics-btn');
    const tabCardsContent = document.getElementById('tab-cards-content');
    const tabRelicsContent = document.getElementById('tab-relics-content');

    if (tabCardsBtn && tabRelicsBtn && tabCardsContent && tabRelicsContent) {
      tabCardsBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        tabCardsBtn.classList.add('active');
        tabRelicsBtn.classList.remove('active');
        tabCardsContent.style.display = 'block';
        tabRelicsContent.style.display = 'none';
      });

      tabRelicsBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        tabRelicsBtn.classList.add('active');
        tabCardsBtn.classList.remove('active');
        tabRelicsContent.style.display = 'block';
        tabCardsContent.style.display = 'none';
      });
    }

    if (viewDeckBtn && deckModal) {
      viewDeckBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        // Reset tabs to Cards active
        if (tabCardsBtn && tabRelicsBtn && tabCardsContent && tabRelicsContent) {
          tabCardsBtn.classList.add('active');
          tabRelicsBtn.classList.remove('active');
          tabCardsContent.style.display = 'block';
          tabRelicsContent.style.display = 'none';
        }
        this.renderDeckModal();
        deckModal.classList.add('active');
      });
    }

    if (deckCloseBtn && deckModal) {
      deckCloseBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        deckModal.classList.remove('active');
      });
    }

    if (deckModal) {
      deckModal.addEventListener('click', (e) => {
        if (e.target === deckModal) {
          window.AudioSynth.playClick();
          deckModal.classList.remove('active');
        }
      });
    }

    // Quest Confirm Button
    const questConfirmBtn = document.getElementById('quest-confirm-btn');
    if (questConfirmBtn) {
      questConfirmBtn.addEventListener('click', () => {
        if (this.selectedQuestId) {
          window.AudioSynth.playClick();
          questConfirmBtn.classList.add('disabled');
          questConfirmBtn.disabled = true;
          window.SocketService.selectQuest(this.selectedQuestId);
        }
      });
    }

    // Quest Reroll Button
    const questRerollBtn = document.getElementById('quest-reroll-btn');
    if (questRerollBtn) {
      questRerollBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        questRerollBtn.classList.add('disabled');
        questRerollBtn.disabled = true;
        window.SocketService.rerollQuests();
      });
    }

    // Card Removal Confirm Button
    const removalConfirmBtn = document.getElementById('removal-confirm-btn');
    if (removalConfirmBtn) {
      removalConfirmBtn.addEventListener('click', () => {
        if (this.selectedRemovalCardInstanceId) {
          window.AudioSynth.playClick();
          removalConfirmBtn.classList.add('disabled');
          removalConfirmBtn.disabled = true;
          window.SocketService.removeCard(this.selectedRemovalCardInstanceId);
        }
      });
    }

    // Relic Selection Confirm Button
    const relicConfirmBtn = document.getElementById('relic-confirm-btn');
    if (relicConfirmBtn) {
      relicConfirmBtn.addEventListener('click', () => {
        if (this.selectedRelicId) {
          window.AudioSynth.playClick();
          relicConfirmBtn.classList.add('disabled');
          relicConfirmBtn.disabled = true;
          window.SocketService.selectRelic(this.selectedRelicId);
        }
      });
    }

    // Card Removal Skip Button
    const removalSkipBtn = document.getElementById('removal-skip-btn');
    if (removalSkipBtn) {
      removalSkipBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        if (removalConfirmBtn) {
          removalConfirmBtn.classList.add('disabled');
          removalConfirmBtn.disabled = true;
        }
        removalSkipBtn.classList.add('disabled');
        removalSkipBtn.disabled = true;
        window.SocketService.skipCardRemoval();
      });
    }

    // Prep Phase Reroll Buttons
    const relicRerollBtn = document.getElementById('relic-reroll-btn');
    if (relicRerollBtn) {
      relicRerollBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        window.SocketService.rerollPrep();
      });
    }
    const packRerollBtn = document.getElementById('pack-reroll-btn');
    if (packRerollBtn) {
      packRerollBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        window.SocketService.rerollPrep();
      });
    }

    // Rematch button click handler
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
      rematchBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        rematchBtn.classList.add('disabled');
        rematchBtn.disabled = true;
        rematchBtn.innerText = 'WAITING FOR OPPONENT...';
        window.SocketService.requestRematch();
      });
    }

    // Click player name to display/toggle their current active statuses in battleKeywordInfo
    if (UI.playerName) {
      UI.playerName.addEventListener('click', () => {
        window.AudioSynth.playClick();
        if (!UI.battleKeywordInfo.classList.contains('hidden') && UI.battleKeywordInfo.dataset.source === 'player') {
          UI.battleKeywordInfo.classList.add('hidden');
          UI.battleKeywordInfo.dataset.source = '';
        } else {
          UI.battleKeywordInfo.dataset.source = 'player';
          UI.showPlayerStatusExplanations(this.myStatuses, this.myName || 'You');
        }
      });
    }

    // Click enemy name to display/toggle opponent's current active statuses in battleKeywordInfo
    if (UI.enemyName) {
      UI.enemyName.addEventListener('click', () => {
        window.AudioSynth.playClick();
        if (!UI.battleKeywordInfo.classList.contains('hidden') && UI.battleKeywordInfo.dataset.source === 'enemy') {
          UI.battleKeywordInfo.classList.add('hidden');
          UI.battleKeywordInfo.dataset.source = '';
        } else {
          UI.battleKeywordInfo.dataset.source = 'enemy';
          UI.showPlayerStatusExplanations(this.opponentStatuses, this.opponentName || 'Opponent');
        }
      });
    }

    // Game Library / Compendium Modal Bindings
    const openCompendiumBtn = document.getElementById('open-compendium-btn');
    const compendiumModal = document.getElementById('compendium-modal');
    const compendiumCloseBtn = document.getElementById('compendium-close-btn');

    const tabCompendiumCardsBtn = document.getElementById('modal-compendium-tab-cards');
    const tabCompendiumRelicsBtn = document.getElementById('modal-compendium-tab-relics');
    const tabCompendiumMatchupsBtn = document.getElementById('modal-compendium-tab-matchups');
    const tabCompendiumRulesBtn = document.getElementById('modal-compendium-tab-rules');

    const compendiumCardsContent = document.getElementById('modal-compendium-cards-content');
    const compendiumRelicsContent = document.getElementById('modal-compendium-relics-content');
    const compendiumMatchupsContent = document.getElementById('modal-compendium-matchups-content');
    const compendiumRulesContent = document.getElementById('modal-compendium-rules-content');
    const compendiumFilters = document.getElementById('modal-compendium-filters');

    if (openCompendiumBtn && compendiumModal) {
      openCompendiumBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        // Reset tabs to Cards active
        if (tabCompendiumCardsBtn && tabCompendiumRelicsBtn && tabCompendiumMatchupsBtn && tabCompendiumRulesBtn &&
            compendiumCardsContent && compendiumRelicsContent && compendiumMatchupsContent && compendiumRulesContent) {
          tabCompendiumCardsBtn.classList.add('active');
          tabCompendiumRelicsBtn.classList.remove('active');
          tabCompendiumMatchupsBtn.classList.remove('active');
          tabCompendiumRulesBtn.classList.remove('active');
          compendiumCardsContent.style.display = 'block';
          compendiumRelicsContent.style.display = 'none';
          compendiumMatchupsContent.style.display = 'none';
          compendiumRulesContent.style.display = 'none';
        }
        // Reset element filter to 'ALL'
        if (compendiumFilters) {
          const filterBtns = compendiumFilters.querySelectorAll('.filter-btn');
          filterBtns.forEach(btn => {
            if (btn.dataset.element === 'ALL') btn.classList.add('active');
            else btn.classList.remove('active');
          });
        }
        
        // Render compendium
        if (window.UI && typeof window.UI.renderCompendium === 'function') {
          window.UI.renderCompendium(this.compendiumCards, this.compendiumRelics);
        }
        
        compendiumModal.classList.add('active');
      });
    }

    if (compendiumCloseBtn && compendiumModal) {
      compendiumCloseBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        compendiumModal.classList.remove('active');
      });
    }

    if (compendiumModal) {
      compendiumModal.addEventListener('click', (e) => {
        if (e.target === compendiumModal) {
          window.AudioSynth.playClick();
          compendiumModal.classList.remove('active');
        }
      });
    }

    if (tabCompendiumCardsBtn && tabCompendiumRelicsBtn && tabCompendiumMatchupsBtn && tabCompendiumRulesBtn &&
        compendiumCardsContent && compendiumRelicsContent && compendiumMatchupsContent && compendiumRulesContent) {
      
      const allTabs = [tabCompendiumCardsBtn, tabCompendiumRelicsBtn, tabCompendiumMatchupsBtn, tabCompendiumRulesBtn];
      const allContents = [compendiumCardsContent, compendiumRelicsContent, compendiumMatchupsContent, compendiumRulesContent];
      
      const switchTab = (activeTab, activeContent) => {
        window.AudioSynth.playClick();
        allTabs.forEach(t => t.classList.remove('active'));
        activeTab.classList.add('active');
        allContents.forEach(c => c.style.display = 'none');
        activeContent.style.display = 'block';
      };

      tabCompendiumCardsBtn.addEventListener('click', () => switchTab(tabCompendiumCardsBtn, compendiumCardsContent));
      tabCompendiumRelicsBtn.addEventListener('click', () => switchTab(tabCompendiumRelicsBtn, compendiumRelicsContent));
      tabCompendiumMatchupsBtn.addEventListener('click', () => switchTab(tabCompendiumMatchupsBtn, compendiumMatchupsContent));
      tabCompendiumRulesBtn.addEventListener('click', () => switchTab(tabCompendiumRulesBtn, compendiumRulesContent));
    }

    if (compendiumFilters) {
      const filterBtns = compendiumFilters.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          window.AudioSynth.playClick();
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const element = btn.dataset.element;
          if (window.UI && typeof window.UI.renderCompendiumCards === 'function') {
            window.UI.renderCompendiumCards(this.compendiumCards, element);
          }
        });
      });
    }
  },

  /**
   * Resets variables and switches back to lobby matchmaking
   */
  resetLobby() {
    const UI = window.UI;
    
    // Exit landscape full screen on mobile
    this.exitLandscapeImmersive();

    // Leave current game room
    window.SocketService.leaveRoom();
    
    // Clear variables
    this.currentRoomId = null;
    this.opponentId = null;
    this.opponentName = null;
    this.round = 0;
    this.hand = [];
    this.myHp = 100;
    this.myMaxHp = 100;
    this.myShield = 0;
    this.opponentHp = 100;
    this.opponentMaxHp = 100;
    this.opponentShield = 0;
    this.myStatuses = {};
    this.opponentStatuses = {};
    this.myPoints = 0;
    this.opponentPoints = 0;
    this.selectedBonusCardTemplateId = null;
    this.currentRoundReveal = null;
    this.currentRoundResult = null;
    
    UI.updateKeywordExplanations(UI.draftKeywordInfo, '');
    UI.updateKeywordExplanations(UI.battleKeywordInfo, '');
    
    UI.selectedCardInstanceId = null;
    UI.isLocked = false;
    
    // Reset inputs and HUD panels
    UI.usernameInput.disabled = false;
    UI.playBtn.classList.remove('hidden');
    UI.leaveQueueBtn.classList.add('hidden');
    UI.queueStatusSub.classList.add('hidden');
    UI.statusText.innerText = 'Ready to enter the arena...';
    
    UI.lockBtn.classList.add('disabled');
    UI.lockBtn.disabled = true;
    UI.lockBtn.classList.remove('locked-state');
    UI.lockBtn.querySelector('.lock-btn-text').innerText = 'SELECT CARD';
    
    UI.clearArenaSlots();

    // Reset points on HUD
    UI.renderPoints(UI.playerPoints, 0);
    UI.renderPoints(UI.enemyPoints, 0);
    
    UI.showScreen('lobby');
    UI.gameOverScreen.classList.remove('active');
    UI.gameOverScreen.style.display = 'none'; // Force hide inline flex set by animation
  },

  /**
   * Triggers when server updates total queue counter
   */
  updateQueueCount(count) {
    const UI = window.UI;
    if (UI.queueCountDisplay) {
      UI.queueCountDisplay.innerText = count;
    }
  },

  /**
   * Triggers when server updates online player count
   */
  updateOnlineCount(count) {
    const onlineDisplay = document.getElementById('online-count-display');
    if (onlineDisplay) {
      onlineDisplay.innerText = count;
    }
  },

  /**
   * Sets all available cards and relics for compendium display
   */
  setCompendiumData(data) {
    this.compendiumCards = data.cards || [];
    this.compendiumRelics = data.relics || [];
    this.compendiumQuestTemplates = data.questTemplates || [];
    if (window.UI && typeof window.UI.renderCompendium === 'function') {
      window.UI.renderCompendium(this.compendiumCards, this.compendiumRelics);
    }
  },

  /**
   * Triggers when server pairs client with opponent
   */
  onMatchFound(data) {
    const UI = window.UI;
    
    // Automatically close game library modal when match is found
    const compendiumModal = document.getElementById('compendium-modal');
    if (compendiumModal) {
      compendiumModal.classList.remove('active');
    }
    
    this.isVisualPipelineRunning = false;
    this.roundFinishedShowing = false;
    this.pendingRoundFinished = null;
    this.pendingGameOver = null;
    this.pendingDraftPhase = null;
    
    this.currentRoomId = data.roomId;
    this.opponentId = data.opponentId;
    this.opponentName = data.opponentName;
    this.myId = data.yourId;
    this.myName = data.yourName;
    
    this.myMaxHp = 100;
    this.opponentMaxHp = 100;
    UI.playerMaxHpVal.innerText = 100;
    UI.enemyMaxHpVal.innerText = 100;
    
    // Sound FX matchmaking
    window.AudioSynth.playMatchFound();
    
    // Match update message
    UI.statusText.innerHTML = `MATCH FOUND! Opponent: <strong class="accent-text">${data.opponentName}</strong>`;
    UI.queueStatusSub.classList.add('hidden');
    UI.leaveQueueBtn.classList.add('hidden');
    
    // Load names in Battle UI (preserve info icon inside the span)
    UI.setHudName(UI.playerName, this.myName);
    UI.setHudName(UI.enemyName, this.opponentName);
    
    // Transition Screen and orientations after a small buffer delay.
    // The server will trigger 'questSelectionStart' which handles the screen transition.
    setTimeout(() => {
      this.enterLandscapeImmersive();
      UI.clearArenaSlots();
    }, 1500);
  },

  /**
   * Triggers when opponent selects a card (without revealing detail)
   */
  onOpponentSelect(data) {
    const UI = window.UI;
    UI.arenaCombatText.innerText = '';
  },

  /**
   * Triggers when opponent locks their card selection
   */
  onOpponentLock(data) {
    const UI = window.UI;
    UI.arenaCombatText.innerText = '';

    // Immediately show the opponent's card face-down in their slot (without element border)
    const opponentSlot = UI.enemyPlaySlot;
    if (opponentSlot && !opponentSlot.querySelector('.card')) {
      const opponentCardEl = document.createElement('div');
      opponentCardEl.className = 'card';
      opponentCardEl.style.cssText = 'position: relative; transform: rotateY(180deg); width: 100%; height: 100%; cursor: default;';
      opponentCardEl.innerHTML = `
        <div class="card-face card-front"></div>
        <div class="card-face card-back"></div>
      `;
      opponentSlot.innerHTML = '';
      opponentSlot.appendChild(opponentCardEl);
      opponentSlot.classList.add('filled');

      // Animate its arrival from above and store the promise
      window.opponentCardArrivalPromise = new Promise(resolve => {
        Animations.animateOpponentCardArrival(opponentCardEl, resolve);
      });
    }
  },

  /**
   * Triggers when server reveals round card choices
   */
  onRoundReveal(data) {
    this.currentRoundReveal = data;
    this.tryResolveVisualPipeline();
  },

  /**
   * Triggers when server pushes clash outcomes
   */
  onRoundResult(data) {
    if (window.UI) {
      if (window.UI.stopTurnTimer) window.UI.stopTurnTimer();
      if (data.clashHistory && window.UI.updateClashLog) window.UI.updateClashLog(data.clashHistory);
    }
    this.currentRoundResult = data;
    this.tryResolveVisualPipeline();
  },

  /**
   * Coordinates the sequential animation visual pipeline.
   * Works by moving a clone of the player card to the arena (avoiding
   * CSS absolute-positioning / transform conflicts in the hand container),
   * then rendering cards directly in arena slots.
   */
  async tryResolveVisualPipeline() {
    // Run only when BOTH payloads have successfully landed
    if (!this.currentRoundReveal || !this.currentRoundResult) return;

    // Await any active local card lock flight animation to prevent race conditions
    if (window.cardFlightPromise) {
      await window.cardFlightPromise;
    }

    const UI = window.UI;
    const Animations = window.Animations;
    
    const reveal = this.currentRoundReveal;
    const result = this.currentRoundResult;
    
    // Reset buffers
    this.currentRoundReveal = null;
    this.currentRoundResult = null;

    // Set state running
    this.isVisualPipelineRunning = true;

    try {
      // Lock controls UI text
      UI.arenaCombatText.innerText = 'CLASH!';

    // --- STEP 0: CARD PREPARATION & FLIGHT TO ARENA ---
    const playedCardId = reveal.yourCard.instanceId;
    const playerCardEl = UI.playerHand.querySelector(`.card[data-instance-id="${playedCardId}"]`);
    const alreadyInSlot = UI.playerPlaySlot.querySelector(`.card[data-instance-id="${playedCardId}"]`) !== null;

    if (alreadyInSlot) {
      if (playerCardEl) {
        playerCardEl.style.opacity = '0';
        playerCardEl.style.pointerEvents = 'none';
      }
    } else {
      await new Promise(resolve => {
        if (playerCardEl) {
          const cardRect = playerCardEl.getBoundingClientRect();
          const slotRect = UI.playerPlaySlot.getBoundingClientRect();

          if (cardRect.width > 0 && slotRect.width > 0) {
            const clone = playerCardEl.cloneNode(true);
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

            playerCardEl.style.opacity = '0';
            playerCardEl.style.pointerEvents = 'none';

            const targetX = slotRect.left + slotRect.width / 2 - cardRect.left - cardRect.width / 2;
            const targetY = slotRect.top + slotRect.height / 2 - cardRect.top - cardRect.height / 2;
            const scaleVal = Math.min(slotRect.width / cardRect.width, slotRect.height / cardRect.height);

            anime({
              targets: clone,
              translateX: targetX,
              translateY: targetY,
              scale: scaleVal,
              duration: 300,
              easing: 'easeOutQuint',
              complete: () => {
                clone.remove();
                const slotCard = UI.createCardElement(reveal.yourCard);
                slotCard.removeAttribute('id');
                slotCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default;';
                UI.playerPlaySlot.innerHTML = '';
                UI.playerPlaySlot.appendChild(slotCard);
                resolve();
              }
            });
          } else {
            const fallbackCard = UI.createCardElement(reveal.yourCard);
            fallbackCard.removeAttribute('id');
            fallbackCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default;';
            UI.playerPlaySlot.innerHTML = '';
            UI.playerPlaySlot.appendChild(fallbackCard);
            resolve();
          }
        } else {
          const fallbackCard = UI.createCardElement(reveal.yourCard);
          fallbackCard.removeAttribute('id');
          fallbackCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default;';
          UI.playerPlaySlot.innerHTML = '';
          UI.playerPlaySlot.appendChild(fallbackCard);
          resolve();
        }
      });
      UI.playerPlaySlot.classList.add('filled');
    }

    let opponentCardEl = UI.enemyPlaySlot.querySelector('.card');
    const opponentCardAlreadyInSlot = opponentCardEl !== null;

    if (opponentCardAlreadyInSlot) {
      // Wait for any running arrival animation to finish first!
      if (window.opponentCardArrivalPromise) {
        await window.opponentCardArrivalPromise;
        window.opponentCardArrivalPromise = null;
      }
      // Add data-element outline now that it is revealed
      opponentCardEl.setAttribute('data-element', reveal.opponentCard.element);
      opponentCardEl.style.transform = 'rotateY(180deg)';
    } else {
      opponentCardEl = document.createElement('div');
      opponentCardEl.className = 'card';
      opponentCardEl.setAttribute('data-element', reveal.opponentCard.element);
      opponentCardEl.style.cssText = 'position: relative; transform: rotateY(180deg); width: 100%; height: 100%; cursor: default;';
      opponentCardEl.innerHTML = `
        <div class="card-face card-front"></div>
        <div class="card-face card-back"></div>
      `;
      UI.enemyPlaySlot.innerHTML = '';
      UI.enemyPlaySlot.appendChild(opponentCardEl);
      UI.enemyPlaySlot.classList.add('filled');
      
      await new Promise(resolve => {
        Animations.animateOpponentCardArrival(opponentCardEl, resolve);
      });
    }
    UI.vsBadge.style.opacity = '0.2';

    const iconClass = UI.getElementIconClass(reveal.opponentCard.element);
    const frontFace = opponentCardEl.querySelector('.card-front');
    const formattedOpponentDesc = UI.formatDescription(reveal.opponentCard.description);
    
    frontFace.innerHTML = `
      <div class="card-header">
        <span class="card-name">${reveal.opponentCard.name}</span>
      </div>
      <div class="card-middle">
        <i class="card-element-icon fa-solid ${iconClass}"></i>
        <p class="card-desc">${formattedOpponentDesc}</p>
      </div>
      <div class="card-footer">
        <span class="card-element-name">${reveal.opponentCard.element}</span>
      </div>
    `;

    const playerCard = UI.playerPlaySlot.querySelector('.card');
    const opponentCard = UI.enemyPlaySlot.querySelector('.card');


    // --- STEP 1: REVEAL CARD, Hasil & Sorotan (Combined) ---
    let outcomeMsg = '';
    if (result.outcome === 'SUPERIOR') {
      outcomeMsg = `<span class="accent-text" style="color: #2ecc71;">SUPERIOR</span>`;
    } else if (result.outcome === 'INFERIOR') {
      outcomeMsg = `<span class="accent-text" style="color: #ff3333;">INFERIOR</span>`;
    } else {
      outcomeMsg = `<span class="accent-text" style="color: #a0aec0;">TIE</span>`;
    }
    UI.arenaCombatText.innerHTML = outcomeMsg;

    // Apply outcome highlight immediately together with reveal
    if (playerCard) {
      const outcomeKey = result.outcome.toUpperCase() === 'DRAW' ? 'neutral' : result.outcome.toLowerCase();
      playerCard.setAttribute('data-active-outcome', outcomeKey);
      const descEl = playerCard.querySelector('.card-desc');
      scrollToActiveOutcome(descEl, outcomeKey);
    }
    if (opponentCard) {
      const outcomeKey = result.opponentOutcome.toUpperCase() === 'DRAW' ? 'neutral' : result.opponentOutcome.toLowerCase();
      opponentCard.setAttribute('data-active-outcome', outcomeKey);
      const descEl = opponentCard.querySelector('.card-desc');
      scrollToActiveOutcome(descEl, outcomeKey);
    }

    await new Promise(resolve => {
      Animations.animateCardFlip(opponentCardEl, resolve);
    });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Helper to drain specific pending relic triggers for current phase
    const drainRelicTriggers = (predicate) => {
      if (!this.pendingRelicTriggers || this.pendingRelicTriggers.length === 0) return [];
      const matched = [];
      const remaining = [];
      for (const t of this.pendingRelicTriggers) {
        if (predicate(t)) matched.push(t);
        else remaining.push(t);
      }
      this.pendingRelicTriggers = remaining;
      return matched;
    };

    const p1Effect = reveal.yourCard.outcomes[result.outcome];
    const p2Effect = reveal.opponentCard.outcomes[result.opponentOutcome];

    // =========================================================================
    // FASE 1: CLEANSE, HEAL & SHIELD GAIN
    // =========================================================================
    const phase1Promises = [];

    // 1.1 Cleanse on Card Outcomes (Self cleanse washes away debuffs before clash)
    if (playerCard && p1Effect && p1Effect.applyStatus?.self?.cleanse > 0) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateCleanseSweep(playerCard);
        Animations.animateCardActionOverlay(playerCard, 'cleanse', 'CLEANSED', () => {
          this.myStatuses.burn = 0;
          this.myStatuses.poison = 0;
          this.myStatuses.weakness = 0;
          UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
          resolve();
        });
      }));
    }

    if (opponentCard && p2Effect && p2Effect.applyStatus?.self?.cleanse > 0) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateCleanseSweep(opponentCard);
        Animations.animateCardActionOverlay(opponentCard, 'cleanse', 'CLEANSED', () => {
          this.opponentStatuses.burn = 0;
          this.opponentStatuses.poison = 0;
          this.opponentStatuses.weakness = 0;
          UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
          resolve();
        });
      }));
    }

    // 1.2 Heal Gain
    const startHpSelf = this.myHp;
    const startHpOpp = this.opponentHp;
    const healedHpSelf = Math.min(this.myMaxHp, startHpSelf + (result.healGain || 0));
    const healedHpOpp = Math.min(this.opponentMaxHp, startHpOpp + (result.opponentHealGain || 0));

    if (result.healGain > 0 && playerCard) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.playerPlaySlot, result.healGain, 'heal');
        Animations.animateCardActionOverlay(playerCard, 'heal', `+${result.healGain} HEAL`);
        Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, startHpSelf, healedHpSelf, this.myMaxHp);
        this.myHp = healedHpSelf;
        setTimeout(resolve, 350);
      }));
    }

    if (result.opponentHealGain > 0 && opponentCard) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentHealGain, 'heal');
        Animations.animateCardActionOverlay(opponentCard, 'heal', `+${result.opponentHealGain} HEAL`);
        Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, startHpOpp, healedHpOpp, this.opponentMaxHp);
        this.opponentHp = healedHpOpp;
        setTimeout(resolve, 350);
      }));
    }

    // 1.3 Shield Gain
    if (result.shieldGain > 0 && playerCard) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.playerPlaySlot, result.shieldGain, true);
        Animations.animateCardActionOverlay(playerCard, 'shield-gain', `+${result.shieldGain} SHIELD`);
        anime({
          targets: playerCard,
          translateY: -30,
          duration: 150,
          easing: 'easeOutQuad',
          direction: 'alternate',
          loop: 1,
          complete: () => {
            this.myShield += result.shieldGain;
            UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
            resolve();
          }
        });
      }));
    }

    if (result.opponentShieldGain > 0 && opponentCard) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentShieldGain, true);
        Animations.animateCardActionOverlay(opponentCard, 'shield-gain', `+${result.opponentShieldGain} SHIELD`);
        anime({
          targets: opponentCard,
          translateY: -30,
          duration: 150,
          easing: 'easeOutQuad',
          direction: 'alternate',
          loop: 1,
          complete: () => {
            this.opponentShield += result.opponentShieldGain;
            UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);
            resolve();
          }
        });
      }));
    }

    if (phase1Promises.length > 0) {
      await Promise.all(phase1Promises);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // =========================================================================
    // FASE 2: CLASH DAMAGE & ON-DAMAGE EFFECTS (Thorns, Leech, Amulet, DoT, Phoenix)
    // =========================================================================
    const playerDamaging = (result.damageDealt > 0);
    const opponentDamaging = (result.opponentDamageDealt > 0);

    await new Promise(resolve => {
      Animations.animateClashImpact(playerCard, opponentCard, result.outcome, playerDamaging, opponentDamaging, () => {
        window.AudioSynth.playClash(result.outcome);

        // Staggered delay trackers for juicy sequential popups (+70ms each)
        let delayP1 = 0;
        let delayP2 = 0;

        // Shield damage popups and absorbs (first line of defense)
        if (result.shieldDamage > 0) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.shieldDamage, 'shield-damage', delayP1);
          delayP1 += 70;
          if (playerCard) Animations.animateShieldAbsorb(playerCard);
        }
        if (result.opponentShieldDamage > 0) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentShieldDamage, 'shield-damage', delayP2);
          delayP2 += 70;
          if (opponentCard) Animations.animateShieldAbsorb(opponentCard);
        }

        // Direct Clash HP Damage popups
        if (result.hpDamage > 0) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.hpDamage, 'damage', delayP1);
          delayP1 += 70;
        }
        if (result.opponentHpDamage > 0) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentHpDamage, 'damage', delayP2);
          delayP2 += 70;
        }

        // Self damage / recoil
        if (result.selfDamage > 0) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.selfDamage, 'self-damage', delayP1);
          delayP1 += 70;
          if (playerCard) {
            Animations.animateCardActionOverlay(playerCard, 'self-damage', `-${result.selfDamage} SELF DMG`);
          }
        }
        if (result.opponentSelfDamage > 0) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentSelfDamage, 'self-damage', delayP2);
          delayP2 += 70;
          if (opponentCard) {
            Animations.animateCardActionOverlay(opponentCard, 'self-damage', `-${result.opponentSelfDamage} SELF DMG`);
          }
        }

        // Thorns damage (reflected true damage from Briar Armor)
        if (result.thornsDamage > 0) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.thornsDamage, 'thorns', delayP1);
          delayP1 += 70;
          const playerHudEl = document.querySelector('.player-hud');
          Animations.animateHudDamageShake(playerHudEl);
        }
        if (result.opponentThornsDamage > 0) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentThornsDamage, 'thorns', delayP2);
          delayP2 += 70;
          const enemyHudEl = document.querySelector('.enemy-hud');
          Animations.animateHudDamageShake(enemyHudEl);
        }

        // Leech heal (siphon on unblocked damage)
        if (result.leechHeal > 0 && playerCard) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.leechHeal, 'leech', delayP1);
          delayP1 += 70;
          Animations.animateCardActionOverlay(playerCard, 'leech', `+${result.leechHeal} LEECH`);
        }
        if (result.opponentLeechHeal > 0 && opponentCard) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentLeechHeal, 'leech', delayP2);
          delayP2 += 70;
          Animations.animateCardActionOverlay(opponentCard, 'leech', `+${result.opponentLeechHeal} LEECH`);
        }

        // Process any queued Purifying Amulet or Briar Armor toasts
        const onDamageRelics = drainRelicTriggers(t => ['Purifying Amulet', 'Briar Armor', 'Leech'].includes(t.relicName));
        for (const trig of onDamageRelics) {
          const isMe = (trig.playerId && trig.playerId === this.myId);
          if (UI.showRelicCombatToast) {
            UI.showRelicCombatToast(isMe, trig.relicName, trig.message);
          }
          if (trig.relicName === 'Purifying Amulet') {
            const targetCard = isMe ? playerCard : opponentCard;
            const targetContainer = isMe ? UI.playerStatusContainer : UI.enemyStatusContainer;
            const targetStatuses = isMe ? this.myStatuses : this.opponentStatuses;
            if (targetCard) Animations.animateCleanseSweep(targetCard);
            targetStatuses.burn = 0;
            targetStatuses.poison = 0;
            targetStatuses.weakness = 0;
            UI.renderStatuses(targetContainer, targetStatuses);
          }
        }

        // Calculate HP value after clash strike but before DoT tick damage
        const p1TickTotal = (result.statusDamage.burnHpDmg !== undefined ? result.statusDamage.burnHpDmg : (result.statusDamage.burn || 0)) + (result.statusDamage.poison || 0);
        const p2TickTotal = (result.opponentStatusDamage.burnHpDmg !== undefined ? result.opponentStatusDamage.burnHpDmg : (result.opponentStatusDamage.burn || 0)) + (result.opponentStatusDamage.poison || 0);

        const clashEndHp = result.newHp + p1TickTotal;
        const clashEndHpOpponent = result.opponentNewHp + p2TickTotal;

        const currentHpSelf = Math.min(this.myMaxHp, this.myHp + (result.leechHeal || 0));
        const currentHpOpp = Math.min(this.opponentMaxHp, this.opponentHp + (result.opponentLeechHeal || 0));

        Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, currentHpSelf, clashEndHp, this.myMaxHp);
        Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, currentHpOpp, clashEndHpOpponent, this.opponentMaxHp);

        // Update shields post clash (pre-tick) dynamically in HUD
        this.myShield = Math.max(0, this.myShield - result.shieldDamage);
        this.opponentShield = Math.max(0, this.opponentShield - result.opponentShieldDamage);
        UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
        UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);

        // Deduct opponent hand dot
        const currentDots = UI.enemyCardDots.querySelectorAll('span');
        if (currentDots.length > 0) {
          currentDots[0].remove();
        }

        this.myHp = clashEndHp;
        this.opponentHp = clashEndHpOpponent;
      }, resolve);
    });

    await new Promise(resolve => setTimeout(resolve, 350));

    // 2.2 DoT (Burn & Poison Ticks)
    const p1Burn = result.statusDamage.burn || 0;
    const p1Poison = result.statusDamage.poison || 0;
    const p1BurnHpDmg = result.statusDamage.burnHpDmg !== undefined ? result.statusDamage.burnHpDmg : p1Burn;
    const p1BurnShieldDmg = result.statusDamage.burnShieldDmg || 0;

    const p2Burn = result.opponentStatusDamage.burn || 0;
    const p2Poison = result.opponentStatusDamage.poison || 0;
    const p2BurnHpDmg = result.opponentStatusDamage.burnHpDmg !== undefined ? result.opponentStatusDamage.burnHpDmg : p2Burn;
    const p2BurnShieldDmg = result.opponentStatusDamage.burnShieldDmg || 0;

    const playerHudEl = document.querySelector('.player-hud');
    const enemyHudEl = document.querySelector('.enemy-hud');

    const dotPromises = [];

    if (p1Burn > 0) {
      dotPromises.push(new Promise(resolve => {
        Animations.animateDamagePopup(playerHudEl, p1Burn, 'burn');
        Animations.triggerBurnFlash(playerHudEl);
        Animations.animateHudDamageShake(playerHudEl);
        if (p1BurnShieldDmg > 0) {
          setTimeout(() => {
            Animations.animateDamagePopup(playerHudEl, p1BurnShieldDmg, 'shield-damage');
            this.myShield = Math.max(0, this.myShield - p1BurnShieldDmg);
            UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
          }, 150);
        }
        this.myStatuses.burn = 0;
        UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
        resolve();
      }));
    }
    if (p1Poison > 0) {
      dotPromises.push(new Promise(resolve => {
        setTimeout(() => {
          Animations.animateDamagePopup(playerHudEl, p1Poison, 'poison');
          Animations.triggerPoisonFlash(playerHudEl);
          Animations.animateHudDamageShake(playerHudEl);
          this.myStatuses.poison = Math.max(0, this.myStatuses.poison - 1);
          UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
          resolve();
        }, p1Burn > 0 ? 150 : 0);
      }));
    }

    if (p2Burn > 0) {
      dotPromises.push(new Promise(resolve => {
        Animations.animateDamagePopup(enemyHudEl, p2Burn, 'burn');
        Animations.triggerBurnFlash(enemyHudEl);
        Animations.animateHudDamageShake(enemyHudEl);
        if (p2BurnShieldDmg > 0) {
          setTimeout(() => {
            Animations.animateDamagePopup(enemyHudEl, p2BurnShieldDmg, 'shield-damage');
            this.opponentShield = Math.max(0, this.opponentShield - p2BurnShieldDmg);
            UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);
          }, 150);
        }
        this.opponentStatuses.burn = 0;
        UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
        resolve();
      }));
    }
    if (p2Poison > 0) {
      dotPromises.push(new Promise(resolve => {
        setTimeout(() => {
          Animations.animateDamagePopup(enemyHudEl, p2Poison, 'poison');
          Animations.triggerPoisonFlash(enemyHudEl);
          Animations.animateHudDamageShake(enemyHudEl);
          this.opponentStatuses.poison = Math.max(0, this.opponentStatuses.poison - 1);
          UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
          resolve();
        }, p2Burn > 0 ? 150 : 0);
      }));
    }

    if (p1BurnHpDmg > 0 || p1Poison > 0) {
      Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, this.myHp, result.newHp, this.myMaxHp);
    }
    if (p2BurnHpDmg > 0 || p2Poison > 0) {
      Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, this.opponentHp, result.opponentNewHp, this.opponentMaxHp);
    }

    this.myHp = result.newHp;
    this.opponentHp = result.opponentNewHp;
    this.myShield = result.newShield;
    this.opponentShield = result.opponentNewShield;
    UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
    UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);

    if (result.activeQuest !== undefined) {
      this.activeQuest = result.activeQuest;
      UI.updateQuestTracker(this.activeQuest);
    }

    if (dotPromises.length > 0) {
      await Promise.all(dotPromises);
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    // 2.3 Check Phoenix Heart Resurrect (executed right after all Phase 2 damage)
    const phoenixTriggers = drainRelicTriggers(t => t.relicName === 'Phoenix Heart');
    if (phoenixTriggers.length > 0) {
      const phoenixPromises = [];
      for (const ptrig of phoenixTriggers) {
        const isMe = (ptrig.playerId && ptrig.playerId === this.myId);
        const cardTarget = isMe ? playerCard : opponentCard;
        const hudSlot = isMe ? UI.playerPlaySlot : UI.enemyPlaySlot;
        const fillEl = isMe ? UI.playerHpFill : UI.enemyHpFill;
        const textEl = isMe ? UI.playerHpVal : UI.enemyHpVal;
        const maxHp = isMe ? this.myMaxHp : this.opponentMaxHp;

        if (UI.showRelicCombatToast) {
          UI.showRelicCombatToast(isMe, 'Phoenix Heart', ptrig.message);
        }

        phoenixPromises.push(new Promise(res => {
          Animations.animatePhoenixRevive(cardTarget);
          Animations.animateDamagePopup(hudSlot, 30, 'heal');
          Animations.animateHpReduction(fillEl, textEl, 0, 30, maxHp, 500);
          if (isMe) this.myHp = 30;
          else this.opponentHp = 30;
          setTimeout(res, 650);
        }));
      }
      await Promise.all(phoenixPromises);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // =========================================================================
    // FASE 3: BUFFS, DEBUFFS & DISPEL (Overlay ONLY on receiver's card!)
    // =========================================================================
    const phase3Promises = [];

    // 3.1 Dispel (Dispel to opponent - strip animation & DISPELLED overlay on victim)
    if (p1Effect?.applyStatus?.opponent?.dispel > 0) {
      if (opponentCard) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateDispelStrip(opponentCard);
          Animations.animateCardActionOverlay(opponentCard, 'dispel', 'DISPELLED', () => {
            this.opponentStatuses.attackBuff = 0;
            this.opponentStatuses.leech = 0;
            UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
            resolve();
          });
        }));
      }
    }

    if (p2Effect?.applyStatus?.opponent?.dispel > 0) {
      if (playerCard) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateDispelStrip(playerCard);
          Animations.animateCardActionOverlay(playerCard, 'dispel', 'DISPELLED', () => {
            this.myStatuses.attackBuff = 0;
            this.myStatuses.leech = 0;
            UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
            resolve();
          });
        }));
      }
    }

    // 3.2 Self-Buffs & Self-Debuffs (Receiver is the caster)
    // Player 1 Self Buffs
    if (playerCard && p1Effect?.applyStatus?.self) {
      const selfStat = p1Effect.applyStatus.self;
      if (selfStat.attackBuff > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'buff', `+${selfStat.attackBuff} BUFF`, resolve);
        }));
      }
      if (selfStat.leech > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'leech', `+${selfStat.leech} LEECH`, resolve);
        }));
      }
      // Self debuffs (e.g. Chaos cards) -> overlay on playerCard (receiver)
      if (selfStat.burn > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'burn', `BURN SELF [${selfStat.burn}]`, resolve);
        }));
      }
      if (selfStat.poison > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'poison', `POISON SELF [${selfStat.poison}]`, resolve);
        }));
      }
      if (selfStat.weakness > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'weak', `WEAK SELF [${selfStat.weakness}]`, resolve);
        }));
      }
    }

    // Player 2 Self Buffs
    if (opponentCard && p2Effect?.applyStatus?.self) {
      const selfStat2 = p2Effect.applyStatus.self;
      if (selfStat2.attackBuff > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'buff', `+${selfStat2.attackBuff} BUFF`, resolve);
        }));
      }
      if (selfStat2.leech > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'leech', `+${selfStat2.leech} LEECH`, resolve);
        }));
      }
      // Self debuffs on opponent card
      if (selfStat2.burn > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'burn', `BURN SELF [${selfStat2.burn}]`, resolve);
        }));
      }
      if (selfStat2.poison > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'poison', `POISON SELF [${selfStat2.poison}]`, resolve);
        }));
      }
      if (selfStat2.weakness > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'weak', `WEAK SELF [${selfStat2.weakness}]`, resolve);
        }));
      }
    }

    // 3.3 Debuffs Inflicted on Opponent (Overlay ONLY on recipient's card!)
    // P1 inflicts debuff on P2 -> overlay appears on opponentCard
    if (opponentCard && p1Effect?.applyStatus?.opponent) {
      const opp = p1Effect.applyStatus.opponent;
      if (opp.outbreak) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'outbreak', 'POISON x2!', resolve);
        }));
      }
      if (opp.burn > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'burn', `BURN [${opp.burn}]`, resolve);
        }));
      }
      if (opp.poison > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'poison', `POISON [${opp.poison}]`, resolve);
        }));
      }
      if (opp.weakness > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'weak', `WEAK [${opp.weakness}]`, resolve);
        }));
      }
    }

    // P2 inflicts debuff on P1 -> overlay appears on playerCard
    if (playerCard && p2Effect?.applyStatus?.opponent) {
      const opp2 = p2Effect.applyStatus.opponent;
      if (opp2.outbreak) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'outbreak', 'POISON x2!', resolve);
        }));
      }
      if (opp2.burn > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'burn', `BURN [${opp2.burn}]`, resolve);
        }));
      }
      if (opp2.poison > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'poison', `POISON [${opp2.poison}]`, resolve);
        }));
      }
      if (opp2.weakness > 0) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'weak', `WEAK [${opp2.weakness}]`, resolve);
        }));
      }
    }

    // Process any remaining relic toasts (e.g. Ember Spark, Venomous Brambles, Last Stand)
    const remainingRelics = drainRelicTriggers(() => true);
    for (const trig of remainingRelics) {
      const isMe = (trig.playerId && trig.playerId === this.myId);
      if (UI.showRelicCombatToast) {
        UI.showRelicCombatToast(isMe, trig.relicName, trig.message);
      }
    }

    if (phase3Promises.length > 0) {
      await Promise.all(phase3Promises);
      // Synchronize HUD statuses after phase 3 applications
      this.myStatuses = { ...(result.newStatuses || {}) };
      this.opponentStatuses = { ...(result.opponentNewStatuses || {}) };
      UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
      UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // --- STEP 8: SHIELD DECAY ---
    const p1Decay = result.shieldDecay || 0;
    const p2Decay = result.opponentShieldDecay || 0;

    const decayPromises = [];
    if (p1Decay > 0) {
      decayPromises.push(new Promise(resolve => {
        Animations.animateDamagePopup(playerHudEl, p1Decay, 'shield-decay');
        UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, result.finalShield);
        resolve();
      }));
    }
    if (p2Decay > 0) {
      decayPromises.push(new Promise(resolve => {
        Animations.animateDamagePopup(enemyHudEl, p2Decay, 'shield-decay');
        UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, result.opponentFinalShield);
        resolve();
      }));
    }

    this.myShield = result.finalShield !== undefined ? result.finalShield : result.newShield;
    this.opponentShield = result.opponentFinalShield !== undefined ? result.opponentFinalShield : result.opponentNewShield;
    this.myStatuses = result.newStatuses || {};
    this.opponentStatuses = result.opponentNewStatuses || {};

    UI.renderStatuses(UI.playerStatusContainer, result.newStatuses);
    UI.renderStatuses(UI.enemyStatusContainer, result.opponentNewStatuses);

    if (decayPromises.length > 0) {
      await Promise.all(decayPromises);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // A deliberate pause so that players can read the final card/board state before cards vanish
    await new Promise(resolve => setTimeout(resolve, 600));

    // Fade out cards in arena to clear slots
    await new Promise(resolve => {
      const playerSlotCard = UI.playerPlaySlot.children[0];
      const enemySlotCard = UI.enemyPlaySlot.children[0];
      const targets = [playerSlotCard, enemySlotCard].filter(Boolean);
      if (targets.length > 0) {
        anime({
          targets: targets,
          opacity: 0,
          scale: 0.8,
          duration: 150,
          easing: 'easeInQuad',
          complete: () => {
            UI.clearArenaSlots();
            resolve();
          }
        });
      } else {
        UI.clearArenaSlots();
        resolve();
      }
    });
    } catch (err) {
      console.error("Error in visual pipeline:", err);
    } finally {
      // Mark visual pipeline as complete and check for pending overlays
      this.isVisualPipelineRunning = false;
      this.checkAndTriggerEndPhase();
      if (window.SocketService && window.SocketService.clashFinished) {
        window.SocketService.clashFinished();
      }
    }
  },

  /**
   * Syncs HP states (redundant backup event helper)
   */
  onHpUpdate(data) {
    // Handled dynamically in resolveVisualPipeline
  },

  /**
   * Triggers when opponent drops offline unexpectedly
   */
  onPlayerDisconnected(data) {
    const UI = window.UI;
    UI.showToast(`Opponent ${data.disconnectedPlayerName} disconnected! Winning match by default.`);
    UI.arenaCombatText.innerText = 'Opponent disconnected!';
  },

  onQuestSelectionStart(data) {
    const UI = window.UI;
    
    // Hide prep timers
    const globalTimer = document.getElementById('global-prep-timer');
    const waitingTimerContainer = document.getElementById('waiting-timer-container');
    if (globalTimer) globalTimer.classList.add('hidden');
    if (waitingTimerContainer) waitingTimerContainer.classList.add('hidden');

    UI.showScreen('questSelection');
    
    this.offeredQuests = data.quests;
    this.selectedQuestId = null;
    
    const rerollsVal = document.getElementById('quest-rerolls-val');
    if (rerollsVal) rerollsVal.innerText = data.rerollsLeft;
    
    const rerollBtn = document.getElementById('quest-reroll-btn');
    if (rerollBtn) {
      if (data.rerollsLeft > 0) {
        rerollBtn.classList.remove('disabled');
        rerollBtn.disabled = false;
      } else {
        rerollBtn.classList.add('disabled');
        rerollBtn.disabled = true;
      }
    }
    
    const confirmBtn = document.getElementById('quest-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.add('disabled');
      confirmBtn.disabled = true;
    }
    
    UI.renderQuestCards(data.quests, (questId) => {
      this.selectedQuestId = questId;
      if (confirmBtn) {
        confirmBtn.classList.remove('disabled');
        confirmBtn.disabled = false;
      }
    });
  },

  onQuestLocked(chosenQuest) {
    const UI = window.UI;
    const waitingText = document.querySelector('#waiting-screen p');
    if (waitingText) {
      waitingText.innerText = 'Waiting for opponent to choose their quest...';
    }
    UI.showScreen('waiting');
  },

  onWaitingForOpponentQuest() {
    const UI = window.UI;
    UI.showToast("Opponent has chosen their quest!");
  },

  onCardRemovalStart(data) {
    const UI = window.UI;
    UI.showScreen('cardRemoval');
    
    this.deck = data.deck || [];
    this.myRemovalTokens = data.removalTokens !== undefined ? data.removalTokens : (this.myRemovalTokens || 0);
    const minDeckSize = data.minDeckSize || 4;
    this.selectedRemovalCardInstanceId = null;
    
    const tokensVal = document.getElementById('removal-tokens-val');
    if (tokensVal) tokensVal.innerText = this.myRemovalTokens;
    
    const deckSizeVal = document.getElementById('removal-deck-size-val');
    if (deckSizeVal) deckSizeVal.innerText = this.deck.length;

    const hudTokensVal = document.getElementById('player-tokens-val');
    if (hudTokensVal) hudTokensVal.innerText = this.myRemovalTokens;

    const confirmBtn = document.getElementById('removal-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.add('disabled');
      confirmBtn.disabled = true;
    }
    
    const skipBtn = document.getElementById('removal-skip-btn');
    if (skipBtn) {
      skipBtn.classList.remove('disabled');
      skipBtn.disabled = false;
    }

    const canRemove = this.deck.length > minDeckSize && this.myRemovalTokens > 0;
    
    UI.renderRemovalCards(this.deck, (cardInstanceId) => {
      if (!canRemove) return;
      this.selectedRemovalCardInstanceId = cardInstanceId;
      if (confirmBtn) {
        confirmBtn.classList.remove('disabled');
        confirmBtn.disabled = false;
      }
    });

    if (this.deck.length <= minDeckSize) {
      UI.showToast(`Deck is at minimum limit (${minDeckSize} cards).`);
    } else if (this.myRemovalTokens <= 0) {
      UI.showToast('No Removal Tokens available.');
    }
  },

  onRemovalConfirmed(data) {
    const UI = window.UI;
    if (data && data.removalTokens !== undefined) {
      this.myRemovalTokens = data.removalTokens;
      const tokensVal = document.getElementById('removal-tokens-val');
      if (tokensVal) tokensVal.innerText = this.myRemovalTokens;
      const hudTokensVal = document.getElementById('player-tokens-val');
      if (hudTokensVal) hudTokensVal.innerText = this.myRemovalTokens;
    }
    UI.showToast("Deck updated!");
  },

  onWaitingForOpponentRemoval() {
    const UI = window.UI;
    const waitingText = document.querySelector('#waiting-screen p');
    if (waitingText) {
      waitingText.innerText = 'Waiting for opponent to complete their card removal phase...';
    }
    UI.showScreen('waiting');
  },

  onOpponentRemovalConfirmed() {
    const UI = window.UI;
    UI.showToast("Opponent has completed card removal!");
  },

  onRelicChoiceStart(data) {
    const UI = window.UI;
    UI.showScreen('relicSelection');
    
    this.selectedRelicId = null;
    
    const confirmBtn = document.getElementById('relic-confirm-btn');
    if (confirmBtn) {
      confirmBtn.classList.add('disabled');
      confirmBtn.disabled = true;
    }

    const rerollsVal = document.getElementById('relic-rerolls-val');
    const rerollBtn = document.getElementById('relic-reroll-btn');
    if (rerollsVal) {
      rerollsVal.innerText = data.prepRerollsLeft !== undefined ? data.prepRerollsLeft : 1;
    }
    if (rerollBtn) {
      const canReroll = data.prepRerollsLeft > 0;
      rerollBtn.disabled = !canReroll;
      rerollBtn.classList.toggle('disabled', !canReroll);
    }

    const subtitleEl = document.getElementById('relic-selection-subtitle');
    if (subtitleEl && data.questText) {
      subtitleEl.innerHTML = `QUEST REWARD FOR: <span class="accent-text" style="color: #ffd700;">${data.questText}</span>`;
    } else if (subtitleEl) {
      subtitleEl.innerText = `QUEST REWARD`;
    }
    
    UI.renderRelicChoices(data.options, (relicId) => {
      this.selectedRelicId = relicId;
      if (confirmBtn) {
        confirmBtn.classList.remove('disabled');
        confirmBtn.disabled = false;
      }
    });
  },

  onRelicChosen(data) {
    const UI = window.UI;
    UI.showToast(`Selected Relic: ${data.name}!`);
  },

  onRelicTriggered(data) {
    // Queue relic event so visual pipeline displays it in the exact phase
    if (!this.pendingRelicTriggers) this.pendingRelicTriggers = [];
    this.pendingRelicTriggers.push(data);

    // If visual pipeline is not currently running, display toast immediately
    if (!this.isVisualPipelineRunning) {
      const isPlayer = (data.playerId && data.playerId === this.myId);
      if (window.UI && window.UI.showRelicCombatToast) {
        window.UI.showRelicCombatToast(isPlayer, data.relicName, data.message);
      } else if (window.UI && window.UI.showToast) {
        window.UI.showToast(data.message || `${data.relicName} triggered!`);
      }
    }
  },

  onWaitingForOpponentRelicChoice() {
    const UI = window.UI;
    const waitingText = document.querySelector('#waiting-screen p');
    if (waitingText) {
      waitingText.innerText = 'Waiting for opponent to complete their relic choice...';
    }
    UI.showScreen('waiting');
  },

  /**
   * Triggers at the start of a round
   */
  onRoundStart(data) {
    const UI = window.UI;
    
    // Hide prep timers
    const globalTimer = document.getElementById('global-prep-timer');
    const waitingTimerContainer = document.getElementById('waiting-timer-container');
    if (globalTimer) globalTimer.classList.add('hidden');
    if (waitingTimerContainer) waitingTimerContainer.classList.add('hidden');

    this.roundFinishedShowing = false;
    this.pendingDraftPhase = null;
    this.pendingRoundFinished = null;
    window.opponentCardArrivalPromise = null;
    
    // Enter landscape full screen on mobile
    this.enterLandscapeImmersive();
    
    // Clear draft timer just in case
    if (this.draftTimerInterval) {
      clearInterval(this.draftTimerInterval);
      this.draftTimerInterval = null;
    }
    
    const wasBattleActive = UI.battleScreen.classList.contains('active');

    // Transition to battle screen
    UI.showScreen('battle');

    const currentDomCardCount = UI.playerHand.querySelectorAll('.card').length;
    const isNewRound = !wasBattleActive || (this.round === 0) || (currentDomCardCount === 0) || (data.hand.length > currentDomCardCount);
    this.round = data.round;
    this.hand = data.hand;
    this.myHp = data.selfStatus.hp;
    this.myMaxHp = data.selfStatus.maxHp || 100;
    this.myShield = data.selfStatus.shield;
    this.myStatuses = data.selfStatus.statuses || {};
    this.opponentHp = data.opponentStatus.hp;
    this.opponentMaxHp = data.opponentStatus.maxHp || 100;
    this.opponentShield = data.opponentStatus.shield;
    this.opponentStatuses = data.opponentStatus.statuses || {};
    
    this.myPoints = data.selfStatus.points || 0;
    this.opponentPoints = data.opponentStatus.points || 0;

    // Reset selection locked states
    UI.selectedCardInstanceId = null;
    UI.isLocked = false;
    UI.lockBtn.classList.add('disabled');
    UI.lockBtn.disabled = true;
    UI.lockBtn.classList.remove('locked-state');
    UI.lockBtn.querySelector('.lock-btn-text').innerText = 'SELECT CARD';

    // Wipe arena slots clean
    UI.clearArenaSlots();
    UI.arenaCombatText.innerText = '';

    // Render cards and trigger draw animation
    UI.renderHand(this.hand, true, isNewRound);
    
    // Update Opponent card indicators
    UI.updateOpponentHandSize(data.opponentStatus.handSize);

    // Sync HUD status bars, active badges, and points immediately
    UI.playerHpVal.innerText = this.myHp;
    UI.playerMaxHpVal.innerText = this.myMaxHp;
    UI.playerHpFill.style.width = `${(this.myHp / this.myMaxHp) * 100}%`;
    UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
    UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
    UI.renderPoints(UI.playerPoints, this.myPoints);

    UI.enemyHpVal.innerText = this.opponentHp;
    UI.enemyMaxHpVal.innerText = this.opponentMaxHp;
    UI.enemyHpFill.style.width = `${(this.opponentHp / this.opponentMaxHp) * 100}%`;
    UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);
    UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
    UI.renderPoints(UI.enemyPoints, this.opponentPoints);

    // Store deck locally and update HUD deck counter
    this.deck = data.selfStatus.deck || [];
    const deckCountEl = document.getElementById('deck-count-val');
    if (deckCountEl) deckCountEl.innerText = this.deck.length;

    // Sync removal tokens count in HUD
    this.myRemovalTokens = data.selfStatus.removalTokens || 0;
    const tokensCountEl = document.getElementById('player-tokens-val');
    if (tokensCountEl) tokensCountEl.innerText = this.myRemovalTokens;

    // Relics & Active Quest State
    this.myRelics = data.selfStatus.relics || {};
    this.opponentRelics = data.opponentStatus.relics || {};
    this.activeQuest = data.selfStatus.activeQuest || null;

    // Render Relics in HUD
    UI.renderRelicsHUD(UI.playerRelicsRow, this.myRelics);
    UI.renderRelicsHUD(UI.enemyRelicsRow, this.opponentRelics);

    // Update active quest tracker widget
    UI.updateQuestTracker(this.activeQuest);
  },

  /**
   * Triggers when a round ends and transitioning to Draft Phase
   */
  onRoundFinished(data) {
    this.pendingRoundFinished = data;
    this.checkAndTriggerEndPhase();
  },

  /**
   * Checks if visual pipeline is complete and triggers the queued overlays
   */
  checkAndTriggerEndPhase() {
    if (this.isVisualPipelineRunning || this.roundFinishedShowing) return; // Wait until clash visual pipeline completes

    if (this.pendingGameOver) {
      const data = this.pendingGameOver;
      this.pendingGameOver = null;
      this.pendingRoundFinished = null;
      this.pendingDraftPhase = null;
      this.triggerGameOver(data);
    } else if (this.pendingRoundFinished) {
      const data = this.pendingRoundFinished;
      this.pendingRoundFinished = null;
      this.triggerRoundFinished(data);
    } else if (this.pendingDraftPhase) {
      const draft = this.pendingDraftPhase;
      this.pendingDraftPhase = null;
      this.triggerDraftPhase(draft);
    }
  },

  /**
   * Actually displays the round finished overlay
   */
  triggerRoundFinished(data) {
    const UI = window.UI;
    const Animations = window.Animations;

    // Sync scores
    this.myPoints = data.score[this.myId] || 0;
    this.opponentPoints = data.score[this.opponentId] || 0;

    // Render points on HUD immediately
    UI.renderPoints(UI.playerPoints, this.myPoints);
    UI.renderPoints(UI.enemyPoints, this.opponentPoints);

    const isRoundWinner = data.winnerId === this.myId;
    const isRoundDraw = data.winnerId === null;

    const roundTitle = UI.roundResultOverlay.querySelector('#round-winner-title');
    const roundDesc = UI.roundResultOverlay.querySelector('#round-winner-desc');
    const scoreP1Val = UI.roundResultOverlay.querySelector('#score-p1-val');
    const scoreP2Val = UI.roundResultOverlay.querySelector('#score-p2-val');

    if (roundTitle) roundTitle.innerHTML = `ROUND <span class="accent-text">${data.round}</span> COMPLETED`;
    
    if (isRoundWinner) {
      if (roundDesc) {
        roundDesc.innerText = 'You won this round!';
        roundDesc.style.color = 'var(--color-nature)';
      }
    } else if (isRoundDraw) {
      if (roundDesc) {
        roundDesc.innerText = 'It was a Draw!';
        roundDesc.style.color = 'var(--color-primary)';
      }
    } else {
      if (roundDesc) {
        roundDesc.innerText = `${this.opponentName || 'Opponent'} won this round!`;
        roundDesc.style.color = 'var(--color-fire)';
      }
    }

    if (scoreP1Val) scoreP1Val.innerText = this.myPoints;
    if (scoreP2Val) scoreP2Val.innerText = this.opponentPoints;

    // Render names in scores overlay
    const scoreP1Name = UI.roundResultOverlay.querySelector('#score-p1-name');
    const scoreP2Name = UI.roundResultOverlay.querySelector('#score-p2-name');
    if (scoreP1Name) scoreP1Name.innerText = this.myName || 'You';
    if (scoreP2Name) scoreP2Name.innerText = this.opponentName || 'Opponent';

    // Show / hide quest reward banner
    const isPlayer1 = data.p1Id === this.myId;
    const myQuest = isPlayer1 ? data.p1Quest : data.p2Quest;

    if (myQuest && myQuest.completed) {
      if (myQuest.removalTokens !== undefined) {
        this.myRemovalTokens = myQuest.removalTokens;
        const hudTokensVal = document.getElementById('player-tokens-val');
        if (hudTokensVal) hudTokensVal.innerText = this.myRemovalTokens;
      }

      if (UI.roundQuestRewardBanner) {
        UI.roundQuestRewardBanner.classList.remove('hidden');
        UI.roundQuestRewardBanner.style.borderColor = 'var(--border-brass)';
        UI.roundQuestRewardBanner.style.background = 'rgba(166, 128, 88, 0.12)';
      }
      const titleEl = UI.roundQuestRewardBanner.querySelector('div');
      if (titleEl) {
        titleEl.style.color = 'var(--color-primary)';
        titleEl.innerHTML = '<i class="fa-solid fa-trophy" style="margin-right: 0.35rem;"></i> QUEST COMPLETED!';
      }
      if (UI.roundQuestRewardText) {
        UI.roundQuestRewardText.innerHTML = `Quest: <strong>${myQuest.text}</strong><br>Reward: <strong style="color: var(--color-primary);">${myQuest.reward}</strong>`;
      }
      if (window.AudioSynth && window.AudioSynth.playQuestComplete) {
        window.AudioSynth.playQuestComplete();
      }
    } else if (myQuest && myQuest.text) {
      // Quest was active but NOT completed by round end (failed)
      if (UI.roundQuestRewardBanner) {
        UI.roundQuestRewardBanner.classList.remove('hidden');
        UI.roundQuestRewardBanner.style.borderColor = 'var(--color-fire)';
        UI.roundQuestRewardBanner.style.background = 'rgba(217, 56, 56, 0.1)';
      }
      const titleEl = UI.roundQuestRewardBanner.querySelector('div');
      if (titleEl) {
        titleEl.style.color = 'var(--color-fire)';
        titleEl.innerHTML = '<i class="fa-solid fa-circle-xmark" style="margin-right: 0.35rem;"></i> QUEST NOT COMPLETED';
      }
      if (UI.roundQuestRewardText) {
        UI.roundQuestRewardText.innerHTML = `Quest: <strong>${myQuest.text}</strong><br><span style="color: var(--color-fire); font-weight: 600;">Failed to complete requirements this round</span>`;
      }
    } else {
      if (UI.roundQuestRewardBanner) {
        UI.roundQuestRewardBanner.classList.add('hidden');
      }
    }

    // Show round result overlay with animation
    const cardEl = UI.roundResultOverlay.querySelector('.round-result-card');
    Animations.animateOverlayReveal(UI.roundResultOverlay, cardEl);

    // Play round-finished sound if we didn't play a quest completion sound
    if (window.AudioSynth && !(myQuest && myQuest.completed)) {
      if (isRoundWinner) {
        window.AudioSynth.playVictory();
      } else {
        window.AudioSynth.playDefeat();
      }
    }

    // Keep round completed overlay visible for a minimum of 2.2 seconds (or 3.7 seconds if a quest is completed)
    const displayDuration = (myQuest && myQuest.completed) ? 3700 : 2200;
    this.roundFinishedShowing = true;
    setTimeout(() => {
      this.roundFinishedShowing = false;

      // Hide round overlay
      if (UI.roundResultOverlay) {
        UI.roundResultOverlay.classList.remove('active');
        UI.roundResultOverlay.style.display = 'none';
        UI.roundResultOverlay.style.opacity = '0';
      }

      this.checkAndTriggerEndPhase();
    }, displayDuration);
  },

  /**
   * Route draft phase screen transitions
   */
  triggerDraftPhase(draft) {
    if (draft.type === 'bonusPick') {
      this.triggerBonusPickStart(draft.data);
    } else if (draft.type === 'waiting') {
      this.triggerWaitingForOpponentBonus();
    } else if (draft.type === 'packSelection') {
      this.triggerPackSelectionStart(draft.data);
    }
  },

  /**
   * Starts the Bonus Pick screen for the loser
   */
  onBonusPickStart(data) {
    if (this.isVisualPipelineRunning || this.roundFinishedShowing) {
      this.pendingDraftPhase = { type: 'bonusPick', data: data };
      return;
    }
    this.triggerBonusPickStart(data);
  },

  triggerBonusPickStart(data) {
    const UI = window.UI;
    this.selectedBonusCardTemplateId = null;

    // Reset confirm button
    UI.bonusConfirmBtn.classList.add('disabled');
    UI.bonusConfirmBtn.disabled = true;

    // Dynamically update headers to clarify Quest vs Loser Comeback pick
    const bonusTitle = document.getElementById('bonus-pick-title');
    const bonusSub = document.getElementById('bonus-pick-logo-sub');
    const bonusDesc = document.getElementById('bonus-pick-subtitle');

    if (data.isQuestBonus) {
      if (bonusSub) bonusSub.innerText = 'QUEST REWARD';
      if (bonusTitle) bonusTitle.innerHTML = 'QUEST <span class="accent-text">BONUS PICK</span>';
      if (bonusDesc) bonusDesc.innerHTML = 'Choose exactly <strong>1 card</strong> to add directly to your deck as a quest reward.';
    } else {
      if (bonusSub) bonusSub.innerText = 'COMEBACK MECHANIC';
      if (bonusTitle) bonusTitle.innerHTML = 'LOSER <span class="accent-text">BONUS PICK</span>';
      if (bonusDesc) bonusDesc.innerHTML = 'Choose exactly <strong>1 card</strong> to add directly to your deck.';
    }

    // Clear and render bonus cards fanned
    UI.bonusCardsFan.innerHTML = '';
    
    data.cards.forEach(card => {
      const cardEl = UI.createCardElement(card);
      UI.bonusCardsFan.appendChild(cardEl);

      cardEl.addEventListener('click', () => {
        window.AudioSynth.playClick();
        
        // Remove selected class from all cards
        UI.bonusCardsFan.querySelectorAll('.card').forEach(c => c.classList.remove('draft-selected'));
        
        // Mark this one selected
        cardEl.classList.add('draft-selected');
        this.selectedBonusCardTemplateId = card.templateId;

        // Enable confirm button
        UI.bonusConfirmBtn.classList.remove('disabled');
        UI.bonusConfirmBtn.disabled = false;
        
        // Show keyword explanations
        const descEl = cardEl.querySelector('.card-desc');
        UI.updateKeywordExplanations(UI.draftKeywordInfo, descEl ? descEl.innerHTML : '');
      });
    });

    UI.showScreen('bonusPick');
    
    // Animate drawing/revealing fanned cards
    const cards = UI.bonusCardsFan.querySelectorAll('.card');
    window.Animations.animateFannedCardsReveal(Array.from(cards));
  },

  /**
   * Shows a waiting panel for the winner during bonus pick
   */
  onWaitingForOpponentBonus() {
    if (this.isVisualPipelineRunning || this.roundFinishedShowing) {
      this.pendingDraftPhase = { type: 'waiting' };
      return;
    }
    this.triggerWaitingForOpponentBonus();
  },

  triggerWaitingForOpponentBonus() {
    window.UI.showScreen('waiting');
  },

  /**
   * Lock bonus choice visually
   */
  onBonusPickLocked(cardTemplate) {
    window.UI.bonusCardsFan.querySelectorAll('.card').forEach(c => c.style.pointerEvents = 'none');
    if (!this.deck) this.deck = [];
    this.deck.push(cardTemplate);
    const deckCountEl = document.getElementById('deck-count-val');
    if (deckCountEl) deckCountEl.innerText = this.deck.length;
  },

  /**
   * Starts pack selection screen
   */
  onPackSelectionStart(data) {
    if (this.isVisualPipelineRunning || this.roundFinishedShowing) {
      this.pendingDraftPhase = { type: 'packSelection', data: data };
      return;
    }
    this.triggerPackSelectionStart(data);
  },

  triggerPackSelectionStart(data) {
    const UI = window.UI;
    UI.packsSelectionGrid.innerHTML = '';

    const rerollsVal = document.getElementById('pack-rerolls-val');
    const rerollBtn = document.getElementById('pack-reroll-btn');
    if (rerollsVal) {
      rerollsVal.innerText = data.prepRerollsLeft !== undefined ? data.prepRerollsLeft : 1;
    }
    if (rerollBtn) {
      const canReroll = data.prepRerollsLeft > 0;
      rerollBtn.disabled = !canReroll;
      rerollBtn.classList.toggle('disabled', !canReroll);
    }

    data.packs.forEach(pack => {
      const packEl = document.createElement('div');
      packEl.className = 'pack-item';
      packEl.style.background = `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.35) 100%), ${pack.color}`;
      packEl.innerHTML = `
        <div class="pack-header-info">
          <span class="pack-theme">${pack.theme}</span>
          <h3 class="pack-title">${pack.name}</h3>
        </div>
        <p class="pack-desc">${pack.description}</p>
        <div class="pack-action-hint">CHOOSE PACK</div>
      `;

      packEl.addEventListener('click', () => {
        window.AudioSynth.playClick();
        // Disable grid interaction immediately to prevent double choosing
        UI.packsSelectionGrid.style.pointerEvents = 'none';
        window.SocketService.selectPack(pack.id);
      });

      UI.packsSelectionGrid.appendChild(packEl);
    });

    UI.packsSelectionGrid.style.pointerEvents = 'auto';
    UI.showScreen('packSelection');
  },

  /**
   * Handles pack reveal opening sequence
   */
  onPackRevealStart(data) {
    const UI = window.UI;
    
    // Clear reveal area
    UI.revealCardsFan.innerHTML = '';
    UI.revealCardsFan.classList.add('hidden');
    UI.revealFooter.classList.add('hidden');

    // Also add these cards to the client's deck list!
    if (!this.deck) this.deck = [];
    this.deck.push(...data.cards);
    const deckCountEl = document.getElementById('deck-count-val');
    if (deckCountEl) deckCountEl.innerText = this.deck.length;
    
    // Configure pack graphic
    UI.revealedPackCard.className = 'pack-graphic'; // Reset classes
    UI.revealedPackName.innerText = data.packName;
    UI.revealedPackCard.style.background = `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.35) 100%), ${data.packColor || 'linear-gradient(135deg, #1f2533, #3a4763)'}`;
    document.getElementById('pack-graphic-wrapper').style.display = 'block';

    // Show screen
    UI.showScreen('packReveal');

    // One-time shake and burst on click
    const handlePackClick = () => {
      UI.revealedPackCard.removeEventListener('click', handlePackClick);
      
      // Trigger burst animation
      window.Animations.animatePackOpening(UI.revealedPackCard, () => {
        // Swap pack graphic for cards
        document.getElementById('pack-graphic-wrapper').style.display = 'none';
        UI.revealCardsFan.classList.remove('hidden');
        
        // Render 4 cards horizontally
        data.cards.forEach(card => {
          const cardEl = UI.createCardElement(card);
          UI.revealCardsFan.appendChild(cardEl);
        });

        // Show confirm footer
        UI.revealFooter.classList.remove('hidden');
        UI.packRevealConfirmBtn.classList.remove('disabled');
        UI.packRevealConfirmBtn.disabled = false;

        // Run sequential cards flip reveal animation
        const cards = UI.revealCardsFan.querySelectorAll('.card');
        window.Animations.animateFannedCardsReveal(Array.from(cards));
      });
    };

    UI.revealedPackCard.addEventListener('click', handlePackClick);
  },



  /**
   * Triggers when round HP results in Game Over (queued)
   */
  onGameOver(data) {
    this.pendingGameOver = data;
    this.checkAndTriggerEndPhase();
  },

  /**
   * Actually displays the game over overlay
   */
  triggerGameOver(data) {
    const UI = window.UI;
    const Animations = window.Animations;

    // Hide prep timers
    const globalTimer = document.getElementById('global-prep-timer');
    const waitingTimerContainer = document.getElementById('waiting-timer-container');
    if (globalTimer) globalTimer.classList.add('hidden');
    if (waitingTimerContainer) waitingTimerContainer.classList.add('hidden');

    const isWinner = data.winnerId === this.myId;
    const isDraw = data.winnerId === null;
    
    if (isWinner) {
      window.AudioSynth.playVictory();
      UI.gameOverTitle.style.color = '#2d9a59';
      UI.gameOverTitle.innerText = 'VICTORY';
      UI.gameOverMsg.innerText = data.reason === 'opponent_disconnected' 
        ? 'Your opponent fled the field. You win by default!' 
        : 'You have out-scored and defeated your opponent!';
      UI.gameOverScreen.className = 'overlay active victory';
    } else if (isDraw) {
      window.AudioSynth.playVictory(); 
      UI.gameOverTitle.style.color = '#f5cf70';
      UI.gameOverTitle.innerText = 'DRAW MATCH';
      UI.gameOverMsg.innerText = 'A double knockout! Tie game.';
      UI.gameOverScreen.className = 'overlay active';
    } else {
      window.AudioSynth.playDefeat();
      UI.gameOverTitle.style.color = '#d93838';
      UI.gameOverTitle.innerText = 'DEFEAT';
      UI.gameOverMsg.innerText = 'You were out-drafted and defeated!';
      UI.gameOverScreen.className = 'overlay active defeat';
    }

    // Set stats info in screen modal
    const p1Points = data.score ? (data.score[this.myId] || 0) : this.myPoints;
    const p2Points = data.score ? (data.score[this.opponentId] || 0) : this.opponentPoints;
    UI.goFinalScore.innerText = `${p1Points} - ${p2Points}`;
    UI.goRounds.innerText = this.round;

    // Display modal card
    const cardEl = UI.gameOverScreen.querySelector('.game-over-card');
    Animations.animateOverlayReveal(UI.gameOverScreen, cardEl);
  },

  /**
   * Requests fullscreen and locks screen orientation to landscape on mobile devices
   */
  enterLandscapeImmersive() {
    // Clean up first to prevent multiple duplicate/leaked listeners
    if (this._mobileTouchImmersiveHandler) {
      document.removeEventListener('click', this._mobileTouchImmersiveHandler);
      document.removeEventListener('touchstart', this._mobileTouchImmersiveHandler);
    }

    document.body.classList.add('force-landscape');
    
    const requestImmersive = () => {
      const docEl = document.documentElement;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      }
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    };

    requestImmersive();

    this._mobileTouchImmersiveHandler = requestImmersive;
    document.addEventListener('click', this._mobileTouchImmersiveHandler);
    document.addEventListener('touchstart', this._mobileTouchImmersiveHandler);
  },

  /**
   * Resets screen orientation and exits fullscreen
   */
  exitLandscapeImmersive() {
    document.body.classList.remove('force-landscape');
    
    if (this._mobileTouchImmersiveHandler) {
      document.removeEventListener('click', this._mobileTouchImmersiveHandler);
      document.removeEventListener('touchstart', this._mobileTouchImmersiveHandler);
      this._mobileTouchImmersiveHandler = null;
    }

    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(() => {
        if (screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      });
    } else if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }

    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  },

  /**
   * Opponent requested a rematch
   */
  onRematchRequested() {
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
      rematchBtn.innerText = 'ACCEPT REMATCH';
      rematchBtn.style.animation = 'pulseNewCard 1.5s infinite';
    }
  },

  /**
   * Rematch accepted and starting
   */
  onRematchStarted() {
    this.isVisualPipelineRunning = false;
    this.roundFinishedShowing = false;
    this.pendingRoundFinished = null;
    this.pendingGameOver = null;
    this.pendingDraftPhase = null;

    // Hide game over screen overlay
    window.UI.gameOverScreen.classList.remove('active');
    window.UI.gameOverScreen.style.display = 'none';
    window.UI.gameOverScreen.style.opacity = '0';
    
    // Reset rematch button state
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
      rematchBtn.classList.remove('disabled');
      rematchBtn.disabled = false;
      rematchBtn.innerText = 'REMATCH';
      rematchBtn.style.animation = '';
    }
  },

  /**
   * Opponent left the rematch room
   */
  onOpponentLeftRoom() {
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
      rematchBtn.classList.add('disabled');
      rematchBtn.disabled = true;
      rematchBtn.innerText = 'OPPONENT LEFT';
      rematchBtn.style.animation = '';
    }
  },

  /**
   * Renders the cards and relics in the player's deck/inventory inside the inspection modal.
   */
  renderDeckModal() {
    const listContainer = document.getElementById('deck-cards-list');
    const relicsContainer = document.getElementById('deck-relics-list');
    const cardsCountEl = document.getElementById('tab-cards-count');
    const relicsCountEl = document.getElementById('tab-relics-count');
    
    // Update card list
    if (listContainer) {
      listContainer.innerHTML = '';
      if (!this.deck || this.deck.length === 0) {
        listContainer.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Your deck is empty.</p>';
      } else {
        this.deck.forEach(card => {
          const cardEl = window.UI.createCardElement(card);
          listContainer.appendChild(cardEl);
        });
      }
    }
    
    // Update cards count
    if (cardsCountEl) {
      cardsCountEl.innerText = this.deck ? this.deck.length : 0;
    }
    
    // Render relics list
    if (relicsContainer) {
      window.UI.renderRelicsGrid(relicsContainer, this.myRelics);
    }
    
    // Update relics count (sum of stacks)
    if (relicsCountEl) {
      const totalRelicsCount = Object.values(this.myRelics || {}).reduce((a, b) => a + b, 0);
      relicsCountEl.innerText = totalRelicsCount;
    }

    // Update removal / purify tokens count in modal
    const tokensValEl = document.getElementById('player-tokens-val');
    if (tokensValEl) {
      tokensValEl.innerText = this.myRemovalTokens || 0;
    }
  },

  onPrepFinished() {
    const UI = window.UI;
    const waitingText = document.querySelector('#waiting-screen p');
    if (waitingText) {
      waitingText.innerText = 'Waiting for opponent to complete their preparation...';
    }
    UI.showScreen('waiting');
  },

  onPrepTimerStarted(data) {
    const UI = window.UI;
    const globalTimer = document.getElementById('global-prep-timer');
    const globalTimerVal = document.getElementById('global-prep-timer-val');
    const waitingTimerContainer = document.getElementById('waiting-timer-container');
    const waitingTimerVal = document.getElementById('waiting-timer-val');

    if (globalTimerVal) globalTimerVal.innerText = data.secondsLeft;
    if (waitingTimerVal) waitingTimerVal.innerText = data.secondsLeft;

    const isWaitingActive = UI.waitingScreen && UI.waitingScreen.classList.contains('active');
    
    if (globalTimer) {
      if (isWaitingActive) {
        globalTimer.classList.add('hidden');
      } else {
        globalTimer.classList.remove('hidden');
      }
    }

    if (waitingTimerContainer) {
      if (isWaitingActive) {
        waitingTimerContainer.classList.remove('hidden');
      } else {
        waitingTimerContainer.classList.add('hidden');
      }
    }
  },

  onPrepTimerTick(data) {
    const UI = window.UI;
    const globalTimer = document.getElementById('global-prep-timer');
    const globalTimerVal = document.getElementById('global-prep-timer-val');
    const waitingTimerContainer = document.getElementById('waiting-timer-container');
    const waitingTimerVal = document.getElementById('waiting-timer-val');

    if (globalTimerVal) globalTimerVal.innerText = data.secondsLeft;
    if (waitingTimerVal) waitingTimerVal.innerText = data.secondsLeft;

    const isWaitingActive = UI.waitingScreen && UI.waitingScreen.classList.contains('active');

    if (globalTimer) {
      if (isWaitingActive) {
        globalTimer.classList.add('hidden');
      } else {
        globalTimer.classList.remove('hidden');
      }
    }

    if (waitingTimerContainer) {
      if (isWaitingActive) {
        waitingTimerContainer.classList.remove('hidden');
      } else {
        waitingTimerContainer.classList.add('hidden');
      }
    }
  }
};

/**
 * Scrolls the card description container to show the active outcome text element
 */
function scrollToActiveOutcome(descEl, outcome) {
  if (!descEl || !outcome) return;
  let upper = outcome.toUpperCase();
  if (upper === 'DRAW' || upper === 'TIE') {
    upper = 'NEUTRAL';
  }
  let activeEl = null;
  if (upper === 'SUPERIOR') {
    activeEl = descEl.querySelector('.superior-outcome');
  } else if (upper === 'INFERIOR') {
    activeEl = descEl.querySelector('.inferior-outcome');
  } else if (upper === 'NEUTRAL') {
    activeEl = descEl.querySelector('.neutral-outcome');
  }
  
  if (activeEl) {
    const relativeTop = activeEl.offsetTop - descEl.offsetTop;
    descEl.scrollTop = relativeTop;
  } else {
    if (upper === 'SUPERIOR') {
      descEl.scrollTop = 0;
    } else if (upper === 'INFERIOR') {
      descEl.scrollTop = descEl.scrollHeight;
    } else if (upper === 'NEUTRAL') {
      descEl.scrollTop = (descEl.scrollHeight - descEl.clientHeight) / 2;
    }
  }
}

// =============================================================================
// CARD DESCRIPTION AUTOSCROLL HELPER SYSTEM
// =============================================================================
const activeCardDescScrollTimers = new Map();

function startCardDescAutoscroll(descEl) {
  if (!descEl) return;
  
  // Only auto-scroll if there is actual overflow
  const maxScroll = descEl.scrollHeight - descEl.clientHeight;
  if (maxScroll <= 0) return;

  if (descEl.dataset.isAutoscrolling === 'true') return;
  descEl.dataset.isAutoscrolling = 'true';
  descEl.dataset.userInterrupted = 'false';

  let direction = 1; // 1 = scroll down, -1 = scroll up
  let currentScroll = descEl.scrollTop;
  let delayCounter = 0;
  let animationId = null;

  const scrollStep = () => {
    // Stop if user interrupted or autoscroll is disabled
    if (descEl.dataset.userInterrupted === 'true' || descEl.dataset.isAutoscrolling !== 'true') {
      descEl.dataset.isAutoscrolling = 'false';
      return;
    }

    if (delayCounter > 0) {
      delayCounter--;
      animationId = requestAnimationFrame(scrollStep);
      activeCardDescScrollTimers.set(descEl, animationId);
      return;
    }

    currentScroll += direction * 0.4; // smooth, slow scroll speed
    descEl.scrollTop = currentScroll;

    // Detect boundaries
    if (direction === 1 && descEl.scrollTop >= maxScroll) {
      descEl.scrollTop = maxScroll;
      currentScroll = maxScroll;
      direction = -1;
      delayCounter = 90; // Pause at the bottom (~1.5 seconds)
    } else if (direction === -1 && descEl.scrollTop <= 0) {
      descEl.scrollTop = 0;
      currentScroll = 0;
      direction = 1;
      delayCounter = 90; // Pause at the top (~1.5 seconds)
    }

    animationId = requestAnimationFrame(scrollStep);
    activeCardDescScrollTimers.set(descEl, animationId);
  };

  animationId = requestAnimationFrame(scrollStep);
  activeCardDescScrollTimers.set(descEl, animationId);
}

function stopCardDescAutoscroll(descEl) {
  if (!descEl) return;
  descEl.dataset.isAutoscrolling = 'false';
  
  const activeAnimationId = activeCardDescScrollTimers.get(descEl);
  if (activeAnimationId) {
    cancelAnimationFrame(activeAnimationId);
    activeCardDescScrollTimers.delete(descEl);
  }
}

// Global Event Delegation for Card Hover & Click Autoscroll
document.addEventListener('mouseover', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const desc = card.querySelector('.card-desc');
  if (!desc) return;
  
  desc.dataset.userInterrupted = 'false';
  startCardDescAutoscroll(desc);
});

document.addEventListener('mouseout', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  
  // Verify if mouse actually left the card container boundaries
  const related = e.relatedTarget;
  if (related && card.contains(related)) return;
  
  const desc = card.querySelector('.card-desc');
  if (!desc) return;
  
  stopCardDescAutoscroll(desc);
  desc.scrollTop = 0; // Return instantly to top
});

document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const desc = card.querySelector('.card-desc');
  if (!desc) return;
  
  desc.dataset.userInterrupted = 'false';
  startCardDescAutoscroll(desc);
});

// Interrupt autoscroll on any manual scroll action
document.addEventListener('wheel', (e) => {
  const desc = e.target.closest('.card-desc');
  if (desc) {
    desc.dataset.userInterrupted = 'true';
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  const desc = e.target.closest('.card-desc');
  if (desc) {
    desc.dataset.userInterrupted = 'true';
  }
}, { passive: true });

document.addEventListener('pointerdown', (e) => {
  const desc = e.target.closest('.card-desc');
  if (desc) {
    desc.dataset.userInterrupted = 'true';
  }
}, { passive: true });

// Bind to window load safely (handles cases where DOM is already interactive/complete)
function initGame() {
  window.gameManager = GameManager;
  GameManager.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
