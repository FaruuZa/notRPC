const { CARD_POOL } = require('./cards');

// Bobot penilaian = opini balance, terkumpul di SATU tempat, mudah di-tuning.
const WEIGHTS = {
  damage: 1.0,
  shield: 0.8,
  heal: 0.8,
  selfDamage: -1.0,
  oppPoison: 2.0,    // bypass shield, multi-turn
  oppBurn: 2.0,      // 3 dmg/stack tapi terhalang shield & instan
  oppWeak: 1.5,      // -10% dmg lawan per stack
  selfBuff: 1.5,     // +10% dmg per stack, decay per serangan
  selfLeech: 1.5,    // lifesteal persen (20%/stack), decay per trigger
  selfThorn: 1.5,    // pantulan damage saat kena hit HP, decay per trigger
  selfCleanse: 3.0,  // nilai flat: menghapus semua debuff/DoT
  oppDispel: 2.0,    // nilai flat: menghapus semua buff lawan
  selfPoison: -2.0,
  selfBurn: -2.0,
  selfWeak: -1.5
};

/**
 * Nilai SATU outcome menjadi skor numerik.
 * Sadar arah: status ke lawan vs ke diri sendiri tandanya berbeda;
 * status self bercabang (buff/cleanse positif, poison/burn/weak negatif).
 */
function evaluateOutcome(effect) {
  if (!effect) return 0;
  let score = 0;
  if (effect.damage) score += effect.damage * WEIGHTS.damage;
  if (effect.shield) score += effect.shield * WEIGHTS.shield;
  if (effect.heal) score += effect.heal * WEIGHTS.heal;
  if (effect.selfDamage) score += effect.selfDamage * WEIGHTS.selfDamage;

  const app = effect.applyStatus;
  if (app) {
    if (app.opponent) {
      if (app.opponent.burn) score += app.opponent.burn * WEIGHTS.oppBurn;
      if (app.opponent.poison) score += app.opponent.poison * WEIGHTS.oppPoison;
      if (app.opponent.weakness) score += app.opponent.weakness * WEIGHTS.oppWeak;
      if (app.opponent.dispel) score += (typeof app.opponent.dispel === 'number' ? app.opponent.dispel : 1) * WEIGHTS.oppDispel;
      if (app.opponent.outbreak) score += 3.0;
    }
    if (app.self) {
      if (app.self.attackBuff) score += app.self.attackBuff * WEIGHTS.selfBuff;
      if (app.self.leech) score += app.self.leech * WEIGHTS.selfLeech;
      if (app.self.thorn) score += app.self.thorn * WEIGHTS.selfThorn;
      if (app.self.thorns) score += app.self.thorns * WEIGHTS.selfThorn;
      if (app.self.cleanse) score += (typeof app.self.cleanse === 'number' ? app.self.cleanse : 1) * WEIGHTS.selfCleanse;
      if (app.self.burn) score += app.self.burn * WEIGHTS.selfBurn;
      if (app.self.poison) score += app.self.poison * WEIGHTS.selfPoison;
      if (app.self.weakness) score += app.self.weakness * WEIGHTS.selfWeak;
      if (app.self.outbreak) score -= 3.0;
    }
    if (app.both) {
      if (app.both.outbreak) score += 3.0;
    }
  }
  return score;
}

/**
 * Menghitung total nilai negatif ke diri (selfDamage + status buruk).
 * Positif = ada biaya / risiko bagi pemain yang memainkannya.
 */
function calculateSelfCost(card) {
  let cost = 0;
  for (const outcome of Object.values(card.outcomes || {})) {
    if (!outcome) continue;
    if (outcome.selfDamage) cost += outcome.selfDamage * 1.0;
    const appSelf = outcome.applyStatus?.self;
    if (appSelf) {
      if (appSelf.burn) cost += appSelf.burn * 2.0;
      if (appSelf.poison) cost += appSelf.poison * 2.0;
      if (appSelf.weakness) cost += appSelf.weakness * 1.5;
      if (appSelf.outbreak) cost += 3.0;
    }
  }
  return cost;
}

/**
 * Diskon stack bila hanya muncul di SUPERIOR (dikali 0.75)
 */
function getEffectiveStatus(sup = 0, neu = 0, inf = 0) {
  if (sup > 0 && neu === 0 && inf === 0) {
    return sup * 0.75;
  }
  return (sup * 0.75) + neu + inf;
}

/**
 * Hitung profil numerik terpusat untuk satu kartu.
 */
function profileCard(card) {
  const sup = card.outcomes?.SUPERIOR || {};
  const neu = card.outcomes?.NEUTRAL || {};
  const inf = card.outcomes?.INFERIOR || {};

  const superiorScore = evaluateOutcome(sup);
  const neutralScore = evaluateOutcome(neu);
  const inferiorScore = evaluateOutcome(inf);

  const shieldSum = (sup.shield || 0) + (neu.shield || 0) + (inf.shield || 0);
  const healSum = (sup.heal || 0) + (neu.heal || 0) + (inf.heal || 0);

  const supBurn = sup.applyStatus?.opponent?.burn || 0;
  const neuBurn = neu.applyStatus?.opponent?.burn || 0;
  const infBurn = inf.applyStatus?.opponent?.burn || 0;
  const oppBurnStacks = supBurn + neuBurn + infBurn;
  const effectiveOppBurnStacks = getEffectiveStatus(supBurn, neuBurn, infBurn);

  const supPoison = sup.applyStatus?.opponent?.poison || 0;
  const neuPoison = neu.applyStatus?.opponent?.poison || 0;
  const infPoison = inf.applyStatus?.opponent?.poison || 0;
  const oppPoisonStacks = supPoison + neuPoison + infPoison;
  const effectiveOppPoisonStacks = getEffectiveStatus(supPoison, neuPoison, infPoison);

  const supWeak = sup.applyStatus?.opponent?.weakness || 0;
  const neuWeak = neu.applyStatus?.opponent?.weakness || 0;
  const infWeak = inf.applyStatus?.opponent?.weakness || 0;
  const oppWeakStacks = supWeak + neuWeak + infWeak;
  const effectiveOppWeakStacks = getEffectiveStatus(supWeak, neuWeak, infWeak);

  const supBuff = sup.applyStatus?.self?.attackBuff || 0;
  const neuBuff = neu.applyStatus?.self?.attackBuff || 0;
  const infBuff = inf.applyStatus?.self?.attackBuff || 0;
  const selfBuffStacks = supBuff + neuBuff + infBuff;
  const effectiveSelfBuffStacks = getEffectiveStatus(supBuff, neuBuff, infBuff);

  const supLeech = sup.applyStatus?.self?.leech || 0;
  const neuLeech = neu.applyStatus?.self?.leech || 0;
  const infLeech = inf.applyStatus?.self?.leech || 0;
  const selfLeechStacks = supLeech + neuLeech + infLeech;
  const effectiveSelfLeechStacks = getEffectiveStatus(supLeech, neuLeech, infLeech);

  const supThorn = sup.applyStatus?.self?.thorn || sup.applyStatus?.self?.thorns || 0;
  const neuThorn = neu.applyStatus?.self?.thorn || neu.applyStatus?.self?.thorns || 0;
  const infThorn = inf.applyStatus?.self?.thorn || inf.applyStatus?.self?.thorns || 0;
  const selfThornStacks = supThorn + neuThorn + infThorn;
  const effectiveSelfThornStacks = getEffectiveStatus(supThorn, neuThorn, infThorn);

  const selfCost = calculateSelfCost(card);

  const hasOutbreak = !!(
    sup.applyStatus?.opponent?.outbreak || neu.applyStatus?.opponent?.outbreak || inf.applyStatus?.opponent?.outbreak ||
    sup.applyStatus?.self?.outbreak || neu.applyStatus?.self?.outbreak || inf.applyStatus?.self?.outbreak ||
    sup.applyStatus?.both?.outbreak || neu.applyStatus?.both?.outbreak || inf.applyStatus?.both?.outbreak
  );
  const hasLeech = !!(
    sup.applyStatus?.self?.leech || neu.applyStatus?.self?.leech || inf.applyStatus?.self?.leech
  );
  const hasThorn = !!(
    supThorn || neuThorn || infThorn
  );
  const hasSelfCleanse = !!(
    sup.applyStatus?.self?.cleanse || neu.applyStatus?.self?.cleanse || inf.applyStatus?.self?.cleanse
  );
  const hasOppDispel = !!(
    sup.applyStatus?.opponent?.dispel || neu.applyStatus?.opponent?.dispel || inf.applyStatus?.opponent?.dispel
  );

  return {
    id: card.id,
    superior: superiorScore,
    neutral: neutralScore,
    inferior: inferiorScore,
    maxDamageMain: Math.max(sup.damage || 0, neu.damage || 0),
    shieldSum,
    healSum,
    oppBurnStacks,
    oppPoisonStacks,
    oppWeakStacks,
    selfBuffStacks,
    selfLeechStacks,
    selfThornStacks,
    selfCost,
    hasOutbreak,
    hasLeech,
    hasThorn,
    hasSelfCleanse,
    hasOppDispel,
    effectiveOppBurnStacks,
    effectiveOppPoisonStacks,
    effectiveOppWeakStacks,
    effectiveSelfBuffStacks,
    effectiveSelfLeechStacks,
    effectiveSelfThornStacks
  };
}

const CARD_PROFILES = {};

function initProfiles(pool = CARD_POOL) {
  for (const card of pool) {
    CARD_PROFILES[card.id] = profileCard(card);
  }
}

// Profil seluruh CARD_POOL terhitung saat server start
initProfiles(CARD_POOL);

function getCardProfile(cardOrId) {
  if (!cardOrId) return null;
  const id = typeof cardOrId === 'string' ? cardOrId : (cardOrId.templateId || cardOrId.id);
  if (id && CARD_PROFILES[id]) {
    return CARD_PROFILES[id];
  }
  if (typeof cardOrId === 'object' && cardOrId.outcomes) {
    return profileCard(cardOrId);
  }
  return null;
}

module.exports = {
  WEIGHTS,
  evaluateOutcome,
  profileCard,
  getCardProfile,
  CARD_PROFILES,
  initProfiles
};
