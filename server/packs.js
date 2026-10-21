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
  PACK_TYPES,
  PACK_POOL
};
