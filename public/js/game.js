/**
 * ELEMENT CLASH: GAME CONTROLLER & STATE MANAGER
 */

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
  myShield: 0,
  opponentHp: 100,
  opponentShield: 0,
  myStatuses: {},
  opponentStatuses: {},
  
  // Draft phase state
  selectedDraftInstanceIds: [],
  draftTimerInterval: null,
  
  // Animation sync helpers
  currentRoundReveal: null,
  currentRoundResult: null,

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

    // Draft lock button
    if (UI.draftLockBtn) {
      UI.draftLockBtn.addEventListener('click', () => {
        window.AudioSynth.playClick();
        this.lockDraft();
      });
    }

    // Game over replay return button
    UI.goLobbyBtn.addEventListener('click', () => {
      window.AudioSynth.playClick();
      this.resetLobby();
    });

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
    
    // Clear variables
    this.currentRoomId = null;
    this.opponentId = null;
    this.opponentName = null;
    this.round = 0;
    this.hand = [];
    this.myHp = 100;
    this.myShield = 0;
    this.opponentHp = 100;
    this.opponentShield = 0;
    this.myStatuses = {};
    this.opponentStatuses = {};
    this.currentRoundReveal = null;
    this.currentRoundResult = null;
    
    // Reset draft states
    this.selectedDraftInstanceIds = [];
    if (this.draftTimerInterval) {
      clearInterval(this.draftTimerInterval);
      this.draftTimerInterval = null;
    }
    
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
    
    this.currentRoomId = data.roomId;
    this.opponentId = data.opponentId;
    this.opponentName = data.opponentName;
    this.myId = data.yourId;
    this.myName = data.yourName;
    
    // Sound FX matchmaking
    window.AudioSynth.playMatchFound();
    
    // Match update message
    UI.statusText.innerHTML = `MATCH FOUND! Opponent: <strong class="accent-text">${data.opponentName}</strong>`;
    UI.queueStatusSub.classList.add('hidden');
    UI.leaveQueueBtn.classList.add('hidden');
    
    // Load names in Battle UI (preserve info icon inside the span)
    UI.setHudName(UI.playerName, this.myName);
    UI.setHudName(UI.enemyName, this.opponentName);
    
    // Transition Screen to draft screen after a small buffer delay
    setTimeout(() => {
      UI.showScreen('draft');
      UI.clearArenaSlots();
    }, 1500);
  },

  /**
   * Triggers at the start of a round
   */
  onRoundStart(data) {
    const UI = window.UI;
    
    // Clear draft timer just in case
    if (this.draftTimerInterval) {
      clearInterval(this.draftTimerInterval);
      this.draftTimerInterval = null;
    }
    
    // Transition to battle screen
    UI.showScreen('battle');
    
    this.round = data.round;
    this.hand = data.hand;
    this.myHp = data.selfStatus.hp;
    this.myShield = data.selfStatus.shield;
    this.myStatuses = data.selfStatus.statuses || {};
    this.opponentHp = data.opponentStatus.hp;
    this.opponentShield = data.opponentStatus.shield;
    this.opponentStatuses = data.opponentStatus.statuses || {};

    // Reset selection locked states
    UI.selectedCardInstanceId = null;
    UI.isLocked = false;
    UI.lockBtn.classList.add('disabled');
    UI.lockBtn.disabled = true;
    UI.lockBtn.classList.remove('locked-state');
    UI.lockBtn.querySelector('.lock-btn-text').innerText = 'SELECT CARD';

    // Wipe arena slots clean
    UI.clearArenaSlots();
    UI.arenaCombatText.innerText = `Round ${this.round}: Select your card!`;

    // Render cards and trigger draw animation
    UI.renderHand(this.hand, true);
    
    // Update Opponent card indicators
    UI.updateOpponentHandSize(data.opponentStatus.handSize);

    // Sync HUD status bars and active badges immediately
    UI.playerHpVal.innerText = this.myHp;
    UI.playerHpFill.style.width = `${this.myHp}%`;
    UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
    UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);

    UI.enemyHpVal.innerText = this.opponentHp;
    UI.enemyHpFill.style.width = `${this.opponentHp}%`;
    UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);
    UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
  },

  /**
   * Triggers when opponent selects a card (without revealing detail)
   */
  onOpponentSelect(data) {
    const UI = window.UI;
    if (UI.isLocked) {
      UI.arenaCombatText.innerText = 'Waiting for opponent to lock selection...';
    } else if (data.opponentSelected) {
      UI.arenaCombatText.innerText = 'Opponent is choosing a card...';
    } else {
      UI.arenaCombatText.innerText = 'Select your card!';
    }
  },

  /**
   * Triggers when opponent locks their card selection
   */
  onOpponentLock(data) {
    const UI = window.UI;
    if (UI.isLocked) {
      UI.arenaCombatText.innerText = 'Both players locked. Simulating clash...';
    } else {
      UI.arenaCombatText.innerText = 'Opponent locked card choice!';
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
  tryResolveVisualPipeline() {
    // Run only when BOTH payloads have successfully landed
    if (!this.currentRoundReveal || !this.currentRoundResult) return;

    const UI = window.UI;
    const Animations = window.Animations;
    
    const reveal = this.currentRoundReveal;
    const result = this.currentRoundResult;
    
    // Reset buffers
    this.currentRoundReveal = null;
    this.currentRoundResult = null;

    // Lock controls UI text
    UI.arenaCombatText.innerText = 'CLASH!';

    // 1. Locate player card inside fanned hand DOM
    const playedCardId = reveal.yourCard.instanceId;
    const playerCardEl = document.getElementById(`card-${playedCardId}`);

    // --- Player Card: Clone-based flight to avoid CSS transform interference ---
    if (playerCardEl) {
      const cardRect = playerCardEl.getBoundingClientRect();
      const slotRect = UI.playerPlaySlot.getBoundingClientRect();

      if (cardRect.width > 0 && slotRect.width > 0) {
        // Create a clone that flies in page-coordinate space
        const clone = playerCardEl.cloneNode(true);
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

        // Hide original card immediately
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
            // Place a proper fresh card into the slot
            const slotCard = UI.createCardElement(reveal.yourCard);
            slotCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default;';
            UI.playerPlaySlot.innerHTML = '';
            UI.playerPlaySlot.appendChild(slotCard);
          }
        });
      } else {
        // Fallback: no valid rects, just place card
        const fallbackCard = UI.createCardElement(reveal.yourCard);
        fallbackCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default;';
        UI.playerPlaySlot.innerHTML = '';
        UI.playerPlaySlot.appendChild(fallbackCard);
      }
    } else {
      // Card element not found — render directly
      const fallbackCard = UI.createCardElement(reveal.yourCard);
      fallbackCard.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default;';
      UI.playerPlaySlot.innerHTML = '';
      UI.playerPlaySlot.appendChild(fallbackCard);
    }
    UI.playerPlaySlot.classList.add('filled');

    // 2. Create face-down opponent card in arena slot and slide it in
    const opponentCardEl = document.createElement('div');
    opponentCardEl.className = 'card';
    opponentCardEl.setAttribute('data-element', reveal.opponentCard.element);
    opponentCardEl.style.cssText = 'position: relative; transform: none; width: 100%; height: 100%; cursor: default;';
    opponentCardEl.innerHTML = `
      <div class="card-face card-front"></div>
      <div class="card-face card-back"></div>
    `;
    UI.enemyPlaySlot.innerHTML = '';
    UI.enemyPlaySlot.appendChild(opponentCardEl);
    UI.enemyPlaySlot.classList.add('filled');
    UI.vsBadge.style.opacity = '0.2';

    Animations.animateOpponentCardArrival(opponentCardEl, () => {
      // 3. Inject details into face front structure of opponent card right before flip
      const iconClass = UI.getElementIconClass(reveal.opponentCard.element);
      const frontFace = opponentCardEl.querySelector('.card-front');
      frontFace.innerHTML = `
        <div class="card-header">
          <span class="card-name">${reveal.opponentCard.name}</span>
        </div>
        <div class="card-middle">
          <i class="card-element-icon fa-solid ${iconClass}"></i>
          <p class="card-desc">${reveal.opponentCard.description}</p>
        </div>
        <div class="card-footer">
          <span class="card-element-name">${reveal.opponentCard.element}</span>
        </div>
      `;

      Animations.animateCardFlip(opponentCardEl, () => {
        const playerCard = UI.playerPlaySlot.querySelector('.card');
        const opponentCard = UI.enemyPlaySlot.querySelector('.card');
        
        const playerHasActivation = (result.shieldGain > 0 || result.healGain > 0);
        const opponentHasActivation = (result.opponentShieldGain > 0 || result.opponentHealGain > 0);
        
        const startHpSelf = this.myHp;
        const startHpOpp = this.opponentHp;

        // 1. Run Effect Activation Animations (Buff / Heal / Shield)
        const runActivation = (onComplete) => {
          let animCount = 0;
          const checkDone = () => {
            animCount--;
            if (animCount <= 0) onComplete();
          };
          
          if (playerHasActivation && playerCard) {
            animCount++;
            anime({
              targets: playerCard,
              translateY: -35,
              duration: 250,
              easing: 'easeOutQuad',
              direction: 'alternate',
              loop: 1,
              begin: () => {
                if (result.shieldGain > 0) {
                  Animations.animateDamagePopup(UI.playerPlaySlot, result.shieldGain, true);
                }
                if (result.healGain > 0) {
                  Animations.animateDamagePopup(UI.playerPlaySlot, result.healGain, 'heal');
                }
              },
              complete: () => {
                UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, result.newShield);
                if (result.healGain > 0) {
                  const intermediateHp = Math.min(100, startHpSelf + result.healGain);
                  Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, startHpSelf, intermediateHp);
                }
                checkDone();
              }
            });
          }
          
          if (opponentHasActivation && opponentCard) {
            animCount++;
            anime({
              targets: opponentCard,
              translateY: -35,
              duration: 250,
              easing: 'easeOutQuad',
              direction: 'alternate',
              loop: 1,
              begin: () => {
                if (result.opponentShieldGain > 0) {
                  Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentShieldGain, true);
                }
                if (result.opponentHealGain > 0) {
                  Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentHealGain, 'heal');
                }
              },
              complete: () => {
                UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, result.opponentNewShield);
                if (result.opponentHealGain > 0) {
                  const intermediateHpOpp = Math.min(100, startHpOpp + result.opponentHealGain);
                  Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, startHpOpp, intermediateHpOpp);
                }
                checkDone();
              }
            });
          }
          
          if (animCount === 0) {
            onComplete();
          }
        };

        // 2. Trigger lunge strike after effect animations resolve
        runActivation(() => {
          if (!playerCard || !opponentCard) {
            // Fallback if elements not ready
            this.myHp = result.newHp;
            this.myShield = result.newShield;
            this.opponentHp = result.opponentNewHp;
            this.opponentShield = result.opponentNewShield;
            return;
          }

          const playerDamaging = (result.damageDealt > 0);
          const opponentDamaging = (result.opponentDamageDealt > 0);

          Animations.animateClashImpact(playerCard, opponentCard, result.outcome, playerDamaging, opponentDamaging, () => {
            // --- ON IMPACT ---
            window.AudioSynth.playClash(result.outcome);

            // Display outcome message
            let outcomeMsg = '';
            if (result.outcome === 'SUPERIOR') {
              outcomeMsg = `<span class="accent-text" style="color: #2ecc71;">SUPERIOR</span>`;
            } else if (result.outcome === 'INFERIOR') {
              outcomeMsg = `<span class="accent-text" style="color: #ff3333;">INFERIOR</span>`;
            } else {
              outcomeMsg = `<span class="accent-text" style="color: #a0aec0;">TIE</span>`;
            }
            UI.arenaCombatText.innerHTML = outcomeMsg;

            // Show HP damage popups
            if (result.hpDamage > 0) {
              Animations.animateDamagePopup(UI.playerPlaySlot, result.hpDamage, false);
            }
            if (result.opponentHpDamage > 0) {
              Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentHpDamage, false);
            }

            // Show self damage popups
            if (result.selfDamage > 0) {
              Animations.animateDamagePopup(UI.playerPlaySlot, result.selfDamage, false);
            }
            if (result.opponentSelfDamage > 0) {
              Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentSelfDamage, false);
            }

            // Calculate HP values after clash damage but before status tick damage
            const p1TickTotal = (result.statusDamage.burn || 0) + (result.statusDamage.poison || 0);
            const p2TickTotal = (result.opponentStatusDamage.burn || 0) + (result.opponentStatusDamage.poison || 0);

            const clashEndHp = result.newHp + p1TickTotal;
            const clashEndHpOpponent = result.opponentNewHp + p2TickTotal;

            const currentHpSelf = Math.min(100, startHpSelf + (result.healGain || 0));
            const currentHpOpp = Math.min(100, startHpOpp + (result.opponentHealGain || 0));

            // Reduce HP bars for clash strike damage
            Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, currentHpSelf, clashEndHp);
            Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, currentHpOpp, clashEndHpOpponent);

            // Update shield displays to final state
            UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, result.newShield);
            UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, result.opponentNewShield);

            // Deduct opponent card count dot indicator
            const currentDots = UI.enemyCardDots.querySelectorAll('span');
            if (currentDots.length > 0) {
              currentDots[0].remove();
            }

            // Store values after clash damage (starting point for status ticks)
            this.myHp = clashEndHp;
            this.opponentHp = clashEndHpOpponent;

          }, () => {
            // --- ON CLASH ANIMATION COMPLETED ---
            // Wait slightly, then show status damage ticks (debuff calculations)
            setTimeout(() => {
              const p1Burn = result.statusDamage.burn || 0;
              const p1Poison = result.statusDamage.poison || 0;
              const p2Burn = result.opponentStatusDamage.burn || 0;
              const p2Poison = result.opponentStatusDamage.poison || 0;

              const playerHudEl = document.querySelector('.player-hud');
              const enemyHudEl = document.querySelector('.enemy-hud');

              if (p1Burn > 0) {
                Animations.animateDamagePopup(playerHudEl, p1Burn, 'burn');
              }
              if (p1Poison > 0) {
                setTimeout(() => {
                  Animations.animateDamagePopup(playerHudEl, p1Poison, 'poison');
                }, p1Burn > 0 ? 150 : 0);
              }
              if (p1Burn > 0 || p1Poison > 0) {
                Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, this.myHp, result.newHp);
              }

              if (p2Burn > 0) {
                Animations.animateDamagePopup(enemyHudEl, p2Burn, 'burn');
              }
              if (p2Poison > 0) {
                setTimeout(() => {
                  Animations.animateDamagePopup(enemyHudEl, p2Poison, 'poison');
                }, p2Burn > 0 ? 150 : 0);
              }
              if (p2Burn > 0 || p2Poison > 0) {
                Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, this.opponentHp, result.opponentNewHp);
              }

              // Sync final values locally
              this.myHp = result.newHp;
              this.myShield = result.newShield;
              this.myStatuses = result.newStatuses || {};
              this.opponentHp = result.opponentNewHp;
              this.opponentShield = result.opponentNewShield;
              this.opponentStatuses = result.opponentNewStatuses || {};

              // Sync updated status badges in HUD
              UI.renderStatuses(UI.playerStatusContainer, result.newStatuses);
              UI.renderStatuses(UI.enemyStatusContainer, result.opponentNewStatuses);
            }, 350);

            // Fade out cards in arena to clear slots
            setTimeout(() => {
              const playerSlotCard = UI.playerPlaySlot.children[0];
              const enemySlotCard = UI.enemyPlaySlot.children[0];
              const targets = [playerSlotCard, enemySlotCard].filter(Boolean);
              if (targets.length > 0) {
                anime({
                  targets: targets,
                  opacity: 0,
                  scale: 0.8,
                  duration: 300,
                  easing: 'easeInQuad',
                  complete: () => {
                    UI.clearArenaSlots();
                  }
                });
              } else {
                UI.clearArenaSlots();
              }
            }, 1400);
          });
        });
      });
    });
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
    alert(`Opponent ${data.disconnectedPlayerName} disconnected! Winning match by default.`);
    UI.arenaCombatText.innerText = 'Opponent disconnected!';
  },

  /**
   * Triggers when round HP results in Game Over
   */
  onGameOver(data) {
    const UI = window.UI;
    const Animations = window.Animations;

    // Play final result sounds
    const isWinner = data.winnerId === this.myId;
    const isDraw = data.winnerId === null;
    
    if (isWinner) {
      window.AudioSynth.playVictory();
      UI.gameOverTitle.innerText = 'VICTORY';
      UI.gameOverMsg.innerText = data.reason === 'opponent_disconnected' 
        ? 'Your opponent fled the field. You win by default!' 
        : 'You have out-predicted and defeated your opponent!';
      UI.gameOverScreen.className = 'overlay active victory';
    } else if (isDraw) {
      window.AudioSynth.playVictory(); // Neutral chord works too
      UI.gameOverTitle.innerText = 'DRAW MATCH';
      UI.gameOverMsg.innerText = 'A double knockout! Both elements crumbled.';
      UI.gameOverScreen.className = 'overlay active';
    } else {
      window.AudioSynth.playDefeat();
      UI.gameOverTitle.innerText = 'DEFEAT';
      UI.gameOverMsg.innerText = 'You were defeated in elemental combat!';
      UI.gameOverScreen.className = 'overlay active defeat';
    }

    // Set stats info in screen modal
    UI.goFinalHp.innerText = this.myHp;
    UI.goRounds.innerText = this.round;

    // Display modal card
    const cardEl = UI.gameOverScreen.querySelector('.game-over-card');
    Animations.animateOverlayReveal(UI.gameOverScreen, cardEl);
  },

  /**
   * Triggers when the draft/mulligan phase starts
   */
  onDraftStart(data) {
    const UI = window.UI;
    
    // Enter landscape full screen on mobile
    this.enterLandscapeImmersive();
    
    // Reset draft state
    this.selectedDraftInstanceIds = [];
    if (this.draftTimerInterval) {
      clearInterval(this.draftTimerInterval);
    }
    
    // Reset UI elements
    UI.draftCardsGrid.style.pointerEvents = 'auto';
    UI.updateKeywordExplanations(UI.draftKeywordInfo, '');
    
    // Reset elemental counter badge
    const elementalVal = document.getElementById('draft-elemental-val');
    if (elementalVal) {
      elementalVal.innerText = '4 / 4 min';
      elementalVal.style.color = '';
      elementalVal.classList.remove('text-danger');
    }
    
    // Configure badge counters to show KEEPING
    const counterLabel = document.querySelector('#draft-counter-box span');
    if (counterLabel) {
      counterLabel.innerHTML = `KEEPING: <strong id="draft-counter-val">0</strong> / 8`;
      UI.draftCounterVal = document.getElementById('draft-counter-val');
    }
    
    const subtitle = UI.draftScreen.querySelector('.draft-subtitle');
    if (subtitle) {
      subtitle.innerHTML = 'Select the cards you want to <strong class="accent-text" style="color: #ffd700;">KEEP</strong>. Unselected cards will be replaced.';
    }
    
    // Mulligan lock is always enabled from the start
    UI.draftLockBtn.classList.remove('disabled');
    UI.draftLockBtn.disabled = false;
    UI.draftLockBtn.innerText = 'LOCK DECK';
    
    // Render draft pool
    UI.renderDraftPool(data.draftPool, (instanceId, cardEl) => {
      this.onDraftCardClick(instanceId, cardEl);
    });
    
    // Start countdown timer
    let secondsLeft = data.seconds;
    UI.draftTimerVal.innerText = secondsLeft;
    
    this.draftTimerInterval = setInterval(() => {
      secondsLeft -= 1;
      UI.draftTimerVal.innerText = secondsLeft;
      
      if (secondsLeft <= 0) {
        clearInterval(this.draftTimerInterval);
        this.draftTimerInterval = null;
        
        // Auto lock selection if not locked
        if (UI.draftCardsGrid.style.pointerEvents !== 'none') {
          this.lockDraft();
        }
      }
    }, 1000);
  },

  /**
   * Handles draft card clicks
   */
  onDraftCardClick(instanceId, cardEl) {
    const UI = window.UI;
    const index = this.selectedDraftInstanceIds.indexOf(instanceId);
    
    if (index > -1) {
      // Deselect
      this.selectedDraftInstanceIds.splice(index, 1);
      cardEl.classList.remove('draft-selected');
    } else {
      // Select (max 8)
      if (this.selectedDraftInstanceIds.length < 8) {
        this.selectedDraftInstanceIds.push(instanceId);
        cardEl.classList.add('draft-selected');
      } else {
        return;
      }
    }
    
    // Update counter text
    if (UI.draftCounterVal) {
      UI.draftCounterVal.innerText = this.selectedDraftInstanceIds.length;
    }

    // Count elementals in current selection
    const selectedCards = UI.draftCardsGrid.querySelectorAll('.card.draft-selected');
    let keptElementals = 0;
    let keptNonElementals = 0;
    selectedCards.forEach(c => {
      const elType = c.getAttribute('data-element');
      if (elType === 'FIRE' || elType === 'WATER' || elType === 'NATURE') {
        keptElementals++;
      } else {
        keptNonElementals++;
      }
    });

    const maxNonElementalsAllowed = 4;
    const isSelectionValid = (keptNonElementals <= maxNonElementalsAllowed);

    // Update elemental validation badge
    const elementalVal = document.getElementById('draft-elemental-val');
    if (elementalVal) {
      const guaranteedElementals = Math.max(keptElementals, Math.min(4, 8 - keptNonElementals));
      elementalVal.innerText = `${guaranteedElementals} / 4 min`;
      
      if (isSelectionValid) {
        elementalVal.style.color = '';
        elementalVal.classList.remove('text-danger');
      } else {
        elementalVal.style.color = '#ff4a4a';
        elementalVal.classList.add('text-danger');
      }
    }

    // Enable / disable lock button
    if (isSelectionValid) {
      UI.draftLockBtn.classList.remove('disabled');
      UI.draftLockBtn.disabled = false;
      UI.draftLockBtn.innerText = 'LOCK DECK';
      
      const subtitle = UI.draftScreen.querySelector('.draft-subtitle');
      if (subtitle) {
        subtitle.innerHTML = 'Select the cards you want to <strong class="accent-text" style="color: #ffd700;">KEEP</strong>. Unselected cards will be replaced.';
      }
    } else {
      UI.draftLockBtn.classList.add('disabled');
      UI.draftLockBtn.disabled = true;
      UI.draftLockBtn.innerText = 'INVALID DECK';
      
      const subtitle = UI.draftScreen.querySelector('.draft-subtitle');
      if (subtitle) {
        subtitle.innerHTML = '<span style="color: #ff4a4a; font-weight: bold;">Cannot keep more than 4 Neutral/Chaos cards! (Need at least 4 Elementals)</span>';
      }
    }
    
    // Render keyword definitions for selected card
    const descEl = cardEl.querySelector('.card-desc');
    const desc = descEl ? descEl.innerHTML : '';
    if (this.selectedDraftInstanceIds.includes(instanceId)) {
      UI.updateKeywordExplanations(UI.draftKeywordInfo, desc);
    } else {
      // Deselected: show most recently selected card's keywords, or hide if none
      if (this.selectedDraftInstanceIds.length > 0) {
        const lastId = this.selectedDraftInstanceIds[this.selectedDraftInstanceIds.length - 1];
        const lastCardEl = UI.draftCardsGrid.querySelector(`[data-instance-id="${lastId}"]`);
        const lastDescEl = lastCardEl ? lastCardEl.querySelector('.card-desc') : null;
        UI.updateKeywordExplanations(UI.draftKeywordInfo, lastDescEl ? lastDescEl.innerHTML : '');
      } else {
        UI.updateKeywordExplanations(UI.draftKeywordInfo, '');
      }
    }
  },

  /**
   * Triggers when opponent locks their deck in draft
   */
  onOpponentDraftLocked() {
    const UI = window.UI;
    const subtitle = UI.draftScreen.querySelector('.draft-subtitle');
    if (subtitle) {
      subtitle.innerHTML = '<span class="accent-text" style="color: #f5cf70;">Opponent locked deck, waiting for you...</span>';
    }
  },

  /**
   * Locks the draft and emits chosen deck to the server
   */
  lockDraft() {
    const UI = window.UI;
    
    if (this.draftTimerInterval) {
      clearInterval(this.draftTimerInterval);
      this.draftTimerInterval = null;
    }
    
    // Disable interactions
    UI.draftCardsGrid.style.pointerEvents = 'none';
    UI.draftLockBtn.classList.add('disabled');
    UI.draftLockBtn.disabled = true;
    UI.draftLockBtn.innerText = 'DECK LOCKED';
    
    // Hide keyword panel when locked
    UI.updateKeywordExplanations(UI.draftKeywordInfo, '');
    
    // Play lock sound
    if (window.AudioSynth) {
      window.AudioSynth.playLock();
    }
    
    window.SocketService.lockDraft(this.selectedDraftInstanceIds);
  },

  /**
   * Animates replacement of unselected cards during mulligan
   */
  onDraftMulliganResult(data) {
    const UI = window.UI;
    if (!data.replaced || data.replaced.length === 0) return;

    data.replaced.forEach(item => {
      const cardEl = UI.draftCardsGrid.querySelector(`[data-instance-id="${item.oldId}"]`);
      if (cardEl) {
        // Remove selection highlight
        cardEl.classList.remove('draft-selected');

        // Play flip-down/flip-up shuffle transition
        anime({
          targets: cardEl,
          rotateY: 180,
          duration: 400,
          easing: 'easeInQuad',
          complete: () => {
            // Replace attribute values
            cardEl.setAttribute('data-instance-id', item.newCard.instanceId);
            cardEl.setAttribute('data-element', item.newCard.element);
            
            // Re-render front face content
            const iconClass = UI.getElementIconClass(item.newCard.element);
            const frontFace = cardEl.querySelector('.card-front');
            frontFace.innerHTML = `
              <div class="card-header">
                <span class="card-name">${item.newCard.name}</span>
              </div>
              <div class="card-middle">
                <i class="card-element-icon fa-solid ${iconClass}"></i>
                <p class="card-desc">${item.newCard.description}</p>
              </div>
              <div class="card-footer">
                <span class="card-element-name">${item.newCard.element}</span>
              </div>
            `;
            
            // Add glow outline highlight for newly drawn cards
            cardEl.classList.add('new-mulligan-glow');
            
            // Flip back to face up
            anime({
              targets: cardEl,
              rotateY: 360,
              duration: 400,
              easing: 'easeOutQuad',
              complete: () => {
                cardEl.style.transform = 'none';
              }
            });
          }
        });
      }
    });
  },

  /**
   * Called when both players lock and mulligans are completed
   */
  onDraftFinalized() {
    const UI = window.UI;
    const subtitle = UI.draftScreen.querySelector('.draft-subtitle');
    if (subtitle) {
      subtitle.innerHTML = '<span class="accent-text" style="color: #ffd700;">Finalizing decks... Starting battle soon!</span>';
    }
  },

  /**
   * Requests fullscreen and locks screen orientation to landscape on mobile devices
   */
  enterLandscapeImmersive() {
    document.body.classList.add('force-landscape');
    
    const requestImmersive = () => {
      // 1. request fullscreen
      const docEl = document.documentElement;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      }
      // 2. lock screen orientation to landscape
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    };

    // Trigger immediately
    requestImmersive();

    // Bind touch listener for mobile browsers requiring direct user gestures
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

    // Exit fullscreen
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    // Unlock screen orientation
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
};

// Bind to window load
window.addEventListener('DOMContentLoaded', () => {
  window.gameManager = GameManager;
  GameManager.init();
});
