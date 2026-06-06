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
  animateHpReduction(fillElement, textElement, startHp, endHp, duration = 400) {
    const obj = { hp: startHp };
    
    anime({
      targets: obj,
      hp: endHp,
      round: 1,
      duration: duration,
      easing: 'easeOutQuad',
      update: () => {
        textElement.innerText = obj.hp;
        fillElement.style.width = `${Math.max(0, obj.hp)}%`;
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

    const isDot = (type === 'burn' || type === 'poison');
    const targetY = isDot ? 60 : -60;

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
  }
};

// Expose globally
window.Animations = Animations;
