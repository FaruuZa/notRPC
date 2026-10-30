const { RELIC_POOL } = require('./relics');
const { getCardProfile } = require('./cardProfiler');

/**
 * REFACTORED QUEST TEMPLATES
 * 
 * Supports two distinct quest template types:
 * 1. Scalable Templates: Define per-tier parameters (EASY, MEDIUM, HARD) where targets and text scale.
 * 2. Tier-Exclusive Templates: Defined strictly for specific difficulties (e.g., streaks, thresholds, or rare archetypes).
 */
const QUEST_TEMPLATES = [
  // ==========================================
  // 1. SCALABLE QUEST TEMPLATES
  // ==========================================

  // Damage Quests (Hard updated from 50 to 70!)
  {
    id: 'deal_damage',
    category: 'damage',
    tags: ['damage'],
    tiers: {
      EASY:   { target: 30, text: 'Deal 30 damage in battle' },
      MEDIUM: { target: 50, text: 'Deal 50 damage in battle' },
      HARD:   { target: 70, text: 'Deal 70 damage in battle' }
    }
  },

  // Damage Taken Quests (Endure / Survival)
  {
    id: 'take_damage',
    category: 'damage_taken',
    tags: ['damage_taken'],
    tiers: {
      EASY:   { target: 20, text: 'Take 20 damage in battle' },
      MEDIUM: { target: 40, text: 'Take 40 damage in battle' },
      HARD:   { target: 60, text: 'Take 60 damage in battle' }
    }
  },

  // Superior Outcomes
  {
    id: 'superior_outcome',
    category: 'outcome',
    tags: ['outcome', 'superior'],
    tiers: {
      EASY:   { target: 2, text: 'Superior outcome 2 times' },
      MEDIUM: { target: 3, text: 'Superior outcome 3 times' },
    }
  },

  // Neutral Outcomes
  {
    id: 'neutral_outcome',
    category: 'outcome',
    tags: ['outcome', 'neutral'],
    tiers: {
      EASY:   { target: 2, text: 'Neutral outcome 2 times' },
      MEDIUM: { target: 4, text: 'Neutral outcome 4 times' },
    }
  },

  // Burn Status Quests
  {
    id: 'apply_burn',
    category: 'burn',
    tags: ['burn'],
    tiers: {
      EASY:   { target: 2, text: 'Apply Burn 2 times' },
      MEDIUM: { target: 4, text: 'Apply Burn 4 times' },
      HARD:   { target: 7, text: 'Apply Burn 7 times' }
    }
  },

  // Poison Status Quests
  {
    id: 'apply_poison',
    category: 'poison',
    tags: ['poison'],
    tiers: {
      EASY:   { target: 2, text: 'Apply Poison 2 times' },
      MEDIUM: { target: 4, text: 'Apply Poison 4 times' },
      HARD:   { target: 7, text: 'Apply Poison 7 times' }
    }
  },

  // Shield Quests (Lowered targets: 10, 20, 35)
  {
    id: 'gain_shield',
    category: 'shield',
    tags: ['shield'],
    tiers: {
      EASY:   { target: 10, text: 'Gain 10 Shield in battle' },
      MEDIUM: { target: 20, text: 'Gain 20 Shield in battle' },
      HARD:   { target: 35, text: 'Gain 35 Shield in battle' }
    }
  },

  // Cleanse Debuffs Quests (MEDIUM: 1, HARD: 3)
  {
    id: 'cleanse_debuff',
    category: 'cleanse',
    tags: ['cleanse'],
    tiers: {
      MEDIUM: { target: 1, text: 'Cleanse debuffs 1 time' },
      HARD:   { target: 3, text: 'Cleanse debuffs 3 times' }
    }
  },

  // Dispel Enemy Buffs Quests (MEDIUM: 1, HARD: 3)
  {
    id: 'dispel_buff',
    category: 'dispel',
    tags: ['dispel'],
    tiers: {
      MEDIUM: { target: 1, text: 'Dispel enemy buffs 1 time' },
      HARD:   { target: 3, text: 'Dispel enemy buffs 3 times' }
    }
  },

  // Heal Quests
  {
    id: 'heal_hp',
    category: 'heal',
    tags: ['heal'],
    tiers: {
      EASY:   { target: 5, text: 'Heal 5 HP in battle' },
      MEDIUM: { target: 10, text: 'Heal 10 HP in battle' },
      HARD:   { target: 30, text: 'Heal 30 HP in battle' }
    }
  },

  // Buff Stacks Quests
  {
    id: 'gain_buff',
    category: 'buff',
    tags: ['buff'],
    tiers: {
      EASY:   { target: 2, text: 'Gain Buff 2 times' },
      MEDIUM: { target: 4, text: 'Gain Buff 4 times' },
      HARD:   { target: 7, text: 'Gain Buff 7 times' }
    }
  },

  // Weakness Stacks Quests
  {
    id: 'apply_weak',
    category: 'weak',
    tags: ['weak'],
    tiers: {
      EASY:   { target: 2, text: 'Apply Weakness 2 times' },
      MEDIUM: { target: 4, text: 'Apply Weakness 4 times' },
      HARD:   { target: 7, text: 'Apply Weakness 7 times' }
    }
  },

  // Elemental Play Quests (Primary Elements)
  {
    id: 'play_fire',
    category: 'element',
    tags: ['fire'],
    tiers: {
      EASY:   { target: 2, text: 'Play 2 Fire cards' },
      MEDIUM: { target: 5, text: 'Play 5 Fire cards' },
    }
  },
  {
    id: 'play_water',
    category: 'element',
    tags: ['water'],
    tiers: {
      EASY:   { target: 2, text: 'Play 2 Water cards' },
      MEDIUM: { target: 5, text: 'Play 5 Water cards' },
    }
  },
  {
    id: 'play_nature',
    category: 'element',
    tags: ['nature'],
    tiers: {
      EASY:   { target: 2, text: 'Play 2 Nature cards' },
      MEDIUM: { target: 5, text: 'Play 5 Nature cards' },
    }
  },

  // ==========================================
  // 2. TIER-EXCLUSIVE QUEST TEMPLATES
  // ==========================================

  // Streak Outcomes (HARD only)
  {
    id: 'superior_3_row',
    category: 'streak',
    tags: ['outcome', 'superior', 'row'],
    tiers: {
      HARD: { target: 3, text: 'Superior 3 times in a row' }
    }
  },
  {
    id: 'neutral_4_row',
    category: 'streak',
    tags: ['outcome', 'neutral', 'row'],
    tiers: {
      HARD: { target: 4, text: 'Neutral 4 times in a row' }
    }
  },

  // Inferior Streak (HARD only)
  {
    id: 'inferior_3_row',
    category: 'streak',
    tags: ['outcome', 'inferior', 'row'],
    tiers: {
      HARD: { target: 3, text: 'Inferior 3 times in a row' }
    }
  },

  // Burn Damage Tick (HARD only)
  {
    id: 'deal_15_burn',
    category: 'burn_dmg',
    tags: ['burn'],
    tiers: {
      HARD: { target: 15, text: 'Deal 15 Burn damage' }
    }
  },

  // Peak Buff (HARD only)
  {
    id: 'reach_buff_5',
    category: 'buff_threshold',
    tags: ['buff'],
    tiers: {
      HARD: { target: 5, text: 'Reach Buff(5) in battle' }
    }
  },

  {
    id: 'play_chaos',
    category: 'element',
    tags: ['chaos'],
    tiers: {
      MEDIUM: { target: 4, text: 'Play 4 Chaos cards' },
    }
  },

  // Neutral Cards (EASY & MEDIUM only)
  {
    id: 'play_neutral',
    category: 'element',
    tags: ['neutral'],
    tiers: {
      EASY:   { target: 2, text: 'Play 2 Neutral cards' },
      MEDIUM: { target: 4, text: 'Play 4 Neutral cards' }
    }
  }
];

const DIFFICULTY_RANK = { EASY: 1, MEDIUM: 2, HARD: 3 };

/**
 * Guaranteed removal token yield per quest difficulty tier.
 * Easy now awards 1 token (up from 0).
 */
function getRemovalTokenReward(difficulty) {
  if (difficulty === 'EASY') return 1;
  if (difficulty === 'MEDIUM') return 2;
  if (difficulty === 'HARD') return 4;
  return 1;
}

/**
 * Reward Pool metadata for UI transparency and server roll mechanics.
 */
const TIER_REWARD_POOLS = {
  EASY: {
    relicChance: 0.80,
    relicQualities: [
      { quality: 'COMMON', weight: 0.9 },
      { quality: 'RARE', weight: 0.1 }
    ],
    nonRelicType: 'bonus_draft',
    nonRelicChance: 0.20,
    nonRelicText: 'Bonus Draft Pick (1 Card)',
    removalTokens: 1,
    summaryText: '80% Common / Rare Relic · 20% Bonus Draft Pick',
    perks: [
      { icon: 'fa-gift', label: '80% Common / Rare Relic' },
      { icon: 'fa-layer-group', label: '20% Bonus Draft Pick' }
    ]
  },
  MEDIUM: {
    relicChance: 0.70,
    relicQualities: [
      { quality: 'RARE', weight: 0.8 },
      { quality: 'EPIC', weight: 0.2 }
    ],
    nonRelicType: 'bonus_draft',
    nonRelicChance: 0.30,
    nonRelicText: 'Bonus Draft Pick (1 Card)',
    removalTokens: 2,
    summaryText: '70% Rare / Epic Relic · 30% Bonus Draft Pick',
    perks: [
      { icon: 'fa-gift', label: '70% Rare / Epic Relic' },
      { icon: 'fa-layer-group', label: '30% Bonus Draft Pick' }
    ]
  },
  HARD: {
    relicChance: 0.70,
    relicQualities: [
      { quality: 'EPIC', weight: 0.80 },
      { quality: 'LEGENDARY', weight: 0.20 }
    ],
    nonRelicType: 'bonus_pack',
    nonRelicChance: 0.30,
    nonRelicText: 'Bonus 4-Card Pack',
    removalTokens: 4,
    summaryText: '70% Epic / Legendary Relic · 30% Bonus Pack',
    perks: [
      { icon: 'fa-gift', label: '70% Epic / Legendary Relic' },
      { icon: 'fa-box-open', label: '30% Bonus 4-Card Pack' }
    ]
  }
};

/**
 * Generates a main reward matched to a quest tier / difficulty.
 * Used upon quest completion (or during legacy preview).
 */
function generateReward(difficulty) {
  const pool = TIER_REWARD_POOLS[difficulty] || TIER_REWARD_POOLS.EASY;
  const roll = Math.random();

  if (roll < pool.relicChance) {
    let quality = pool.relicQualities[0].quality;
    if (pool.relicQualities.length > 1) {
      const qRoll = Math.random();
      let cumulative = 0;
      for (const q of pool.relicQualities) {
        cumulative += q.weight;
        if (qRoll < cumulative) {
          quality = q.quality;
          break;
        }
      }
    }
    return { type: 'relic', quality, text: `${quality} Relic` };
  } else {
    if (pool.nonRelicType === 'bonus_pack') {
      return { type: 'bonus_pack', text: pool.nonRelicText };
    } else {
      return { type: 'bonus_draft', text: pool.nonRelicText };
    }
  }
}

/**
 * Realistic maximum quest progress capacity per round based on deck and relics.
 */
function questCapacity(quest, deck, relics = {}) {
  const tags = quest.tags || [];

  // Outcome, damage, and streak quests are not constrained by card status capacity
  if (tags.some(t => ['outcome', 'damage', 'damage_taken', 'row', 'streak', 'superior', 'neutral', 'inferior'].includes(t))) {
    return null;
  }

  const profiles = (deck || []).map(c => getCardProfile(c)).filter(Boolean);

  if (tags.includes('burn')) {
    const hasEmberSpark = (relics?.ember_spark || 0) > 0;
    const emberMultiplier = relics?.ember_spark || 1;
    const fireCardsCount = (deck || []).filter(c => c.element === 'FIRE').length;
    const emberBonus = hasEmberSpark ? fireCardsCount * emberMultiplier * 0.75 : 0;
    const oppBurnStacks = profiles.reduce((sum, p) => sum + (p.effectiveOppBurnStacks || 0), 0) + emberBonus;

    if (quest.id === 'deal_15_burn' || quest.templateId === 'deal_15_burn') {
      const burningCoreStacks = relics?.burning_core || 0;
      const dmgPerBurn = 3 * (1 + burningCoreStacks);
      return dmgPerBurn * 2 * oppBurnStacks;
    }
    return 2 * oppBurnStacks;
  }

  if (tags.includes('poison')) {
    const hasVenomousBrambles = (relics?.venomous_brambles || 0) > 0;
    const brambleMultiplier = relics?.venomous_brambles || 1;
    const natureCardsCount = (deck || []).filter(c => c.element === 'NATURE').length;
    const brambleBonus = hasVenomousBrambles ? natureCardsCount * brambleMultiplier * 0.75 : 0;
    const oppPoisonStacks = profiles.reduce((sum, p) => sum + (p.effectiveOppPoisonStacks || 0), 0) + brambleBonus;
    return 2 * oppPoisonStacks;
  }

  if (tags.includes('weak')) {
    const oppWeakStacks = profiles.reduce((sum, p) => sum + (p.effectiveOppWeakStacks || 0), 0);
    return 2 * oppWeakStacks;
  }

  if (tags.includes('buff')) {
    const selfBuffStacks = profiles.reduce((sum, p) => sum + (p.effectiveSelfBuffStacks || 0), 0);
    if (quest.id === 'reach_buff_5' || quest.templateId === 'reach_buff_5') {
      return selfBuffStacks;
    }
    return 2 * selfBuffStacks;
  }

  if (tags.includes('shield')) {
    const shieldSum = profiles.reduce((sum, p) => sum + (p.shieldSum || 0), 0);
    return 2 * shieldSum;
  }

  if (tags.includes('heal')) {
    const healSum = profiles.reduce((sum, p) => sum + (p.healSum || 0), 0);
    return 2 * healSum;
  }

  if (tags.includes('cleanse')) {
    const hasPurifyingAmulet = (relics?.relic_reactive_cleanse_legendary || 0) > 0;
    const cleanseCount = profiles.filter(p => p.hasSelfCleanse).length + (hasPurifyingAmulet ? 2 : 0);
    return cleanseCount * 2;
  }

  if (tags.includes('dispel')) {
    const dispelCount = profiles.filter(p => p.hasOppDispel).length;
    return dispelCount * 2;
  }

  // Element Quests
  for (const elem of ['fire', 'water', 'nature', 'chaos', 'neutral']) {
    if (tags.includes(elem)) {
      const count = (deck || []).filter(c => c.element === elem.toUpperCase()).length;
      return count * 2;
    }
  }

  return 0;
}

/**
 * Checks if a specific quest target is feasible for the player's current deck and relics.
 */
function isQuestFeasible(quest, deck, relics = {}) {
  const capacity = questCapacity(quest, deck, relics);
  if (capacity === null) {
    // Damage and outcome quests are always achievable
    return true;
  }
  if (!quest.target || quest.target <= 0) return true;
  const ratio = capacity / quest.target;
  return ratio >= 1.15;
}

/**
 * Instantiates a concrete quest instance from a template for a given tier.
 */
function instantiateQuest(template, tier) {
  const tierConfig = template.tiers?.[tier];
  if (!tierConfig) return null;

  return {
    id: `${template.id}_${tier.toLowerCase()}`,
    templateId: template.id,
    text: tierConfig.text,
    tags: [...template.tags],
    difficulty: tier,
    tier: tier,
    target: tierConfig.target,
    removalTokens: getRemovalTokenReward(tier),
    reward: null // Rolled upon completion in Blind Pick, or populated on demand
  };
}

/**
 * Returns all feasible quest instances for a given difficulty tier.
 */
function getFeasibleQuestsForTier(deck, relics = {}, tier) {
  const candidates = [];
  for (const template of QUEST_TEMPLATES) {
    if (!template.tiers || !template.tiers[tier]) continue;
    const instance = instantiateQuest(template, tier);
    if (isQuestFeasible(instance, deck, relics)) {
      candidates.push(instance);
    }
  }
  return candidates;
}

/**
 * Generates the 3 Blind Pick Tier Offers for Stage 1.
 * Payload exposes ONLY tier metadata and reward pool ranges — no quest details.
 */
function getTierOffers(deck, relics = {}) {
  const tiers = ['EASY', 'MEDIUM', 'HARD'];
  return tiers.map(tier => {
    const feasible = getFeasibleQuestsForTier(deck, relics, tier);
    const pool = TIER_REWARD_POOLS[tier];
    return {
      tier,
      available: feasible.length > 0,
      candidateCount: feasible.length,
      removalTokens: getRemovalTokenReward(tier),
      summaryText: pool.summaryText,
      perks: pool.perks || [],
      pool: {
        relicChance: pool.relicChance,
        relicQualities: pool.relicQualities,
        nonRelicType: pool.nonRelicType,
        nonRelicChance: pool.nonRelicChance,
        nonRelicText: pool.nonRelicText
      }
    };
  });
}

/**
 * Draws a single quest for the selected tier (Stage 2 or Reroll Stage 3).
 * Excludes previously rejected quests during rerolls.
 */
function drawQuestForTier(deck, relics = {}, tier, excludeIds = []) {
  let candidates = getFeasibleQuestsForTier(deck, relics, tier);

  if (excludeIds && excludeIds.length > 0) {
    const filtered = candidates.filter(c => !excludeIds.includes(c.id) && !excludeIds.includes(c.templateId));
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  // Guaranteed fallback: Outcome or damage quests for this tier always exist
  if (candidates.length === 0) {
    candidates = QUEST_TEMPLATES
      .filter(t => t.tiers && t.tiers[tier] && t.tags.some(tag => ['damage', 'outcome'].includes(tag)))
      .map(t => instantiateQuest(t, tier));
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const pool = TIER_REWARD_POOLS[tier] || TIER_REWARD_POOLS.EASY;
  return {
    ...picked,
    reward: null, // Rolled on completion at end of battle, hidden during round!
    rewardPoolText: pool.summaryText,
    rewardPoolPerks: pool.perks || []
  };
}

/**
 * Generates 3 deck-aware quests (1 Easy, 1 Medium, 1 Hard) for backward compatibility.
 */
function generatePlayerQuests(deck, relics = {}) {
  return ['EASY', 'MEDIUM', 'HARD'].map(tier => drawQuestForTier(deck, relics, tier));
}

/**
 * Backward compatibility helper for legacy feasibility check.
 */
function isQuestSupported(quest, deck, relics = {}) {
  return isQuestFeasible(quest, deck, relics);
}

/**
 * Backward compatibility helper for effective difficulty.
 */
function getEffectiveDifficulty(quest, deck, relics = {}) {
  const feasible = isQuestFeasible(quest, deck, relics);
  return {
    feasible,
    effectiveDifficulty: quest.difficulty || 'MEDIUM',
    ratio: 1.5
  };
}

/**
 * Updates a player's quest progress after a round clash.
 * Robust matching supports both new template IDs and legacy IDs.
 */
function updateQuestProgress(player, outcome, damageDealt, shieldGain, healGain, cardPlayed, appliedBurnToOpponent, appliedPoisonToOpponent, appliedBuffToSelf, appliedWeakToOpponent, opponentBurnTickDmg, damageTaken = 0, cleanseSuccess = false, dispelSuccess = false) {
  if (!player.activeQuest) return;

  const q = player.activeQuest;
  if (player.questProgress >= q.target) return;

  const templateId = q.templateId || q.id;
  let progressDelta = 0;

  // 1. Damage Dealt Quests
  if (templateId === 'deal_damage' || q.tags?.includes('damage') || q.id?.startsWith('deal_damage') || q.id === 'deal_30' || q.id === 'deal_50' || q.id === 'deal_70') {
    progressDelta = damageDealt;
  }
  // 1b. Damage Taken Quests
  else if (templateId === 'take_damage' || q.tags?.includes('damage_taken') || q.id?.startsWith('take_damage')) {
    progressDelta = damageTaken;
  }
  // 2. Streaks: Superior X in a row
  else if (
    templateId === 'superior_3_row' ||
    templateId === 'superior_4_row' ||
    templateId === 'superior_2_row' ||
    q.id?.startsWith('superior_3_row') ||
    q.id?.startsWith('superior_4_row') ||
    q.id?.startsWith('superior_2_row') ||
    (q.tags?.includes('superior') && (q.tags?.includes('row') || q.category === 'streak' || q.text?.toLowerCase().includes('in a row')))
  ) {
    if (outcome === 'SUPERIOR') {
      progressDelta = 1;
    } else {
      player.questProgress = 0;
    }
  }
  // 3. Streaks: Neutral X in a row
  else if (
    templateId === 'neutral_4_row' ||
    templateId === 'neutral_3_row' ||
    q.id?.startsWith('neutral_4_row') ||
    q.id?.startsWith('neutral_3_row') ||
    (q.tags?.includes('neutral') && (q.tags?.includes('row') || q.category === 'streak' || q.text?.toLowerCase().includes('in a row')))
  ) {
    if (outcome === 'NEUTRAL') {
      progressDelta = 1;
    } else {
      player.questProgress = 0;
    }
  }
  // 4. Streaks: Inferior X in a row
  else if (
    templateId === 'inferior_3_row' ||
    templateId === 'inferior_4' ||
    templateId === 'inferior_4_row' ||
    q.id?.startsWith('inferior_3_row') ||
    q.id?.startsWith('inferior_4') ||
    (q.tags?.includes('inferior') && (q.tags?.includes('row') || q.category === 'streak' || q.text?.toLowerCase().includes('in a row')))
  ) {
    if (outcome === 'INFERIOR') {
      progressDelta = 1;
    } else {
      player.questProgress = 0;
    }
  }
  // 5. Cumulative Superior Outcomes (Count)
  else if (
    templateId === 'superior_outcome' ||
    q.id?.startsWith('superior_outcome') ||
    (q.tags?.includes('superior') && q.tags?.includes('outcome')) ||
    q.id === 'superior_3' || q.id === 'superior_4' || q.id === 'superior_5'
  ) {
    if (outcome === 'SUPERIOR') progressDelta = 1;
  }
  // 6. Cumulative Neutral Outcomes (Count)
  else if (
    templateId === 'neutral_outcome' ||
    q.id?.startsWith('neutral_outcome') ||
    (q.tags?.includes('neutral') && q.tags?.includes('outcome') && q.category !== 'element') ||
    q.id === 'neutral_3' || q.id === 'neutral_4' || q.id === 'neutral_5'
  ) {
    if (outcome === 'NEUTRAL') progressDelta = 1;
  }
  // 7. Cumulative Inferior Outcomes (Count)
  else if (
    templateId === 'inferior_outcome' ||
    templateId === 'inferior_3' ||
    q.id?.startsWith('inferior_outcome') ||
    (q.tags?.includes('inferior') && q.tags?.includes('outcome'))
  ) {
    if (outcome === 'INFERIOR') progressDelta = 1;
  }
  // 8. Burn Stacks Applied
  else if (templateId === 'apply_burn' || q.id?.startsWith('apply_burn') || (q.tags?.includes('burn') && !q.tags?.includes('burn_dmg') && templateId !== 'deal_15_burn')) {
    progressDelta = appliedBurnToOpponent;
  }
  // 9. Burn Damage Ticks
  else if (templateId === 'deal_15_burn' || q.id?.startsWith('deal_15_burn') || q.category === 'burn_dmg') {
    progressDelta = opponentBurnTickDmg;
  }
  // 10. Poison Stacks Applied
  else if (templateId === 'apply_poison' || q.id?.startsWith('apply_poison') || q.tags?.includes('poison')) {
    progressDelta = appliedPoisonToOpponent;
  }
  // 11. Shield Gained
  else if (templateId === 'gain_shield' || q.id?.startsWith('gain_shield') || q.tags?.includes('shield')) {
    progressDelta = shieldGain;
  }
  // 12. Health Healed
  else if (templateId === 'heal_hp' || q.id?.startsWith('heal_hp') || q.tags?.includes('heal')) {
    progressDelta = healGain;
  }
  // 13. Element: Fire
  else if (templateId === 'play_fire' || q.id?.startsWith('play_fire') || (q.tags?.includes('fire') && q.category === 'element')) {
    if (cardPlayed?.element === 'FIRE') progressDelta = 1;
  }
  // 14. Element: Water
  else if (templateId === 'play_water' || q.id?.startsWith('play_water') || (q.tags?.includes('water') && q.category === 'element')) {
    if (cardPlayed?.element === 'WATER') progressDelta = 1;
  }
  // 15. Element: Nature
  else if (templateId === 'play_nature' || q.id?.startsWith('play_nature') || (q.tags?.includes('nature') && q.category === 'element')) {
    if (cardPlayed?.element === 'NATURE') progressDelta = 1;
  }
  // 16. Element: Chaos
  else if (templateId === 'play_chaos' || q.id?.startsWith('play_chaos') || (q.tags?.includes('chaos') && q.category === 'element')) {
    if (cardPlayed?.element === 'CHAOS') progressDelta = 1;
  }
  // 17. Element: Neutral
  else if (templateId === 'play_neutral' || q.id?.startsWith('play_neutral') || (q.tags?.includes('neutral') && q.category === 'element')) {
    if (cardPlayed?.element === 'NEUTRAL') progressDelta = 1;
  }
  // 18. Buff Stacks Gained
  else if (templateId === 'gain_buff' || q.id?.startsWith('gain_buff') || (q.tags?.includes('buff') && q.category === 'buff')) {
    progressDelta = appliedBuffToSelf;
  }
  // 19. Reach Buff Threshold
  else if (templateId === 'reach_buff_5' || q.id?.startsWith('reach_buff_5') || q.category === 'buff_threshold') {
    const currentBuff = player.statuses?.attackBuff || player.statuses?.buff || 0;
    player.questProgress = Math.min(q.target, Math.max(player.questProgress || 0, currentBuff));
    return;
  }
  // 20. Weakness Applied
  else if (templateId === 'apply_weak' || q.id?.startsWith('apply_weak') || q.tags?.includes('weak')) {
    progressDelta = appliedWeakToOpponent;
  }
  // 21. Cleanse Debuffs (counted when successfully cleansing at least 1 debuff)
  else if (templateId === 'cleanse_debuff' || q.id?.startsWith('cleanse_debuff') || q.tags?.includes('cleanse')) {
    if (cleanseSuccess) progressDelta = 1;
  }
  // 22. Dispel Enemy Buffs (counted when successfully dispelling at least 1 enemy buff)
  else if (templateId === 'dispel_buff' || q.id?.startsWith('dispel_buff') || q.tags?.includes('dispel')) {
    if (dispelSuccess) progressDelta = 1;
  }

  player.questProgress = Math.min(q.target, (player.questProgress || 0) + progressDelta);
}

module.exports = {
  QUEST_TEMPLATES,
  TIER_REWARD_POOLS,
  questCapacity,
  isQuestFeasible,
  instantiateQuest,
  getFeasibleQuestsForTier,
  getTierOffers,
  drawQuestForTier,
  getEffectiveDifficulty,
  isQuestSupported,
  generatePlayerQuests,
  getRemovalTokenReward,
  generateReward,
  updateQuestProgress
};
