const RELIC_POOL = {
  // COMMON
  steady_resolve: {
    id: 'steady_resolve',
    name: 'Steady Resolve',
    description: 'When obtaining Neutral outcome: gain 3 Shield per stack.',
    quality: 'COMMON',
    icon: 'fa-shield-halved',
    effect: { type: 'outcome_shield', outcome: 'NEUTRAL', value: 3 }
  },
  nature_affinity: {
    id: 'nature_affinity',
    name: 'Nature Affinity',
    description: 'All Nature cards: +2 Heal per stack.',
    quality: 'COMMON',
    icon: 'fa-heart-pulse',
    effect: { type: 'element_heal', element: 'NATURE', value: 2 }
  },
  frozen_shield: {
    id: 'frozen_shield',
    name: 'Frozen Shield',
    description: 'All Water cards: gain 2 Shield on Superior outcome per stack.',
    quality: 'COMMON',
    icon: 'fa-snowflake',
    effect: { type: 'element_outcome_shield', element: 'WATER', outcome: 'SUPERIOR', value: 2 }
  },
  iron_grit: {
    id: 'iron_grit',
    name: 'Iron Grit',
    description: 'All Neutral cards: gain 2 Shield on Neutral outcome per stack.',
    quality: 'COMMON',
    icon: 'fa-dumbbell',
    effect: { type: 'element_outcome_shield', element: 'NEUTRAL', outcome: 'NEUTRAL', value: 2 }
  },

  // RARE
  fire_mastery: {
    id: 'fire_mastery',
    name: 'Fire Mastery',
    description: 'All Fire cards: +2 Damage per stack.',
    quality: 'RARE',
    icon: 'fa-fire',
    effect: { type: 'element_damage', element: 'FIRE', value: 2 }
  },
  water_mastery: {
    id: 'water_mastery',
    name: 'Water Mastery',
    description: 'All Water cards: +2 Damage per stack.',
    quality: 'RARE',
    icon: 'fa-droplet',
    effect: { type: 'element_damage', element: 'WATER', value: 2 }
  },
  nature_mastery: {
    id: 'nature_mastery',
    name: 'Nature Mastery',
    description: 'All Nature cards: +2 Damage per stack.',
    quality: 'RARE',
    icon: 'fa-leaf',
    effect: { type: 'element_damage', element: 'NATURE', value: 2 }
  },
  ember_spark: {
    id: 'ember_spark',
    name: 'Ember Spark',
    description: 'All Fire cards apply +1 Burn on Superior outcome per stack.',
    quality: 'RARE',
    icon: 'fa-fire-flame-curved',
    effect: { type: 'element_outcome_status', element: 'FIRE', outcome: 'SUPERIOR', status: 'burn', value: 1 }
  },
  venomous_brambles: {
    id: 'venomous_brambles',
    name: 'Venomous Brambles',
    description: 'All Nature cards apply +1 Poison on Superior outcome per stack.',
    quality: 'RARE',
    icon: 'fa-wheat-awn-circle-exclamation',
    effect: { type: 'element_outcome_status', element: 'NATURE', outcome: 'SUPERIOR', status: 'poison', value: 1 }
  },

  // EPIC
  tidal_wisdom: {
    id: 'tidal_wisdom',
    name: 'Tidal Wisdom',
    description: 'At the start of each round: gain 4 Shield per stack.',
    quality: 'EPIC',
    icon: 'fa-water',
    effect: { type: 'start_round_shield', value: 4 }
  },
  burning_core: {
    id: 'burning_core',
    name: 'Burning Core',
    description: 'Burn deals +1 damage per stack of burn, per stack of relic.',
    quality: 'EPIC',
    icon: 'fa-sun',
    effect: { type: 'burn_damage_boost', value: 1 }
  },
  toxic_catalyst: {
    id: 'toxic_catalyst',
    name: 'Toxic Catalyst',
    description: 'Poison deals +1 damage per stack of poison, per stack of relic.',
    quality: 'EPIC',
    icon: 'fa-biohazard',
    effect: { type: 'poison_damage_boost', value: 1 }
  },
  aggressive_momentum: {
    id: 'aggressive_momentum',
    name: 'Aggressive Momentum',
    description: 'When obtaining Superior outcome: deal 2 extra damage per stack.',
    quality: 'EPIC',
    icon: 'fa-bolt',
    effect: { type: 'outcome_damage', outcome: 'SUPERIOR', value: 2 }
  },
  elemental_harmony: {
    id: 'elemental_harmony',
    name: 'Elemental Harmony',
    description: 'All Fire, Water, and Nature cards: +1 Damage per stack.',
    quality: 'EPIC',
    icon: 'fa-circle-nodes',
    effect: { type: 'multi_element_damage', elements: ['FIRE', 'WATER', 'NATURE'], value: 1 }
  },

  // LEGENDARY
  chaos_engine: {
    id: 'chaos_engine',
    name: 'Chaos Engine',
    description: 'Chaos cards: +3 Damage per stack. Inferior outcome: take 3 self damage per stack.',
    quality: 'LEGENDARY',
    icon: 'fa-gear',
    effect: { type: 'chaos_engine_double', damageVal: 3, selfDamageVal: 3 }
  },
  last_stand: {
    id: 'last_stand',
    name: 'Last Stand',
    description: 'When obtaining Inferior outcome: gain Buff(1) per stack.',
    quality: 'LEGENDARY',
    icon: 'fa-shield-heart',
    effect: { type: 'outcome_status_self', outcome: 'INFERIOR', status: 'attackBuff', value: 1 }
  },
  relic_vitality_common: {
    id: 'relic_vitality_common',
    name: 'Vitality Boost',
    description: 'Permanent +15 Max HP and HP per stack.',
    quality: 'COMMON',
    icon: 'fa-heart-pulse',
    effect: { type: 'max_hp', value: 15 }
  },
  relic_shield_regen_common: {
    id: 'relic_shield_regen_common',
    name: 'Fortress Shell',
    description: 'At the start of each turn: gain 3 Shield per stack.',
    quality: 'COMMON',
    icon: 'fa-shield',
    effect: { type: 'start_round_shield', value: 3 }
  },
  relic_vitality_rare: {
    id: 'relic_vitality_rare',
    name: 'Iron Vitality',
    description: 'Permanent +25 Max HP and HP per stack.',
    quality: 'RARE',
    icon: 'fa-heart-circle-plus',
    effect: { type: 'max_hp', value: 25 }
  },
  relic_shield_regen_rare: {
    id: 'relic_shield_regen_rare',
    name: 'Bastion Shield',
    description: 'At the start of each turn: gain 5 Shield per stack.',
    quality: 'RARE',
    icon: 'fa-shield-halved',
    effect: { type: 'start_round_shield', value: 5 }
  },
  relic_vitality_epic: {
    id: 'relic_vitality_epic',
    name: 'Godly Vitality',
    description: 'Permanent +40 Max HP and HP per stack.',
    quality: 'EPIC',
    icon: 'fa-heart-circle-bolt',
    effect: { type: 'max_hp', value: 40 }
  },
  relic_shield_regen_epic: {
    id: 'relic_shield_regen_epic',
    name: 'Aegis Shield',
    description: 'At the start of each turn: gain 8 Shield per stack.',
    quality: 'EPIC',
    icon: 'fa-shield-halved',
    effect: { type: 'start_round_shield', value: 8 }
  },
  relic_focused_soul: {
    id: 'relic_focused_soul',
    name: 'Focused Soul',
    description: 'At the start of each round: gain 1 Attack Buff per stack.',
    quality: 'EPIC',
    icon: 'fa-bolt',
    effect: { type: 'start_round_buff', value: 1 }
  }
};

module.exports = {
  RELIC_POOL
};
