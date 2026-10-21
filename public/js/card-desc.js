/**
 * ELEMENT CLASH: CARD DESCRIPTION & AUTOSCROLL SYSTEM
 */

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

// Expose globally
window.scrollToActiveOutcome = scrollToActiveOutcome;
window.startCardDescAutoscroll = startCardDescAutoscroll;
window.stopCardDescAutoscroll = stopCardDescAutoscroll;
