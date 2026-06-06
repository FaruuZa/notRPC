const { nanoid } = require('nanoid');
const { MAX_HP } = require('./constants');
const { drawCards, drawDraftPool, drawReplacements, evaluateClash } = require('./gameLogic');

// Active game rooms map: roomId -> roomState
const rooms = {};

// Socket ID to Room ID lookup map: socketId -> roomId
const playerToRoom = {};

/**
 * Creates and initializes a new game room, launching the Draft Phase
 */
function createRoom(roomId, player1, player2, io) {
  // Generate 8 random cards for each player to draft/mulligan from (at least 4 elemental)
  const draftPool1 = drawDraftPool(8, 4);
  const draftPool2 = drawDraftPool(8, 4);

  rooms[roomId] = {
    id: roomId,
    players: {
      [player1.socketId]: {
        id: player1.socketId,
        username: player1.username,
        socket: player1.socket,
        hp: MAX_HP,
        shield: 0,
        hand: [],
        deck: [], // Will hold the 8 drafted cards
        draftPool: draftPool1,
        draftLocked: false,
        selectedCardId: null,
        locked: false,
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0 }
      },
      [player2.socketId]: {
        id: player2.socketId,
        username: player2.username,
        socket: player2.socket,
        hp: MAX_HP,
        shield: 0,
        hand: [],
        deck: [], // Will hold the 8 drafted cards
        draftPool: draftPool2,
        draftLocked: false,
        selectedCardId: null,
        locked: false,
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0 }
      }
    },
    round: 0,
    state: 'DRAFT',
    draftSecondsLeft: 20,
    draftTimer: null
  };

  // Map sockets to room
  playerToRoom[player1.socketId] = roomId;
  playerToRoom[player2.socketId] = roomId;

  console.log(`[RoomManager] Room ${roomId} created. Launching draft phase...`);

  // Send draft start payload to clients (8 cards mulligan pool)
  player1.socket.emit('draftStart', {
    draftPool: draftPool1,
    seconds: 20
  });

  player2.socket.emit('draftStart', {
    draftPool: draftPool2,
    seconds: 20
  });

  // Start server-side draft timer countdown
  startDraftTimer(roomId, io);
}

/**
 * Handles the countdown interval for the Draft Phase
 */
function startDraftTimer(roomId, io) {
  const room = rooms[roomId];
  if (!room) return;

  room.draftTimer = setInterval(() => {
    room.draftSecondsLeft -= 1;

    if (room.draftSecondsLeft <= 0) {
      clearInterval(room.draftTimer);
      autoDraftAndStart(roomId, io);
    }
  }, 1000);
}

/**
 * Autodrafts (keeps entire pool as deck) for idle players and launches the match
 */
function autoDraftAndStart(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state !== 'DRAFT') return;

  console.log(`[RoomManager] Room ${roomId}: Draft timer expired. Keeping current pool...`);

  Object.keys(room.players).forEach(socketId => {
    const player = room.players[socketId];
    if (!player.draftLocked) {
      // Keep entire draft pool as deck
      player.deck = JSON.parse(JSON.stringify(player.draftPool));
      player.draftLocked = true;
    }
  });

  finalizeDraftAndStartGame(roomId, io);
}

/**
 * Handles incoming lockDraft events from clients (Mulligan keep selection)
 */
function handleLockDraft(socket, selectedInstanceIds, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'DRAFT') return;

  const player = room.players[socket.id];
  if (player.draftLocked) return;

  // Validate that selectedInstanceIds is an array
  if (!selectedInstanceIds || !Array.isArray(selectedInstanceIds)) {
    socket.emit('error', 'Invalid mulligan selection.');
    return;
  }

  // Count elemental and non-elemental cards in the selected keeps
  const keptElementals = player.draftPool.filter(card => 
    selectedInstanceIds.includes(card.instanceId) && 
    ['FIRE', 'WATER', 'NATURE'].includes(card.element)
  );
  const keptNonElementals = player.draftPool.filter(card => 
    selectedInstanceIds.includes(card.instanceId) && 
    !['FIRE', 'WATER', 'NATURE'].includes(card.element)
  );

  // Validate keeping limit for non-elementals to guarantee at least 4 elementals can be obtained
  if (keptNonElementals.length > 4) {
    socket.emit('error', 'Invalid selection: You can keep at most 4 Neutral/Chaos cards to ensure at least 4 Elementals.');
    return;
  }

  // Draw replacements in a single batch, forcing enough elementals to hit 4 min
  const unselectedCards = player.draftPool.filter(card => !selectedInstanceIds.includes(card.instanceId));
  const numReplacements = unselectedCards.length;
  const minElementalReq = Math.max(0, 4 - keptElementals.length);
  const replacementCards = drawReplacements(numReplacements, minElementalReq);

  const finalDeck = [];
  const replaced = [];
  let replacementIndex = 0;

  player.draftPool.forEach(card => {
    if (selectedInstanceIds.includes(card.instanceId)) {
      finalDeck.push(card);
    } else {
      const newCard = replacementCards[replacementIndex++];
      finalDeck.push(newCard);
      replaced.push({
        oldId: card.instanceId,
        newCard: newCard
      });
    }
  });

  player.draftPool = finalDeck;
  player.deck = JSON.parse(JSON.stringify(finalDeck));
  player.draftLocked = true;
  
  console.log(`[RoomManager] Room ${roomId}: Player ${player.username} locked draft.`);

  // Inform the client about which cards were replaced and what they got
  socket.emit('draftMulliganResult', {
    draftPool: player.draftPool,
    replaced: replaced
  });

  // Check if both players have locked their drafts
  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  if (opponent.draftLocked) {
    // Clear draft timer
    if (room.draftTimer) {
      clearInterval(room.draftTimer);
    }
    
    // Inform both clients that draft is finalized
    io.to(roomId).emit('draftFinalized');

    // Delay start of game to allow shuffle animations to complete on clients
    room.nextRoundTimeout = setTimeout(() => {
      finalizeDraftAndStartGame(roomId, io);
    }, 4500);
  } else {
    // Notify opponent that player locked draft (can display waiting status)
    opponent.socket.emit('opponentDraftLocked');
  }
}

/**
 * Draws a random starting hand from the 8-card deck
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
 * Finalizes the draft phase and deals the starting hand of 4 cards randomly from the 8-card deck
 */
function finalizeDraftAndStartGame(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state !== 'DRAFT') return;

  console.log(`[RoomManager] Room ${roomId}: Draft completed. Starting match...`);

  Object.keys(room.players).forEach(socketId => {
    const player = room.players[socketId];
    
    // Starting hand of 4 cards randomly chosen from their deck
    player.hand = drawHandFromDeck(player.deck, 4);
    
    // Clear draft values
    delete player.draftPool;
    delete player.draftLocked;
  });

  room.state = 'BATTLE';
  room.round = 1;

  // Kickoff round 1
  startRound(roomId, io);
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
    selfStatus: { hp: p1.hp, shield: p1.shield, handSize: p1.hand.length, statuses: p1.statuses },
    opponentStatus: { hp: p2.hp, shield: p2.shield, handSize: p2.hand.length, username: p2.username, statuses: p2.statuses }
  });

  p2.socket.emit('roundStart', {
    round: room.round,
    hand: p2.hand,
    selfStatus: { hp: p2.hp, shield: p2.shield, handSize: p2.hand.length, statuses: p2.statuses },
    opponentStatus: { hp: p1.hp, shield: p1.shield, handSize: p1.hand.length, username: p1.username, statuses: p1.statuses }
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

  // Apply clash results to server states (including HEAL)
  p1.shield = result.newShieldA;
  p2.shield = result.newShieldB;
  p1.hp = Math.max(0, Math.min(MAX_HP, p1.hp - result.hpDamageA + result.healGainA));
  p2.hp = Math.max(0, Math.min(MAX_HP, p2.hp - result.hpDamageB + result.healGainB));

  // Helper to apply status to a player
  const applyStatusToPlayer = (player, statusObj) => {
    if (!statusObj) return;

    // First process Cleanse if it is present in the outcome
    if (statusObj.cleanse && statusObj.cleanse > 0) {
      player.statuses.poison = 0;
      player.statuses.burn = 0;
      player.statuses.weakness = 0;
      console.log(`[RoomManager] Player ${player.username} cleansed all debuffs.`);
    }

    // Now process other statuses
    Object.keys(statusObj).forEach(stat => {
      if (stat === 'cleanse') return; // already handled
      
      if (stat === 'attackBuff' || stat === 'weakness') {
        player.statuses[stat] = Math.min(5, (player.statuses[stat] || 0) + statusObj[stat]);
      } else {
        player.statuses[stat] = (player.statuses[stat] || 0) + statusObj[stat];
      }
    });
  };

  // Process status effect applications from card outcomes
  const effect1 = card1.outcomes[result.outcomeA];
  const effect2 = card2.outcomes[result.outcomeB];

  // 1. Pre-tick Cleanse check: If player played a Cleanse card, wipe debuffs BEFORE ticks run!
  if (effect1.applyStatus && effect1.applyStatus.self && effect1.applyStatus.self.cleanse > 0) {
    p1.statuses.poison = 0;
    p1.statuses.burn = 0;
    p1.statuses.weakness = 0;
    console.log(`[RoomManager] Player ${p1.username} cleansed all debuffs (pre-tick).`);
  }
  if (effect2.applyStatus && effect2.applyStatus.self && effect2.applyStatus.self.cleanse > 0) {
    p2.statuses.poison = 0;
    p2.statuses.burn = 0;
    p2.statuses.weakness = 0;
    console.log(`[RoomManager] Player ${p2.username} cleansed all debuffs (pre-tick).`);
  }
  if (effect1.applyStatus && effect1.applyStatus.opponent && effect1.applyStatus.opponent.cleanse > 0) {
    p2.statuses.poison = 0;
    p2.statuses.burn = 0;
    p2.statuses.weakness = 0;
  }
  if (effect2.applyStatus && effect2.applyStatus.opponent && effect2.applyStatus.opponent.cleanse > 0) {
    p1.statuses.poison = 0;
    p1.statuses.burn = 0;
    p1.statuses.weakness = 0;
  }

  // 2. Process end-of-round status damage ticks (Poison & Burn directly bypass Shield)
  // These use the pre-outcome statuses (except cleansed) so newly applied poison/burn will not tick this round
  let p1BurnTick = 0, p1PoisonTick = 0;
  let p2BurnTick = 0, p2PoisonTick = 0;

  // Player 1 Ticks
  if (p1.statuses.burn > 0) {
    p1BurnTick = p1.statuses.burn * 2;
    p1.hp = Math.max(0, p1.hp - p1BurnTick);
    p1.statuses.burn = 0; // Burn immediately resets to 0
  }
  if (p1.statuses.poison > 0) {
    p1PoisonTick = p1.statuses.poison;
    p1.hp = Math.max(0, p1.hp - p1PoisonTick);
    p1.statuses.poison = Math.max(0, p1.statuses.poison - 1); // Poison decreases by 1
  }

  // Player 2 Ticks
  if (p2.statuses.burn > 0) {
    p2BurnTick = p2.statuses.burn * 2;
    p2.hp = Math.max(0, p2.hp - p2BurnTick);
    p2.statuses.burn = 0;
  }
  if (p2.statuses.poison > 0) {
    p2PoisonTick = p2.statuses.poison;
    p2.hp = Math.max(0, p2.hp - p2PoisonTick);
    p2.statuses.poison = Math.max(0, p2.statuses.poison - 1);
  }

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
    newShield: p1.shield,
    newHp: p1.hp,
    newStatuses: p1.statuses,
    statusDamage: { burn: p1BurnTick, poison: p1PoisonTick },
    
    opponentOutcome: result.outcomeB,
    opponentShieldGain: result.shieldGainB,
    opponentHealGain: result.healGainB,
    opponentDamageDealt: result.damageDealtByB,
    opponentSelfDamage: result.selfDamageB,
    opponentTotalIncomingDmg: result.totalDmgB,
    opponentHpDamage: result.hpDamageB,
    opponentNewShield: p2.shield,
    opponentNewHp: p2.hp,
    opponentNewStatuses: p2.statuses,
    opponentStatusDamage: { burn: p2BurnTick, poison: p2PoisonTick },
    
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
    newShield: p2.shield,
    newHp: p2.hp,
    newStatuses: p2.statuses,
    statusDamage: { burn: p2BurnTick, poison: p2PoisonTick },
    
    opponentOutcome: result.outcomeA,
    opponentShieldGain: result.shieldGainA,
    opponentHealGain: result.healGainA,
    opponentDamageDealt: result.damageDealtByA,
    opponentSelfDamage: result.selfDamageA,
    opponentTotalIncomingDmg: result.totalDmgA,
    opponentHpDamage: result.hpDamageA,
    opponentNewShield: p1.shield,
    opponentNewHp: p1.hp,
    opponentNewStatuses: p1.statuses,
    opponentStatusDamage: { burn: p1BurnTick, poison: p1PoisonTick },
    
    drewNewCards: drewNewCardsP2
  });

  // Emit hpUpdate
  io.to(roomId).emit('hpUpdate', {
    [p1.id]: { hp: p1.hp, shield: p1.shield },
    [p2.id]: { hp: p2.hp, shield: p2.shield }
  });

  // Check Game Over
  let winnerId = null;
  let isGameOver = false;
  let reason = '';

  if (p1.hp <= 0 && p2.hp <= 0) {
    isGameOver = true;
    reason = 'draw';
  } else if (p1.hp <= 0) {
    isGameOver = true;
    winnerId = p2.id;
    reason = 'opponent_defeated';
  } else if (p2.hp <= 0) {
    isGameOver = true;
    winnerId = p1.id;
    reason = 'opponent_defeated';
  }

  if (isGameOver) {
    room.state = 'OVER';
    setTimeout(() => {
      io.to(roomId).emit('gameOver', {
        winnerId,
        reason,
        winnerName: winnerId ? room.players[winnerId].username : 'DRAW'
      });
      cleanupRoom(roomId);
    }, 3500);
  } else {
    room.round += 1;
    room.nextRoundTimeout = setTimeout(() => {
      startRound(roomId, io);
    }, 3500);
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

module.exports = {
  createRoom,
  handleLockDraft,
  handleSelectCard,
  handleLockSelection,
  handleDisconnect,
  isPlayerInActiveRoom
};
