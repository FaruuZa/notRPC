const PORT = process.env.PORT || 8000;
const MAX_HP = 100;
const HAND_SIZE = 4;

// Progression & Timeout Constants
const TURN_DURATION_SEC = 30;        // battle, normal player
const AFK_TURN_DURATION_SEC = 10;    // battle, after >= 2 consecutive timeouts
const AFK_STREAK_THRESHOLD = 2;
const PREP_PHASE_DURATION_SEC = 60;  // 1 single timer for entire prep phase (60 detik, no subphase timers)
const PREP_STEP_TIMEOUT_SEC = 60;    // fallback/backwards compatibility
const CLASH_WINDOW_MS = 8000;        // fixed server-side clash window

const ELEMENTS = {
  FIRE: 'FIRE',
  WATER: 'WATER',
  NATURE: 'NATURE',
  NEUTRAL: 'NEUTRAL',
  CHAOS: 'CHAOS'
};

// =============================================================================
// CLASH RULES
// Classic RPS triangle: FIRE > NATURE > WATER > FIRE
// NEUTRAL: Ties against all elements, but COUNTERS CHAOS (stability beats chaos)
// CHAOS: Beats FIRE, WATER, NATURE — but LOSES to NEUTRAL
// =============================================================================
const CLASH_RULES = {
  [ELEMENTS.FIRE]: {
    [ELEMENTS.FIRE]:    'NEUTRAL',
    [ELEMENTS.WATER]:   'INFERIOR',
    [ELEMENTS.NATURE]:  'SUPERIOR',
    [ELEMENTS.NEUTRAL]: 'NEUTRAL',
    [ELEMENTS.CHAOS]:   'INFERIOR'
  },
  [ELEMENTS.WATER]: {
    [ELEMENTS.FIRE]:    'SUPERIOR',
    [ELEMENTS.WATER]:   'NEUTRAL',
    [ELEMENTS.NATURE]:  'INFERIOR',
    [ELEMENTS.NEUTRAL]: 'NEUTRAL',
    [ELEMENTS.CHAOS]:   'INFERIOR'
  },
  [ELEMENTS.NATURE]: {
    [ELEMENTS.FIRE]:    'INFERIOR',
    [ELEMENTS.WATER]:   'SUPERIOR',
    [ELEMENTS.NATURE]:  'NEUTRAL',
    [ELEMENTS.NEUTRAL]: 'NEUTRAL',
    [ELEMENTS.CHAOS]:   'INFERIOR'
  },
  [ELEMENTS.NEUTRAL]: {
    [ELEMENTS.FIRE]:    'NEUTRAL',
    [ELEMENTS.WATER]:   'NEUTRAL',
    [ELEMENTS.NATURE]:  'NEUTRAL',
    [ELEMENTS.NEUTRAL]: 'NEUTRAL',
    [ELEMENTS.CHAOS]:   'SUPERIOR' 
  },
  [ELEMENTS.CHAOS]: {
    [ELEMENTS.FIRE]:    'SUPERIOR',
    [ELEMENTS.WATER]:   'SUPERIOR',
    [ELEMENTS.NATURE]:  'SUPERIOR',
    [ELEMENTS.NEUTRAL]: 'INFERIOR', 
    [ELEMENTS.CHAOS]:   'NEUTRAL'
  }
};

// =============================================================================
// CARD POOL
// All descriptions are 100% accurate to the outcome values below them.
// "X dmg" = damage dealt to opponent
// "X self dmg" = damage dealt to yourself
// Inferior outcomes on some cards are intentionally powerful (mind-game cards)
// =============================================================================

module.exports = {
  PORT,
  MAX_HP,
  HAND_SIZE,
  TURN_DURATION_SEC,
  AFK_TURN_DURATION_SEC,
  AFK_STREAK_THRESHOLD,
  PREP_PHASE_DURATION_SEC,
  PREP_STEP_TIMEOUT_SEC,
  CLASH_WINDOW_MS,
  ELEMENTS,
  CLASH_RULES
};
