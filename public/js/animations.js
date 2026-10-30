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
   * Animates the physical 3D peel & flip reveal of a card (corner-hinge axis peel)
   * Rather than rotating symmetrically in-place, the card hinges on its bottom-left corner,
   * shifts slightly outward, arcs through 3D space, and slaps flat face-up onto the mat.
   */
  animateCardFlip(cardElement, callback) {
    if (!cardElement) {
      if (callback) callback();
      return;
    }

    try {
      if (window.AudioSynth && typeof window.AudioSynth.playDraw === 'function') {
        window.AudioSynth.playDraw();
      }
    } catch (e) {}

    // Physical corner hinge axis
    cardElement.style.transformOrigin = '0% 100%';
    cardElement.style.backfaceVisibility = 'hidden';
    cardElement.style.zIndex = '60';

    const timeline = anime.timeline({
      complete: () => {
        try {
          cardElement.style.transformOrigin = 'center center';
          cardElement.style.transform = 'none';
          cardElement.style.zIndex = '';
        } catch (e) {}
        if (callback) callback();
      }
    });

    timeline
      .add({
        targets: cardElement,
        translateX: [-16, -30],
        translateY: [0, -14],
        rotateZ: [0, -4],
        rotateY: [180, 245],
        scale: [1, 1.06],
        duration: 180,
        easing: 'easeInQuad'
      })
      .add({
        targets: cardElement,
        translateX: 0,
        translateY: 0,
        rotateZ: 0,
        rotateY: [245, 360],
        scale: 1,
        duration: 260,
        easing: 'easeOutBack'
      });
  },

  /**
   * Animates the card collision / clash vibration
   */
  /**
   * Animates card collision / clash vibration with physical contact.
   * Resolves the visual gap between cards across screen sizes and slot scales,
   * guaranteeing that attacking cards physically reach and strike the target.
   */
  animateClashImpact(cardA, cardB, outcome, playerDamaging, opponentDamaging, onImpact, onComplete) {
    if (!cardA || !cardB) {
      if (onImpact) onImpact();
      if (onComplete) onComplete();
      return;
    }

    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();

    // Scale factors of cards inside their parents (e.g. 0.48-0.55 on mobile, 0.72-1.0 on desktop)
    const scaleA = (cardA.offsetWidth > 0) ? (rectA.width / cardA.offsetWidth) : 1;
    const scaleB = (cardB.offsetWidth > 0) ? (rectB.width / cardB.offsetWidth) : 1;

    // Physical screen gap between Card A (left) and Card B (right)
    const screenGap = Math.max(0, rectB.left - rectA.right);

    // Target translation distances in local coordinates to guarantee physical impact
    const screenHitOverlap = 18;
    const lungeA = (screenGap + screenHitOverlap) / Math.max(0.1, scaleA);
    const lungeB = -(screenGap + screenHitOverlap) / Math.max(0.1, scaleB);
    const mutualLungeA = (screenGap * 0.5 + 12) / Math.max(0.1, scaleA);
    const mutualLungeB = -(screenGap * 0.5 + 12) / Math.max(0.1, scaleB);
    const recoilA = -24 / Math.max(0.1, scaleA);
    const recoilB = 24 / Math.max(0.1, scaleB);

    const timeline = anime.timeline({
      easing: 'easeOutQuad',
      complete: () => {
        try {
          if (cardA) cardA.style.transform = 'none';
          if (cardB) cardB.style.transform = 'none';
        } catch (e) {}
        if (onComplete) onComplete();
      }
    });

    if (playerDamaging && opponentDamaging) {
      // Both collide in the exact middle with heavy impact
      timeline
        .add({
          targets: cardA,
          translateX: mutualLungeA,
          translateY: -10,
          duration: 150,
          easing: 'easeInBack',
          complete: () => {
            if (onImpact) onImpact();
          }
        })
        .add({
          targets: cardB,
          translateX: mutualLungeB,
          translateY: -10,
          duration: 150,
          easing: 'easeInBack'
        }, '-=150')
        .add({
          targets: [cardA, cardB],
          translateX: (el, i) => i === 0 ? mutualLungeA - 10 : mutualLungeB + 10,
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
      // Player card (cardA) lunges right across the gap and directly smacks Opponent card (cardB)
      timeline
        .add({
          targets: cardA,
          translateX: lungeA,
          translateY: -14,
          duration: 160,
          easing: 'easeInBack',
          complete: () => {
            if (onImpact) onImpact();
          }
        })
        .add({
          targets: cardB,
          translateX: recoilB,
          rotate: 5,
          duration: 50,
          easing: 'easeOutQuint'
        }, '-=25')
        .add({
          targets: cardB,
          translateX: [recoilB, -5, 3, 0],
          rotate: 0,
          duration: 160,
          easing: 'linear'
        })
        .add({
          targets: cardA,
          translateX: 0,
          translateY: 0,
          duration: 160,
          easing: 'easeOutBack'
        }, '-=120');
    } else if (opponentDamaging) {
      // Opponent card (cardB) lunges left across the gap and directly smacks Player card (cardA)
      timeline
        .add({
          targets: cardB,
          translateX: lungeB,
          translateY: -14,
          duration: 160,
          easing: 'easeInBack',
          complete: () => {
            if (onImpact) onImpact();
          }
        })
        .add({
          targets: cardA,
          translateX: recoilA,
          rotate: -5,
          duration: 50,
          easing: 'easeOutQuint'
        }, '-=25')
        .add({
          targets: cardA,
          translateX: [recoilA, 5, -3, 0],
          rotate: 0,
          duration: 160,
          easing: 'linear'
        })
        .add({
          targets: cardB,
          translateX: 0,
          translateY: 0,
          duration: 160,
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
   * Animates HP Bar reduction / gain with Fighting Game Ghost Bar and Tier Colors.
   * Uses CSS width percentages for robust, pixel-accurate alignment across all resolutions.
   */
  animateHpReduction(fillElement, textElement, startHp, endHp, maxHp = 100, duration = 400) {
    if (!fillElement) return;

    const container = fillElement.closest('.hp-bar-container');
    const ghostElement = container ? container.querySelector('.hp-bar-ghost') : null;

    const startPct = Math.max(0, Math.min(100, (startHp / maxHp) * 100));
    const endPct = Math.max(0, Math.min(100, (endHp / maxHp) * 100));

    // Update HP Tier styling on fillElement
    const updateTierClass = (hpVal) => {
      const pct = (hpVal / maxHp) * 100;
      fillElement.classList.remove('tier-high', 'tier-mid', 'tier-low');
      if (pct > 50) {
        fillElement.classList.add('tier-high');
      } else if (pct > 25) {
        fillElement.classList.add('tier-mid');
      } else {
        fillElement.classList.add('tier-low');
      }
    };

    updateTierClass(endHp);

    const isDamage = endHp < startHp;
    const isHeal = endHp > startHp;

    if (isDamage && ghostElement) {
      // 1. Damage: Fill immediately drops to endPct. Ghost bar holds at startPct then shrinks smoothly.
      ghostElement.classList.remove('ghost-heal');
      ghostElement.style.transition = 'none';
      ghostElement.style.width = `${startPct}%`;

      // Main fill drops
      fillElement.style.width = `${endPct}%`;

      // Ghost shrinks after brief impact hold (450ms)
      setTimeout(() => {
        ghostElement.style.transition = 'width 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        ghostElement.style.width = `${endPct}%`;
      }, 450);
    } else if (isHeal && ghostElement) {
      // 2. Heal: Ghost instantly extends to healed preview with green color, fill catches up over 350ms
      ghostElement.classList.add('ghost-heal');
      ghostElement.style.transition = 'none';
      ghostElement.style.width = `${endPct}%`;

      fillElement.style.width = `${endPct}%`;

      setTimeout(() => {
        ghostElement.classList.remove('ghost-heal');
        ghostElement.style.width = `${endPct}%`;
      }, 400);
    } else {
      fillElement.style.width = `${endPct}%`;
      if (ghostElement) {
        ghostElement.classList.remove('ghost-heal');
        ghostElement.style.transition = 'none';
        ghostElement.style.width = `${endPct}%`;
      }
    }

    // Numbers animation
    if (textElement) {
      const numObj = { val: startHp };
      anime({
        targets: numObj,
        val: endHp,
        round: 1,
        duration: duration,
        easing: 'easeOutQuad',
        update: () => {
          textElement.innerText = numObj.val;
        }
      });
    }
  },

  /**
   * Animates a floating combat damage popup (HP or Shield)
   */
  animateDamagePopup(container, value, type, delay = 0) {
    if (!value || value === 0 || !container) return;

    const popup = document.createElement('div');

    // 1. Determine type, color class, sign and icon
    let colorClass = 'combat-dmg red';
    let iconHtml = '<i class="fa-solid fa-burst"></i>';
    let sign = '-';

    if (type === 'shield' || type === true) {
      colorClass = 'shield-gain blue';
      iconHtml = '<i class="fa-solid fa-shield-halved"></i>';
      sign = '+';
    } else if (type === 'shield-damage') {
      colorClass = 'shield-dmg blue';
      iconHtml = '<i class="fa-solid fa-shield-halved"></i>';
      sign = '-';
    } else if (type === 'heal') {
      colorClass = 'heal-gain green';
      iconHtml = '<i class="fa-solid fa-heart"></i>';
      sign = '+';
    } else if (type === 'leech') {
      colorClass = 'leech-heal';
      iconHtml = '<i class="fa-solid fa-droplet"></i>';
      sign = '+';
    } else if (type === 'burn') {
      colorClass = 'burn-tick';
      iconHtml = '<i class="fa-solid fa-fire"></i>';
      sign = '-';
    } else if (type === 'poison') {
      colorClass = 'poison-tick';
      iconHtml = '<i class="fa-solid fa-skull-crossbones"></i>';
      sign = '-';
    } else if (type === 'shield-decay') {
      colorClass = 'shield-decay';
      iconHtml = '<i class="fa-solid fa-shield-halved"></i>';
      sign = '-';
    } else if (type === 'self-damage') {
      colorClass = 'self-dmg';
      iconHtml = '<i class="fa-solid fa-heart-crack"></i>';
      sign = '-';
    } else if (type === 'thorns') {
      colorClass = 'thorns-dmg';
      iconHtml = '<i class="fa-solid fa-shield-cat"></i>';
      sign = '-';
    } else {
      colorClass = 'combat-dmg red';
      iconHtml = '<i class="fa-solid fa-burst"></i>';
      sign = '-';
    }

    // 2. Size tiers based on value
    const numericVal = Math.abs(Number(value)) || 0;
    const isDotOrDecay = (type === 'burn' || type === 'poison' || type === 'shield-decay');
    let tier = 'mid';
    if (numericVal < 8 || isDotOrDecay) {
      tier = 'small';
    } else if (numericVal >= 15) {
      tier = 'big';
    }

    // 3. Peak scale based on tier & type
    let peakScale = 1.25;
    if (tier === 'big') {
      peakScale = 1.45;
    } else if (type === 'thorns') {
      peakScale = 1.35;
    } else if (tier === 'small') {
      peakScale = 1.15;
    }

    popup.className = `damage-popup ${colorClass} ${tier}`;
    // Clean numbers only: icon + sign + value (no redundant HP/DMG labels)
    popup.innerHTML = `${iconHtml}<span>${sign}${numericVal}</span>`;

    // 4. Tight jitter around center so numbers don't wander off-card
    const jitterX = Math.random() * 12 - 6; // ±6%
    const jitterY = Math.random() * 8 - 4;   // ±4%
    popup.style.left = `${50 + jitterX}%`;
    popup.style.top = `${45 + jitterY}%`;
    popup.style.transform = 'translate(-50%, -50%) scale(0.3)';
    popup.style.opacity = '0';

    container.appendChild(popup);

    // 5. Target micro-shake for big impacts
    if (tier === 'big') {
      anime({
        targets: container,
        translateX: [
          { value: -4, duration: 35 },
          { value:  4, duration: 35 },
          { value: -2, duration: 35 },
          { value:  2, duration: 35 },
          { value:  0, duration: 40 }
        ],
        delay: delay + 120,
        easing: 'easeInOutQuad'
      });
    }

    // 6. Arced trajectory & 3-phase punch animation
    const riseY = isDotOrDecay ? 28 : -38;
    const arcX = Math.random() * 40 - 20; // slight arc left or right

    anime.timeline({
      delay: delay,
      complete: () => popup.remove()
    })
    // Phase 1: Punch in with overshoot (0 - 130ms)
    .add({
      targets: popup,
      opacity: [0, 1],
      scale: [0.3, peakScale],
      duration: 130,
      easing: 'easeOutBack'
    })
    // Phase 2: Settle to normal scale & arc trajectory (130 - 580ms)
    .add({
      targets: popup,
      scale: 1.0,
      translateX: arcX,
      translateY: riseY,
      duration: 450,
      easing: 'easeOutCubic'
    }, '-=30')
    // Phase 3: Fast vanish (580 - 740ms)
    .add({
      targets: popup,
      opacity: 0,
      translateY: riseY + (isDotOrDecay ? 10 : -14),
      duration: 160,
      easing: 'easeInQuad'
    });
  },

  /**
   * Animates a protective shield absorb visual flash over a card (stationary slot host)
   */
  animateShieldAbsorb(cardEl) {
    if (!cardEl) return;
    
    const slotHost = cardEl.closest('.card-play-slot') || cardEl;

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
      background: rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      font-size: 3.5rem;
      border: 2.5px solid #38bdf8;
      border-radius: 8px;
      opacity: 0;
      z-index: 60;
      pointer-events: none;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.6);
      text-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
    `;
    
    slotHost.appendChild(shieldOverlay);
    
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
   * Displays status actions combining a subtle color wash overlay,
   * a punchy top badge pill, and a border pulse.
   * Overlays are anchored to the stationary card-play-slot so they don't move during card lunges.
   */
  animateCardActionOverlay(cardEl, actionType, text, callback) {
    if (!cardEl) {
      if (callback) callback();
      return;
    }

    // Anchor overlay to the stationary card-play-slot so it stays in place during card movement
    const slotHost = cardEl.closest('.card-play-slot') || cardEl;

    let iconHtml = '<i class="fa-solid fa-bolt"></i>';
    let color = '#ff9f43';
    let tintBg = 'rgba(255, 159, 67, 0.22)';

    if (actionType === 'buff') {
      iconHtml = '<i class="fa-solid fa-arrow-trend-up"></i>';
      color = '#f1c40f';
      tintBg = 'rgba(241, 196, 15, 0.22)';
    } else if (actionType === 'debuff') {
      iconHtml = '<i class="fa-solid fa-arrow-trend-down"></i>';
      color = '#a55eea';
      tintBg = 'rgba(165, 94, 234, 0.25)';
    } else if (actionType === 'heal') {
      iconHtml = '<i class="fa-solid fa-heart"></i>';
      color = '#00ff88';
      tintBg = 'rgba(0, 255, 136, 0.22)';
    } else if (actionType === 'self-damage') {
      iconHtml = '<i class="fa-solid fa-heart-crack"></i>';
      color = '#e040fb';
      tintBg = 'rgba(224, 64, 251, 0.26)';
    } else if (actionType === 'shield-gain') {
      iconHtml = '<i class="fa-solid fa-shield-halved"></i>';
      color = '#38bdf8';
      tintBg = 'rgba(56, 189, 248, 0.24)';
    } else if (actionType === 'cleanse') {
      iconHtml = '<i class="fa-solid fa-droplet"></i>';
      color = '#2ecc71';
      tintBg = 'rgba(46, 204, 113, 0.22)';
    } else if (actionType === 'dispel') {
      iconHtml = '<i class="fa-solid fa-ban"></i>';
      color = '#c084fc';
      tintBg = 'rgba(192, 132, 252, 0.25)';
    } else if (actionType === 'burn') {
      iconHtml = '<i class="fa-solid fa-fire"></i>';
      color = '#ff5722';
      tintBg = 'rgba(255, 87, 34, 0.24)';
    } else if (actionType === 'poison') {
      iconHtml = '<i class="fa-solid fa-skull-crossbones"></i>';
      color = '#2ecc71';
      tintBg = 'rgba(46, 204, 113, 0.24)';
    } else if (actionType === 'weak') {
      iconHtml = '<i class="fa-solid fa-arrow-down"></i>';
      color = '#94a3b8';
      tintBg = 'rgba(148, 163, 184, 0.22)';
    } else if (actionType === 'outbreak') {
      iconHtml = '<i class="fa-solid fa-biohazard"></i>';
      color = '#c084fc';
      tintBg = 'rgba(192, 132, 252, 0.28)';
    } else if (actionType === 'leech') {
      iconHtml = '<i class="fa-solid fa-droplet"></i>';
      color = '#f43f5e';
      tintBg = 'rgba(244, 63, 94, 0.26)';
    } else if (actionType === 'thorns') {
      iconHtml = '<i class="fa-solid fa-shield-cat"></i>';
      color = '#fbbf24';
      tintBg = 'rgba(251, 191, 36, 0.25)';
    }

    // 1. Create thin tint wash overlay inside stationary slot
    const tintEl = document.createElement('div');
    tintEl.className = 'card-action-tint';
    tintEl.style.backgroundColor = tintBg;
    slotHost.appendChild(tintEl);

    // 2. Create compact top badge pill inside stationary slot
    const badge = document.createElement('div');
    badge.className = `card-action-badge ${actionType}`;
    badge.style.color = color;
    badge.innerHTML = `${iconHtml} <span>${text}</span>`;
    slotHost.appendChild(badge);

    // 3. Border pulse on card
    const originalBorder = cardEl.style.borderColor;
    const originalShadow = cardEl.style.boxShadow;
    cardEl.style.borderColor = color;
    cardEl.style.boxShadow = `0 0 0 2px ${color}`;

    // 4. Animate both tint and badge
    anime({
      targets: tintEl,
      opacity: [0, 1, 1, 0],
      duration: 650,
      easing: 'easeInOutQuad',
      complete: () => tintEl.remove()
    });

    anime.timeline({
      complete: () => {
        badge.remove();
        cardEl.style.borderColor = originalBorder;
        cardEl.style.boxShadow = originalShadow;
        if (callback) callback();
      }
    })
    .add({
      targets: badge,
      scale: [0.4, 1.05],
      opacity: [0, 1],
      duration: 160,
      easing: 'easeOutBack'
    })
    .add({
      targets: badge,
      scale: 1.0,
      duration: 380,
      easing: 'linear'
    })
    .add({
      targets: badge,
      opacity: 0,
      translateY: -8,
      duration: 160,
      easing: 'easeInQuad'
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
    if (typeof anime === 'undefined') return;
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
  },

  /**
   * Animates Phoenix Heart resurrection: glorious card rising & golden revival glow (no ring overlay)
   */
  animatePhoenixRevive(cardEl, callback) {
    if (!cardEl) {
      if (callback) callback();
      return;
    }

    cardEl.classList.add('phoenix-revive-glow');

    anime({
      targets: cardEl,
      scale: [
        { value: 0.92, duration: 120, easing: 'easeInOutQuad' },
        { value: 1.08, duration: 280, easing: 'easeOutBack' },
        { value: 1.0, duration: 250, easing: 'easeOutQuad' }
      ],
      complete: () => {
        setTimeout(() => {
          cardEl.classList.remove('phoenix-revive-glow');
        }, 400);
        if (callback) callback();
      }
    });
  },

  /**
   * Animates Cleanse Sweep: upward light sweep starting from bottom of stationary slot and rising over card
   */
  animateCleanseSweep(cardEl, callback) {
    if (!cardEl) {
      if (callback) callback();
      return;
    }

    const slotHost = cardEl.closest('.card-play-slot') || cardEl;
    const sweep = document.createElement('div');
    sweep.className = 'cleanse-sweep-overlay';
    slotHost.appendChild(sweep);

    anime({
      targets: sweep,
      translateY: ['100%', '-100%'],
      opacity: [0.2, 1, 0],
      duration: 550,
      easing: 'easeOutCubic',
      complete: () => {
        sweep.remove();
        if (callback) callback();
      }
    });
  },

  /**
   * Animates Dispel Strip: downward purple/violet strip stripping away buffs inside stationary slot
   */
  animateDispelStrip(cardEl, callback) {
    if (!cardEl) {
      if (callback) callback();
      return;
    }

    const slotHost = cardEl.closest('.card-play-slot') || cardEl;
    const sweep = document.createElement('div');
    sweep.className = 'dispel-sweep-overlay';
    slotHost.appendChild(sweep);

    anime({
      targets: sweep,
      translateY: ['-100%', '100%'],
      opacity: [0.2, 1, 0],
      duration: 550,
      easing: 'easeOutCubic',
      complete: () => {
        sweep.remove();
        if (callback) callback();
      }
    });
  }
};

// Expose globally
window.Animations = Animations;
