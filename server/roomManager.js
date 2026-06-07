const { nanoid } = require('nanoid');
const { MAX_HP, PACK_POOL } = require('./constants');
const {
  evaluateClash,
  generateStarterDeck,
  generatePacks,
  generatePackCards,
  generateBonusPickCards
} = require('./gameLogic');

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
        shield: 0,
        hand: drawHandFromDeck(deck1, 4),
        deck: deck1,
        selectedCardId: null,
        locked: false,
        points: 0,
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0 }
      },
      [player2.socketId]: {
        id: player2.socketId,
        username: player2.username,
        socket: player2.socket,
        hp: MAX_HP,
        shield: 0,
        hand: drawHandFromDeck(deck2, 4),
        deck: deck2,
        selectedCardId: null,
        locked: false,
        points: 0,
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0 }
      }
    },
    round: 1,
    state: 'BATTLE'
  };

  // Map sockets to room
  playerToRoom[player1.socketId] = roomId;
  playerToRoom[player2.socketId] = roomId;

  console.log(`[RoomManager] Room ${roomId} created. Starting match with starter decks...`);

  // Small delay to allow matchmaking screen to play transition
  setTimeout(() => {
    startRound(roomId, io);
  }, 1600);
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

  console.log(`[RoomManager] Room ${roomId}: starting round ${room.round}`);

  p1.socket.emit('roundStart', {
    round: room.round,
    hand: p1.hand,
    selfStatus: { hp: p1.hp, shield: p1.shield, handSize: p1.hand.length, statuses: p1.statuses, points: p1.points, deck: p1.deck },
    opponentStatus: { hp: p2.hp, shield: p2.shield, handSize: p2.hand.length, username: p2.username, statuses: p2.statuses, points: p2.points }
  });

  p2.socket.emit('roundStart', {
    round: room.round,
    hand: p2.hand,
    selfStatus: { hp: p2.hp, shield: p2.shield, handSize: p2.hand.length, statuses: p2.statuses, points: p2.points, deck: p2.deck },
    opponentStatus: { hp: p1.hp, shield: p1.shield, handSize: p1.hand.length, username: p1.username, statuses: p1.statuses, points: p1.points }
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

  // Evaluate clash considering active statuses
  const result = evaluateClash(card1, card2, p1.shield, p2.shield, p1.statuses, p2.statuses);

  const shieldDamageA = Math.max(0, (p1.shield + result.shieldGainA) - result.newShieldA);
  const shieldDamageB = Math.max(0, (p2.shield + result.shieldGainB) - result.newShieldB);

  // Apply clash results to server states (including HEAL)
  p1.shield = result.newShieldA;
  p2.shield = result.newShieldB;
  p1.hp = Math.max(0, Math.min(MAX_HP, p1.hp - result.hpDamageA + result.healGainA));
  p2.hp = Math.max(0, Math.min(MAX_HP, p2.hp - result.hpDamageB + result.healGainB));

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

  // Player 1 Ticks
  if (p1.statuses.burn > 0) {
    const totalBurnDmg = p1.statuses.burn * 3;
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
    p1PoisonTick = p1.statuses.poison;
    p1.hp = Math.max(0, p1.hp - p1PoisonTick);
    p1.statuses.poison = Math.max(0, p1.statuses.poison - 1); // Poison decreases by 1
  }

  // Player 2 Ticks
  if (p2.statuses.burn > 0) {
    const totalBurnDmg = p2.statuses.burn * 3;
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
    p2PoisonTick = p2.statuses.poison;
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
 * Handles choosing a loser bonus card
 */
function handleSelectBonusCard(socket, cardTemplateId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'DRAFT_PHASE' || !room.draft) return;

  const player = room.players[socket.id];
  if (room.draft.loserId !== socket.id || room.draft.bonusChosen) return;

  const cardTemplate = room.draft.bonusCards.find(c => c.templateId === cardTemplateId);
  if (!cardTemplate) return;

  player.deck.push(cardTemplate);
  room.draft.bonusChosen = true;
  console.log(`[RoomManager] Player ${player.username} chose bonus card ${cardTemplate.name}. Added to deck.`);

  socket.emit('bonusPickLocked', cardTemplate);

  // Transition both players to Pack Selection
  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  p1.socket.emit('packSelectionStart', {
    packs: room.draft.p1OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
  });
  p2.socket.emit('packSelectionStart', {
    packs: room.draft.p2OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
  });
}

/**
 * Handles selecting a pack in draft phase
 */
function handleSelectPack(socket, packId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'DRAFT_PHASE' || !room.draft || !room.draft.bonusChosen) return;

  const player = room.players[socket.id];
  const isPlayer1 = (Object.keys(room.players)[0] === socket.id);
  const offeredPacks = isPlayer1 ? room.draft.p1OfferedPacks : room.draft.p2OfferedPacks;
  const packChosenKey = isPlayer1 ? 'p1PackChosen' : 'p2PackChosen';

  if (room.draft[packChosenKey]) return;
  if (!offeredPacks.includes(packId)) return;

  const cards = generatePackCards(packId);
  player.deck.push(...cards);
  room.draft[packChosenKey] = true;

  console.log(`[RoomManager] Player ${player.username} selected pack ${packId}. Added 4 cards.`);

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
  if (!room || room.state !== 'DRAFT_PHASE' || !room.draft) return;

  const isPlayer1 = (Object.keys(room.players)[0] === socket.id);
  const confirmKey = isPlayer1 ? 'p1RevealConfirmed' : 'p2RevealConfirmed';

  room.draft[confirmKey] = true;
  console.log(`[RoomManager] Player ${room.players[socket.id].username} confirmed pack reveal.`);

  if (room.draft.p1RevealConfirmed && room.draft.p2RevealConfirmed) {
    const playerIds = Object.keys(room.players);
    const p1 = room.players[playerIds[0]];
    const p2 = room.players[playerIds[1]];

    p1.hp = MAX_HP;
    p2.hp = MAX_HP;
    p1.shield = 0;
    p2.shield = 0;
    p1.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0 };
    p2.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0 };

    p1.hand = drawHandFromDeck(p1.deck, 4);
    p2.hand = drawHandFromDeck(p2.deck, 4);

    room.round += 1;
    room.state = 'BATTLE';

    console.log(`[RoomManager] Room ${roomId}: Starting Round ${room.round}`);
    delete room.draft;

    startRound(roomId, io);
  }
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
  if (!room || (room.state !== 'BATTLE' && room.state !== 'DRAFT_PHASE')) return;

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

    p1.hp = MAX_HP;
    p1.shield = 0;
    p1.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0 };
    p1.points = 0;
    p1.deck = deck1;
    p1.hand = drawHandFromDeck(deck1, 4);
    p1.selectedCardId = null;
    p1.locked = false;

    p2.hp = MAX_HP;
    p2.shield = 0;
    p2.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0 };
    p2.points = 0;
    p2.deck = deck2;
    p2.hand = drawHandFromDeck(deck2, 4);
    p2.selectedCardId = null;
    p2.locked = false;

    room.round = 1;
    room.state = 'BATTLE';
    room.draft = null;
    room.rematchRequests = {};

    console.log(`[RoomManager] Rematch started for room ${roomId}.`);
    io.to(roomId).emit('rematchStarted');

    setTimeout(() => {
      startRound(roomId, io);
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
 * FUTURE UPDATE: CARD REMOVAL PHASE
 * 
 * To implement this phase in the future:
 * 1. Define a new game state `room.state = 'CARD_REMOVAL_PHASE'` in constants and logic.
 * 2. In resolveRound, instead of transitioning directly from roundOver to DRAFT_PHASE,
 *    transition to CARD_REMOVAL_PHASE.
 * 3. Emit a socket event 'cardRemovalStart' to both players with their current deck list.
 * 4. Implement a socket handler like the one below to process removals:
 * 
 * function handleRemoveCard(socket, cardInstanceId, io) {
 *   const roomId = playerToRoom[socket.id];
 *   const room = rooms[roomId];
 *   if (!room || room.state !== 'CARD_REMOVAL_PHASE') return;
 * 
 *   const player = room.players[socket.id];
 *   if (cardInstanceId) {
 *     const idx = player.deck.findIndex(c => c.instanceId === cardInstanceId);
 *     if (idx !== -1) {
 *       const removed = player.deck.splice(idx, 1);
 *       console.log(`[RoomManager] Player ${player.username} removed card: ${removed[0].name}`);
 *     }
 *   }
 * 
 *   player.removalConfirmed = true;
 * 
 *   // Once both players confirm/skip, transition to the DRAFT_PHASE
 *   const playerIds = Object.keys(room.players);
 *   const p1 = room.players[playerIds[0]];
 *   const p2 = room.players[playerIds[1]];
 *   if (p1.removalConfirmed && p2.removalConfirmed) {
 *     p1.removalConfirmed = false;
 *     p2.removalConfirmed = false;
 *     // ... transition to DRAFT_PHASE / pack selection
 *   }
 * }
 */

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
  handleClashFinished
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
      room.state = 'DRAFT_PHASE';
      
      const p1OfferedPacks = generatePacks(3);
      const p2OfferedPacks = generatePacks(3);

      room.draft = {
        loserId: loserId,
        bonusChosen: loserId ? false : true,
        p1PackChosen: false,
        p2PackChosen: false,
        p1RevealConfirmed: false,
        p2RevealConfirmed: false,
        p1OfferedPacks: p1OfferedPacks,
        p2OfferedPacks: p2OfferedPacks,
        bonusCards: loserId ? generateBonusPickCards() : []
      };

      // Since the clients are ready, we emit roundFinished immediately!
      io.to(roomId).emit('roundFinished', {
        round: room.round,
        winnerId: roundWinnerId,
        loserId: loserId,
        score: {
          [p1.id]: p1.points,
          [p2.id]: p2.points
        }
      });

      // After a delay for the roundFinished overlay to show, trigger drafting
      room.nextRoundTimeout = setTimeout(() => {
        if (loserId) {
          const loserPlayer = room.players[loserId];
          const winnerPlayerId = Object.keys(room.players).find(id => id !== loserId);
          const winnerPlayer = room.players[winnerPlayerId];

          loserPlayer.socket.emit('bonusPickStart', {
            cards: room.draft.bonusCards
          });
          winnerPlayer.socket.emit('waitingForOpponentBonus');
        } else {
          p1.socket.emit('packSelectionStart', {
            packs: p1OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
          });
          p2.socket.emit('packSelectionStart', {
            packs: p2OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
          });
        }
      }, 2200); // 2.2s for display
    }
  } else {
    // Round is not over, start next card clash turn immediately!
    startRound(roomId, io);
  }
}
