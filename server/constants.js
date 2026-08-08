const PORT = process.env.PORT || 8000;
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
  {
    id: 'fire_strike',
    name: 'Fire Strike',
    element: ELEMENTS.FIRE,
    description: 'Superior: 12 dmg. Neutral: 3 dmg.',
    outcomes: {
      SUPERIOR: { damage: 12, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 3,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'water_strike',
    name: 'Water Strike',
    element: ELEMENTS.WATER,
    description: 'Superior: 12 dmg. Neutral: 3 dmg.',
    outcomes: {
      SUPERIOR: { damage: 12, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 3,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'nature_strike',
    name: 'Nature Strike',
    element: ELEMENTS.NATURE,
    description: 'Superior: 12 dmg. Neutral: 3 dmg.',
    outcomes: {
      SUPERIOR: { damage: 12, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 3,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },

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
  {
    id: 'cauterize',
    name: 'Cauterize',
    element: ELEMENTS.FIRE,
    description: 'Superior: 8 <span class="kw-heal">HEAL</span> & <span class="kw-cleanse">CLEANSE</span>. Neutral: <span class="kw-cleanse">CLEANSE</span>. Inferior: 4 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 0, heal: 8, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 4 }
    }
  },
  {
    id: 'blinding_flare',
    name: 'Blinding Flare',
    element: ELEMENTS.FIRE,
    description: 'Superior: 8 dmg & <span class="kw-weak">WEAK [2]</span>. Neutral: <span class="kw-weak">WEAK [1]</span>.',
    outcomes: {
      SUPERIOR: { damage: 8, shield: 0, selfDamage: 0, applyStatus: { opponent: { weakness: 2 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { opponent: { weakness: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
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
    description: 'Superior: 10 <span class="kw-shield">SHIELD</span> & <span class="kw-dispel">DISPEL</span>. Neutral: <span class="kw-dispel">DISPEL</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 10, selfDamage: 0, applyStatus: { opponent: { dispel: 1 } } },
      NEUTRAL:  { damage: 0, shield: 0,  selfDamage: 0, applyStatus: { opponent: { dispel: 1 } } },
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
  {
    id: 'hydro_cannon',
    name: 'Hydro Cannon',
    element: ELEMENTS.WATER,
    description: 'Superior: 16 dmg. Neutral: 4 dmg. Inferior: 6 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 16, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 4,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 6 }
    }
  },
  {
    id: 'scalding_steam',
    name: 'Scalding Steam',
    element: ELEMENTS.WATER,
    description: 'Superior: 8 dmg & <span class="kw-burn">BURN [2]</span>. Neutral: <span class="kw-burn">BURN [1]</span>.',
    outcomes: {
      SUPERIOR: { damage: 8, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 2 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
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
  {
    id: 'savage_growth',
    name: 'Savage Growth',
    element: ELEMENTS.NATURE,
    description: 'Superior: 6 dmg & <span class="kw-buff">BUFF [3]</span>. Neutral: <span class="kw-buff">BUFF [1]</span>.',
    outcomes: {
      SUPERIOR: { damage: 6, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 3 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'leech_seed',
    name: 'Leech Seed',
    element: ELEMENTS.NATURE,
    description: 'Superior: 6 dmg & 6 <span class="kw-heal">HEAL</span>. Neutral: 3 <span class="kw-heal">HEAL</span>.',
    outcomes: {
      SUPERIOR: { damage: 6, shield: 0, heal: 6, selfDamage: 0 },
      NEUTRAL:  { damage: 0, shield: 0, heal: 3, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
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
    id: 'spellbreaker',
    name: 'Spellbreaker',
    element: ELEMENTS.NEUTRAL,
    description: 'Superior: 8 dmg & <span class="kw-dispel">DISPEL</span>. Neutral: <span class="kw-dispel">DISPEL</span>.',
    outcomes: {
      SUPERIOR: { damage: 8, shield: 0, selfDamage: 0, applyStatus: { opponent: { dispel: 1 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { opponent: { dispel: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
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
  {
    id: 'zen_meditation',
    name: 'Zen Meditation',
    element: ELEMENTS.NEUTRAL,
    description: 'Superior: 8 <span class="kw-heal">HEAL</span> & <span class="kw-cleanse">CLEANSE</span>. Neutral: 4 <span class="kw-heal">HEAL</span> & <span class="kw-cleanse">CLEANSE</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 0, heal: 8, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      NEUTRAL:  { damage: 0, shield: 0, heal: 4, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'adrenaline_rush',
    name: 'Adrenaline Rush',
    element: ELEMENTS.NEUTRAL,
    description: 'Superior: 6 dmg & <span class="kw-buff">BUFF [3]</span>. Neutral: <span class="kw-buff">BUFF [2]</span>.',
    outcomes: {
      SUPERIOR: { damage: 6, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 3 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 2 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
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
    description: 'Superior: 12 dmg. Neutral: 4 dmg & 6 self dmg. Inferior: 10 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 12, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 4,  shield: 0, selfDamage: 6 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 10 }
    }
  },
  {
    id: 'chaos_blast',
    name: 'Chaos Blast',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 14 dmg. Neutral: 12 self dmg. Inferior: 8 self dmg & <span class="kw-weak">WEAK [2]</span> to self.',
    outcomes: {
      SUPERIOR: { damage: 14, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 12 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 8, applyStatus: { self: { weakness: 2 } } }
    }
  },
  {
    id: 'chaos_overdrive',
    name: 'Chaos Overdrive',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 10 dmg, <span class="kw-buff">BUFF [2]</span> & <span class="kw-weak">WEAK [1]</span> to self. Neutral: <span class="kw-buff">BUFF [1]</span> & 8 self dmg. Inferior: 6 self dmg & <span class="kw-weak">WEAK [2]</span> to self.',
    outcomes: {
      SUPERIOR: { damage: 10, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 2, weakness: 1 } } },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 8, applyStatus: { self: { attackBuff: 1 } } },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 6, applyStatus: { self: { weakness: 2 } } },
    }
  },
  {
    id: 'void_pact',
    name: 'Void Pact',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 3 dmg. Neutral: 3 dmg & <span class="kw-weak">WEAK [1]</span> to self. Inferior: 15 dmg & 5 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 3,  shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 3,  shield: 0, selfDamage: 0, applyStatus: { self: { weakness: 1 } } },
      INFERIOR: { damage: 15, shield: 0, selfDamage: 5 }
    }
  },
  {
    id: 'chaos_reversal',
    name: 'Chaos Reversal',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 5 dmg & <span class="kw-burn">BURN [1]</span> to self. Neutral: 5 self dmg. Inferior: 11 dmg & <span class="kw-buff">BUFF [2]</span>.',
    outcomes: {
      SUPERIOR: { damage: 5,  shield: 0, selfDamage: 0, applyStatus: { self: { burn: 1 } } },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 5 },
      INFERIOR: { damage: 11, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 2 } } }
    }
  },
  {
    id: 'entropy',
    name: 'Entropy',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 3 dmg & <span class="kw-poison">POISON [2]</span>. Neutral: <span class="kw-poison">POISON [1]</span> to opponent & <span class="kw-poison">POISON [2]</span> to self. Inferior: 4 self dmg & <span class="kw-poison">POISON [3]</span> to self.',
    outcomes: {
      SUPERIOR: { damage: 3, shield: 0, selfDamage: 0, applyStatus: { opponent: { poison: 2 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { opponent: { poison: 1 }, self: { poison: 2 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 4, applyStatus: { self: { poison: 3 } } }
    }
  },
  {
    id: 'meteor_shower',
    name: 'Meteor Shower',
    element: ELEMENTS.FIRE,
    description: 'Superior: 22 dmg. Inferior: 15 self dmg.',
    isDraftExclusive: true,
    outcomes: {
      SUPERIOR: { damage: 22, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 15 }
    }
  },
  {
    id: 'tsunami',
    name: 'Tsunami',
    element: ELEMENTS.WATER,
    description: 'Superior: 10 dmg & 15 <span class="kw-shield">SHIELD</span>. Neutral: 5 <span class="kw-shield">SHIELD</span>.',
    isDraftExclusive: true,
    outcomes: {
      SUPERIOR: { damage: 10, shield: 15, selfDamage: 0 },
      NEUTRAL:  { damage: 0,  shield: 5,  selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0,  selfDamage: 0 }
    }
  },
  {
    id: 'wrath_of_nature',
    name: 'Wrath of Nature',
    element: ELEMENTS.NATURE,
    description: 'Superior: 12 dmg & <span class="kw-buff">BUFF [3]</span>. Inferior: <span class="kw-poison">POISON [3]</span> to self.',
    isDraftExclusive: true,
    outcomes: {
      SUPERIOR: { damage: 12, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 3 } } },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0, applyStatus: { self: { poison: 3 } } }
    }
  },
  {
    id: 'cosmic_alignment',
    name: 'Cosmic Alignment',
    element: ELEMENTS.NEUTRAL,
    description: 'Superior: 15 dmg & <span class="kw-cleanse">CLEANSE</span>. Neutral: 5 <span class="kw-heal">HEAL</span>.',
    isDraftExclusive: true,
    outcomes: {
      SUPERIOR: { damage: 15, shield: 0, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      NEUTRAL:  { damage: 0,  shield: 0, heal: 5, selfDamage: 0 },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'pandemonium',
    name: 'Pandemonium',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 18 dmg. Neutral: <span class="kw-burn">BURN [2]</span> to All & 6 self dmg. Inferior: 15 self dmg & <span class="kw-weak">WEAK [2]</span> to self.',
    isDraftExclusive: true,
    outcomes: {
      SUPERIOR: { damage: 18, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 0,  shield: 0, selfDamage: 6, applyStatus: { opponent: { burn: 2 }, self: { burn: 2 } } },
      INFERIOR: { damage: 0,  shield: 0, selfDamage: 15, applyStatus: { self: { weakness: 2 } } }
    }
  },
  {
    id: 'flame_ward',
    name: 'Flame Ward',
    element: ELEMENTS.FIRE,
    description: 'Superior: 5 dmg & 8 <span class="kw-shield">SHIELD</span>. Neutral: 4 <span class="kw-shield">SHIELD</span>. Inferior: 2 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 5, shield: 8, selfDamage: 0 },
      NEUTRAL:  { damage: 0, shield: 4, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 2 }
    }
  },
  {
    id: 'volcanic_ash',
    name: 'Volcanic Ash',
    element: ELEMENTS.FIRE,
    description: 'Superior: 6 dmg & <span class="kw-burn">BURN [2]</span>. Neutral: <span class="kw-burn">BURN [1]</span>. Inferior: <span class="kw-weak">WEAK [1]</span> to self.',
    outcomes: {
      SUPERIOR: { damage: 6, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 2 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0, applyStatus: { self: { weakness: 1 } } }
    }
  },
  {
    id: 'healing_rain',
    name: 'Healing Rain',
    element: ELEMENTS.WATER,
    description: 'Superior: 10 <span class="kw-heal">HEAL</span> & <span class="kw-cleanse">CLEANSE</span>. Neutral: 4 <span class="kw-heal">HEAL</span>. Inferior: 2 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 0, heal: 10, selfDamage: 0, applyStatus: { self: { cleanse: 1 } } },
      NEUTRAL:  { damage: 0, shield: 0, heal: 4, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 2 }
    }
  },
  {
    id: 'frostbite',
    name: 'Frostbite',
    element: ELEMENTS.WATER,
    description: 'Superior: 8 dmg & <span class="kw-weak">WEAK [2]</span>. Neutral: 2 dmg & <span class="kw-weak">WEAK [1]</span>. Inferior: 2 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 8, shield: 0, selfDamage: 0, applyStatus: { opponent: { weakness: 2 } } },
      NEUTRAL:  { damage: 2, shield: 0, selfDamage: 0, applyStatus: { opponent: { weakness: 1 } } },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 2 }
    }
  },
  {
    id: 'spore_shroud',
    name: 'Spore Shroud',
    element: ELEMENTS.NATURE,
    description: 'Superior: 8 <span class="kw-shield">SHIELD</span> & <span class="kw-poison">POISON [2]</span>. Neutral: 4 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 8, selfDamage: 0, applyStatus: { opponent: { poison: 2 } } },
      NEUTRAL:  { damage: 0, shield: 4, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'photosynthesis',
    name: 'Photosynthesis',
    element: ELEMENTS.NATURE,
    description: 'Superior: 8 <span class="kw-heal">HEAL</span> & <span class="kw-buff">BUFF [2]</span>. Neutral: 3 <span class="kw-heal">HEAL</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 0, heal: 8, selfDamage: 0, applyStatus: { self: { attackBuff: 2 } } },
      NEUTRAL:  { damage: 0, shield: 0, heal: 3, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'balance',
    name: 'Balance',
    element: ELEMENTS.NEUTRAL,
    description: 'Superior: 8 dmg & 8 <span class="kw-shield">SHIELD</span>. Neutral: 4 dmg & 4 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 8, shield: 8, selfDamage: 0 },
      NEUTRAL:  { damage: 4, shield: 4, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'mirror_shield',
    name: 'Mirror Shield',
    element: ELEMENTS.NEUTRAL,
    description: 'Superior: 10 <span class="kw-shield">SHIELD</span> & <span class="kw-buff">BUFF [1]</span>. Neutral: 5 <span class="kw-shield">SHIELD</span>.',
    outcomes: {
      SUPERIOR: { damage: 0, shield: 10, selfDamage: 0, applyStatus: { self: { attackBuff: 1 } } },
      NEUTRAL:  { damage: 0, shield: 5, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0 }
    }
  },
  {
    id: 'wild_magic',
    name: 'Wild Magic',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 18 dmg. Neutral: 5 self dmg. Inferior: <span class="kw-buff">BUFF [2]</span>.',
    outcomes: {
      SUPERIOR: { damage: 18, shield: 0, selfDamage: 0 },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 5 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 0, applyStatus: { self: { attackBuff: 2 } } }
    }
  },
  {
    id: 'catastrophe',
    name: 'Catastrophe',
    element: ELEMENTS.CHAOS,
    description: 'Superior: 10 dmg & <span class="kw-burn">BURN [2]</span> & <span class="kw-poison">POISON [2]</span>. Inferior: 6 self dmg.',
    outcomes: {
      SUPERIOR: { damage: 10, shield: 0, selfDamage: 0, applyStatus: { opponent: { burn: 2, poison: 2 } } },
      NEUTRAL:  { damage: 0, shield: 0, selfDamage: 0 },
      INFERIOR: { damage: 0, shield: 0, selfDamage: 6 }
    }
  }
];

const PACK_TYPES = {
  FIRE_PACK: 'FIRE_PACK',
  WATER_PACK: 'WATER_PACK',
  NATURE_PACK: 'NATURE_PACK',
  ELEMENTAL_PACK: 'ELEMENTAL_PACK',
  HYBRID_PACK: 'HYBRID_PACK',
  UNIVERSAL_PACK: 'UNIVERSAL_PACK',
  BURN_PACK: 'BURN_PACK',
  POISON_PACK: 'POISON_PACK',
  SHIELD_PACK: 'SHIELD_PACK',
  SUSTAIN_PACK: 'SUSTAIN_PACK',
  AGGRO_PACK: 'AGGRO_PACK',
  CONTROL_PACK: 'CONTROL_PACK',
  STATUS_PACK: 'STATUS_PACK',
  COUNTER_PACK: 'COUNTER_PACK',
  RISK_PACK: 'RISK_PACK',
  GAMBLER_PACK: 'GAMBLER_PACK',
  REVENGE_PACK: 'REVENGE_PACK',
  TRAP_PACK: 'TRAP_PACK',
  DRAFT_EXCLUSIVE_PACK: 'DRAFT_EXCLUSIVE_PACK'
};

const PACK_POOL = {
  [PACK_TYPES.FIRE_PACK]: {
    name: 'Pyromaniac Vault',
    theme: 'Fire Spec',
    description: 'Contains explosive Fire cards. Burn and blast your foes.',
    color: 'linear-gradient(135deg, #e74c3c, #f39c12)'
  },
  [PACK_TYPES.WATER_PACK]: {
    name: 'Tidal Arsenal',
    theme: 'Water Spec',
    description: 'Defensive and chilling Water cards to control the flow.',
    color: 'linear-gradient(135deg, #2980b9, #8e44ad)'
  },
  [PACK_TYPES.NATURE_PACK]: {
    name: 'Wildbloom Cache',
    theme: 'Nature Spec',
    description: 'Poisonous vines and restoring blooms from the jungle.',
    color: 'linear-gradient(135deg, #27ae60, #2ecc71)'
  },
  [PACK_TYPES.ELEMENTAL_PACK]: {
    name: 'Elemental Conflux',
    theme: 'Tri-Element',
    description: 'A balanced mix of Fire, Water, and Nature cards.',
    color: 'linear-gradient(135deg, #16a085, #f1c40f)'
  },
  [PACK_TYPES.HYBRID_PACK]: {
    name: 'Entropy Fusion',
    theme: 'Elemental & Chaos',
    description: 'A volatile combination of traditional elements and chaotic energy.',
    color: 'linear-gradient(135deg, #16a085, #8e44ad)'
  },
  [PACK_TYPES.UNIVERSAL_PACK]: {
    name: 'Emperor Trunk',
    theme: 'General Pool',
    description: 'A completely random assortment of cards from the general pool.',
    color: 'linear-gradient(135deg, #7f8c8d, #bdc3c7)'
  },
  [PACK_TYPES.BURN_PACK]: {
    name: 'Blazing Hearth',
    theme: 'Burn Focus',
    description: 'Cards specialized in applying the devastating Burn status effect.',
    color: 'linear-gradient(135deg, #d35400, #c0392b)'
  },
  [PACK_TYPES.POISON_PACK]: {
    name: 'Viper Nest',
    theme: 'Poison Focus',
    description: 'Slow acting but lethal Poison cards that drain opponent health.',
    color: 'linear-gradient(135deg, #16a085, #27ae60)'
  },
  [PACK_TYPES.SHIELD_PACK]: {
    name: 'Fortress Core',
    theme: 'Shield Focus',
    description: 'Highly defensive cards to absorb incoming strikes.',
    color: 'linear-gradient(135deg, #2c3e50, #34495e)'
  },
  [PACK_TYPES.SUSTAIN_PACK]: {
    name: 'Elixir Spring',
    theme: 'Sustain Focus',
    description: 'Restores HP and cleanses debuffs to outlast your opponent.',
    color: 'linear-gradient(135deg, #1abc9c, #16a085)'
  },
  [PACK_TYPES.AGGRO_PACK]: {
    name: 'Apex Striker',
    theme: 'High Damage',
    description: 'Pure offensive pressure. High base damage outcomes.',
    color: 'linear-gradient(135deg, #c0392b, #d35400)'
  },
  [PACK_TYPES.CONTROL_PACK]: {
    name: 'Grip of Winter',
    theme: 'Control Focus',
    description: 'Weakens opponent damage and manages the match pacing.',
    color: 'linear-gradient(135deg, #2980b9, #34495e)'
  },
  [PACK_TYPES.STATUS_PACK]: {
    name: 'Affliction Grid',
    theme: 'Status Effects',
    description: 'Applies various status effects: buffs, weaknesses, burn, poison.',
    color: 'linear-gradient(135deg, #f39c12, #8e44ad)'
  },
  [PACK_TYPES.COUNTER_PACK]: {
    name: 'Mirror Shield',
    theme: 'Inferior Benefits',
    description: 'Contains cards that excel when they lose a clash.',
    color: 'linear-gradient(135deg, #2c3e50, #e74c3c)'
  },
  [PACK_TYPES.RISK_PACK]: {
    name: 'Reckless Gambit',
    theme: 'Self-Harm & Power',
    description: 'High reward cards that demand HP or apply self debuffs.',
    color: 'linear-gradient(135deg, #e74c3c, #2c3e50)'
  },
  [PACK_TYPES.GAMBLER_PACK]: {
    name: 'Chaos Casino',
    theme: 'High Variance',
    description: 'Roll the dice with extreme damage variance and self-inflicted pain.',
    color: 'linear-gradient(135deg, #d35400, #2c3e50)'
  },
  [PACK_TYPES.REVENGE_PACK]: {
    name: 'Vengeance Spur',
    theme: 'Recovery Focus',
    description: 'Payoffs when losing clashes combined with restoration.',
    color: 'linear-gradient(135deg, #c0392b, #8e44ad)'
  },
  [PACK_TYPES.TRAP_PACK]: {
    name: 'Ambush Satchel',
    theme: 'Trickster Focus',
    description: 'Deceptive cards with powerful neutral or inferior results.',
    color: 'linear-gradient(135deg, #2c3e50, #16a085)'
  },
  [PACK_TYPES.DRAFT_EXCLUSIVE_PACK]: {
    name: 'Astral Rift (LEGENDARY)',
    theme: 'Draft Exclusive',
    description: 'Contains legendary, draft-only cards with powerful game-warping abilities.',
    color: 'linear-gradient(135deg, #f1c40f, #8e44ad)'
  }
};

module.exports = {
  PORT,
  MAX_HP,
  HAND_SIZE,
  ELEMENTS,
  CLASH_RULES,
  CARD_POOL,
  PACK_TYPES,
  PACK_POOL
};

