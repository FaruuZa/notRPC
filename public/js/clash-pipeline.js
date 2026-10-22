/**
 * ELEMENT CLASH: VISUAL CLASH PIPELINE
 * Coordinates the sequential animation visual pipeline.
 */

const ClashPipeline = {
  _aborted: false,

  /**
   * Instantly fast-forwards and cancels any running animations and delays
   */
  fastForward(gm) {
    this._aborted = true;
    if (window.anime) {
      try {
        anime.remove('*');
      } catch (e) {}
    }
    document.querySelectorAll('.floating-combat-text, .damage-popup, .relic-combat-toast, body > .card').forEach(el => el.remove());

    if (window.UI) {
      window.UI.clearArenaSlots();
      if (window.UI.arenaCombatText) window.UI.arenaCombatText.innerText = '';
    }

    const handWrapper = document.querySelector('.hand-container-wrapper');
    if (handWrapper) handWrapper.classList.remove('clash-dimmed');

    if (gm) {
      gm.isVisualPipelineRunning = false;
      gm.currentRoundReveal = null;
      gm.currentRoundResult = null;
    }
  },

  /**
   * Runs the sequential clash visual pipeline
   * @param {Object} gm The GameManager instance
   * @param {Object} reveal Round card reveal payload
   * @param {Object} result Clash calculation result payload
   */
  async run(gm, reveal, result) {
    // Await any active local card lock flight animation to prevent race conditions
    if (window.cardFlightPromise) {
      await window.cardFlightPromise;
    }

    const UI = window.UI;
    const Animations = window.Animations;

    // Set state running
    this._aborted = false;
    gm.isVisualPipelineRunning = true;

    // Dim player hand during active clash sequence so cards remain legible but non-distracting
    const handWrapper = document.querySelector('.hand-container-wrapper');
    if (handWrapper) handWrapper.classList.add('clash-dimmed');

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
      if (!gm.pendingRelicTriggers || gm.pendingRelicTriggers.length === 0) return [];
      const matched = [];
      const remaining = [];
      for (const t of gm.pendingRelicTriggers) {
        if (predicate(t)) matched.push(t);
        else remaining.push(t);
      }
      gm.pendingRelicTriggers = remaining;
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
          gm.myStatuses.burn = 0;
          gm.myStatuses.poison = 0;
          gm.myStatuses.weakness = 0;
          UI.renderStatuses(UI.playerStatusContainer, gm.myStatuses);
          resolve();
        });
      }));
    }

    if (opponentCard && p2Effect && p2Effect.applyStatus?.self?.cleanse > 0) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateCleanseSweep(opponentCard);
        Animations.animateCardActionOverlay(opponentCard, 'cleanse', 'CLEANSED', () => {
          gm.opponentStatuses.burn = 0;
          gm.opponentStatuses.poison = 0;
          gm.opponentStatuses.weakness = 0;
          UI.renderStatuses(UI.enemyStatusContainer, gm.opponentStatuses);
          resolve();
        });
      }));
    }

    // 1.2 Heal Gain
    const startHpSelf = gm.myHp;
    const startHpOpp = gm.opponentHp;
    const healedHpSelf = Math.min(gm.myMaxHp, startHpSelf + (result.healGain || 0));
    const healedHpOpp = Math.min(gm.opponentMaxHp, startHpOpp + (result.opponentHealGain || 0));

    if (result.healGain > 0 && playerCard) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.playerPlaySlot, result.healGain, 'heal');
        Animations.animateCardActionOverlay(playerCard, 'heal', `+${result.healGain} HEAL`);
        Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, startHpSelf, healedHpSelf, gm.myMaxHp);
        gm.myHp = healedHpSelf;
        setTimeout(resolve, 350);
      }));
    }

    if (result.opponentHealGain > 0 && opponentCard) {
      phase1Promises.push(new Promise(resolve => {
        Animations.animateDamagePopup(UI.enemyPlaySlot, result.opponentHealGain, 'heal');
        Animations.animateCardActionOverlay(opponentCard, 'heal', `+${result.opponentHealGain} HEAL`);
        Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, startHpOpp, healedHpOpp, gm.opponentMaxHp);
        gm.opponentHp = healedHpOpp;
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
            gm.myShield += result.shieldGain;
            UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, gm.myShield);
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
            gm.opponentShield += result.opponentShieldGain;
            UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, gm.opponentShield);
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
        const onDamageRelics = drainRelicTriggers(t => ['Purifying Amulet', 'Briar Armor', 'Leech', 'Thorn', 'Venomheart Briar'].includes(t.relicName));
        for (const trig of onDamageRelics) {
          const isMe = (trig.playerId && trig.playerId === gm.myId);
          if (UI.showRelicCombatToast) {
            UI.showRelicCombatToast(isMe, trig.relicName, trig.message);
          }
          if (trig.relicName === 'Purifying Amulet') {
            const targetCard = isMe ? playerCard : opponentCard;
            const targetContainer = isMe ? UI.playerStatusContainer : UI.enemyStatusContainer;
            const targetStatuses = isMe ? gm.myStatuses : gm.opponentStatuses;
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

        const currentHpSelf = Math.min(gm.myMaxHp, gm.myHp + (result.leechHeal || 0));
        const currentHpOpp = Math.min(gm.opponentMaxHp, gm.opponentHp + (result.opponentLeechHeal || 0));

        Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, currentHpSelf, clashEndHp, gm.myMaxHp);
        Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, currentHpOpp, clashEndHpOpponent, gm.opponentMaxHp);

        // Update shields post clash (pre-tick) dynamically in HUD
        gm.myShield = Math.max(0, gm.myShield - result.shieldDamage);
        gm.opponentShield = Math.max(0, gm.opponentShield - result.opponentShieldDamage);
        UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, gm.myShield);
        UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, gm.opponentShield);

        // Deduct opponent hand dot
        const currentDots = UI.enemyCardDots.querySelectorAll('span');
        if (currentDots.length > 0) {
          currentDots[0].remove();
        }

        gm.myHp = clashEndHp;
        gm.opponentHp = clashEndHpOpponent;
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
            gm.myShield = Math.max(0, gm.myShield - p1BurnShieldDmg);
            UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, gm.myShield);
          }, 150);
        }
        gm.myStatuses.burn = 0;
        UI.renderStatuses(UI.playerStatusContainer, gm.myStatuses);
        resolve();
      }));
    }
    if (p1Poison > 0) {
      dotPromises.push(new Promise(resolve => {
        setTimeout(() => {
          Animations.animateDamagePopup(playerHudEl, p1Poison, 'poison');
          Animations.triggerPoisonFlash(playerHudEl);
          Animations.animateHudDamageShake(playerHudEl);
          gm.myStatuses.poison = Math.max(0, gm.myStatuses.poison - 1);
          UI.renderStatuses(UI.playerStatusContainer, gm.myStatuses);
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
            gm.opponentShield = Math.max(0, gm.opponentShield - p2BurnShieldDmg);
            UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, gm.opponentShield);
          }, 150);
        }
        gm.opponentStatuses.burn = 0;
        UI.renderStatuses(UI.enemyStatusContainer, gm.opponentStatuses);
        resolve();
      }));
    }
    if (p2Poison > 0) {
      dotPromises.push(new Promise(resolve => {
        setTimeout(() => {
          Animations.animateDamagePopup(enemyHudEl, p2Poison, 'poison');
          Animations.triggerPoisonFlash(enemyHudEl);
          Animations.animateHudDamageShake(enemyHudEl);
          gm.opponentStatuses.poison = Math.max(0, gm.opponentStatuses.poison - 1);
          UI.renderStatuses(UI.enemyStatusContainer, gm.opponentStatuses);
          resolve();
        }, p2Burn > 0 ? 150 : 0);
      }));
    }

    if (p1BurnHpDmg > 0 || p1Poison > 0) {
      Animations.animateHpReduction(UI.playerHpFill, UI.playerHpVal, gm.myHp, result.newHp, gm.myMaxHp);
    }
    if (p2BurnHpDmg > 0 || p2Poison > 0) {
      Animations.animateHpReduction(UI.enemyHpFill, UI.enemyHpVal, gm.opponentHp, result.opponentNewHp, gm.opponentMaxHp);
    }

    gm.myHp = result.newHp;
    gm.opponentHp = result.opponentNewHp;
    gm.myShield = result.newShield;
    gm.opponentShield = result.opponentNewShield;
    UI.updateShield(UI.playerShieldBox, UI.playerShieldVal, gm.myShield);
    UI.updateShield(UI.enemyShieldBox, UI.enemyShieldVal, gm.opponentShield);

    if (result.activeQuest !== undefined) {
      gm.activeQuest = result.activeQuest;
      UI.updateQuestTracker(gm.activeQuest);
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
        const isMe = (ptrig.playerId && ptrig.playerId === gm.myId);
        const cardTarget = isMe ? playerCard : opponentCard;
        const hudSlot = isMe ? UI.playerPlaySlot : UI.enemyPlaySlot;
        const fillEl = isMe ? UI.playerHpFill : UI.enemyHpFill;
        const textEl = isMe ? UI.playerHpVal : UI.enemyHpVal;
        const maxHp = isMe ? gm.myMaxHp : gm.opponentMaxHp;

        if (UI.showRelicCombatToast) {
          UI.showRelicCombatToast(isMe, 'Phoenix Heart', ptrig.message);
        }

        phoenixPromises.push(new Promise(res => {
          Animations.animatePhoenixRevive(cardTarget);
          Animations.animateDamagePopup(hudSlot, 30, 'heal');
          Animations.animateHpReduction(fillEl, textEl, 0, 30, maxHp, 500);
          if (isMe) gm.myHp = 30;
          else gm.opponentHp = 30;
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
            gm.opponentStatuses.attackBuff = 0;
            gm.opponentStatuses.leech = 0;
            UI.renderStatuses(UI.enemyStatusContainer, gm.opponentStatuses);
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
            gm.myStatuses.attackBuff = 0;
            gm.myStatuses.leech = 0;
            UI.renderStatuses(UI.playerStatusContainer, gm.myStatuses);
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
      if (selfStat.outbreak) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'outbreak', 'POISON SELF x2!', resolve);
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
      if (selfStat2.outbreak) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'outbreak', 'POISON SELF x2!', resolve);
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

    // 3.4 Statuses Inflicted on Both
    if (p1Effect?.applyStatus?.both?.outbreak) {
      if (playerCard) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'outbreak', 'POISON x2!', resolve);
        }));
      }
      if (opponentCard) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'outbreak', 'POISON x2!', resolve);
        }));
      }
    }
    if (p2Effect?.applyStatus?.both?.outbreak) {
      if (playerCard) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(playerCard, 'outbreak', 'POISON x2!', resolve);
        }));
      }
      if (opponentCard) {
        phase3Promises.push(new Promise(resolve => {
          Animations.animateCardActionOverlay(opponentCard, 'outbreak', 'POISON x2!', resolve);
        }));
      }
    }

    // Process any remaining relic toasts (e.g. Ember Spark, Venomous Brambles, Last Stand)
    const remainingRelics = drainRelicTriggers(() => true);
    for (const trig of remainingRelics) {
      const isMe = (trig.playerId && trig.playerId === gm.myId);
      if (UI.showRelicCombatToast) {
        UI.showRelicCombatToast(isMe, trig.relicName, trig.message);
      }
    }

    if (phase3Promises.length > 0) {
      await Promise.all(phase3Promises);
      // Synchronize HUD statuses after phase 3 applications
      gm.myStatuses = { ...(result.newStatuses || {}) };
      gm.opponentStatuses = { ...(result.opponentNewStatuses || {}) };
      UI.renderStatuses(UI.playerStatusContainer, gm.myStatuses);
      UI.renderStatuses(UI.enemyStatusContainer, gm.opponentStatuses);
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

    gm.myShield = result.finalShield !== undefined ? result.finalShield : result.newShield;
    gm.opponentShield = result.opponentFinalShield !== undefined ? result.opponentFinalShield : result.opponentNewShield;
    gm.myStatuses = result.newStatuses || {};
    gm.opponentStatuses = result.opponentNewStatuses || {};

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
      const wasAborted = this._aborted;
      this._aborted = false;
      gm.isVisualPipelineRunning = false;
      const handWrapper = document.querySelector('.hand-container-wrapper');
      if (handWrapper) handWrapper.classList.remove('clash-dimmed');
      gm.checkAndTriggerEndPhase();
      if (!wasAborted && window.SocketService && window.SocketService.clashFinished) {
        window.SocketService.clashFinished();
      }
    }
  }
};

// Expose globally
window.ClashPipeline = ClashPipeline;
