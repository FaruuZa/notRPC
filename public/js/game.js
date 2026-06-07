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
  selectedRemovalCardInstanceId: null,
  
  // Animation sync helpers
  currentRoundReveal: null,
  currentRoundResult: null,
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

    // Bind event listeners to UI components
    this.bindEvents();
    console.log('[GameManager] Game initialized.');
  },

  bindEvents() {
    const UI = window.UI;

    // Play button triggers matchmaking
    UI.playBtn.addEventListener('click', () => {
      const username = UI.usernameInput.value.trim();
      this.myName = username || 'Player';
      
      // Unlock AudioContext on user gesture
      window.AudioSynth.init();
      window.AudioSynth.playClick();
      
      // Request immersive fullscreen on mobile to hide toolbars
      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen request blocked or unsupported:', e);
      }
      
      // Submit connection queue
      window.SocketService.joinQueue(this.myName);
      
      // Update UI matching controls
      UI.usernameInput.disabled = true;
      UI.playBtn.classList.add('hidden');
      UI.leaveQueueBtn.classList.remove('hidden');
      UI.queueStatusSub.classList.remove('hidden');
      UI.statusText.innerText = 'Searching for an opponent...';
    });

    // Leave queue button triggers matchmaking cancellation
    UI.leaveQueueBtn.addEventListener('click', () => {
      window.AudioSynth.playClick();
      window.SocketService.leaveQueue();
      
      // Reset matching controls
      UI.usernameInput.disabled = false;
      UI.playBtn.classList.remove('hidden');
      UI.leaveQueueBtn.classList.add('hidden');
      UI.queueStatusSub.classList.add('hidden');
      UI.statusText.innerText = 'Ready to enter the arena...';
    });

    // Lock selection button
    UI.lockBtn.addEventListener('click', () => {
      UI.lockSelection();
    });

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
    UI.goLobbyBtn.addEventListener('click', () => {
      window.AudioSynth.playClick();
      this.resetLobby();
    });

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
   * Triggers when server pairs client with opponent
   */
  onMatchFound(data) {
    const UI = window.UI;
    
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

    // --- STEP 2: SOROTAN HASIL KARTU CLASH (Merged into Step 1) ---
    // Kept as structural placeholder


    // --- STEP 3: SHIELDING ---
    const shieldingPromises = [];
    if (result.shieldGain > 0 && playerCard) {
      shieldingPromises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.playerPlaySlot, result.shieldGain, true);
        Animations.animateCardActionOverlay(playerCard, 'shield-gain', `+${result.shieldGain} shield`);
        anime({
          targets: playerCard,
          translateY: -35,
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
      shieldingPromises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentShieldGain, true);
        Animations.animateCardActionOverlay(opponentCard, 'shield-gain', `+${result.opponentShieldGain} shield`);
        anime({
          targets: opponentCard,
          translateY: -35,
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
    if (shieldingPromises.length > 0) {
      await Promise.all(shieldingPromises);
      await new Promise(resolve => setTimeout(resolve, 150));
    }


    // --- STEP 4: BUFFING & DEBUFFING ---
    const buffDebuffPromises = [];
    const p1Effect = reveal.yourCard.outcomes[result.outcome];
    const p2Effect = reveal.opponentCard.outcomes[result.opponentOutcome];

    // Player 1 (you) card effects
    if (playerCard && p1Effect && p1Effect.applyStatus) {
      // Self Buffs
      if (p1Effect.applyStatus.self && p1Effect.applyStatus.self.attackBuff > 0) {
        buffDebuffPromises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'buff', `buff self`, resolve);
        }));
      }
      // Self Debuffs (typically on Chaos cards)
      if (p1Effect.applyStatus.self) {
        if (p1Effect.applyStatus.self.burn > 0) {
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(playerCard, 'burn', `burn self`, resolve);
          }));
        }
        if (p1Effect.applyStatus.self.poison > 0) {
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(playerCard, 'poison', `poison self`, resolve);
          }));
        }
        if (p1Effect.applyStatus.self.weakness > 0) {
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(playerCard, 'weak', `weak self`, resolve);
          }));
        }
      }
      // Debuffs to Opponent
      if (p1Effect.applyStatus.opponent) {
        const hasBurn = p1Effect.applyStatus.opponent.burn > 0;
        const hasPoison = p1Effect.applyStatus.opponent.poison > 0;
        const hasWeakness = p1Effect.applyStatus.opponent.weakness > 0;
        if (hasBurn || hasPoison || hasWeakness) {
          // Own card shows "debuff enemy"
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(playerCard, 'debuff', `debuff enemy`, resolve);
          }));
          // Enemy card shows specific debuff overlay
          if (opponentCard) {
            if (hasBurn) {
              buffDebuffPromises.push(new Promise(resolve => {
                Animations.animateCardActionOverlay(opponentCard, 'burn', `burn`, resolve);
              }));
            }
            if (hasPoison) {
              buffDebuffPromises.push(new Promise(resolve => {
                Animations.animateCardActionOverlay(opponentCard, 'poison', `poison`, resolve);
              }));
            }
            if (hasWeakness) {
              buffDebuffPromises.push(new Promise(resolve => {
                Animations.animateCardActionOverlay(opponentCard, 'weak', `weakness`, resolve);
              }));
            }
          }
        }
      }
    }

    // Player 2 (opponent) card effects
    if (opponentCard && p2Effect && p2Effect.applyStatus) {
      // Self Buffs
      if (p2Effect.applyStatus.self && p2Effect.applyStatus.self.attackBuff > 0) {
        buffDebuffPromises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'buff', `buff self`, resolve);
        }));
      }
      // Self Debuffs
      if (p2Effect.applyStatus.self) {
        if (p2Effect.applyStatus.self.burn > 0) {
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(opponentCard, 'burn', `burn self`, resolve);
          }));
        }
        if (p2Effect.applyStatus.self.poison > 0) {
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(opponentCard, 'poison', `poison self`, resolve);
          }));
        }
        if (p2Effect.applyStatus.self.weakness > 0) {
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(opponentCard, 'weak', `weak self`, resolve);
          }));
        }
      }
      // Debuffs to Opponent
      if (p2Effect.applyStatus.opponent) {
        const hasBurn = p2Effect.applyStatus.opponent.burn > 0;
        const hasPoison = p2Effect.applyStatus.opponent.poison > 0;
        const hasWeakness = p2Effect.applyStatus.opponent.weakness > 0;
        if (hasBurn || hasPoison || hasWeakness) {
          // Opponent card shows "debuff enemy"
          buffDebuffPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(opponentCard, 'debuff', `debuff enemy`, resolve);
          }));
          // Player card shows specific debuff overlay
          if (playerCard) {
            if (hasBurn) {
              buffDebuffPromises.push(new Promise(resolve => {
                Animations.animateCardActionOverlay(playerCard, 'burn', `burn`, resolve);
              }));
            }
            if (hasPoison) {
              buffDebuffPromises.push(new Promise(resolve => {
                Animations.animateCardActionOverlay(playerCard, 'poison', `poison`, resolve);
              }));
            }
            if (hasWeakness) {
              buffDebuffPromises.push(new Promise(resolve => {
                Animations.animateCardActionOverlay(playerCard, 'weak', `weakness`, resolve);
              }));
            }
          }
        }
      }
    }

    // Apply Buff/Debuff status changes dynamically to Client-side HUD state
    const addStatuses = (target, source) => {
      if (!source) return;
      Object.keys(source).forEach(key => {
        if (key === 'cleanse' || key === 'dispel') return;
        target[key] = (target[key] || 0) + source[key];
      });
    };

    if (p1Effect && p1Effect.applyStatus) {
      if (p1Effect.applyStatus.self) addStatuses(this.myStatuses, p1Effect.applyStatus.self);
      if (p1Effect.applyStatus.opponent) addStatuses(this.opponentStatuses, p1Effect.applyStatus.opponent);
    }
    if (p2Effect && p2Effect.applyStatus) {
      if (p2Effect.applyStatus.self) addStatuses(this.opponentStatuses, p2Effect.applyStatus.self);
      if (p2Effect.applyStatus.opponent) addStatuses(this.myStatuses, p2Effect.applyStatus.opponent);
    }

    if (buffDebuffPromises.length > 0) {
      await Promise.all(buffDebuffPromises);
      // Update HUD status visuals in real-time
      UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
      UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
      await new Promise(resolve => setTimeout(resolve, 100));
    }


    // --- STEP 5: CLEANSE & DISPEL ---
    const cleanseDispelPromises = [];

    // Player 1 (you) card effects
    if (playerCard && p1Effect && p1Effect.applyStatus) {
      if (p1Effect.applyStatus.self && p1Effect.applyStatus.self.cleanse > 0) {
        cleanseDispelPromises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'cleanse', `cleanse`, resolve);
        }));
      }
      if (p1Effect.applyStatus.opponent && p1Effect.applyStatus.opponent.dispel > 0) {
        cleanseDispelPromises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'dispel', `dispel`, resolve);
        }));
        if (opponentCard) {
          cleanseDispelPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(opponentCard, 'dispel', `dispelled`, resolve);
          }));
        }
      }
    }

    // Player 2 (opponent) card effects
    if (opponentCard && p2Effect && p2Effect.applyStatus) {
      if (p2Effect.applyStatus.self && p2Effect.applyStatus.self.cleanse > 0) {
        cleanseDispelPromises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'cleanse', `cleanse`, resolve);
        }));
      }
      if (p2Effect.applyStatus.opponent && p2Effect.applyStatus.opponent.dispel > 0) {
        cleanseDispelPromises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'dispel', `dispel`, resolve);
        }));
        if (playerCard) {
          cleanseDispelPromises.push(new Promise(resolve => {
            Animations.animateCardActionOverlay(playerCard, 'dispel', `dispelled`, resolve);
          }));
        }
      }
    }

    // Apply Cleanse / Dispel status changes dynamically to Client-side HUD state
    if (p1Effect && p1Effect.applyStatus) {
      if (p1Effect.applyStatus.self && p1Effect.applyStatus.self.cleanse > 0) {
        this.myStatuses.burn = 0;
        this.myStatuses.poison = 0;
        this.myStatuses.weakness = 0;
      }
      if (p1Effect.applyStatus.opponent && p1Effect.applyStatus.opponent.dispel > 0) {
        this.opponentStatuses.attackBuff = 0;
      }
    }
    if (p2Effect && p2Effect.applyStatus) {
      if (p2Effect.applyStatus.self && p2Effect.applyStatus.self.cleanse > 0) {
        this.opponentStatuses.burn = 0;
        this.opponentStatuses.poison = 0;
        this.opponentStatuses.weakness = 0;
      }
      if (p2Effect.applyStatus.opponent && p2Effect.applyStatus.opponent.dispel > 0) {
        this.myStatuses.attackBuff = 0;
      }
    }

    if (cleanseDispelPromises.length > 0) {
      await Promise.all(cleanseDispelPromises);
      // Update HUD status visuals in real-time
      UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
      UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
      await new Promise(resolve => setTimeout(resolve, 100));
    }


    // --- STEP 6: ATTACKING (Lunge strike and HP reductions) ---
    const playerDamaging = (result.damageDealt > 0);
    const opponentDamaging = (result.opponentDamageDealt > 0);
    const startHpSelf = this.myHp;
    const startHpOpp = this.opponentHp;

    await new Promise(resolve => {
      Animations.animateClashImpact(playerCard, opponentCard, result.outcome, playerDamaging, opponentDamaging, () => {
        window.AudioSynth.playClash(result.outcome);

        // HP Damage popups
        if (result.hpDamage > 0) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.hpDamage, false);
        }
        if (result.opponentHpDamage > 0) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentHpDamage, false);
        }

        // Shield damage popups and absorbs
        if (result.shieldDamage > 0) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.shieldDamage, 'shield-damage');
          if (playerCard) Animations.animateShieldAbsorb(playerCard);
        }
        if (result.opponentShieldDamage > 0) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentShieldDamage, 'shield-damage');
          if (opponentCard) Animations.animateShieldAbsorb(opponentCard);
        }

        // Self damage
        if (result.selfDamage > 0) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.selfDamage, 'self-damage');
          if (playerCard) {
            Animations.animateCardActionOverlay(playerCard, 'self-damage', `-${result.selfDamage} self dmg`);
          }
        }
        if (result.opponentSelfDamage > 0) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentSelfDamage, 'self-damage');
          if (opponentCard) {
            Animations.animateCardActionOverlay(opponentCard, 'self-damage', `-${result.opponentSelfDamage} self dmg`);
          }
        }

        // Healing
        if (result.healGain > 0 && playerCard) {
          Animations.animateDamagePopup(UI.playerPlaySlot, result.healGain, 'heal');
          Animations.animateCardActionOverlay(playerCard, 'heal', `+${result.healGain} hp`);
        }
        if (result.opponentHealGain > 0 && opponentCard) {
          Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentHealGain, 'heal');
          Animations.animateCardActionOverlay(opponentCard, 'heal', `+${result.opponentHealGain} hp`);
        }

        // Calculate HP value after strike but before tick damage
        const p1TickTotal = (result.statusDamage.burnHpDmg !== undefined ? result.statusDamage.burnHpDmg : (result.statusDamage.burn || 0)) + (result.statusDamage.poison || 0);
        const p2TickTotal = (result.opponentStatusDamage.burnHpDmg !== undefined ? result.opponentStatusDamage.burnHpDmg : (result.opponentStatusDamage.burn || 0)) + (result.opponentStatusDamage.poison || 0);

        const clashEndHp = result.newHp + p1TickTotal;
        const clashEndHpOpponent = result.opponentNewHp + p2TickTotal;

        const currentHpSelf = Math.min(this.myMaxHp, startHpSelf + (result.healGain || 0));
        const currentHpOpp = Math.min(this.opponentMaxHp, startHpOpp + (result.opponentHealGain || 0));

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

    await new Promise(resolve => setTimeout(resolve, 400));


    // --- STEP 7: DoT (Burn & Poison Ticks) ---
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
        // Burn resets to 0 instantly when ticked
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
          // Poison stack decreases by 1 when ticked
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

    // Sync values post ticks
    this.myHp = result.newHp;
    this.opponentHp = result.opponentNewHp;
    this.myShield = result.newShield;
    this.opponentShield = result.opponentNewShield;
    UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
    UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);

    // Update active quest progress tracker post ticks
    if (result.activeQuest !== undefined) {
      this.activeQuest = result.activeQuest;
      UI.updateQuestTracker(this.activeQuest);
    }

    if (dotPromises.length > 0) {
      await Promise.all(dotPromises);
      await new Promise(resolve => setTimeout(resolve, 300));
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
    this.selectedRemovalCardInstanceId = null;
    
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
    
    UI.renderRemovalCards(data.deck, (cardInstanceId) => {
      this.selectedRemovalCardInstanceId = cardInstanceId;
      if (confirmBtn) {
        confirmBtn.classList.remove('disabled');
        confirmBtn.disabled = false;
      }
    });
  },

  onRemovalConfirmed() {
    const UI = window.UI;
    const waitingText = document.querySelector('#waiting-screen p');
    if (waitingText) {
      waitingText.innerText = 'Waiting for opponent to complete their card removal phase...';
    }
    UI.showScreen('waiting');
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

  /**
   * Triggers at the start of a round
   */
  onRoundStart(data) {
    const UI = window.UI;
    
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
        roundDesc.style.color = '#2ecc71';
      }
    } else if (isRoundDraw) {
      if (roundDesc) {
        roundDesc.innerText = 'It was a Draw!';
        roundDesc.style.color = '#f1c40f';
      }
    } else {
      if (roundDesc) {
        roundDesc.innerText = `${this.opponentName || 'Opponent'} won this round!`;
        roundDesc.style.color = '#e74c3c';
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
      if (UI.roundQuestRewardBanner) {
        UI.roundQuestRewardBanner.classList.remove('hidden');
      }
      if (UI.roundQuestRewardText) {
        UI.roundQuestRewardText.innerHTML = `Quest: <strong>${myQuest.text}</strong><br>Reward: <strong style="color: #ffd700;">${myQuest.reward}</strong>`;
      }
      if (window.AudioSynth && window.AudioSynth.playQuestComplete) {
        window.AudioSynth.playQuestComplete();
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

// Bind to window load
window.addEventListener('DOMContentLoaded', () => {
  window.gameManager = GameManager;
  GameManager.init();
});
