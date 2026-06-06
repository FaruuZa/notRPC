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
  
  // Rework score states
  myPoints: 0,
  opponentPoints: 0,
  selectedBonusCardTemplateId: null,
  
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
    this.myShield = 0;
    this.opponentHp = 100;
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
      this.enterLandscapeImmersive();
      UI.showScreen('draft');
      UI.clearArenaSlots();
    }, 1500);
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

            // Show Shield damage popups and trigger card shield absorb overlay effects
            if (result.shieldDamage > 0) {
              Animations.animateDamagePopup(UI.playerPlaySlot, result.shieldDamage, 'shield-damage');
              if (playerCard) {
                Animations.animateShieldAbsorb(playerCard);
              }
            }
            if (result.opponentShieldDamage > 0) {
              Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentShieldDamage, 'shield-damage');
              if (opponentCard) {
                Animations.animateShieldAbsorb(opponentCard);
              }
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
    UI.showToast(`Opponent ${data.disconnectedPlayerName} disconnected! Winning match by default.`);
    UI.arenaCombatText.innerText = 'Opponent disconnected!';
  },

  /**
   * Triggers at the start of a round
   */
  onRoundStart(data) {
    const UI = window.UI;
    
    // Enter landscape full screen on mobile
    this.enterLandscapeImmersive();
    
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
    UI.arenaCombatText.innerText = `Round ${this.round}: Select your card!`;

    // Render cards and trigger draw animation
    UI.renderHand(this.hand, true);
    
    // Update Opponent card indicators
    UI.updateOpponentHandSize(data.opponentStatus.handSize);

    // Sync HUD status bars, active badges, and points immediately
    UI.playerHpVal.innerText = this.myHp;
    UI.playerHpFill.style.width = `${this.myHp}%`;
    UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, this.myShield);
    UI.renderStatuses(UI.playerStatusContainer, this.myStatuses);
    UI.renderPoints(UI.playerPoints, this.myPoints);

    UI.enemyHpVal.innerText = this.opponentHp;
    UI.enemyHpFill.style.width = `${this.opponentHp}%`;
    UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, this.opponentShield);
    UI.renderStatuses(UI.enemyStatusContainer, this.opponentStatuses);
    UI.renderPoints(UI.enemyPoints, this.opponentPoints);
  },

  /**
   * Triggers when a round ends and transitioning to Draft Phase
   */
  onRoundFinished(data) {
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

    // Show round result overlay with animation
    const cardEl = UI.roundResultOverlay.querySelector('.round-result-card');
    Animations.animateOverlayReveal(UI.roundResultOverlay, cardEl);

    // Play round-finished sound
    if (window.AudioSynth) {
      if (isRoundWinner) {
        window.AudioSynth.playVictory();
      } else {
        window.AudioSynth.playDefeat();
      }
    }
  },

  /**
   * Starts the Bonus Pick screen for the loser
   */
  onBonusPickStart(data) {
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
    window.UI.showScreen('waiting');
  },

  /**
   * Lock bonus choice visually
   */
  onBonusPickLocked(cardTemplate) {
    window.UI.bonusCardsFan.querySelectorAll('.card').forEach(c => c.style.pointerEvents = 'none');
  },

  /**
   * Starts pack selection screen
   */
  onPackSelectionStart(data) {
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
   * Triggers when round HP results in Game Over
   */
  onGameOver(data) {
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
  }
};

// Bind to window load
window.addEventListener('DOMContentLoaded', () => {
  window.gameManager = GameManager;
  GameManager.init();
});
