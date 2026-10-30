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
    icon: 'fa-seedling',
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
    description: 'When obtaining Superior outcome: deal 4 extra damage per stack.',
    quality: 'EPIC',
    icon: 'fa-forward-fast',
    effect: { type: 'outcome_damage', outcome: 'SUPERIOR', value: 4 }
  },
  elemental_harmony: {
    id: 'elemental_harmony',
    name: 'Elemental Harmony',
    description: 'All Fire, Water, and Nature cards: +2 Damage per stack.',
    quality: 'EPIC',
    icon: 'fa-circle-nodes',
    effect: { type: 'multi_element_damage', elements: ['FIRE', 'WATER', 'NATURE'], value: 2 }
  },

  // LEGENDARY
  defiant_heart: {
    id: 'defiant_heart',
    name: 'Defiant Heart',
    description: 'When obtaining Inferior outcome: gain <span class="kw-buff">BUFF [2]</span> per stack.',
    quality: 'LEGENDARY',
    icon: 'fa-shield-heart',
    effect: { type: 'outcome_status_self', outcome: 'INFERIOR', status: 'attackBuff', value: 2 }
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
    icon: 'fa-heart-pulse',
    effect: { type: 'max_hp', value: 25 }
  },
  relic_shield_regen_rare: {
    id: 'relic_shield_regen_rare',
    name: 'Bastion Shield',
    description: 'At the start of each turn: gain 5 Shield per stack.',
    quality: 'RARE',
    icon: 'fa-shield',
    effect: { type: 'start_round_shield', value: 5 }
  },
  relic_vitality_epic: {
    id: 'relic_vitality_epic',
    name: 'Godly Vitality',
    description: 'Permanent +40 Max HP and HP per stack.',
    quality: 'EPIC',
    icon: 'fa-heart-pulse',
    effect: { type: 'max_hp', value: 40 }
  },
  relic_shield_regen_legendary: {
    id: 'relic_shield_regen_legendary',
    name: 'Aegis Shield',
    description: 'At the start of each turn: gain 10 Shield per stack.',
    quality: 'LEGENDARY',
    icon: 'fa-shield',
    effect: { type: 'start_round_shield', value: 10 }
  },
  relic_focused_soul: {
    id: 'relic_focused_soul',
    name: 'First Spark',
    description: 'At the start of each round: gain 5 Attack Buff per stack.',
    quality: 'EPIC',
    icon: 'fa-bolt',
    effect: { type: 'start_round_buff', value: 5 }
  },

  // Prep Phase Reroll (Hourglass Family)
  relic_prep_reroll_common: {
    id: 'relic_prep_reroll_common',
    name: 'Temporal Hourglass',
    description: 'Gain +1 Prep Phase Reroll charge each preparation phase per stack.',
    quality: 'COMMON',
    icon: 'fa-hourglass-start',
    effect: { type: 'prep_reroll_bonus', value: 1 }
  },
  relic_prep_reroll_rare: {
    id: 'relic_prep_reroll_rare',
    name: 'Temporal Hourglass',
    description: 'Gain +2 Prep Phase Reroll charge each preparation phase per stack.',
    quality: 'RARE',
    icon: 'fa-hourglass-start',
    effect: { type: 'prep_reroll_bonus', value: 2 }
  },

  // Shield Piercers (Piercer Blade Family)
  relic_shield_piercer_epic: {
    id: 'relic_shield_piercer_epic',
    name: 'Shard Piercer',
    description: 'When dealing clash damage to an opponent with Shield: deal +5 extra damage per stack.',
    quality: 'EPIC',
    icon: 'fa-khanda',
    effect: { type: 'shield_piercer', value: 5 }
  },
  relic_shield_piercer_legendary: {
    id: 'relic_shield_piercer_legendary',
    name: 'Nullifier Edge',
    description: 'When dealing clash damage to an opponent with Shield: deal +10 extra damage per stack.',
    quality: 'LEGENDARY',
    icon: 'fa-khanda',
    effect: { type: 'shield_piercer', value: 10 }
  },

  // Reactive Cleanse
  relic_reactive_cleanse_legendary: {
    id: 'relic_reactive_cleanse_legendary',
    name: 'Purifying Amulet',
    description: 'When you take HP damage from a card clash: instantly cleanse all your Poison, Burn, and Weakness stacks. (Unique - max 1)',
    quality: 'LEGENDARY',
    icon: 'fa-hand-sparkles',
    unique: true,
    maxStacks: 1,
    effect: { type: 'reactive_cleanse' }
  },

  // Spite Thorns (Briar Armor - Epic quality)
  relic_spite_thorns_epic: {
    id: 'relic_spite_thorns_epic',
    name: 'Briar Armor',
    description: 'When you take HP damage (clash or status tick): deal 3 true damage to your opponent per stack.',
    quality: 'EPIC',
    icon: 'fa-shield-virus',
    effect: { type: 'spite_thorns', value: 3 }
  },

  // Desperation (Scaling damage as HP drops)
  relic_desperation_rare: {
    id: 'relic_desperation_rare',
    name: 'Desperation',
    description: 'Deal +1 bonus damage for every 10 HP missing from your Max HP.',
    quality: 'RARE',
    icon: 'fa-skull',
    effect: { type: 'desperation_scaling', value: 1 }
  },

  // Chaos Affinity (Smooths Chaos curve)
  relic_chaos_affinity_rare: {
    id: 'relic_chaos_affinity_rare',
    name: 'Chaos Affinity',
    description: 'Increase damage dealt by your Chaos cards by +2 per stack.',
    quality: 'RARE',
    icon: 'fa-burst',
    effect: { type: 'element_mastery', element: 'CHAOS', value: 2 }
  },

  // Phoenix Heart
  relic_phoenix_down_legendary: {
    id: 'relic_phoenix_down_legendary',
    name: 'Phoenix Heart',
    description: 'Once per round: when your HP would drop to 0 or below, restore your HP to 30 and inflict <span class="kw-burn">BURN [2]</span> on opponent. (Unique - max 1)',
    quality: 'LEGENDARY',
    icon: 'fa-feather-pointed',
    unique: true,
    maxStacks: 1,
    effect: { type: 'phoenix_resurrection', value: 30 }
  },

  // Venomheart Briar
  relic_venomheart_briar_legendary: {
    id: 'relic_venomheart_briar_legendary',
    name: 'Venomheart Briar',
    quality: 'LEGENDARY',
    icon: 'fa-heart-crack',
    unique: true,
    maxStacks: 1,
    description: 'Your Thorns no longer deal instant damage. Instead, attackers are Poisoned equal to the Thorns damage (max 3 stacks per trigger).',
    effect: { type: 'venomheart_briar' }
  }
};

module.exports = {
  RELIC_POOL
};
