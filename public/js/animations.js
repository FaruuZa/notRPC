/**
 * ELEMENT CLASH: ANIME.JS VISUAL ANIMATIONS
 */

const Animations = {
  /**
   * Animates drawn cards sliding up from bottom into hand stably
   */
  animateCardDraw(cardElements, callback) {
    // Set initial positions offscreen without touching 'transform'
    cardElements.forEach(card => {
      card.style.opacity = 0;
      card.style.bottom = '-30px';
    });

    anime({
      targets: cardElements,
      opacity: [0, 1],
      bottom: ['-30px', '0px'],
      delay: anime.stagger(90),
      duration: 450,
      easing: 'easeOutCubic',
      complete: () => {
        // Clear inline bottom/opacity styles so CSS fanning and hover takes over
        cardElements.forEach(card => {
          card.style.bottom = '';
          card.style.opacity = '';
        });
        if (callback) callback();
      }
    });
  },

  /**
   * Animates a card flying from its position in the hand to the arena slot.
   * Uses a clone to avoid messing with CSS-positioned absolute hand cards.
   */
  animateCardToSlot(cardElement, slotElement, callback) {
    const cardRect = cardElement.getBoundingClientRect();
    const slotRect = slotElement.getBoundingClientRect();

    if (cardRect.width === 0 || slotRect.width === 0) {
      // Fallback: slot/card not visible, just call callback
      if (callback) callback();
      return;
    }

    // Calculate difference vector from card center to slot center
    const deltaX = (slotRect.left + slotRect.width / 2) - (cardRect.left + cardRect.width / 2);
    const deltaY = (slotRect.top + slotRect.height / 2) - (cardRect.top + cardRect.height / 2);
    const scaleX = slotRect.width / cardRect.width;
    const scaleY = slotRect.height / cardRect.height;
    const scaleVal = Math.min(scaleX, scaleY);

    // Temporarily disable CSS transitions & set high z-index
    cardElement.style.transition = 'none';
    cardElement.style.zIndex = '50';

    // Reset any CSS-set transform to a known state before animating
    cardElement.style.transform = 'translate(-50%, 0px) rotate(0deg)';

    anime({
      targets: cardElement,
      translateX: deltaX,
      translateY: deltaY,
      rotate: 0,
      scale: scaleVal,
      duration: 300,
      easing: 'easeOutQuint',
      complete: () => {
        cardElement.style.transition = '';
        if (callback) callback();
      }
    });
  },

  /**
   * Animates the opponent card sliding into its arena slot face down.
   * The card starts face-down (rotateY:180deg) and stays face-down
   * until animateCardFlip is called.
   */
  animateOpponentCardArrival(cardElement, callback) {
    // Start the card above, invisible
    cardElement.style.opacity = '0';

    anime({
      targets: cardElement,
      translateY: ['-160px', '0px'],
      rotateY: [180, 180],   // Keep at 180deg (face-down) throughout arrival
      opacity: [0, 1],
      scale: [0.85, 1],
      duration: 350,
      easing: 'easeOutCubic',
      complete: () => {
        // Ensure the card remains face-down for the flip animation
        // We directly set the transform so anime has a clean starting state
        cardElement.style.transform = 'rotateY(180deg)';
        if (callback) callback();
      }
    });
  },

  /**
   * Animates the 3D flip reveal of a card (from face-down to face-up)
   */
  animateCardFlip(cardElement, callback) {
    anime({
      targets: cardElement,
      rotateY: [180, 360],
      duration: 400,
      easing: 'easeInOutQuad',
      complete: () => {
        cardElement.style.transform = 'rotateY(0deg)';
        if (callback) callback();
      }
    });
  },

  /**
   * Animates the card collision / clash vibration
   */
  animateClashImpact(cardA, cardB, outcome, playerDamaging, opponentDamaging, onImpact, onComplete) {
    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();
    const distanceX = rectB.left - rectA.left;

    const timeline = anime.timeline({
      easing: 'easeOutQuad',
      complete: () => {
        cardA.style.transform = 'none';
        cardB.style.transform = 'none';
        if (onComplete) onComplete();
      }
    });

    if (playerDamaging && opponentDamaging) {
      // Both collide in the middle
      timeline
        .add({
          targets: cardA,
          translateX: distanceX * 0.28,
          translateY: -10,
          duration: 150,
          easing: 'easeInBack',
          complete: () => {
            if (onImpact) onImpact();
          }
        })
        .add({
          targets: cardB,
          translateX: -distanceX * 0.28,
          translateY: -10,
          duration: 150,
          easing: 'easeInBack'
        }, '-=150')
        .add({
          targets: [cardA, cardB],
          translateX: (el, i) => i === 0 ? distanceX * 0.28 - 10 : -distanceX * 0.28 + 10,
          duration: 50,
          easing: 'easeOutQuint'
        })
        .add({
          targets: [cardA, cardB],
          translateX: 0,
          translateY: 0,
          duration: 150,
          easing: 'easeOutBack'
        });
    } else if (playerDamaging) {
      // Player card (cardA) lunges right and hits Opponent card (cardB)
      timeline
        .add({
          targets: cardA,
          translateX: distanceX * 0.55,
          translateY: -15,
          duration: 150,
          easing: 'easeInBack',
          complete: () => {
            if (onImpact) onImpact();
          }
        })
        .add({
          targets: cardB,
          translateX: 20,
          rotate: 4,
          duration: 50,
          easing: 'easeOutQuint'
        }, '-=25')
        .add({
          targets: cardB,
          translateX: [20, -5, 3, 0],
          rotate: 0,
          duration: 150,
          easing: 'linear'
        })
        .add({
          targets: cardA,
          translateX: 0,
          translateY: 0,
          duration: 150,
          easing: 'easeOutBack'
        }, '-=120');
    } else if (opponentDamaging) {
      // Opponent card (cardB) lunges left and hits Player card (cardA)
      timeline
        .add({
          targets: cardB,
          translateX: -distanceX * 0.55,
          translateY: -15,
          duration: 150,
          easing: 'easeInBack',
          complete: () => {
            if (onImpact) onImpact();
          }
        })
        .add({
          targets: cardA,
          translateX: -20,
          rotate: -4,
          duration: 50,
          easing: 'easeOutQuint'
        }, '-=25')
        .add({
          targets: cardA,
          translateX: [-20, 5, -3, 0],
          rotate: 0,
          duration: 150,
          easing: 'linear'
        })
        .add({
          targets: cardB,
          translateX: 0,
          translateY: 0,
          duration: 150,
          easing: 'easeOutBack'
        }, '-=120');
    } else {
      // Neither damages. Stationary.
      timeline
        .add({
          targets: {},
          duration: 150,
          complete: () => {
            if (onImpact) onImpact();
          }
        });
    }
  },

  /**
   * Animates HP Bar reduction
   */
  animateHpReduction(fillElement, textElement, startHp, endHp, maxHp = 100, duration = 400) {
    const obj = { hp: startHp };
    
    anime({
      targets: obj,
      hp: endHp,
      round: 1,
      duration: duration,
      easing: 'easeOutQuad',
      update: () => {
        textElement.innerText = obj.hp;
        fillElement.style.width = `${Math.max(0, (obj.hp / maxHp) * 100)}%`;
      }
    });
  },

  /**
   * Animates a floating combat damage popup (HP or Shield)
   */
  animateDamagePopup(container, value, type) {
    if (!value || value === 0) return;
    
    const popup = document.createElement('div');
    let colorClass = 'red';
    let text = `-${value} HP`;

    if (type === 'shield' || type === true) {
      colorClass = 'blue';
      text = `<i class="fa-solid fa-shield-halved"></i> +${value} SHIELD`;
    } else if (type === 'shield-damage') {
      colorClass = 'blue';
      text = `<i class="fa-solid fa-shield-halved"></i> -${value} SHIELD`;
    } else if (type === 'heal') {
      colorClass = 'green';
      text = `<i class="fa-solid fa-heart"></i> +${value} HP`;
    } else if (type === 'burn') {
      colorClass = 'burn-tick';
      text = `<i class="fa-solid fa-fire"></i> -${value} BURN`;
    } else if (type === 'poison') {
      colorClass = 'poison-tick';
      text = `<i class="fa-solid fa-skull-crossbones"></i> -${value} POISON`;
    } else if (type === 'shield-decay') {
      colorClass = 'shield-decay';
      text = `<i class="fa-solid fa-shield-halved"></i> -${value} DECAY`;
    } else if (type === 'self-damage') {
      colorClass = 'self-dmg';
      text = `<i class="fa-solid fa-heart-crack"></i> -${value} SELF`;
    } else {
      colorClass = 'red';
      text = `-${value} HP`;
    }

    popup.className = `damage-popup ${colorClass}`;
    popup.innerHTML = text;
    
    popup.style.left = `${50 + (Math.random() * 30 - 15)}%`;
    popup.style.top = `${40 + (Math.random() * 15 - 7.5)}%`;
    popup.style.transform = 'translate(-50%, -50%) scale(0.6)';
    popup.style.opacity = '0';
    
    container.appendChild(popup);

    const isDotOrDecay = (type === 'burn' || type === 'poison' || type === 'shield-decay');
    const targetY = isDotOrDecay ? 60 : -60;

    anime({
      targets: popup,
      translateY: [0, targetY],
      scale: [0.6, 1.1, 1],
      opacity: [0, 1, 1, 0],
      duration: 600,
      easing: 'easeOutQuad',
      complete: () => {
        popup.remove();
      }
    });
  },

  /**
   * Animates a protective shield absorb visual flash over a card
   */
  animateShieldAbsorb(cardEl) {
    if (!cardEl) return;
    
    // Create shield overlay element
    const shieldOverlay = document.createElement('div');
    shieldOverlay.className = 'shield-absorb-overlay';
    shieldOverlay.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
    
    // Apply styling to overlay
    shieldOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(77, 171, 247, 0.25);
      color: #4dabf7;
      font-size: 3.5rem;
      border: 3px solid #4dabf7;
      border-radius: 4px;
      opacity: 0;
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 0 20px rgba(77, 171, 247, 0.6);
      text-shadow: 0 0 10px rgba(77, 171, 247, 0.8);
    `;
    
    cardEl.appendChild(shieldOverlay);
    
    // Animate opacity and scale
    anime({
      targets: shieldOverlay,
      opacity: [0, 1, 1, 0],
      scale: [0.7, 1.1, 1],
      duration: 500,
      easing: 'easeOutBack',
      complete: () => {
        shieldOverlay.remove();
      }
    });
  },

  /**
   * Animates a floating overlay over a card to signify actions like buffing, debuffing, healing, self damage
   */
  animateCardActionOverlay(cardEl, actionType, text, callback) {
    if (!cardEl) {
      if (callback) callback();
      return;
    }

    // Create action overlay element
    const overlay = document.createElement('div');
    overlay.className = `card-action-overlay ${actionType}`;

    let iconHtml = '';
    let color = '';
    let border = '';
    let bg = '';
    let glow = '';

    if (actionType === 'buff') {
      iconHtml = '<i class="fa-solid fa-bolt"></i>';
      color = '#ff9f43';
      border = '3px solid #ff9f43';
      bg = 'rgba(255, 159, 67, 0.28)';
      glow = '0 0 20px rgba(255, 159, 67, 0.6)';
    } else if (actionType === 'debuff') {
      iconHtml = '<i class="fa-solid fa-arrow-down-long"></i>';
      color = '#a55eea';
      border = '3px solid #a55eea';
      bg = 'rgba(165, 94, 234, 0.28)';
      glow = '0 0 20px rgba(165, 94, 234, 0.6)';
    } else if (actionType === 'heal') {
      iconHtml = '<i class="fa-solid fa-heart"></i>';
      color = '#2ed573';
      border = '3px solid #2ed573';
      bg = 'rgba(46, 213, 115, 0.28)';
      glow = '0 0 20px rgba(46, 213, 115, 0.6)';
    } else if (actionType === 'self-damage') {
      iconHtml = '<i class="fa-solid fa-heart-crack"></i>';
      color = '#ff4757';
      border = '3px solid #ff4757';
      bg = 'rgba(255, 71, 87, 0.28)';
      glow = '0 0 20px rgba(255, 71, 87, 0.6)';
    } else if (actionType === 'shield-gain') {
      iconHtml = '<i class="fa-solid fa-shield-halved"></i>';
      color = '#4dabf7';
      border = '3px solid #4dabf7';
      bg = 'rgba(77, 171, 247, 0.28)';
      glow = '0 0 20px rgba(77, 171, 247, 0.6)';
    } else if (actionType === 'cleanse') {
      iconHtml = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
      color = '#f1f2f6';
      border = '3px solid #f1f2f6';
      bg = 'rgba(241, 242, 246, 0.28)';
      glow = '0 0 20px rgba(241, 242, 246, 0.6)';
    } else if (actionType === 'dispel') {
      iconHtml = '<i class="fa-solid fa-bolt-slash"></i>';
      color = '#ff9f43';
      border = '3px solid #ff9f43';
      bg = 'rgba(255, 159, 67, 0.28)';
      glow = '0 0 20px rgba(255, 159, 67, 0.6)';
    } else if (actionType === 'burn') {
      iconHtml = '<i class="fa-solid fa-fire"></i>';
      color = '#ff4d4d';
      border = '3px solid #ff4d4d';
      bg = 'rgba(255, 77, 77, 0.28)';
      glow = '0 0 20px rgba(255, 77, 77, 0.6)';
    } else if (actionType === 'poison') {
      iconHtml = '<i class="fa-solid fa-skull-crossbones"></i>';
      color = '#2ecc71';
      border = '3px solid #2ecc71';
      bg = 'rgba(46, 204, 113, 0.28)';
      glow = '0 0 20px rgba(46, 204, 113, 0.6)';
    } else if (actionType === 'weak') {
      iconHtml = '<i class="fa-solid fa-shield-halved" style="transform: rotate(180deg);"></i>';
      color = '#7f8c8d';
      border = '3px solid #7f8c8d';
      bg = 'rgba(127, 140, 141, 0.28)';
      glow = '0 0 20px rgba(127, 140, 141, 0.6)';
    }

    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      background: ${bg};
      color: ${color};
      border: ${border};
      border-radius: 4px;
      opacity: 0;
      z-index: 10;
      pointer-events: none;
      box-shadow: ${glow};
      text-shadow: 0 0 10px ${color};
    `;

    const iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '2.4rem';
    iconSpan.innerHTML = iconHtml;

    const textSpan = document.createElement('span');
    textSpan.style.fontFamily = 'var(--font-title)';
    textSpan.style.fontSize = '0.82rem';
    textSpan.style.fontWeight = '850';
    textSpan.style.letterSpacing = '1px';
    textSpan.style.textTransform = 'uppercase';
    textSpan.innerText = text;

    overlay.appendChild(iconSpan);
    overlay.appendChild(textSpan);
    cardEl.appendChild(overlay);

    anime({
      targets: overlay,
      opacity: [0, 1, 1, 0],
      scale: [0.75, 1.05, 1],
      duration: 400,
      easing: 'easeOutBack',
      complete: () => {
        overlay.remove();
        if (callback) callback();
      }
    });
  },

  /**
   * Animates a fade and scale reveal of a modal overlay
   */
  animateOverlayReveal(overlayElement, cardElement, callback) {
    overlayElement.style.display = 'flex';
    overlayElement.style.opacity = '0';
    cardElement.style.transform = 'scale(0.8)';
    
    anime({
      targets: overlayElement,
      opacity: 1,
      duration: 350,
      easing: 'linear'
    });

    anime({
      targets: cardElement,
      scale: [0.8, 1],
      duration: 500,
      easing: 'easeOutElastic(1, 0.85)',
      complete: () => {
        if (callback) callback();
      }
    });
  },

  /**
   * Floating logo hover effects
   */
  animateLogoPulse() {
    anime({
      targets: '.animate-logo',
      translateY: [-1, 1],
      duration: 4000,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine'
    });
  },

  /**
   * Animates a card pack shaking, scaling up, and then bursting open.
   */
  animatePackOpening(packElement, onBurst, callback) {
    packElement.classList.add('pack-bursting');
    
    if (window.AudioSynth) {
      window.AudioSynth.playLock();
      // Retro synthesizer arpeggio for booster opening
      setTimeout(() => {
        window.AudioSynth.playMatchFound();
      }, 200);
    }
    
    setTimeout(() => {
      if (onBurst) onBurst();
      if (callback) callback();
    }, 600);
  },

  /**
   * Animates fanned cards revealing sequentially
   */
  animateFannedCardsReveal(cardElements, callback) {
    cardElements.forEach(card => {
      card.style.opacity = '0';
    });

    anime({
      targets: cardElements,
      opacity: [0, 1],
      scale: [0.8, 1],
      delay: anime.stagger(150),
      duration: 500,
      easing: 'easeOutBack',
      complete: () => {
        cardElements.forEach(card => {
          card.style.transform = '';
        });
        if (callback) callback();
      }
    });
  },

  /**
   * Animates cards sliding to deck (shrinking and fading)
   */
  animateCardsAcquisition(cardElements, callback) {
    anime({
      targets: cardElements,
      scale: 0.1,
      opacity: 0,
      translateY: 200,
      delay: anime.stagger(80),
      duration: 500,
      easing: 'easeInBack',
      complete: () => {
        if (callback) callback();
      }
    });
  },

  /**
   * Shakes the HUD panel when taking damage (e.g. burn/poison tick or attack damage)
   */
  animateHudDamageShake(hudEl) {
    if (!hudEl) return;
    anime({
      targets: hudEl,
      translateX: [0, -6, 6, -4, 4, -2, 2, 0],
      duration: 350,
      easing: 'easeInOutSine'
    });
  },

  /**
   * Triggers a temporary flash overlay/background effect on HUD for Burn damage
   */
  triggerBurnFlash(hudEl) {
    if (!hudEl) return;
    hudEl.classList.remove('burn-flash');
    void hudEl.offsetWidth; // force reflow
    hudEl.classList.add('burn-flash');
    setTimeout(() => {
      hudEl.classList.remove('burn-flash');
    }, 500);
  },

  /**
   * Triggers a temporary flash overlay/background effect on HUD for Poison damage
   */
  triggerPoisonFlash(hudEl) {
    if (!hudEl) return;
    hudEl.classList.remove('poison-flash');
    void hudEl.offsetWidth; // force reflow
    hudEl.classList.add('poison-flash');
    setTimeout(() => {
      hudEl.classList.remove('poison-flash');
    }, 500);
  }
};

// Expose globally
window.Animations = Animations;
