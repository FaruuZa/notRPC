const { RELIC_POOL } = require('./relics');
const { getCardProfile } = require('./cardProfiler');

const QUEST_TEMPLATES = [
  // Outcome Quests
  { id: 'superior_4', text: 'Superior outcome 4 times', tags: ['outcome', 'superior'], difficulty: 'MEDIUM', target: 4 },
  { id: 'neutral_4', text: 'Neutral outcome 4 times', tags: ['outcome', 'neutral'], difficulty: 'MEDIUM', target: 4 },
  { id: 'inferior_3', text: 'Inferior outcome 3 times', tags: ['outcome', 'inferior'], difficulty: 'MEDIUM', target: 3 },
  { id: 'superior_2_row', text: 'Superior 2 times in a row', tags: ['outcome', 'superior', 'row'], difficulty: 'HARD', target: 2 },
  { id: 'neutral_3_row', text: 'Neutral 3 times in a row', tags: ['outcome', 'neutral', 'row'], difficulty: 'HARD', target: 3 },

  // Damage Quests
  { id: 'deal_30', text: 'Deal 30 damage in battle', tags: ['damage'], difficulty: 'EASY', target: 30 },
  { id: 'deal_50', text: 'Deal 50 damage in battle', tags: ['damage'], difficulty: 'HARD', target: 50 },

  // Burn Quests
  { id: 'apply_burn_3', text: 'Apply Burn 3 times', tags: ['burn'], difficulty: 'MEDIUM', target: 3 },
  { id: 'apply_burn_5', text: 'Apply Burn 5 times', tags: ['burn'], difficulty: 'HARD', target: 5 },
  { id: 'deal_15_burn', text: 'Deal 15 Burn damage', tags: ['burn'], difficulty: 'HARD', target: 15 },

  // Poison Quests
  { id: 'apply_poison_3', text: 'Apply Poison 3 times', tags: ['poison'], difficulty: 'MEDIUM', target: 3 },
  { id: 'apply_poison_5', text: 'Apply Poison 5 times', tags: ['poison'], difficulty: 'HARD', target: 5 },

  // Shield Quests
  { id: 'gain_20_shield', text: 'Gain 20 Shield in battle', tags: ['shield'], difficulty: 'EASY', target: 20 },
  { id: 'gain_40_shield', text: 'Gain 40 Shield in battle', tags: ['shield'], difficulty: 'MEDIUM', target: 40 },

  // Heal Quests
  { id: 'heal_10', text: 'Heal 10 HP in battle', tags: ['heal'], difficulty: 'EASY', target: 10 },
  { id: 'heal_20', text: 'Heal 20 HP in battle', tags: ['heal'], difficulty: 'MEDIUM', target: 20 },

  // Element Quests
  { id: 'play_3_fire', text: 'Play 3 Fire cards', tags: ['fire'], difficulty: 'EASY', target: 3 },
  { id: 'play_3_water', text: 'Play 3 Water cards', tags: ['water'], difficulty: 'EASY', target: 3 },
  { id: 'play_3_nature', text: 'Play 3 Nature cards', tags: ['nature'], difficulty: 'EASY', target: 3 },
  { id: 'play_2_chaos', text: 'Play 2 Chaos cards', tags: ['chaos'], difficulty: 'MEDIUM', target: 2 },
  { id: 'play_2_neutral', text: 'Play 2 Neutral cards', tags: ['neutral'], difficulty: 'EASY', target: 2 },

  // Buff Quests
  { id: 'gain_buff_5', text: 'Gain Buff 5 times', tags: ['buff'], difficulty: 'MEDIUM', target: 5 },
  { id: 'reach_buff_5', text: 'Reach Buff(5) in battle', tags: ['buff'], difficulty: 'HARD', target: 5 },

  // Weak Quests
  { id: 'apply_weak_3', text: 'Apply Weakness 3 times', tags: ['weak'], difficulty: 'MEDIUM', target: 3 },
  { id: 'apply_weak_6', text: 'Apply Weakness 6 times', tags: ['weak'], difficulty: 'HARD', target: 6 }
];

/**
 * Estimasi progres maksimum realistis quest dalam satu ronde berdasarkan deck dan relic.
 * Asumsi: tiap kartu sumber dimainkan ±2× per ronde.
 * Diskon outcome: stack status yang hanya muncul di SUPERIOR dihitung ×0.75 (disediakan profiler).
 */
function questCapacity(quest, deck, relics = {}) {
  // Outcome, damage, dan row quest tidak dinilai kapasitasnya
  if (quest.tags.some(t => ['outcome', 'damage', 'row', 'superior', 'neutral', 'inferior'].includes(t))) {
    return null;
  }

  const profiles = (deck || []).map(c => getCardProfile(c)).filter(Boolean);

  if (quest.tags.includes('burn')) {
    const hasEmberSpark = (relics?.ember_spark || 0) > 0;
    const emberMultiplier = relics?.ember_spark || 1;
    const fireCardsCount = (deck || []).filter(c => c.element === 'FIRE').length;
    // Ember Spark: Fire card on superior applies +1 burn (superior discount x0.75)
    const emberBonus = hasEmberSpark ? fireCardsCount * emberMultiplier * 0.75 : 0;
    const oppBurnStacks = profiles.reduce((sum, p) => sum + (p.effectiveOppBurnStacks || 0), 0) + emberBonus;

    if (quest.id === 'deal_15_burn') {
      const burningCoreStacks = relics?.burning_core || 0;
      const dmgPerBurn = 3 * (1 + burningCoreStacks);
      return dmgPerBurn * 2 * oppBurnStacks;
    }
    return 2 * oppBurnStacks;
  }

  if (quest.tags.includes('poison')) {
    const hasVenomousBrambles = (relics?.venomous_brambles || 0) > 0;
    const brambleMultiplier = relics?.venomous_brambles || 1;
    const natureCardsCount = (deck || []).filter(c => c.element === 'NATURE').length;
    // Venomous Brambles: Nature card on superior applies +1 poison (superior discount x0.75)
    const brambleBonus = hasVenomousBrambles ? natureCardsCount * brambleMultiplier * 0.75 : 0;
    const oppPoisonStacks = profiles.reduce((sum, p) => sum + (p.effectiveOppPoisonStacks || 0), 0) + brambleBonus;
    return 2 * oppPoisonStacks;
  }

  if (quest.tags.includes('weak')) {
    const oppWeakStacks = profiles.reduce((sum, p) => sum + (p.effectiveOppWeakStacks || 0), 0);
    return 2 * oppWeakStacks;
  }

  if (quest.tags.includes('buff')) {
    const selfBuffStacks = profiles.reduce((sum, p) => sum + (p.effectiveSelfBuffStacks || 0), 0);
    if (quest.id === 'reach_buff_5') {
      return selfBuffStacks;
    }
    return 2 * selfBuffStacks;
  }

  if (quest.tags.includes('shield')) {
    const shieldSum = profiles.reduce((sum, p) => sum + (p.shieldSum || 0), 0);
    return 2 * shieldSum;
  }

  if (quest.tags.includes('heal')) {
    const healSum = profiles.reduce((sum, p) => sum + (p.healSum || 0), 0);
    return 2 * healSum;
  }

  // Element Quests
  for (const elem of ['fire', 'water', 'nature', 'chaos', 'neutral']) {
    if (quest.tags.includes(elem)) {
      const count = (deck || []).filter(c => c.element === elem.toUpperCase()).length;
      return count * 2;
    }
  }

  return 0;
}

const DIFFICULTY_RANK = { EASY: 1, MEDIUM: 2, HARD: 3 };

/**
 * Menghitung kelayakan (feasibility) dan difficulty efektif quest.
 * Pagar promotion-only: hanya boleh naik, tidak pernah turun dari label template.
 */
function getEffectiveDifficulty(quest, deck, relics = {}) {
  // Outcome, damage, in-a-row tetap memakai label template
  if (quest.tags.some(t => ['outcome', 'damage', 'row', 'superior', 'neutral', 'inferior'].includes(t))) {
    return { feasible: true, effectiveDifficulty: quest.difficulty, ratio: null };
  }

  const capacity = questCapacity(quest, deck, relics);
  if (quest.target <= 0) {
    return { feasible: true, effectiveDifficulty: quest.difficulty, ratio: 999 };
  }

  const ratio = capacity / quest.target;
  if (ratio < 1.15) {
    return { feasible: false, effectiveDifficulty: null, ratio };
  }

  let rawDifficulty;
  if (ratio < 1.6) {
    rawDifficulty = 'HARD';
  } else if (ratio < 2.5) {
    rawDifficulty = 'MEDIUM';
  } else {
    rawDifficulty = 'EASY';
  }

  const templateRank = DIFFICULTY_RANK[quest.difficulty] || 1;
  const rawRank = DIFFICULTY_RANK[rawDifficulty] || 1;
  const effectiveRank = Math.max(templateRank, rawRank);
  const effectiveDifficulty = Object.keys(DIFFICULTY_RANK).find(k => DIFFICULTY_RANK[k] === effectiveRank) || quest.difficulty;

  return { feasible: true, effectiveDifficulty, ratio };
}

/**
 * Kompatibilitas mundur: memeriksa apakah quest feasible untuk deck pemain.
 */
function isQuestSupported(quest, deck, relics = {}) {
  return getEffectiveDifficulty(quest, deck, relics).feasible;
}

/**
 * Returns the guaranteed removal token reward for completing a quest of this difficulty
 */
function getRemovalTokenReward(difficulty) {
  if (difficulty === 'EASY') return 0;
  if (difficulty === 'MEDIUM') return 1;
  if (difficulty === 'HARD') return 2;
  return 0;
}

/**
 * Generates a main reward matched to a quest's difficulty.
 * HARD non-relic reward adalah bonus pack (alur draft pack dipakai ulang).
 */
function generateReward(difficulty) {
  const roll = Math.random();

  if (difficulty === 'EASY') {
    // 80% COMMON Relic, 20% Bonus Draft Pick
    if (roll < 0.80) {
      return { type: 'relic', quality: 'COMMON', text: 'COMMON Relic' };
    } else {
      return { type: 'bonus_draft', text: 'Bonus Draft Pick' };
    }
  } else if (difficulty === 'MEDIUM') {
    // 70% RARE/EPIC Relic, 30% Bonus Draft Pick
    if (roll < 0.70) {
      const q = Math.random() < 0.85 ? 'RARE' : 'EPIC';
      return { type: 'relic', quality: q, text: `${q} Relic` };
    } else {
      return { type: 'bonus_draft', text: 'Bonus Draft Pick' };
    }
  } else { // HARD
    // 70% EPIC/LEGENDARY Relic, 30% Bonus Pack
    if (roll < 0.70) {
      const q = Math.random() < 0.80 ? 'EPIC' : 'LEGENDARY';
      return { type: 'relic', quality: q, text: `${q} Relic` };
    } else {
      return { type: 'bonus_pack', text: 'Bonus Pack (Choose 1 of 3)' };
    }
  }
}

/**
 * Generates 3 deck-aware quests for a player.
 * Slot tetap: selalu tepat 1 EASY, 1 MEDIUM, 1 HARD (difficulty efektif).
 */
function generatePlayerQuests(deck, relics = {}) {
  const evaluated = [];
  for (const q of QUEST_TEMPLATES) {
    const res = getEffectiveDifficulty(q, deck, relics);
    if (res.feasible) {
      evaluated.push({
        template: q,
        effectiveDifficulty: res.effectiveDifficulty
      });
    }
  }

  const slotTargets = ['EASY', 'MEDIUM', 'HARD'];
  const selected = [];

  for (const targetDiff of slotTargets) {
    // Candidates matching exact target difficulty not yet picked
    const candidates = evaluated.filter(e => e.effectiveDifficulty === targetDiff && !selected.some(s => s.template.id === e.template.id));
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(picked);
    } else {
      // Fallback: ambil template feasible terdekat difficulty-nya, JANGAN pernah yang infeasible
      const targetRank = DIFFICULTY_RANK[targetDiff];
      const remaining = evaluated.filter(e => !selected.some(s => s.template.id === e.template.id));
      if (remaining.length > 0) {
        remaining.sort((a, b) => {
          const distA = Math.abs(DIFFICULTY_RANK[a.effectiveDifficulty] - targetRank);
          const distB = Math.abs(DIFFICULTY_RANK[b.effectiveDifficulty] - targetRank);
          return distA - distB;
        });
        const minDistance = Math.abs(DIFFICULTY_RANK[remaining[0].effectiveDifficulty] - targetRank);
        const closest = remaining.filter(e => Math.abs(DIFFICULTY_RANK[e.effectiveDifficulty] - targetRank) === minDistance);
        const picked = closest[Math.floor(Math.random() * closest.length)];
        selected.push(picked);
      }
    }
  }

  return selected.map(({ template, effectiveDifficulty }) => {
    const reward = generateReward(effectiveDifficulty);
    const tokens = getRemovalTokenReward(effectiveDifficulty);
    return {
      id: template.id,
      text: template.text,
      tags: template.tags,
      difficulty: effectiveDifficulty,
      target: template.target,
      reward: reward,
      removalTokens: tokens
    };
  });
}

/**
 * Updates a player's quest progress after a round clash.
 * (Definisi tunggal yang bersih tanpa duplikasi).
 */
function updateQuestProgress(player, outcome, damageDealt, shieldGain, healGain, cardPlayed, appliedBurnToOpponent, appliedPoisonToOpponent, appliedBuffToSelf, appliedWeakToOpponent, opponentBurnTickDmg) {
  if (!player.activeQuest) return;

  const q = player.activeQuest;
  if (player.questProgress >= q.target) return;

  let progressDelta = 0;

  switch (q.id) {
    case 'superior_3':
    case 'superior_4':
      if (outcome === 'SUPERIOR') progressDelta = 1;
      break;
    case 'neutral_4':
      if (outcome === 'NEUTRAL') progressDelta = 1;
      break;
    case 'inferior_3':
      if (outcome === 'INFERIOR') progressDelta = 1;
      break;
    case 'superior_2_row':
      if (outcome === 'SUPERIOR') {
        progressDelta = 1;
      } else {
        player.questProgress = 0;
      }
      break;
    case 'neutral_3_row':
      if (outcome === 'NEUTRAL') {
        progressDelta = 1;
      } else {
        player.questProgress = 0;
      }
      break;
    case 'deal_30':
    case 'deal_50':
      progressDelta = damageDealt;
      break;
    case 'apply_burn_3':
    case 'apply_burn_5':
      progressDelta = appliedBurnToOpponent;
      break;
    case 'deal_15_burn':
      progressDelta = opponentBurnTickDmg;
      break;
    case 'apply_poison_3':
    case 'apply_poison_5':
      progressDelta = appliedPoisonToOpponent;
      break;
    case 'gain_20_shield':
    case 'gain_40_shield':
      progressDelta = shieldGain;
      break;
    case 'heal_10':
    case 'heal_20':
      progressDelta = healGain;
      break;
    case 'play_3_fire':
      if (cardPlayed.element === 'FIRE') progressDelta = 1;
      break;
    case 'play_3_water':
      if (cardPlayed.element === 'WATER') progressDelta = 1;
      break;
    case 'play_3_nature':
      if (cardPlayed.element === 'NATURE') progressDelta = 1;
      break;
    case 'play_2_chaos':
      if (cardPlayed.element === 'CHAOS') progressDelta = 1;
      break;
    case 'play_2_neutral':
      if (cardPlayed.element === 'NEUTRAL') progressDelta = 1;
      break;
    case 'gain_buff_5':
      progressDelta = appliedBuffToSelf;
      break;
    case 'reach_buff_5':
      player.questProgress = player.statuses.attackBuff || 0;
      return;
    case 'apply_weak_3':
    case 'apply_weak_5':
    case 'apply_weak_6':
      progressDelta = appliedWeakToOpponent;
      break;
  }

  player.questProgress = Math.min(q.target, player.questProgress + progressDelta);
}

module.exports = {
  QUEST_TEMPLATES,
  questCapacity,
  getEffectiveDifficulty,
  isQuestSupported,
  generatePlayerQuests,
  getRemovalTokenReward,
  generateReward,
  updateQuestProgress
};
