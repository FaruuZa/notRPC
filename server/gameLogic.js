const { nanoid } = require('nanoid');
const { CARD_POOL, CLASH_RULES, HAND_SIZE, ELEMENTS, PACK_TYPES } = require('./constants');

const generalPool = CARD_POOL.filter(c => !c.isDraftExclusive);
const draftExclusivePool = CARD_POOL.filter(c => c.isDraftExclusive);

function createCardInstance(template) {
  return {
    instanceId: nanoid(),
    templateId: template.id,
    name: template.name,
    element: template.element,
    description: template.description,
    outcomes: JSON.parse(JSON.stringify(template.outcomes))
  };
}

/**
 * Draw a set of random cards from the card pool
 * @param {number} count Number of cards to draw
 * @returns {Array} List of cards with unique instance IDs
 */
function drawCards(count = HAND_SIZE) {
  const hand = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * generalPool.length);
    hand.push(createCardInstance(generalPool[randomIndex]));
  }
  return hand;
}

/**
 * Draws a specified number of cards that are guaranteed to have a minimum number of elemental cards.
 * @param {number} totalCount Total number of cards to draw (e.g. 8 for draft pool)
 * @param {number} minElemental Minimum number of elemental cards (FIRE, WATER, NATURE)
 * @returns {Array} List of cards with unique instance IDs
 */
function drawDraftPool(totalCount = 8, minElemental = 4) {
  const elementals = generalPool.filter(c => ['FIRE', 'WATER', 'NATURE'].includes(c.element));
  const pool = [];
  
  // 1. Draw required elementals
  for (let i = 0; i < minElemental; i++) {
    const randomIndex = Math.floor(Math.random() * elementals.length);
    pool.push(createCardInstance(elementals[randomIndex]));
  }
  
  // 2. Draw the remaining cards randomly from the whole pool
  const remainingCount = totalCount - minElemental;
  for (let i = 0; i < remainingCount; i++) {
    const randomIndex = Math.floor(Math.random() * generalPool.length);
    pool.push(createCardInstance(generalPool[randomIndex]));
  }
  
  // Shuffle pool so elementals are mixed
  return pool.sort(() => Math.random() - 0.5);
}

/**
 * Draws replacement cards guaranteeing a certain number of elementals
 * @param {number} totalReplacements Total number of replacements needed
 * @param {number} minElementalReq Minimum number of elementals that must be in these replacements
 * @returns {Array} List of replacement cards
 */
function drawReplacements(totalReplacements, minElementalReq) {
  const elementals = generalPool.filter(c => ['FIRE', 'WATER', 'NATURE'].includes(c.element));
  const replacements = [];
  
  // Draw required elementals first
  for (let i = 0; i < minElementalReq; i++) {
    const randomIndex = Math.floor(Math.random() * elementals.length);
    replacements.push(createCardInstance(elementals[randomIndex]));
  }
  
  // Draw remaining replacements from general pool
  const remaining = totalReplacements - minElementalReq;
  for (let i = 0; i < remaining; i++) {
    const randomIndex = Math.floor(Math.random() * generalPool.length);
    replacements.push(createCardInstance(generalPool[randomIndex]));
  }
  
  // Shuffle to mix them
  return replacements.sort(() => Math.random() - 0.5);
}

/**
 * Generates a randomized 4-card starter deck (1 Fire, 1 Water, 1 Nature, 1 Neutral/Chaos)
 * Now modified to return a fixed, identical set of cards to reduce RNG.
 */
function generateStarterDeck() {
  const starterIds = ['ember_slash', 'tidal_surge', 'nature_shield', 'basic_fist'];
  const starter = starterIds.map(id => CARD_POOL.find(c => c.id === id)).filter(Boolean);
  return starter.map(card => createCardInstance(card));
}

/**
 * Generates 3 unique random pack types
 */
function generatePacks(count = 3) {
  const packKeys = Object.keys(PACK_TYPES);
  const shuffled = packKeys.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generates 4 cards matching the pack type's theme
 */
function generatePackCards(packType) {
  let pool = [];

  switch(packType) {
    case PACK_TYPES.FIRE_PACK:
      pool = generalPool.filter(c => c.element === ELEMENTS.FIRE);
      break;
    case PACK_TYPES.WATER_PACK:
      pool = generalPool.filter(c => c.element === ELEMENTS.WATER);
      break;
    case PACK_TYPES.NATURE_PACK:
      pool = generalPool.filter(c => c.element === ELEMENTS.NATURE);
      break;
    case PACK_TYPES.ELEMENTAL_PACK:
      pool = generalPool.filter(c => [ELEMENTS.FIRE, ELEMENTS.WATER, ELEMENTS.NATURE].includes(c.element));
      break;
    case PACK_TYPES.HYBRID_PACK:
      pool = generalPool.filter(c => [ELEMENTS.FIRE, ELEMENTS.WATER, ELEMENTS.NATURE, ELEMENTS.CHAOS].includes(c.element));
      break;
    case PACK_TYPES.UNIVERSAL_PACK:
      pool = generalPool;
      break;
    case PACK_TYPES.BURN_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.applyStatus && (o.applyStatus.opponent?.burn || o.applyStatus.self?.burn));
      });
      break;
    case PACK_TYPES.POISON_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.applyStatus && (o.applyStatus.opponent?.poison || o.applyStatus.self?.poison));
      });
      break;
    case PACK_TYPES.SHIELD_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.shield > 0);
      });
      break;
    case PACK_TYPES.SUSTAIN_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.heal > 0 || (o.applyStatus && o.applyStatus.self?.cleanse));
      });
      break;
    case PACK_TYPES.AGGRO_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.damage >= 14);
      });
      break;
    case PACK_TYPES.CONTROL_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => (o.applyStatus && o.applyStatus.opponent?.weakness) || o.shield > 0);
      });
      break;
    case PACK_TYPES.STATUS_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.applyStatus && Object.keys(o.applyStatus).length > 0);
      });
      break;
    case PACK_TYPES.COUNTER_PACK:
      pool = generalPool.filter(c => {
        const inf = c.outcomes.INFERIOR;
        return inf && (inf.damage > 0 || inf.shield > 0 || inf.heal > 0 || (inf.applyStatus && Object.keys(inf.applyStatus).length > 0));
      });
      break;
    case PACK_TYPES.RISK_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.selfDamage > 0 || (o.applyStatus && o.applyStatus.self && Object.keys(o.applyStatus.self).length > 0));
      });
      break;
    case PACK_TYPES.GAMBLER_PACK:
      pool = generalPool.filter(c => {
        const outcomes = Object.values(c.outcomes);
        return outcomes.some(o => o.selfDamage > 0) || c.element === ELEMENTS.CHAOS;
      });
      break;
    case PACK_TYPES.REVENGE_PACK:
      pool = generalPool.filter(c => {
        const inf = c.outcomes.INFERIOR;
        const hasInfBenefit = inf && (inf.damage > 0 || inf.shield > 0 || inf.heal > 0 || (inf.applyStatus && Object.keys(inf.applyStatus).length > 0));
        const outcomes = Object.values(c.outcomes);
        const hasSustain = outcomes.some(o => o.heal > 0 || (o.applyStatus && o.applyStatus.self?.cleanse));
        return hasInfBenefit || hasSustain;
      });
      break;
    case PACK_TYPES.TRAP_PACK:
      pool = generalPool.filter(c => {
        const inf = c.outcomes.INFERIOR;
        const neu = c.outcomes.NEUTRAL;
        return (inf && (inf.damage >= 10 || (inf.applyStatus && inf.applyStatus.opponent?.poison))) ||
               (neu && (neu.damage >= 4 || neu.shield >= 8));
      });
      break;
    case PACK_TYPES.DRAFT_EXCLUSIVE_PACK:
      pool = draftExclusivePool;
      break;
    default:
      pool = generalPool;
  }

  if (pool.length === 0) {
    pool = generalPool;
  }

  const cards = [];
  const tempPool = [...pool];
  for (let i = 0; i < 4; i++) {
    if (tempPool.length > 0) {
      const idx = Math.floor(Math.random() * tempPool.length);
      cards.push(createCardInstance(tempPool[idx]));
      tempPool.splice(idx, 1);
    } else {
      const idx = Math.floor(Math.random() * pool.length);
      cards.push(createCardInstance(pool[idx]));
    }
  }

  return cards;
}

/**
 * Generates 3 unique cards for the Loser Bonus Pick
 */
function generateBonusPickCards() {
  const cards = [];
  const tempPool = [...generalPool];
  for (let i = 0; i < 3; i++) {
    if (tempPool.length > 0) {
      const idx = Math.floor(Math.random() * tempPool.length);
      cards.push(createCardInstance(tempPool[idx]));
      tempPool.splice(idx, 1);
    }
  }
  return cards;
}


/**
 * Evaluates the outcome of a clash between two cards considering active status effects
 * @param {Object} cardA Player A's chosen card
 * @param {Object} cardB Player B's chosen card
 * @param {number} shieldA Player A's current shield
 * @param {number} shieldB Player B's current shield
 * @param {Object} statusesA Player A's status effects
 * @param {Object} statusesB Player B's status effects
 * @returns {Object} Complete details of the clash outcomes and damage calculations
 */
function evaluateClash(cardA, cardB, shieldA = 0, shieldB = 0, statusesA = {}, statusesB = {}) {
  // Determine clash outcome based on elements
  const outcomeA = CLASH_RULES[cardA.element][cardB.element];
  const outcomeB = CLASH_RULES[cardB.element][cardA.element];
  
  // Get corresponding effects
  const effectA = cardA.outcomes[outcomeA];
  const effectB = cardB.outcomes[outcomeB];
  
  const shieldGainA = effectA.shield || 0;
  const shieldGainB = effectB.shield || 0;
  
  const healGainA = effectA.heal || 0;
  const healGainB = effectB.heal || 0;
  
  let damageDealtByA = effectA.damage || 0;
  let damageDealtByB = effectB.damage || 0;
  
  const selfDamageA = effectA.selfDamage || 0;
  const selfDamageB = effectB.selfDamage || 0;

  // Apply active attack-modifying statuses (Attack Buff / Weakness)
  const buffA = statusesA ? (statusesA.attackBuff || 0) : 0;
  const weakA = statusesA ? (statusesA.weakness || 0) : 0;
  const netModifierA = (buffA - weakA) * 0.1;
  damageDealtByA = Math.max(0, Math.round(damageDealtByA * (1 + netModifierA)));
  
  const buffB = statusesB ? (statusesB.attackBuff || 0) : 0;
  const weakB = statusesB ? (statusesB.weakness || 0) : 0;
  const netModifierB = (buffB - weakB) * 0.1;
  damageDealtByB = Math.max(0, Math.round(damageDealtByB * (1 + netModifierB)));
  
  // Buffs/Shields first: calculate temp shield
  const tempShieldA = shieldA + shieldGainA;
  const tempShieldB = shieldB + shieldGainB;
  
  // Damage calculation: total incoming damage to player (opponent damage + self damage)
  const totalDmgA = damageDealtByB + selfDamageA;
  const totalDmgB = damageDealtByA + selfDamageB;
  
  // Apply damage absorption on shields
  let newShieldA = 0;
  let hpDamageA = 0;
  if (tempShieldA >= totalDmgA) {
    newShieldA = tempShieldA - totalDmgA;
    hpDamageA = 0;
  } else {
    newShieldA = 0;
    hpDamageA = totalDmgA - tempShieldA;
  }
  
  let newShieldB = 0;
  let hpDamageB = 0;
  if (tempShieldB >= totalDmgB) {
    newShieldB = tempShieldB - totalDmgB;
    hpDamageB = 0;
  } else {
    newShieldB = 0;
    hpDamageB = totalDmgB - tempShieldB;
  }
  
  const didAttackA = (effectA.damage || 0) > 0;
  const didAttackB = (effectB.damage || 0) > 0;

  return {
    outcomeA,
    outcomeB,
    shieldGainA,
    shieldGainB,
    healGainA,
    healGainB,
    damageDealtByA,
    damageDealtByB,
    selfDamageA,
    selfDamageB,
    totalDmgA,
    totalDmgB,
    newShieldA,
    newShieldB,
    hpDamageA,
    hpDamageB,
    didAttackA,
    didAttackB
  };
}

module.exports = {
  drawCards,
  drawDraftPool,
  drawReplacements,
  evaluateClash,
  generateStarterDeck,
  generatePacks,
  generatePackCards,
  generateBonusPickCards
};
