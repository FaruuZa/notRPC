const PORT = 8000;
const MAX_HP = 100;
const HAND_SIZE = 4;

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
    [ELEMENTS.CHAOS]:   'SUPERIOR'   // ← NEUTRAL finally beats CHAOS!
  },
  [ELEMENTS.CHAOS]: {
    [ELEMENTS.FIRE]:    'SUPERIOR',
    [ELEMENTS.WATER]:   'SUPERIOR',
    [ELEMENTS.NATURE]:  'SUPERIOR',
    [ELEMENTS.NEUTRAL]: 'INFERIOR',  // ← CHAOS finally loses to NEUTRAL!
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
const CARD_POOL = [

  // ─── FIRE CARDS ────────────────────────────────────────────────────────────
  // Fire: beats NATURE, loses to WATER and CHAOS, ties FIRE and NEUTRAL

  {
    id: 'fire_burst',
    name: 'Fire Burst',
    element: ELEMENTS.FIRE,
    description: 'Superior: 15 dmg & <span class="kw-burn">BURN [2]</span>. Inferior: 8 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 15, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 2 } } },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 8 }
    }
  },
  {
    id: 'ember_slash',
    name: 'Ember Slash',
    element: ELEMENTS.FIRE,
    description: 'Superior: 10 dmg & <span class="kw-buff">BUFF [2]</span>. Neutral: 3 dmg.',
    outcomes: {
      SUPERIOR: { damage: 10, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 2 } } },
      NEUTRAL:  { damage: 3,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'lava_jet',
    name: 'Lava Jet',
    element: ELEMENTS.FIRE,
    description: 'Superior: 4 dmg & <span class="kw-burn">BURN [3]</span>. Neutral: <span class="kw-burn">BURN [1]</span> to All.',
    outcomes: {
      SUPERIOR: { damage: 4, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 3 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 1 }, self: { burn: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'blazing_edge',
    name: 'Blazing Edge',
    element: ELEMENTS.FIRE,
    // INTENTIONAL INFERIOR BENEFIT: you power up even when you lose the clash
    description: 'Superior: 14 dmg. Neutral: 2 dmg. Inferior: 8 self dmg & <span class="kw-buff">BUFF [2]</span>.',
    outcomes: {
      SUPERIOR: { damage: 14, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 2,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 8, applyStatus: { self: { attackBuff: 2 } } }
    }
  },
  {
    id: 'reckless_blaze',
    name: 'Reckless Blaze',
    element: ELEMENTS.FIRE,
    // NEW: High risk/reward — punishing when it wins, punishing when it loses
    description: 'Superior: 20 dmg. Neutral: 5 dmg & 5 self dmg. Inferior: 12 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 20, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 5,  shield: 0, selfDamage: 5 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 12 }
    }
  },

  // ─── WATER CARDS ───────────────────────────────────────────────────────────
  // Water: beats FIRE, loses to NATURE and CHAOS, ties WATER and NEUTRAL

  {
    id: 'aqua_guard',
    name: 'Aqua Guard',
    element: ELEMENTS.WATER,
    description: 'Superior: 14 <span class="kw-shield">SHIELD</span> & <span class="kw-cleanse">CLEANSE</span>. Neutral: 6 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 14, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      NEUTRAL:  { damage: 0, shield: 6,  selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0,  selfDamage: 0 }
    }
  },
  {
    id: 'tidal_surge',
    name: 'Tidal Surge',
    element: ELEMENTS.WATER,
    // FIX: Added Neutral description (2 dmg & 2 SHIELD) which was previously unlisted
    description: 'Superior: 10 dmg, 5 <span class="kw-shield">SHIELD</span> & <span class="kw-weak">WEAK [1]</span>. Neutral: 2 dmg & 2 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 10, shield: 5, selfDamage: 0, applyStatus: { opponent: { weakness: 1 } } },
      NEUTRAL:  { damage: 2,  shield: 2, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'chilling_mist',
    name: 'Chilling Mist',
    element: ELEMENTS.WATER,
    description: 'Superior: 10 <span class="kw-shield">SHIELD</span> & <span class="kw-weak">WEAK [1]</span>. Neutral: <span class="kw-weak">WEAK [1]</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 10, selfDamage: 0, applyStatus: { opponent: { weakness: 1 } } },
      NEUTRAL:  { damage: 0, shield: 0,  selfDamage: 0, applyStatus: { opponent: { weakness: 1 } } },
      INFERIOR: { damage: 0, shield: 0,  selfDamage: 0 }
    }
  },
  {
    id: 'collapse_wave',
    name: 'Collapse Wave',
    element: ELEMENTS.WATER,
    // NEW: INTENTIONAL INFERIOR BENEFIT — debilitates opponent even when you lose to Nature/Chaos
    description: 'Superior: 15 dmg. Neutral: 4 dmg. Inferior: 8 self dmg & <span class="kw-weak">WEAK [3]</span>.',
    outcomes: {
      SUPERIOR: { damage: 15, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 4,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 8, applyStatus: { opponent: { weakness: 3 } } }
    }
  },

  // ─── NATURE CARDS ──────────────────────────────────────────────────────────
  // Nature: beats WATER, loses to FIRE and CHAOS, ties NATURE and NEUTRAL

  {
    id: 'nature_shield',
    name: 'Nature Shield',
    element: ELEMENTS.NATURE,
    description: 'Superior: 8 <span class="kw-shield">SHIELD</span> & 5 <span class="kw-heal">HEAL</span>. Neutral: 4 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 8, heal: 5, selfDamage: 0 },
      NEUTRAL:  { damage: 0, shield: 4, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'spore_sprout',
    name: 'Spore Sprout',
    element: ELEMENTS.NATURE,
    // FIX: Added Neutral (1 dmg & 2 SHIELD) and Inferior (1 self dmg) to description
    description: 'Superior: 8 dmg, 6 <span class="kw-shield">SHIELD</span> & <span class="kw-poison">POISON [3]</span>. Neutral: 1 dmg & 2 <span class="kw-shield">SHIELD</span>. Inferior: 1 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 8, shield: 6, selfDamage: 0, applyStatus: { opponent: { poison: 3 } } },
      NEUTRAL:  { damage: 1, shield: 2, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 1 }
    }
  },
  {
    id: 'toxin_vine',
    name: 'Toxin Vine',
    element: ELEMENTS.NATURE,
    // FIX: Added "2 SHIELD &" to Neutral description (was missing, value was in code)
    description: 'Superior: 8 <span class="kw-shield">SHIELD</span> & <span class="kw-poison">POISON [3]</span>. Neutral: 2 <span class="kw-shield">SHIELD</span> & <span class="kw-poison">POISON [1]</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 8, selfDamage: 0, applyStatus: { opponent: { poison: 3 } } },
      NEUTRAL:  { damage: 0, shield: 2, selfDamage: 0, applyStatus: { opponent: { poison: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'restoring_bloom',
    name: 'Restoring Bloom',
    element: ELEMENTS.NATURE,
    description: 'Superior: 5 <span class="kw-heal">HEAL</span> & <span class="kw-cleanse">CLEANSE</span>. Neutral: <span class="kw-cleanse">CLEANSE</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 0, heal: 5, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'spite_thorns',
    name: 'Spite Thorns',
    element: ELEMENTS.NATURE,
    // NEW: INTENTIONAL INFERIOR BENEFIT — punishes Fire/Chaos players who beat you
    // Superior outcome is deliberately weak; the power is in the counter
    description: 'Superior: 3 dmg & 6 <span class="kw-shield">SHIELD</span>. Neutral: 2 <span class="kw-shield">SHIELD</span>. Inferior: 10 dmg & <span class="kw-poison">POISON [3]</span>.',
    outcomes: {
      SUPERIOR: { damage: 3, shield: 6, selfDamage: 0 },
      NEUTRAL:  { damage: 0, shield: 2, selfDamage: 0 },
      INFERIOR: { damage: 10, shield: 0, selfDamage: 0, applyStatus: { opponent: { poison: 3 } } }
    }
  },

  // ─── NEUTRAL CARDS ─────────────────────────────────────────────────────────
  // Neutral: ties against all elements. SUPERIOR against CHAOS (stability > chaos).
  // Cannot be INFERIOR. The Chaos counter.

  {
    id: 'iron_wall',
    name: 'Iron Wall',
    element: ELEMENTS.NEUTRAL,
    // BUFFED Superior: now counters Chaos properly (8 SHIELD + 6 dmg vs old 8+4)
    description: 'Superior: 12 <span class="kw-shield">SHIELD</span> & 6 dmg. Neutral: 6 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 6, shield: 12, selfDamage: 0 },
      NEUTRAL:  { damage: 0, shield: 6, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'basic_fist',
    name: 'Basic Fist',
    element: ELEMENTS.NEUTRAL,
    // BUFFED Superior: now 10 dmg (was 8) to reward beating Chaos
    description: 'Superior: 10 dmg. Neutral: 3 dmg.',
    outcomes: {
      SUPERIOR: { damage: 10, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 3,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'null_barrier',
    name: 'Null Barrier',
    element: ELEMENTS.NEUTRAL,
    // NEW: Fortress card — massive defensive payoff when it counters Chaos
    description: 'Superior: 20 <span class="kw-shield">SHIELD</span> & 4 dmg. Neutral: 8 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 4,  shield: 20, selfDamage: 0 },
      NEUTRAL:  { damage: 0,  shield: 8,  selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0,  selfDamage: 0 }
    }
  },
  {
    id: 'steady_hand',
    name: 'Steady Hand',
    element: ELEMENTS.NEUTRAL,
    // NEW: Reliable mid-range card, good in both Superior and Neutral outcomes
    description: 'Superior: 6 dmg & 4 <span class="kw-shield">SHIELD</span>. Neutral: 4 dmg & 2 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 6, shield: 4, selfDamage: 0 },
      NEUTRAL:  { damage: 4, shield: 2, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'iron_sentinel',
    name: 'Iron Sentinel',
    element: ELEMENTS.NEUTRAL,
    // NEW: Punishing Chaos-counter; also applies Weak when it wins
    description: 'Superior: 14 dmg & <span class="kw-weak">WEAK [1]</span>. Neutral: 5 dmg.',
    outcomes: {
      SUPERIOR: { damage: 14, shield: 0, selfDamage: 0, applyStatus: { opponent: { weakness: 1 } } },
      NEUTRAL:  { damage: 5,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },

  // ─── CHAOS CARDS ────────────────────────────────────────────────────────────
  // Chaos: SUPERIOR vs FIRE, WATER, NATURE. NEUTRAL vs CHAOS.
  // INFERIOR vs NEUTRAL — chaos cannot overcome stability.
  // All Chaos cards now have meaningful Inferior outcomes (they occur vs NEUTRAL).

  {
    id: 'chaos_strike',
    name: 'Chaos Strike',
    element: ELEMENTS.CHAOS,
    // NERFED Superior: 18 dmg (was 20). Added clear Inferior outcome vs NEUTRAL.
    description: 'Superior: 15 dmg. Neutral: 5 dmg & 8 self dmg. Inferior: 6 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 15, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 5,  shield: 0, selfDamage: 8 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 6 }
    }
  },
  {
    id: 'chaos_blast',
    name: 'Chaos Blast',
    element: ELEMENTS.CHAOS,
    // UNCHANGED but now Inferior makes sense (vs NEUTRAL)
    description: 'Superior: 18 dmg. Neutral: 12 self dmg. Inferior: 8 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 18, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 12 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 8 }
    }
  },
  {
    id: 'chaos_overdrive',
    name: 'Chaos Overdrive',
    element: ELEMENTS.CHAOS,
    // Added Inferior: 4 self dmg (vs NEUTRAL — previously missing)
    description: 'Superior: 12 dmg & <span class="kw-buff">BUFF [2]</span>. Neutral: <span class="kw-buff">BUFF [1]</span> & 6 self dmg. Inferior: 4 self dmg & <span class="kw-weak">WEAK [2]</span> to self.',
    outcomes: {
      SUPERIOR: { damage: 12, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 2 } } },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 6, applyStatus: { self: { attackBuff: 1 } } },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 4, applyStatus: { self: { weakness: 2 } } },
    }
  },
  {
    id: 'void_pact',
    name: 'Void Pact',
    element: ELEMENTS.CHAOS,
    // NEW: INTENTIONAL INFERIOR BENEFIT — weak when winning, massive counter when losing to NEUTRAL
    // Mind-game card: punishes NEUTRAL players who think they're safe countering Chaos
    description: 'Superior: 2 dmg. Neutral: 2 dmg. Inferior: 20 dmg (counter vs NEUTRAL!).',
    outcomes: {
      SUPERIOR: { damage: 2,  shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 2,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 20, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'chaos_reversal',
    name: 'Chaos Reversal',
    element: ELEMENTS.CHAOS,
    // NEW: INTENTIONAL INFERIOR BENEFIT — garbage when winning, devastating + BUFF when losing to NEUTRAL
    // Forces opponent to reconsider playing NEUTRAL against Chaos
    description: 'Superior: 6 dmg. Neutral: 3 self dmg. Inferior: 14 dmg & <span class="kw-buff">BUFF [2]</span>.',
    outcomes: {
      SUPERIOR: { damage: 6,  shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 3 },
      INFERIOR: { damage: 14, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 2 } } }
    }
  }
];

module.exports = {
  PORT,
  MAX_HP,
  HAND_SIZE,
  ELEMENTS,
  CLASH_RULES,
  CARD_POOL
};
