/**
 * ELEMENT CLASH: HAND GESTURES
 *
 * Handles every pointer interaction on the player's hand:
 *   - tap            -> select card (tap selected card / double-tap -> play it)
 *   - drag onto slot -> play card
 *   - drag inside the hand -> reorder cards (client-side only)
 *
 * Design notes (why this is robust on mobile):
 *   - ONE delegated listener set on the hand container, not per-card closures.
 *     Re-rendering the hand can never orphan or duplicate listeners.
 *   - Pointer capture is taken on the (stable) container, not on a card that
 *     may be re-ordered/re-parented while dragging.
 *   - All geometry (slot rect, card slot centres) is measured ONCE when the
 *     drag starts, so CSS hover/snap transforms can't create feedback loops.
 *   - The floating card uses the card's *layout* size + CSS scale, so it looks
 *     identical to the hand card (no squashed content from rotated bounding
 *     boxes).
 *   - Drop target is decided by the floating card's centre, never by a
 *     "flick upward anywhere" heuristic.
 */
const HandGesture = (() => {
  const DRAG_THRESHOLD = 6;         // px of movement before a press becomes a drag
  const DOUBLE_TAP_MS = 350;
  const TOUCH_LIFT = 40;            // px the card floats above a finger so it stays visible
  const SLOT_PAD_TOUCH = 36;        // forgiving drop margin around the play slot
  const SLOT_PAD_MOUSE = 16;
  const HAND_TOP_PAD = 8;           // above the highest resting card still counts as "in hand"

  let ui = null;
  let handEl = null;
  let st = null;                    // active gesture state (null when idle)
  const lastTap = new Map();        // instanceId -> timestamp of last tap

  // ---------- helpers ----------

  function measureCard(el) {
    const r = el.getBoundingClientRect();
    let scale = 1;
    let angle = 0;
    try {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      scale = Math.hypot(m.a, m.b) || 1;
      angle = Math.atan2(m.b, m.a) * 180 / Math.PI;
    } catch (e) { /* keep defaults */ }
    // The centre of a rotated rectangle's bounding box equals the rectangle's centre.
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, scale, angle };
  }

  function cardsInHand() {
    return Array.from(handEl.querySelectorAll('.card')).filter(c => c.style.display !== 'none');
  }

  function inRect(x, y, rect, pad) {
    return x >= rect.left - pad && x <= rect.right + pad &&
           y >= rect.top - pad && y <= rect.bottom + pad;
  }

  // ---------- drag lifecycle ----------

  function beginDrag() {
    // Purge any stale dragging clones from document.body immediately
    document.querySelectorAll('.card-dragging').forEach(el => el.remove());

    const { cardEl } = st;
    st.dragging = true;

    const w = cardEl.offsetWidth;
    const h = cardEl.offsetHeight;
    st.w = w;
    st.h = h;

    // Geometry snapshot (measured once; see header notes)
    const slotEl = ui.playerPlaySlot;
    st.slotRect = slotEl.getBoundingClientRect();
    st.slotCx = st.slotRect.left + st.slotRect.width / 2;
    st.slotCy = st.slotRect.top + st.slotRect.height / 2;
    st.slotScale = st.slotRect.width / w;
    st.slotPad = st.isTouch ? 4 : 2; // Precise entry into play slot: no premature snapping
    st.dragScale = st.isTouch ? st.start.scale : Math.max(st.start.scale, 1) * 1.04;

    // Re-measure every card's resting position (hand order), so we can compute
    // an insertion index from the finger X without touching the live layout.
    const cards = cardsInHand();
    st.order = cards;
    st.index = cards.indexOf(cardEl);
    st.origIndex = st.index;
    st.rest = cards.map(measureCard);
    st.handTop = Math.min(...st.rest.map(r => r.cy - (r.scale * h) / 2)) - HAND_TOP_PAD;

    // Floating card
    const clone = cardEl.cloneNode(true);
    clone.removeAttribute('id');
    clone.removeAttribute('data-instance-id');
    clone.classList.remove('selected', 'hovered', 'locked', 'drag-placeholder');
    clone.classList.add('card-dragging');
    clone.style.cssText = `
      position: fixed !important; left: 0 !important; top: 0 !important;
      width: ${w}px !important; height: ${h}px !important;
      min-width: 0 !important; max-width: none !important; min-height: 0 !important; max-height: none !important;
      margin: 0 !important; bottom: auto !important; right: auto !important;
      transform: none !important; transform-origin: 50% 50% !important;
      translate: ${st.start.cx - w / 2}px ${st.start.cy - h / 2}px;
      rotate: ${st.start.angle}deg;
      scale: ${st.start.scale};
      transition: rotate .16s ease-out, scale .16s ease-out !important;
      z-index: 9999 !important; pointer-events: none !important;
    `;
    document.body.appendChild(clone);
    st.clone = clone;

    // The real card stays in the hand as an invisible placeholder (keeps the
    // fan gap open and lets us reorder it).
    cardEl.classList.add('drag-placeholder');
    handEl.classList.add('is-dragging');
    if (!ui.isLocked) {
      slotEl.classList.add('drop-target');
    }

    // Next frame: straighten + grow the floating card (CSS transition animates it)
    requestAnimationFrame(() => {
      if (!st || st.clone !== clone) return;
      clone.style.rotate = '0deg';
      clone.style.scale = st.dragScale;
    });

    st.lift = 0;
    if (window.AudioSynth && typeof window.AudioSynth.playDraw === 'function') {
      window.AudioSynth.playDraw();
    }
    st.raf = requestAnimationFrame(frame);
  }

  function setSnap(on) {
    if (st.snapped === on) return;
    st.snapped = on;
    ui.playerPlaySlot.classList.toggle('snap-active', on);
    // Ease the floating card into / out of the slot, then go back to 1:1 tracking.
    st.clone.style.transition = 'translate .14s ease-out, rotate .16s ease-out, scale .16s ease-out';
    clearTimeout(st.snapTimer);
    const clone = st.clone;
    st.snapTimer = setTimeout(() => {
      if (st && st.clone === clone) clone.style.transition = 'rotate .16s ease-out, scale .16s ease-out';
    }, 160);
  }

  function reorderTo(newIndex) {
    if (newIndex === st.index) return;
    const order = st.order.slice();
    order.splice(st.index, 1);
    order.splice(newIndex, 0, st.cardEl);
    st.order = order;
    st.index = newIndex;
    // Move ONLY the (invisible) dragged card. Re-appending the other cards would
    // reset their CSS transitions; changing --index lets them glide into place.
    handEl.insertBefore(st.cardEl, order[newIndex + 1] || null);
    ui.realignHand();
  }

  /** Decides snap / reorder for the current finger position and moves the floating card. */
  function update() {
    // Ease the touch "lift" in so the card doesn't jump when picked up
    const targetLift = st.isTouch ? TOUCH_LIFT : 0;
    st.lift += (targetLift - st.lift) * 0.3;

    const cx = st.px - st.grabX;
    const cy = st.py - st.grabY - st.lift;
    st.cx = cx;
    st.cy = cy;

    // Snap ONLY when touch/pointer enters the play slot area and player is not locked
    const overSlot = !ui.isLocked && inRect(st.px, st.py, st.slotRect, st.slotPad);
    st.inHand = !overSlot && cy >= st.handTop;
    setSnap(overSlot);

    if (st.inHand) {
      if (st.order.length > 1) {
        // Nearest resting slot (by X) decides the insertion index
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < st.rest.length; i++) {
          const d = Math.abs(st.rest[i].cx - cx);
          if (d < bestDist) { bestDist = d; best = i; }
        }
        reorderTo(best);
      }
    } else {
      // Left the hand (heading for the slot or hovering in between): the fan closes
      // back to its original arrangement, so just passing over other cards never
      // rearranges the hand.
      reorderTo(st.origIndex);
    }

    const x = st.snapped ? st.slotCx : cx;
    const y = st.snapped ? st.slotCy : cy;
    st.clone.style.translate = `${x - st.w / 2}px ${y - st.h / 2}px`;
    st.clone.style.scale = st.snapped ? st.slotScale : st.dragScale;
  }

  function frame() {
    if (!st || !st.dragging) return;
    st.raf = requestAnimationFrame(frame);
    update();
  }

  function teardown(flush = true) {
    if (!st) return;
    cancelAnimationFrame(st.raf);
    clearTimeout(st.snapTimer);
    try { handEl.releasePointerCapture(st.pointerId); } catch (e) { /* already released */ }
    handEl.classList.remove('is-dragging');
    if (ui.playerPlaySlot) ui.playerPlaySlot.classList.remove('snap-active', 'drop-target');
    if (st.clone && st.clone.parentNode) st.clone.remove();
    if (st.cardEl) st.cardEl.classList.remove('drag-placeholder');
    // Ensure all cards in hand have drag-placeholder removed so nothing ever gets stuck invisible
    if (handEl) {
      handEl.querySelectorAll('.drag-placeholder').forEach(c => c.classList.remove('drag-placeholder'));
    }
    // Purge any dragging clones on document.body
    document.querySelectorAll('.card-dragging').forEach(el => el.remove());
    st = null;
    if (flush) ui.flushPendingHandRender();
  }

  // ---------- pointer handlers ----------

  function onPointerDown(e) {
    if (st) return;                                   // ignore 2nd finger
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const cardEl = e.target.closest && e.target.closest('.card');
    if (!cardEl || !handEl.contains(cardEl)) return;
    if (cardEl.classList.contains('locked') || cardEl.classList.contains('drag-placeholder')) return;
    const id = cardEl.getAttribute('data-instance-id');
    if (!id) return;

    const start = measureCard(cardEl);
    st = {
      pointerId: e.pointerId,
      isTouch: e.pointerType !== 'mouse',
      cardEl, id, start,
      downX: e.clientX, downY: e.clientY,
      px: e.clientX, py: e.clientY,
      grabX: e.clientX - start.cx,
      grabY: e.clientY - start.cy,
      dragging: false, snapped: false
    };
    try { handEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function onPointerMove(e) {
    if (!st || e.pointerId !== st.pointerId) return;
    st.px = e.clientX;
    st.py = e.clientY;
    if (!st.dragging && Math.hypot(e.clientX - st.downX, e.clientY - st.downY) > DRAG_THRESHOLD) {
      beginDrag();
    }
  }

  function settleInto(index, done) {
    const clone = st.clone;
    if (!clone || !clone.parentNode) {
      done();
      return;
    }
    // Measure cardEl's live target position in the DOM to avoid any hover mismatch
    const target = (st.cardEl && st.cardEl.parentNode) ? measureCard(st.cardEl) : (st.rest[index] || st.start);
    clone.style.transition = 'translate .12s cubic-bezier(.2,.8,.2,1), rotate .12s ease-out, scale .12s ease-out';
    clone.style.translate = `${target.cx - st.w / 2}px ${target.cy - st.h / 2}px`;
    clone.style.rotate = `${target.angle}deg`;
    clone.style.scale = target.scale;
    setTimeout(() => {
      if (clone.parentNode) clone.remove();
      done();
    }, 130);
  }

  function onPointerUp(e) {
    if (!st || e.pointerId !== st.pointerId) return;
    const s = st;

    if (!s.dragging) {
      // ----- tap -----
      const id = s.id;
      teardown();
      if (ui.isLocked) return;
      const now = Date.now();
      const dt = now - (lastTap.get(id) || 0);
      lastTap.set(id, now);
      if (window.AudioSynth && typeof window.AudioSynth.playClick === 'function') window.AudioSynth.playClick();
      if (ui.selectedCardInstanceId === id || dt < DOUBLE_TAP_MS) {
        ui.selectCard(id, true);
        ui.lockSelection();
      } else {
        ui.selectCard(id);
      }
      return;
    }

    // ----- drop -----
    cancelAnimationFrame(s.raf);
    s.px = e.clientX;
    s.py = e.clientY;
    update();                                       // final, exact verdict at the release point

    if (s.snapped && !ui.isLocked) {
      // Play. Passing over other cards on the way must not rearrange the hand.
      reorderTo(s.origIndex);
      const from = { cx: s.slotCx, cy: s.slotCy, scale: s.slotScale };
      if (s.clone && s.clone.parentNode) s.clone.remove();
      teardown(false);
      ui.selectCard(s.id, true);
      ui.lockSelection(from);
      ui.flushPendingHandRender();
      return;
    }

    // Released INSIDE the hand: instant drop with ZERO clone delay or lingering duplicates!
    if (s.inHand) {
      ui.handOrder = s.order.map(el => el.getAttribute('data-instance-id'));
      if (s.clone && s.clone.parentNode) s.clone.remove();
      teardown();
      ui.realignHand();
      return;
    }

    // Released OUTSIDE the hand (not on slot): fly smoothly back into original resting hand position
    reorderTo(s.origIndex);
    s.dragging = false;
    s.settling = true;
    settleInto(s.origIndex, () => {
      if (st === s) teardown();
    });
  }

  function onPointerCancel(e) {
    if (!st || e.pointerId !== st.pointerId) return;
    abort();
  }

  /** Aborts any gesture immediately (round change, timer lock, resize, ...). */
  function abort() {
    if (!st) return;
    if (st.clone) st.clone.remove();
    teardown();
  }

  // ---------- public API ----------

  function bind(uiRef) {
    ui = uiRef;
    const el = ui.playerHand;
    if (!el || el.__handGestureBound) return;
    el.__handGestureBound = true;
    handEl = el;

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('contextmenu', (e) => e.preventDefault());   // Android long-press menu
    el.addEventListener('dragstart', (e) => e.preventDefault());     // native HTML drag ghost

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    window.addEventListener('resize', () => {
      // Mobile browser chrome showing/hiding nudges innerHeight a little: ignore that.
      if (Math.abs(window.innerWidth - vw) > 80 || Math.abs(window.innerHeight - vh) > 120) abort();
      vw = window.innerWidth;
      vh = window.innerHeight;
    });
    window.addEventListener('orientationchange', abort);
    window.addEventListener('blur', abort);
  }

  return {
    bind,
    abort,
    measureCard,
    isActive: () => !!st,
    isDragging: () => !!(st && (st.dragging || st.settling)),
    activeId: () => (st ? st.id : null)
  };
})();

window.HandGesture = HandGesture;
