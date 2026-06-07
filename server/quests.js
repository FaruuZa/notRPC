const { RELIC_POOL } = require('./relics');

const QUEST_TEMPLATES = [
  // Outcome Quests
  { id: 'superior_3', text: 'Superior outcome 3 times', tags: ['outcome', 'superior'], difficulty: 'MEDIUM', target: 3 },
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
  { id: 'heal_20', text: 'Heal 20 HP in battle', tags: ['heal'], difficulty: 'HARD', target: 20 },

  // Element Quests
  { id: 'play_3_fire', text: 'Play 3 Fire cards', tags: ['fire'], difficulty: 'MEDIUM', target: 3 },
  { id: 'play_3_water', text: 'Play 3 Water cards', tags: ['water'], difficulty: 'MEDIUM', target: 3 },
  { id: 'play_3_nature', text: 'Play 3 Nature cards', tags: ['nature'], difficulty: 'MEDIUM', target: 3 },
  { id: 'play_2_chaos', text: 'Play 2 Chaos cards', tags: ['chaos'], difficulty: 'MEDIUM', target: 2 },
  { id: 'play_2_neutral', text: 'Play 2 Neutral cards', tags: ['neutral'], difficulty: 'EASY', target: 2 },

  // Buff Quests
  { id: 'gain_buff_5', text: 'Gain Buff 5 times', tags: ['buff'], difficulty: 'MEDIUM', target: 5 },
  { id: 'reach_buff_5', text: 'Reach Buff(5) in battle', tags: ['buff'], difficulty: 'MEDIUM', target: 5 },

  // Weak Quests
  { id: 'apply_weak_3', text: 'Apply Weakness 3 times', tags: ['weak'], difficulty: 'MEDIUM', target: 3 },
  { id: 'apply_weak_5', text: 'Apply Weakness 5 times', tags: ['weak'], difficulty: 'HARD', target: 5 }
];

/**
 * Checks if a quest is supported by the player's current deck
 */
function isQuestSupported(quest, deck) {
  for (const tag of quest.tags) {
    if (['outcome', 'damage', 'row', 'superior', 'neutral', 'inferior'].includes(tag)) {
      continue;
    }

    // Element checks
    if (['fire', 'water', 'nature', 'chaos', 'neutral'].includes(tag)) {
      const hasElement = deck.some(card => card.element === tag.toUpperCase());
      if (!hasElement) return false;
      continue;
    }

    // Keyword checks (e.g. burn, poison, shield, heal, buff, weak)
    if (tag === 'burn') {
      const hasBurn = deck.some(card => {
        const outcomes = Object.values(card.outcomes);
        return outcomes.some(o => o.applyStatus && (o.applyStatus.opponent?.burn || o.applyStatus.self?.burn));
      });
      if (!hasBurn) return false;
      continue;
    }

    if (tag === 'poison') {
      const hasPoison = deck.some(card => {
        const outcomes = Object.values(card.outcomes);
        return outcomes.some(o => o.applyStatus && (o.applyStatus.opponent?.poison || o.applyStatus.self?.poison));
      });
      if (!hasPoison) return false;
      continue;
    }

    if (tag === 'shield') {
      const hasShield = deck.some(card => {
        const outcomes = Object.values(card.outcomes);
        return outcomes.some(o => o.shield > 0);
      });
      if (!hasShield) return false;
      continue;
    }

    if (tag === 'heal') {
      const hasHeal = deck.some(card => {
        const outcomes = Object.values(card.outcomes);
        return outcomes.some(o => o.heal > 0);
      });
      if (!hasHeal) return false;
      continue;
    }

    if (tag === 'buff') {
      const hasBuff = deck.some(card => {
        const outcomes = Object.values(card.outcomes);
        return outcomes.some(o => o.applyStatus && (o.applyStatus.self?.attackBuff || o.applyStatus.opponent?.attackBuff));
      });
      if (!hasBuff) return false;
      continue;
    }

    if (tag === 'weak') {
      const hasWeak = deck.some(card => {
        const outcomes = Object.values(card.outcomes);
        return outcomes.some(o => o.applyStatus && (o.applyStatus.opponent?.weakness || o.applyStatus.self?.weakness));
      });
      if (!hasWeak) return false;
      continue;
    }
  }

  return true;
}

/**
 * Generates a reward matched to a quest's difficulty
 */
function generateReward(difficulty) {
  const roll = Math.random();
  
  if (difficulty === 'EASY') {
    // 100% COMMON Relic
    return { type: 'relic', quality: 'COMMON', text: 'COMMON Relic' };
  } else if (difficulty === 'MEDIUM') {
    // 50% RARE Relic, 25% Remove Card, 25% Bonus Draft
    if (roll < 0.50) {
      return { type: 'relic', quality: 'RARE', text: 'RARE Relic' };
    } else if (roll < 0.75) {
      return { type: 'remove_card', text: 'Card Removal Option' };
    } else {
      return { type: 'bonus_draft', text: 'Bonus Draft Pick' };
    }
  } else { // HARD
    // 60% EPIC/LEGENDARY Relic, 40% Bonus Draft
    if (roll < 0.60) {
      const q = Math.random() < 0.80 ? 'EPIC' : 'LEGENDARY';
      return { type: 'relic', quality: q, text: `${q} Relic` };
    } else {
      return { type: 'bonus_draft', text: 'Bonus Draft Pick' };
    }
  }
}

/**
 * Generates 3 unique deck-aware quests for a player
 * @param {Array} deck Player's deck list of card templates
 * @returns {Array} List of 3 quest objects
 */
function generatePlayerQuests(deck) {
  const supported = QUEST_TEMPLATES.filter(q => isQuestSupported(q, deck));
  
  // Shuffle supported templates
  const shuffled = supported.sort(() => Math.random() - 0.5);
  
  // Pick up to 3 unique templates
  const selectedTemplates = shuffled.slice(0, Math.min(3, shuffled.length));
  
  // If we have less than 3 (very small custom deck), fill with outcome/damage templates which are always supported
  while (selectedTemplates.length < 3) {
    const backup = QUEST_TEMPLATES.find(q => 
      !selectedTemplates.some(s => s.id === q.id) && 
      isQuestSupported(q, deck)
    );
    if (!backup) break;
    selectedTemplates.push(backup);
  }

  // Map to instances with random rewards
  return selectedTemplates.map(t => {
    const reward = generateReward(t.difficulty);
    return {
      id: t.id,
      text: t.text,
      tags: t.tags,
      difficulty: t.difficulty,
      target: t.target,
      reward: reward
    };
  });
}

module.exports = {
  generatePlayerQuests
};
