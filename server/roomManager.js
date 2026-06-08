const { nanoid } = require('nanoid');
const { MAX_HP, PACK_POOL } = require('./constants');
const {
  evaluateClash,
  generateStarterDeck,
  generatePacks,
  generatePackCards,
  generateBonusPickCards
} = require('./gameLogic');
const { generatePlayerQuests } = require('./quests');
const { RELIC_POOL } = require('./relics');

// Active game rooms map: roomId -> roomState
const rooms = {};

// Socket ID to Room ID lookup map: socketId -> roomId
const playerToRoom = {};

/**
 * Creates and initializes a new game room, launching the Battle directly with starter decks
 */
function createRoom(roomId, player1, player2, io) {
  const deck1 = generateStarterDeck();
  const deck2 = generateStarterDeck();

  rooms[roomId] = {
    id: roomId,
    players: {
      [player1.socketId]: {
        id: player1.socketId,
        username: player1.username,
        socket: player1.socket,
        hp: MAX_HP,
        maxHp: MAX_HP,
        shield: 0,
        hand: drawHandFromDeck(deck1, 4),
        deck: deck1,
        selectedCardId: null,
        locked: false,
        points: 0,
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0 },
        relics: {},
        activeQuest: null,
        questProgress: 0,
        questRerollCount: 0,
        questLocked: false,
        offeredQuests: [],
        pendingRemoveCardCount: 0,
        pendingBonusDraft: false,
        pendingRewardNotification: null
      },
      [player2.socketId]: {
        id: player2.socketId,
        username: player2.username,
        socket: player2.socket,
        hp: MAX_HP,
        maxHp: MAX_HP,
        shield: 0,
        hand: drawHandFromDeck(deck2, 4),
        deck: deck2,
        selectedCardId: null,
        locked: false,
        points: 0,
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0 },
        relics: {},
        activeQuest: null,
        questProgress: 0,
        questRerollCount: 0,
        questLocked: false,
        offeredQuests: [],
        pendingRemoveCardCount: 0,
        pendingBonusDraft: false,
        pendingRewardNotification: null
      }
    },
    round: 1,
    state: 'QUEST_PHASE'
  };

  // Map sockets to room
  playerToRoom[player1.socketId] = roomId;
  playerToRoom[player2.socketId] = roomId;

  console.log(`[RoomManager] Room ${roomId} created. Starting Quest Selection Phase...`);

  // Small delay to allow matchmaking screen to play transition
  setTimeout(() => {
    startQuestSelectionPhase(roomId, io);
  }, 1600);
}

/**
 * Starts the quest selection phase by generating and sending 3 quests to each player
 */
function startQuestSelectionPhase(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  room.state = 'QUEST_PHASE';
  console.log(`[RoomManager] Room ${roomId}: starting Quest Phase`);

  const playerIds = Object.keys(room.players);
  playerIds.forEach(id => {
    const p = room.players[id];
    p.offeredQuests = generatePlayerQuests(p.deck);
    p.questRerollCount = 0;
    p.questLocked = false;
    p.activeQuest = null;
    p.questProgress = 0;

    p.socket.emit('questSelectionStart', {
      quests: p.offeredQuests,
      rerollsLeft: 1
    });
  });
}

/**
 * Handles quest selection
 */
function handleSelectQuest(socket, questId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'QUEST_PHASE') return;

  const player = room.players[socket.id];
  if (player.questLocked) return;

  const chosenQuest = player.offeredQuests.find(q => q.id === questId);
  if (!chosenQuest) return;

  player.activeQuest = chosenQuest;
  player.questProgress = 0;
  player.questLocked = true;

  console.log(`[RoomManager] Player ${player.username} selected quest: ${chosenQuest.text}`);
  socket.emit('questLocked', chosenQuest);

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  if (opponent.questLocked) {
    // Both players locked. Transition to BATTLE!
    room.state = 'BATTLE';
    console.log(`[RoomManager] Both players locked quests in Room ${roomId}. Starting BATTLE.`);
    startRound(roomId, io);
  } else {
    // Notify opponent we are waiting for them
    opponent.socket.emit('waitingForOpponentQuest');
  }
}

/**
 * Handles quest rerolls (limit of 1 per phase)
 */
function handleRerollQuests(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'QUEST_PHASE') return;

  const player = room.players[socket.id];
  if (player.questLocked || player.questRerollCount >= 1) return;

  player.questRerollCount += 1;
  player.offeredQuests = generatePlayerQuests(player.deck);

  console.log(`[RoomManager] Player ${player.username} rerolled quests.`);
  socket.emit('questSelectionStart', {
    quests: player.offeredQuests,
    rerollsLeft: 0
  });
}

/**
 * Draws a random starting hand from the deck
 */
function drawHandFromDeck(deck, size = 4) {
  const shuffled = [...deck].sort(() => Math.random() - 0.5);
  // Generate deep copies with fresh unique instanceIds for client-side matching
  return shuffled.slice(0, size).map(card => ({
    instanceId: nanoid(),
    templateId: card.templateId,
    name: card.name,
    element: card.element,
    description: card.description,
    outcomes: JSON.parse(JSON.stringify(card.outcomes))
  }));
}

/**
 * Starts a new round in a room
 */
function startRound(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  p1.selectedCardId = null;
  p1.locked = false;
  p2.selectedCardId = null;
  p2.locked = false;

  // Apply Tidal Wisdom passive relic shield (+4 shield per stack)
  const p1Tidal = p1.relics.tidal_wisdom || 0;
  if (p1Tidal > 0) {
    p1.shield += p1Tidal * 4;
  }
  const p2Tidal = p2.relics.tidal_wisdom || 0;
  if (p2Tidal > 0) {
    p2.shield += p2Tidal * 4;
  }

  // Apply starting shield regen relics
  const p1StartShield = (p1.relics.relic_shield_regen_common || 0) * 3 + (p1.relics.relic_shield_regen_rare || 0) * 5 + (p1.relics.relic_shield_regen_epic || 0) * 8;
  p1.shield += p1StartShield;
  const p2StartShield = (p2.relics.relic_shield_regen_common || 0) * 3 + (p2.relics.relic_shield_regen_rare || 0) * 5 + (p2.relics.relic_shield_regen_epic || 0) * 8;
  p2.shield += p2StartShield;

  // Re-calculate maxHp in case vitality relics were gained
  p1.maxHp = MAX_HP + (p1.relics.relic_vitality_common || 0) * 15 + (p1.relics.relic_vitality_rare || 0) * 25 + (p1.relics.relic_vitality_epic || 0) * 40;
  p2.maxHp = MAX_HP + (p2.relics.relic_vitality_common || 0) * 15 + (p2.relics.relic_vitality_rare || 0) * 25 + (p2.relics.relic_vitality_epic || 0) * 40;

  console.log(`[RoomManager] Room ${roomId}: starting round ${room.round}`);

  p1.socket.emit('roundStart', {
    round: room.round,
    hand: p1.hand,
    selfStatus: { 
      hp: p1.hp, 
      maxHp: p1.maxHp,
      shield: p1.shield, 
      handSize: p1.hand.length, 
      statuses: p1.statuses, 
      points: p1.points, 
      deck: p1.deck,
      relics: p1.relics,
      activeQuest: p1.activeQuest ? { ...p1.activeQuest, progress: p1.questProgress } : null
    },
    opponentStatus: { 
      hp: p2.hp, 
      maxHp: p2.maxHp,
      shield: p2.shield, 
      handSize: p2.hand.length, 
      username: p2.username, 
      statuses: p2.statuses, 
      points: p2.points,
      relics: p2.relics
    }
  });

  p2.socket.emit('roundStart', {
    round: room.round,
    hand: p2.hand,
    selfStatus: { 
      hp: p2.hp, 
      maxHp: p2.maxHp,
      shield: p2.shield, 
      handSize: p2.hand.length, 
      statuses: p2.statuses, 
      points: p2.points, 
      deck: p2.deck,
      relics: p2.relics,
      activeQuest: p2.activeQuest ? { ...p2.activeQuest, progress: p2.questProgress } : null
    },
    opponentStatus: { 
      hp: p1.hp, 
      maxHp: p1.maxHp,
      shield: p1.shield, 
      handSize: p1.hand.length, 
      username: p1.username, 
      statuses: p1.statuses, 
      points: p1.points,
      relics: p1.relics
    }
  });
}

/**
 * Handles card selection from a client
 */
function handleSelectCard(socket, cardInstanceId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  const player = room.players[socket.id];
  if (player.locked) return;

  const cardExists = player.hand.some(c => c.instanceId === cardInstanceId);
  if (!cardExists && cardInstanceId !== null) return;

  player.selectedCardId = cardInstanceId;
  
  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  opponent.socket.emit('selectCard', {
    opponentSelected: cardInstanceId !== null
  });
}

/**
 * Handles selection lock event
 */
function handleLockSelection(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  const player = room.players[socket.id];
  if (!player.selectedCardId || player.locked) return;

  player.locked = true;

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  opponent.socket.emit('lockSelection', {
    opponentLocked: true
  });

  if (opponent.locked) {
    resolveRound(roomId, io);
  }
}

/**
 * Tracks and updates quest progress for a player based on clash parameters and status updates
 */
function updateQuestProgress(player, outcome, damageDealt, shieldGain, healGain, cardPlayed, appliedBurnToOpponent, appliedPoisonToOpponent, appliedBuffToSelf, appliedWeakToOpponent, opponentBurnTickDmg) {
  if (!player.activeQuest) return;

  const q = player.activeQuest;
  if (player.questProgress >= q.target) return;

  let progressDelta = 0;

  switch (q.id) {
    case 'superior_3':
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
      progressDelta = appliedWeakToOpponent;
      break;
  }

  player.questProgress = Math.min(q.target, player.questProgress + progressDelta);
}

/**
 * Resolves the clash of selected cards, applies effects and statuses, and schedules next round
 */
function resolveRound(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  const card1Index = p1.hand.findIndex(c => c.instanceId === p1.selectedCardId);
  const card2Index = p2.hand.findIndex(c => c.instanceId === p2.selectedCardId);

  const card1 = p1.hand[card1Index];
  const card2 = p2.hand[card2Index];

  if (!card1 || !card2) {
    console.error(`[RoomManager] Error: Selected cards not found!`);
    return;
  }

  // Evaluate clash considering active statuses and relics
  const result = evaluateClash(card1, card2, p1.shield, p2.shield, p1.statuses, p2.statuses, p1.relics, p2.relics);

  const shieldDamageA = Math.max(0, (p1.shield + result.shieldGainA) - result.newShieldA);
  const shieldDamageB = Math.max(0, (p2.shield + result.shieldGainB) - result.newShieldB);

  // Apply clash results to server states (including HEAL and player maxHp)
  p1.shield = result.newShieldA;
  p2.shield = result.newShieldB;
  
  p1.maxHp = p1.maxHp || MAX_HP;
  p2.maxHp = p2.maxHp || MAX_HP;
  p1.hp = Math.max(0, Math.min(p1.maxHp, p1.hp - result.hpDamageA + result.healGainA));
  p2.hp = Math.max(0, Math.min(p2.maxHp, p2.hp - result.hpDamageB + result.healGainB));

  // Helper to apply status to a player (Buff and Weakness capping at 5 removed)
  const applyStatusToPlayer = (player, statusObj) => {
    if (!statusObj) return;

    // First process Cleanse if it is present in the outcome
    if (statusObj.cleanse && statusObj.cleanse > 0) {
      player.statuses.poison = 0;
      player.statuses.burn = 0;
      player.statuses.weakness = 0;
      console.log(`[RoomManager] Player ${player.username} cleansed all debuffs.`);
    }

    // Process Dispel if present in the outcome
    if (statusObj.dispel && statusObj.dispel > 0) {
      player.statuses.attackBuff = 0;
      console.log(`[RoomManager] Player ${player.username} was dispelled.`);
    }

    // Now process other statuses (capping removed)
    Object.keys(statusObj).forEach(stat => {
      if (stat === 'cleanse' || stat === 'dispel') return; // already handled
      player.statuses[stat] = (player.statuses[stat] || 0) + statusObj[stat];
    });
  };

  // Process status effect applications from card outcomes
  const effect1 = card1.outcomes[result.outcomeA];
  const effect2 = card2.outcomes[result.outcomeB];

  // 1. Pre-tick Cleanse & Dispel check: Wipe debuffs (Cleanse) and opponent buffs (Dispel) BEFORE ticks run!
  if (effect1.applyStatus) {
    if (effect1.applyStatus.self && effect1.applyStatus.self.cleanse > 0) {
      p1.statuses.poison = 0;
      p1.statuses.burn = 0;
      p1.statuses.weakness = 0;
      console.log(`[RoomManager] Player ${p1.username} cleansed all debuffs (pre-tick).`);
    }
    if (effect1.applyStatus.opponent && effect1.applyStatus.opponent.cleanse > 0) {
      p2.statuses.poison = 0;
      p2.statuses.burn = 0;
      p2.statuses.weakness = 0;
    }
    if (effect1.applyStatus.opponent && effect1.applyStatus.opponent.dispel > 0) {
      p2.statuses.attackBuff = 0;
      console.log(`[RoomManager] Player ${p2.username} was dispelled (pre-tick).`);
    }
    if (effect1.applyStatus.self && effect1.applyStatus.self.dispel > 0) {
      p1.statuses.attackBuff = 0;
    }
  }

  if (effect2.applyStatus) {
    if (effect2.applyStatus.self && effect2.applyStatus.self.cleanse > 0) {
      p2.statuses.poison = 0;
      p2.statuses.burn = 0;
      p2.statuses.weakness = 0;
      console.log(`[RoomManager] Player ${p2.username} cleansed all debuffs (pre-tick).`);
    }
    if (effect2.applyStatus.opponent && effect2.applyStatus.opponent.cleanse > 0) {
      p1.statuses.poison = 0;
      p1.statuses.burn = 0;
      p1.statuses.weakness = 0;
    }
    if (effect2.applyStatus.opponent && effect2.applyStatus.opponent.dispel > 0) {
      p1.statuses.attackBuff = 0;
      console.log(`[RoomManager] Player ${p1.username} was dispelled (pre-tick).`);
    }
    if (effect2.applyStatus.self && effect2.applyStatus.self.dispel > 0) {
      p2.statuses.attackBuff = 0;
    }
  }

  // 2. Process end-of-round status damage ticks
  // Burn Rework: 3 damage per stack, blocked by Shield, instantly consumed.
  // Poison Rework: still directly bypasses Shield, stack decreases by 1.
  // These use the pre-outcome statuses (except cleansed) so newly applied poison/burn will not tick this round
  let p1BurnTick = 0, p1PoisonTick = 0;
  let p1BurnHpDmg = 0, p1BurnShieldDmg = 0;
  let p2BurnTick = 0, p2PoisonTick = 0;
  let p2BurnHpDmg = 0, p2BurnShieldDmg = 0;

  // Player 1 Ticks (incorporating Burning Core and Toxic Catalyst relics from opponent Player 2)
  if (p1.statuses.burn > 0) {
    const burnCoreVal = p2.relics.burning_core || 0;
    const totalBurnDmg = p1.statuses.burn * (3 + burnCoreVal);
    p1BurnTick = totalBurnDmg;
    if (p1.shield >= totalBurnDmg) {
      p1.shield -= totalBurnDmg;
      p1BurnShieldDmg = totalBurnDmg;
      p1BurnHpDmg = 0;
    } else {
      p1BurnShieldDmg = p1.shield;
      p1BurnHpDmg = totalBurnDmg - p1.shield;
      p1.shield = 0;
    }
    p1.hp = Math.max(0, p1.hp - p1BurnHpDmg);
    p1.statuses.burn = 0; // Burn immediately resets to 0
  }
  if (p1.statuses.poison > 0) {
    const toxicVal = p2.relics.toxic_catalyst || 0;
    p1PoisonTick = p1.statuses.poison * (1 + toxicVal);
    p1.hp = Math.max(0, p1.hp - p1PoisonTick);
    p1.statuses.poison = Math.max(0, p1.statuses.poison - 1); // Poison decreases by 1
  }

  // Player 2 Ticks (incorporating Burning Core and Toxic Catalyst relics from opponent Player 1)
  if (p2.statuses.burn > 0) {
    const burnCoreVal = p1.relics.burning_core || 0;
    const totalBurnDmg = p2.statuses.burn * (3 + burnCoreVal);
    p2BurnTick = totalBurnDmg;
    if (p2.shield >= totalBurnDmg) {
      p2.shield -= totalBurnDmg;
      p2BurnShieldDmg = totalBurnDmg;
      p2BurnHpDmg = 0;
    } else {
      p2BurnShieldDmg = p2.shield;
      p2BurnHpDmg = totalBurnDmg - p2.shield;
      p2.shield = 0;
    }
    p2.hp = Math.max(0, p2.hp - p2BurnHpDmg);
    p2.statuses.burn = 0; // Burn immediately resets to 0
  }
  if (p2.statuses.poison > 0) {
    const toxicVal = p1.relics.toxic_catalyst || 0;
    p2PoisonTick = p2.statuses.poison * (1 + toxicVal);
    p2.hp = Math.max(0, p2.hp - p2PoisonTick);
    p2.statuses.poison = Math.max(0, p2.statuses.poison - 1);
  }

  // Store intermediate shield values before decay (after clash and status ticks)
  const shieldPostTicksA = p1.shield;
  const shieldPostTicksB = p2.shield;

  // 3. Shield Decay: On turn end, shield is reduced to Floor(Shield * 50%)
  p1.shield = Math.floor(p1.shield * 0.5);
  p2.shield = Math.floor(p2.shield * 0.5);

  const shieldDecayedA = shieldPostTicksA - p1.shield;
  const shieldDecayedB = shieldPostTicksB - p2.shield;

  // Decrement Buff/Weakness stacks by 1 ONLY when attacking (base damage > 0 outcome)
  if (result.didAttackA) {
    if (p1.statuses.attackBuff > 0) {
      p1.statuses.attackBuff -= 1;
    }
    if (p1.statuses.weakness > 0) {
      p1.statuses.weakness -= 1;
    }
  }

  if (result.didAttackB) {
    if (p2.statuses.attackBuff > 0) {
      p2.statuses.attackBuff -= 1;
    }
    if (p2.statuses.weakness > 0) {
      p2.statuses.weakness -= 1;
    }
  }

  // Helper variables for quest progress tracking
  const p1BurnOpponent = effect1.applyStatus?.opponent?.burn || 0;
  const p1PoisonOpponent = effect1.applyStatus?.opponent?.poison || 0;
  const p1BuffSelf = effect1.applyStatus?.self?.attackBuff || 0;
  const p1WeakOpponent = effect1.applyStatus?.opponent?.weakness || 0;

  const p2BurnOpponent = effect2.applyStatus?.opponent?.burn || 0;
  const p2PoisonOpponent = effect2.applyStatus?.opponent?.poison || 0;
  const p2BuffSelf = effect2.applyStatus?.self?.attackBuff || 0;
  const p2WeakOpponent = effect2.applyStatus?.opponent?.weakness || 0;

  // Add Ember Spark / Venomous Brambles extra status applications
  let p1BurnExtra = 0, p1PoisonExtra = 0;
  if (result.outcomeA === 'SUPERIOR') {
    if (card1.element === 'FIRE') p1BurnExtra += (p1.relics.ember_spark || 0);
    if (card1.element === 'NATURE') p1PoisonExtra += (p1.relics.venomous_brambles || 0);
  }
  const p1TotalBurnApplied = p1BurnOpponent + p1BurnExtra;
  const p1TotalPoisonApplied = p1PoisonOpponent + p1PoisonExtra;

  let p2BurnExtra = 0, p2PoisonExtra = 0;
  if (result.outcomeB === 'SUPERIOR') {
    if (card2.element === 'FIRE') p2BurnExtra += (p2.relics.ember_spark || 0);
    if (card2.element === 'NATURE') p2PoisonExtra += (p2.relics.venomous_brambles || 0);
  }
  const p2TotalBurnApplied = p2BurnOpponent + p2BurnExtra;
  const p2TotalPoisonApplied = p2PoisonOpponent + p2PoisonExtra;

  // 3. Now apply remaining status outcomes from this round (which will tick starting next turn)
  if (effect1.applyStatus) {
    if (effect1.applyStatus.opponent) {
      applyStatusToPlayer(p2, effect1.applyStatus.opponent);
    }
    if (effect1.applyStatus.self) {
      applyStatusToPlayer(p1, effect1.applyStatus.self);
    }
  }

  if (effect2.applyStatus) {
    if (effect2.applyStatus.opponent) {
      applyStatusToPlayer(p1, effect2.applyStatus.opponent);
    }
    if (effect2.applyStatus.self) {
      applyStatusToPlayer(p2, effect2.applyStatus.self);
    }
  }

  // Apply outcome statuses from relics: Ember Spark / Venomous Brambles
  if (result.outcomeA === 'SUPERIOR') {
    if (card1.element === 'FIRE' && (p1.relics.ember_spark || 0) > 0) {
      p2.statuses.burn = (p2.statuses.burn || 0) + (p1.relics.ember_spark || 0);
    }
    if (card1.element === 'NATURE' && (p1.relics.venomous_brambles || 0) > 0) {
      p2.statuses.poison = (p2.statuses.poison || 0) + (p1.relics.venomous_brambles || 0);
    }
  }
  if (result.outcomeB === 'SUPERIOR') {
    if (card2.element === 'FIRE' && (p2.relics.ember_spark || 0) > 0) {
      p1.statuses.burn = (p1.statuses.burn || 0) + (p2.relics.ember_spark || 0);
    }
    if (card2.element === 'NATURE' && (p2.relics.venomous_brambles || 0) > 0) {
      p1.statuses.poison = (p1.statuses.poison || 0) + (p2.relics.venomous_brambles || 0);
    }
  }

  // Apply outcome Buffs from relics: Last Stand (Inferior outcome gives Buff(1))
  if (result.outcomeA === 'INFERIOR' && (p1.relics.last_stand || 0) > 0) {
    p1.statuses.attackBuff = (p1.statuses.attackBuff || 0) + (p1.relics.last_stand || 0);
  }
  if (result.outcomeB === 'INFERIOR' && (p2.relics.last_stand || 0) > 0) {
    p2.statuses.attackBuff = (p2.statuses.attackBuff || 0) + (p2.relics.last_stand || 0);
  }

  // Update Quest Progress for both players
  updateQuestProgress(p1, result.outcomeA, result.damageDealtByA, result.shieldGainA, result.healGainA, card1, p1TotalBurnApplied, p1TotalPoisonApplied, p1BuffSelf, p1WeakOpponent, p2BurnTick);
  updateQuestProgress(p2, result.outcomeB, result.damageDealtByB, result.shieldGainB, result.healGainB, card2, p2TotalBurnApplied, p2TotalPoisonApplied, p2BuffSelf, p2WeakOpponent, p1BurnTick);

  // Remove played cards from hands
  p1.hand.splice(card1Index, 1);
  p2.hand.splice(card2Index, 1);

  // If hand is empty, draw 4 new card copies randomly sampled from their deck
  let drewNewCardsP1 = false;
  let drewNewCardsP2 = false;
  if (p1.hand.length === 0) {
    p1.hand = drawHandFromDeck(p1.deck, 4);
    drewNewCardsP1 = true;
  }
  if (p2.hand.length === 0) {
    p2.hand = drawHandFromDeck(p2.deck, 4);
    drewNewCardsP2 = true;
  }

  // Emit roundReveal to BOTH players (showing each other's played card)
  p1.socket.emit('roundReveal', {
    yourCard: card1,
    opponentCard: card2
  });

  p2.socket.emit('roundReveal', {
    yourCard: card2,
    opponentCard: card1
  });

  // Emit roundResult with new statuses and status tick damages
  p1.socket.emit('roundResult', {
    outcome: result.outcomeA,
    shieldGain: result.shieldGainA,
    healGain: result.healGainA,
    damageDealt: result.damageDealtByA,
    selfDamage: result.selfDamageA,
    totalIncomingDmg: result.totalDmgA,
    hpDamage: result.hpDamageA,
    shieldDamage: shieldDamageA,
    newShield: shieldPostTicksA, // Intermediate shield (after clash & tick, before decay)
    finalShield: p1.shield,       // Decayed shield at end of round
    shieldDecay: shieldDecayedA,  // Amount decayed
    newHp: p1.hp,
    newStatuses: p1.statuses,
    statusDamage: { burn: p1BurnTick, poison: p1PoisonTick, burnHpDmg: p1BurnHpDmg, burnShieldDmg: p1BurnShieldDmg },
    activeQuest: p1.activeQuest ? { ...p1.activeQuest, progress: p1.questProgress } : null,
    
    opponentOutcome: result.outcomeB,
    opponentShieldGain: result.shieldGainB,
    opponentHealGain: result.opponentHealGain || result.healGainB,
    opponentDamageDealt: result.damageDealtByB,
    opponentSelfDamage: result.selfDamageB,
    opponentTotalIncomingDmg: result.totalDmgB,
    opponentHpDamage: result.hpDamageB,
    opponentShieldDamage: shieldDamageB,
    opponentNewShield: shieldPostTicksB, // Intermediate shield
    opponentFinalShield: p2.shield,       // Decayed shield at end of round
    opponentShieldDecay: shieldDecayedB,  // Amount decayed
    opponentNewHp: p2.hp,
    opponentNewStatuses: p2.statuses,
    opponentStatusDamage: { burn: p2BurnTick, poison: p2PoisonTick, burnHpDmg: p2BurnHpDmg, burnShieldDmg: p2BurnShieldDmg },
    
    drewNewCards: drewNewCardsP1
  });

  p2.socket.emit('roundResult', {
    outcome: result.outcomeB,
    shieldGain: result.shieldGainB,
    healGain: result.healGainB,
    damageDealt: result.damageDealtByB,
    selfDamage: result.selfDamageB,
    totalIncomingDmg: result.totalDmgB,
    hpDamage: result.hpDamageB,
    shieldDamage: shieldDamageB,
    newShield: shieldPostTicksB, // Intermediate shield
    finalShield: p2.shield,       // Decayed shield at end of round
    shieldDecay: shieldDecayedB,  // Amount decayed
    newHp: p2.hp,
    newStatuses: p2.statuses,
    statusDamage: { burn: p2BurnTick, poison: p2PoisonTick, burnHpDmg: p2BurnHpDmg, burnShieldDmg: p2BurnShieldDmg },
    activeQuest: p2.activeQuest ? { ...p2.activeQuest, progress: p2.questProgress } : null,
    
    opponentOutcome: result.outcomeA,
    opponentShieldGain: result.shieldGainA,
    opponentHealGain: result.healGainA,
    opponentDamageDealt: result.damageDealtByA,
    opponentSelfDamage: result.selfDamageA,
    opponentTotalIncomingDmg: result.totalDmgA,
    opponentHpDamage: result.hpDamageA,
    opponentShieldDamage: shieldDamageA,
    opponentNewShield: shieldPostTicksA, // Intermediate shield
    opponentFinalShield: p1.shield,       // Decayed shield at end of round
    opponentShieldDecay: shieldDecayedA,  // Amount decayed
    opponentNewHp: p1.hp,
    opponentNewStatuses: p1.statuses,
    opponentStatusDamage: { burn: p1BurnTick, poison: p1PoisonTick, burnHpDmg: p1BurnHpDmg, burnShieldDmg: p1BurnShieldDmg },
    
    drewNewCards: drewNewCardsP2
  });

  // Emit hpUpdate
  io.to(roomId).emit('hpUpdate', {
    [p1.id]: { hp: p1.hp, shield: p1.shield },
    [p2.id]: { hp: p2.hp, shield: p2.shield }
  });

  // Check Round End (HP reaches 0)
  let roundOver = false;
  let roundWinnerId = null;
  let loserId = null;

  if (p1.hp <= 0 && p2.hp <= 0) {
    roundOver = true;
    // Draw: nobody gets a point, both score remains same
  } else if (p1.hp <= 0) {
    roundOver = true;
    roundWinnerId = p2.id;
    loserId = p1.id;
    p2.points += 1;
  } else if (p2.hp <= 0) {
    roundOver = true;
    roundWinnerId = p1.id;
    loserId = p2.id;
    p1.points += 1;
  }

  if (roundOver) {
    console.log(`[RoomManager] Round ${room.round} Over. Winner: ${roundWinnerId || 'DRAW'}. Current Score: ${p1.username} ${p1.points} - ${p2.points} ${p2.username}`);

    // Check if match is fully completed: First To 3 Points
    const matchOver = (p1.points >= 3 || p2.points >= 3);

    // Save pending clash state
    room.pendingClashEnd = {
      roundOver: true,
      roundWinnerId: roundWinnerId,
      loserId: loserId,
      matchOver: matchOver
    };
  } else {
    room.pendingClashEnd = {
      roundOver: false
    };
  }

  // Clear any existing next round timeout
  if (room.nextRoundTimeout) {
    clearTimeout(room.nextRoundTimeout);
    room.nextRoundTimeout = null;
  }

  // Initialize clash finished set
  room.clashFinishedPlayers = new Set();

  // Set safety timeout in case a client fails to report clashFinished
  room.nextRoundTimeout = setTimeout(() => {
    console.log(`[RoomManager] Safety timeout triggered for clash in room ${roomId}. Proceeding.`);
    const pEnd = room.pendingClashEnd;
    if (pEnd) {
      proceedAfterClash(roomId, io, pEnd.roundOver, pEnd.roundWinnerId, pEnd.loserId, pEnd.matchOver);
    }
  }, 12000); // 12 seconds safety margin (max animations is ~11s)
}

/**
 * Handles choosing a bonus card (loser comeback or quest bonus draft)
 */
function handleSelectBonusCard(socket, cardTemplateId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'BONUS_PICK') return;

  const cardTemplate = currentStep.options.find(c => c.templateId === cardTemplateId);
  if (!cardTemplate) {
    console.log(`[RoomManager] Card template ${cardTemplateId} not found in available draft pools for player ${player.username}`);
    return;
  }

  player.deck.push(cardTemplate);
  socket.emit('bonusPickLocked', cardTemplate);

  // Shift step and advance queue
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Handles selecting a pack in draft phase
 */
function handleSelectPack(socket, packId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'PACK_SELECTION') return;

  if (!currentStep.options.includes(packId)) return;

  const cards = generatePackCards(packId);
  player.deck.push(...cards);

  console.log(`[RoomManager] Player ${player.username} selected pack ${packId}. Added 4 cards.`);

  // Transform PACK_SELECTION step to PACK_REVEAL step
  player.prepQueue[0] = {
    type: 'PACK_REVEAL',
    packId: packId,
    cards: cards
  };

  socket.emit('packRevealStart', {
    packName: PACK_POOL[packId].name,
    packColor: PACK_POOL[packId].color,
    cards: cards
  });
}

/**
 * Handles pack reveal confirmation
 */
function handlePackRevealConfirm(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'PACK_REVEAL') return;

  console.log(`[RoomManager] Player ${player.username} confirmed pack reveal.`);

  // Shift step and advance queue
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Handles player disconnections during an active battle room
 */
function handleDisconnect(socket, io) {
  const roomId = playerToRoom[socket.id];
  if (!roomId) return;

  const room = rooms[roomId];
  if (!room) return;

  console.log(`[RoomManager] Player ${socket.id} disconnected from Room ${roomId}. Ending match.`);

  if (room.draftTimer) {
    clearInterval(room.draftTimer);
  }
  if (room.nextRoundTimeout) {
    clearTimeout(room.nextRoundTimeout);
  }
  if (room.prepTimer) {
    clearInterval(room.prepTimer);
    room.prepTimer = null;
  }

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  room.state = 'OVER';

  if (opponent) {
    opponent.socket.emit('playerDisconnected', {
      disconnectedPlayerName: room.players[socket.id].username
    });
    
    opponent.socket.emit('gameOver', {
      winnerId: opponentId,
      reason: 'opponent_disconnected',
      winnerName: opponent.username
    });

    opponent.socket.leave(roomId);
  }

  cleanupRoom(roomId);
}

/**
 * Helper to cleanup and delete a room
 */
function cleanupRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.draftTimer) {
    clearInterval(room.draftTimer);
  }
  if (room.nextRoundTimeout) {
    clearTimeout(room.nextRoundTimeout);
  }
  if (room.prepTimer) {
    clearInterval(room.prepTimer);
    room.prepTimer = null;
  }

  Object.keys(room.players).forEach(socketId => {
    delete playerToRoom[socketId];
  });

  delete rooms[roomId];
  console.log(`[RoomManager] Room ${roomId} cleared.`);
}

/**
 * Returns true if player is already inside an active room
 */
function isPlayerInActiveRoom(socketId) {
  return !!playerToRoom[socketId];
}

/**
 * Handles match surrender
 */
function handleSurrender(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || (room.state !== 'BATTLE' && room.state !== 'PREPARATION_PHASE')) return;

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  const opponentId = playerIds.find(id => id !== socket.id);
  if (!opponentId) return;

  room.state = 'OVER';
  const matchWinnerName = room.players[opponentId].username;

  io.to(roomId).emit('gameOver', {
    winnerId: opponentId,
    winnerName: matchWinnerName,
    reason: 'surrender',
    score: {
      [p1.id]: p1.points,
      [p2.id]: p2.points
    }
  });
}

/**
 * Handles rematch requests
 */
function handleRequestRematch(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'OVER') return;

  if (!room.rematchRequests) {
    room.rematchRequests = {};
  }

  room.rematchRequests[socket.id] = true;
  
  // Notify opponent
  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  if (opponentId) {
    const opponent = room.players[opponentId];
    opponent.socket.emit('rematchRequested');
  }

  // If both players requested rematch, start!
  if (Object.keys(room.rematchRequests).length === 2) {
    const playerIds = Object.keys(room.players);
    const p1 = room.players[playerIds[0]];
    const p2 = room.players[playerIds[1]];

    const deck1 = generateStarterDeck();
    const deck2 = generateStarterDeck();

    p1.maxHp = MAX_HP;
    p1.hp = MAX_HP;
    p1.shield = 0;
    p1.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0 };
    p1.points = 0;
    p1.deck = deck1;
    p1.hand = drawHandFromDeck(deck1, 4);
    p1.selectedCardId = null;
    p1.locked = false;
    p1.relics = {};
    p1.activeQuest = null;
    p1.questProgress = 0;
    p1.questRerollCount = 0;
    p1.questLocked = false;
    p1.offeredQuests = [];
    p1.pendingRemoveCardCount = 0;
    p1.pendingBonusDraft = false;
    p1.pendingRewardNotification = null;

    p2.maxHp = MAX_HP;
    p2.hp = MAX_HP;
    p2.shield = 0;
    p2.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0 };
    p2.points = 0;
    p2.deck = deck2;
    p2.hand = drawHandFromDeck(deck2, 4);
    p2.selectedCardId = null;
    p2.locked = false;
    p2.relics = {};
    p2.activeQuest = null;
    p2.questProgress = 0;
    p2.questRerollCount = 0;
    p2.questLocked = false;
    p2.offeredQuests = [];
    p2.pendingRemoveCardCount = 0;
    p2.pendingBonusDraft = false;
    p2.pendingRewardNotification = null;

    room.round = 1;
    room.state = 'QUEST_PHASE';
    room.draft = null;
    room.rematchRequests = {};

    console.log(`[RoomManager] Rematch started for room ${roomId}.`);
    io.to(roomId).emit('rematchStarted');

    setTimeout(() => {
      startQuestSelectionPhase(roomId, io);
    }, 1000);
  }
}

/**
 * Handles leaving the game room
 */
function handleLeaveRoom(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room) return;

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  if (opponentId) {
    const opponent = room.players[opponentId];
    opponent.socket.emit('opponentLeftRoom');
  }

  cleanupRoom(roomId);
}

/**
 * Handles a card removal request
 */
function handleRemoveCard(socket, cardInstanceId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'CARD_REMOVAL') return;

  if (currentStep.count <= 0) return;

  const idx = player.deck.findIndex(c => c.instanceId === cardInstanceId);
  if (idx !== -1) {
    const removed = player.deck.splice(idx, 1);
    console.log(`[RoomManager] Player ${player.username} removed card: ${removed[0].name}`);
  }

  currentStep.count = Math.max(0, currentStep.count - 1);

  if (currentStep.count > 0) {
    socket.emit('cardRemovalStart', { deck: player.deck });
  } else {
    socket.emit('removalConfirmed');
    player.prepQueue.shift();
    advancePlayerPrepQueue(player, room, io);
  }
}

/**
 * Handles skipping card removal
 */
function handleSkipCardRemoval(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'CARD_REMOVAL') return;

  currentStep.count = 0;
  socket.emit('removalConfirmed');
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Starts normal draft phase (loser pick and pack selection)
 */
function startNormalDraftPhase(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  room.state = 'DRAFT_PHASE';

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  const p1OfferedPacks = generatePacks(3);
  const p2OfferedPacks = generatePacks(3);

  const draftLoserId = room.draftLoserId;
  delete room.draftLoserId;

  room.draft = {
    loserId: draftLoserId,
    bonusChosen: draftLoserId ? false : true,
    p1PackChosen: false,
    p2PackChosen: false,
    p1RevealConfirmed: false,
    p2RevealConfirmed: false,
    p1OfferedPacks: p1OfferedPacks,
    p2OfferedPacks: p2OfferedPacks,
    bonusCards: draftLoserId ? generateBonusPickCards() : []
  };

  room.draft.p1BonusDraft = p1.pendingBonusDraft;
  room.draft.p2BonusDraft = p2.pendingBonusDraft;

  p1.pendingBonusDraft = false;
  p2.pendingBonusDraft = false;

  room.draft.p1BonusCards = room.draft.p1BonusDraft ? generateBonusPickCards() : [];
  room.draft.p2BonusCards = room.draft.p2BonusDraft ? generateBonusPickCards() : [];

  room.draft.p1BonusChosen = !room.draft.p1BonusDraft;
  room.draft.p2BonusChosen = !room.draft.p2BonusDraft;

  const p1NeedsBonus = (draftLoserId === p1.id) || room.draft.p1BonusDraft;
  const p2NeedsBonus = (draftLoserId === p2.id) || room.draft.p2BonusDraft;

  if (p1NeedsBonus) {
    const cards = (draftLoserId === p1.id) ? room.draft.bonusCards : room.draft.p1BonusCards;
    p1.socket.emit('bonusPickStart', { 
      cards: cards,
      isQuestBonus: (draftLoserId === p1.id) ? false : true
    });
  } else {
    p1.socket.emit('waitingForOpponentBonus');
  }

  if (p2NeedsBonus) {
    const cards = (draftLoserId === p2.id) ? room.draft.bonusCards : room.draft.p2BonusCards;
    p2.socket.emit('bonusPickStart', { 
      cards: cards,
      isQuestBonus: (draftLoserId === p2.id) ? false : true
    });
  } else {
    p2.socket.emit('waitingForOpponentBonus');
  }

  if (!p1NeedsBonus && !p2NeedsBonus) {
    room.draft.bonusChosen = true;
    p1.socket.emit('packSelectionStart', {
      packs: p1OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
    });
    p2.socket.emit('packSelectionStart', {
      packs: p2OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
    });
  }
}

module.exports = {
  createRoom,
  handleSelectCard,
  handleLockSelection,
  handleDisconnect,
  isPlayerInActiveRoom,
  handleSelectBonusCard,
  handleSelectPack,
  handlePackRevealConfirm,
  handleSurrender,
  handleRequestRematch,
  handleLeaveRoom,
  handleClashFinished,
  handleSelectQuest,
  handleRerollQuests,
  handleRemoveCard,
  handleSkipCardRemoval,
  handleSelectRelic,
  rooms,
  playerToRoom,
  updateQuestProgress
};

/**
 * Handles a client message indicating they have completed their clash animation
 */
function handleClashFinished(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'BATTLE' || !room.pendingClashEnd) return;

  if (!room.clashFinishedPlayers) {
    room.clashFinishedPlayers = new Set();
  }
  room.clashFinishedPlayers.add(socket.id);

  const playerIds = Object.keys(room.players);
  if (room.clashFinishedPlayers.size >= playerIds.length) {
    console.log(`[RoomManager] Both players finished clash in room ${roomId}. Proceeding immediately.`);
    if (room.nextRoundTimeout) {
      clearTimeout(room.nextRoundTimeout);
      room.nextRoundTimeout = null;
    }
    const pEnd = room.pendingClashEnd;
    proceedAfterClash(roomId, io, pEnd.roundOver, pEnd.roundWinnerId, pEnd.loserId, pEnd.matchOver);
  }
}

/**
 * Transition logic that triggers after both clients complete clash animations (or safety timeout)
 */
function proceedAfterClash(roomId, io, roundOver, roundWinnerId, loserId, matchOver) {
  const room = rooms[roomId];
  if (!room) return;

  // Clean up pending clash state
  delete room.pendingClashEnd;
  delete room.clashFinishedPlayers;

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  if (roundOver) {
    console.log(`[RoomManager] Round ${room.round} Over. Winner: ${roundWinnerId || 'DRAW'}. Current Score: ${p1.username} ${p1.points} - ${p2.points} ${p2.username}`);

    room.draftLoserId = loserId;

    // Check quests completion for both players and award rewards
    [p1, p2].forEach(p => {
      p.questCompletedThisRound = false;
      p.completedQuestText = '';
      p.pendingRewardNotification = null;
      
      if (p.activeQuest) {
        p.completedQuestText = p.activeQuest.text; // Store quest text so client can render it (completed or not)
        const progress = p.questProgress || 0;
        const target = p.activeQuest.target;
        
        if (progress >= target) {
          p.questCompletedThisRound = true;
          
          // Hand out rewards
          const reward = p.activeQuest.reward;
          
          if (reward.type === 'relic') {
            const relicsOfQuality = Object.values(RELIC_POOL).filter(r => r.quality === reward.quality);
            if (relicsOfQuality.length > 0) {
              // Pick 3 unique random relic options to choose from
              const shuffled = [...relicsOfQuality].sort(() => 0.5 - Math.random());
              const options = shuffled.slice(0, Math.min(3, shuffled.length));
              
              p.pendingRelicChoice = {
                quality: reward.quality,
                options: options.map(o => o.id),
                questText: p.activeQuest.text
              };
              p.pendingRewardNotification = `Unlocked: Choose a ${reward.quality} Relic!`;
            } else {
              p.pendingRewardNotification = `Unlocked ${reward.quality} Relic`;
            }
          } else if (reward.type === 'remove_card') {
            p.pendingRemoveCardCount = (p.pendingRemoveCardCount || 0) + 1;
            p.pendingRewardNotification = reward.text;
          } else if (reward.type === 'bonus_draft') {
            p.pendingBonusDraft = true;
            p.pendingRewardNotification = reward.text;
          }
        }
        
        // Clear active quest after the round ends
        p.activeQuest = null;
        p.questProgress = 0;
      }
    });

    // Emit roundFinished with quest updates
    io.to(roomId).emit('roundFinished', {
      round: room.round,
      winnerId: roundWinnerId,
      loserId: loserId,
      score: {
        [p1.id]: p1.points,
        [p2.id]: p2.points
      },
      p1Quest: {
        completed: p1.questCompletedThisRound,
        text: p1.completedQuestText,
        reward: p1.pendingRewardNotification
      },
      p2Quest: {
        completed: p2.questCompletedThisRound,
        text: p2.completedQuestText,
        reward: p2.pendingRewardNotification
      },
      p1Id: p1.id,
      p2Id: p2.id
    });

    const anyQuestCompleted = p1.questCompletedThisRound || p2.questCompletedThisRound;
    const displayDuration = anyQuestCompleted ? 4000 : 2500;

    // After a delay for the roundFinished overlay, trigger next phase
    room.nextRoundTimeout = setTimeout(() => {
      if (matchOver) {
        room.state = 'OVER';
        const matchWinnerId = p1.points >= 3 ? p1.id : p2.id;
        const matchWinnerName = room.players[matchWinnerId].username;

        io.to(roomId).emit('gameOver', {
          winnerId: matchWinnerId,
          winnerName: matchWinnerName,
          reason: 'match_finished',
          score: {
            [p1.id]: p1.points,
            [p2.id]: p2.points
          }
        });
      } else {
        // Transition to PREPARATION_PHASE
        room.state = 'PREPARATION_PHASE';
        
        // Clean up any prep timer in room
        clearPrepTimer(room);
        room.prepTimerSeconds = 30;

        p1.prepFinished = false;
        p2.prepFinished = false;

        [p1, p2].forEach(p => {
          p.prepQueue = [];

          // 1. Relic Choice
          if (p.pendingRelicChoice) {
            p.prepQueue.push({
              type: 'RELIC_CHOICE',
              quality: p.pendingRelicChoice.quality,
              options: p.pendingRelicChoice.options,
              questText: p.pendingRelicChoice.questText
            });
            p.pendingRelicChoice = null;
          }

          // 2. Card Removal
          if (p.pendingRemoveCardCount > 0) {
            p.prepQueue.push({
              type: 'CARD_REMOVAL',
              count: p.pendingRemoveCardCount
            });
            p.pendingRemoveCardCount = 0;
          }

          // 3. Bonus Pick (Loser Comeback / Quest Reward)
          const isLoser = (room.draftLoserId === p.id);
          if (isLoser) {
            p.prepQueue.push({
              type: 'BONUS_PICK',
              isQuestBonus: false,
              options: generateBonusPickCards()
            });
          }
          if (p.pendingBonusDraft) {
            p.prepQueue.push({
              type: 'BONUS_PICK',
              isQuestBonus: true,
              options: generateBonusPickCards()
            });
            p.pendingBonusDraft = false;
          }

          // 4. Pack Selection (always present at end of round)
          p.prepQueue.push({
            type: 'PACK_SELECTION',
            options: generatePacks(3)
          });
        });

        delete room.draftLoserId;

        // Start processing prep queues for both players
        [p1, p2].forEach(p => {
          advancePlayerPrepQueue(p, room, io);
        });
      }
    }, displayDuration);
  } else {
    // Round is not over, start next card clash turn immediately!
    startRound(roomId, io);
  }
}

/**
 * Handles choosing a relic from the options offered by quest completions
 */
function handleSelectRelic(socket, relicId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'RELIC_CHOICE') return;

  // Verify the relic is in options
  if (!currentStep.options.includes(relicId)) return;

  // Award the relic!
  player.relics[relicId] = (player.relics[relicId] || 0) + 1;

  // Apply HP buff immediately if it is a vitality relic
  if (relicId.startsWith('relic_vitality_')) {
    const buffVal = relicId === 'relic_vitality_common' ? 15 
                  : relicId === 'relic_vitality_rare' ? 25 
                  : 40; // epic
    player.maxHp = (player.maxHp || MAX_HP) + buffVal;
    player.hp += buffVal;
  }

  const selectedRelic = RELIC_POOL[relicId];

  // Notify client of success
  socket.emit('relicChosen', { relicId, name: selectedRelic.name });

  // Shift step and advance queue
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Helper to advance a player's preparation session queue
 */
function advancePlayerPrepQueue(player, room, io) {
  if (player.prepQueue.length === 0) {
    player.prepFinished = true;
    player.socket.emit('prepFinished');
    
    // Check if both players are finished
    const playerIds = Object.keys(room.players);
    const p1 = room.players[playerIds[0]];
    const p2 = room.players[playerIds[1]];
    
    if (p1.prepFinished && p2.prepFinished) {
      clearPrepTimer(room);
      proceedToQuestPhase(room, io);
    } else {
      startPrepTimer(room, io);
    }
    return;
  }

  const nextStep = player.prepQueue[0];
  if (nextStep.type === 'RELIC_CHOICE') {
    player.socket.emit('relicChoiceStart', {
      quality: nextStep.quality,
      options: nextStep.options.map(id => RELIC_POOL[id]),
      questText: nextStep.questText
    });
  } else if (nextStep.type === 'CARD_REMOVAL') {
    player.socket.emit('cardRemovalStart', {
      deck: player.deck
    });
  } else if (nextStep.type === 'BONUS_PICK') {
    player.socket.emit('bonusPickStart', {
      cards: nextStep.options,
      isQuestBonus: nextStep.isQuestBonus
    });
  } else if (nextStep.type === 'PACK_SELECTION') {
    player.socket.emit('packSelectionStart', {
      packs: nextStep.options.map(p => ({ id: p, ...PACK_POOL[p] }))
    });
  } else if (nextStep.type === 'PACK_REVEAL') {
    player.socket.emit('packRevealStart', {
      packName: PACK_POOL[nextStep.packId].name,
      packColor: PACK_POOL[nextStep.packId].color,
      cards: nextStep.cards
    });
  }
}

/**
 * Starts the 30-second countdown timer for preparation phase
 */
function startPrepTimer(room, io) {
  if (room.prepTimer) return; // Already running

  room.prepTimerSeconds = 30;
  
  // Notify both players that timer has started
  io.to(room.id).emit('prepTimerStarted', { secondsLeft: room.prepTimerSeconds });

  room.prepTimer = setInterval(() => {
    room.prepTimerSeconds -= 1;
    io.to(room.id).emit('prepTimerTick', { secondsLeft: room.prepTimerSeconds });

    if (room.prepTimerSeconds <= 0) {
      clearInterval(room.prepTimer);
      room.prepTimer = null;
      console.log(`[RoomManager] Prep timer expired for room ${room.id}. Auto-resolving pending player(s).`);

      const playerIds = Object.keys(room.players);
      playerIds.forEach(id => {
        const p = room.players[id];
        if (!p.prepFinished) {
          autoResolvePlayerPrepQueue(p, room, io);
        }
      });

      proceedToQuestPhase(room, io);
    }
  }, 1000);
}

/**
 * Clears the active preparation timer
 */
function clearPrepTimer(room) {
  if (room.prepTimer) {
    clearInterval(room.prepTimer);
    room.prepTimer = null;
  }
}

/**
 * Automatically resolves all remaining choices in a player's preparation queue
 */
function autoResolvePlayerPrepQueue(player, room, io) {
  console.log(`[RoomManager] Auto-resolving prep queue for player ${player.username}. Steps remaining: ${player.prepQueue.length}`);

  while (player.prepQueue.length > 0) {
    const step = player.prepQueue.shift();

    if (step.type === 'RELIC_CHOICE') {
      const relicId = step.options[0];
      if (relicId) {
        player.relics[relicId] = (player.relics[relicId] || 0) + 1;
        if (relicId.startsWith('relic_vitality_')) {
          const buffVal = relicId === 'relic_vitality_common' ? 15 
                        : relicId === 'relic_vitality_rare' ? 25 
                        : 40; // epic
          player.maxHp = (player.maxHp || MAX_HP) + buffVal;
          player.hp += buffVal;
        }
        console.log(`[RoomManager] Auto-resolved relic choice for ${player.username}: selected ${relicId}`);
      }
    } else if (step.type === 'CARD_REMOVAL') {
      console.log(`[RoomManager] Auto-resolved card removal for ${player.username}: skipped`);
    } else if (step.type === 'BONUS_PICK') {
      const cardOption = step.options[0];
      if (cardOption) {
        player.deck.push(cardOption);
        console.log(`[RoomManager] Auto-resolved bonus card pick for ${player.username}: selected ${cardOption.name}`);
      }
    } else if (step.type === 'PACK_SELECTION') {
      const packId = step.options[0];
      if (packId) {
        const cards = generatePackCards(packId);
        player.deck.push(...cards);
        console.log(`[RoomManager] Auto-resolved pack selection for ${player.username}: selected ${packId}`);
      }
    } else if (step.type === 'PACK_REVEAL') {
      console.log(`[RoomManager] Auto-resolved pack reveal for ${player.username}: confirmed`);
    }
  }

  player.prepFinished = true;
}

/**
 * Transitions both players from preparation to play session (quest selection)
 */
function proceedToQuestPhase(room, io) {
  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  p1.maxHp = MAX_HP + (p1.relics.relic_vitality_common || 0) * 15 + (p1.relics.relic_vitality_rare || 0) * 25 + (p1.relics.relic_vitality_epic || 0) * 40;
  p2.maxHp = MAX_HP + (p2.relics.relic_vitality_common || 0) * 15 + (p2.relics.relic_vitality_rare || 0) * 25 + (p2.relics.relic_vitality_epic || 0) * 40;

  p1.hp = p1.maxHp;
  p2.hp = p2.maxHp;
  p1.shield = 0;
  p2.shield = 0;

  p1.statuses = { poison: 0, burn: 0, attackBuff: (p1.relics.relic_focused_soul || 0) * 1, weakness: 0 };
  p2.statuses = { poison: 0, burn: 0, attackBuff: (p2.relics.relic_focused_soul || 0) * 1, weakness: 0 };

  p1.hand = drawHandFromDeck(p1.deck, 4);
  p2.hand = drawHandFromDeck(p2.deck, 4);

  room.round += 1;
  room.state = 'QUEST_PHASE';

  console.log(`[RoomManager] Room ${room.id}: Starting Round ${room.round} Quest Phase`);

  delete p1.prepQueue;
  delete p2.prepQueue;
  delete p1.prepFinished;
  delete p2.prepFinished;

  startQuestSelectionPhase(room.id, io);
}
