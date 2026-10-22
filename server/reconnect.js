const { MAX_HP } = require('./constants');
const { generateStarterDeck } = require('./gameLogic');
const { generatePlayerQuests } = require('./quests');
const { RELIC_POOL } = require('./relics');
const { PACK_POOL } = require('./packs');
const auth = require('./auth');
const { rooms, playerToRoom, userToRoom, cleanupRoom, recordMatchToDb } = require('./roomState');

// Late-bound delegate helpers to avoid circular evaluation issues
function drawHandFromDeck(...args) {
  return require('./battle').drawHandFromDeck(...args);
}
function startQuestSelectionPhase(...args) {
  return require('./prepPhase').startQuestSelectionPhase(...args);
}

/**
 * Builds an authoritative snapshot of the current match room state for a given player
 */
function buildStateSnapshot(room, player, opponent) {
  // Ensure offeredQuests is populated if in QUEST_PHASE
  if (room.state === 'QUEST_PHASE' && (!player.offeredQuests || player.offeredQuests.length === 0)) {
    player.offeredQuests = generatePlayerQuests(player.deck, player.relics);
  }

  // Determine currentPrepStep if player is in prep queue
  let currentPrepStep = null;
  if (player.prepQueue && player.prepQueue.length > 0) {
    const rawStep = player.prepQueue[0];
    if (rawStep.type === 'RELIC_CHOICE') {
      currentPrepStep = {
        type: 'RELIC_CHOICE',
        quality: rawStep.quality,
        options: (rawStep.options || []).map(id => typeof id === 'string' ? RELIC_POOL[id] : id).filter(Boolean),
        questText: rawStep.questText,
        prepRerollsLeft: player.prepRerollsLeft !== undefined ? player.prepRerollsLeft : 1
      };
    } else if (rawStep.type === 'PACK_SELECTION') {
      currentPrepStep = {
        type: 'PACK_SELECTION',
        packs: (rawStep.options || []).map(p => ({ id: p, ...PACK_POOL[p] })),
        prepRerollsLeft: player.prepRerollsLeft !== undefined ? player.prepRerollsLeft : 1,
        isQuestBonus: rawStep.isQuestBonus || false
      };
    } else if (rawStep.type === 'PACK_REVEAL') {
      currentPrepStep = {
        type: 'PACK_REVEAL',
        packId: rawStep.packId,
        packName: PACK_POOL[rawStep.packId]?.name || '',
        packColor: PACK_POOL[rawStep.packId]?.color || '',
        cards: rawStep.cards || []
      };
    } else if (rawStep.type === 'CARD_REMOVAL') {
      currentPrepStep = {
        type: 'CARD_REMOVAL',
        deck: player.deck,
        removalTokens: player.removalTokens || 0,
        minDeckSize: 4
      };
    } else if (rawStep.type === 'BONUS_PICK') {
      currentPrepStep = {
        type: 'BONUS_PICK',
        cards: rawStep.options || [],
        isQuestBonus: rawStep.isQuestBonus || false
      };
    } else {
      currentPrepStep = { ...rawStep };
    }
  }

  // Determine phaseEndsAt
  let phaseEndsAt = null;
  if (room.state === 'BATTLE') {
    if (room.clashWindowEndsAt && room.pendingClash) {
      phaseEndsAt = room.clashWindowEndsAt;
    } else if (player.turnDeadline) {
      phaseEndsAt = player.turnDeadline;
    }
  } else if (room.state === 'QUEST_PHASE') {
    phaseEndsAt = null; // No timer in quest selection sub-phase
  } else if (room.state === 'PREPARATION_PHASE') {
    if (room.prepPhaseEndsAt) {
      phaseEndsAt = room.prepPhaseEndsAt;
    }
  }

  // Determine pendingClash for this player if clash window is actively running
  let pendingClash = null;
  if (room.pendingClash && room.pendingClash.reveals && room.pendingClash.reveals[player.id]) {
    pendingClash = {
      reveal: room.pendingClash.reveals[player.id],
      result: room.pendingClash.results ? room.pendingClash.results[player.id] : null,
      roundOver: room.pendingClashEnd?.roundOver || false,
      roundWinnerId: room.pendingClashEnd?.roundWinnerId || null,
      matchOver: room.pendingClashEnd?.matchOver || false
    };
  }

  return {
    roomId: room.id,
    state: room.state,
    round: room.round,
    yourId: player.id,
    yourName: player.username,
    opponentId: opponent ? opponent.id : null,
    opponentName: opponent ? opponent.username : 'Opponent',
    yourHp: player.hp,
    yourMaxHp: player.maxHp || MAX_HP,
    yourShield: player.shield || 0,
    yourPoints: player.points || 0,
    yourDeck: player.deck || [],
    yourHand: player.hand || [],
    yourStatuses: player.statuses || {},
    yourRelics: player.relics || {},
    yourActiveQuest: player.activeQuest ? { ...player.activeQuest, progress: player.questProgress || 0 } : null,
    questProgress: player.questProgress || 0,
    offeredQuests: player.offeredQuests || [],
    questLocked: player.questLocked || false,
    questRerollCount: player.questRerollCount || 0,
    yourRemovalTokens: player.removalTokens || 0,
    yourLocked: player.locked || false,
    yourSelectedCardId: player.selectedCardId || null,
    opponentLocked: opponent ? (opponent.locked || false) : false,
    opponentHp: opponent ? opponent.hp : 100,
    opponentMaxHp: opponent ? opponent.maxHp : 100,
    opponentShield: opponent ? opponent.shield : 0,
    opponentPoints: opponent ? opponent.points : 0,
    opponentHandCount: opponent ? (opponent.hand ? opponent.hand.length : 0) : 0,
    opponentStatuses: opponent ? opponent.statuses : {},
    opponentRelics: opponent ? opponent.relics : {},
    clashHistory: room.clashHistory || [],
    currentPrepStep: currentPrepStep,
    pendingRelicChoices: (player.prepQueue?.find(s => s.type === 'RELIC_CHOICE')?.options || player.pendingRelicChoices || []).map(item => typeof item === 'string' ? RELIC_POOL[item] : item).filter(Boolean),
    pendingClash: pendingClash,
    phaseEndsAt: phaseEndsAt
  };
}

/**
 * Handles player disconnections with a 30s grace reconnect period
 */
function handleDisconnect(socket, io) {
  let roomId = playerToRoom[socket.id];
  if (!roomId && socket.user?.userId) {
    roomId = userToRoom[socket.user.userId];
  }
  if (!roomId) return;

  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  const player = room.players[socket.id];
  if (!player) return;

  console.log(`[RoomManager] Player ${player.username} (${socket.id}) disconnected from Room ${roomId}. Starting 30s reconnect grace timer...`);
  player.isDisconnected = true;

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  if (opponent && opponent.socket) {
    opponent.socket.emit('opponentDisconnected', {
      disconnectedPlayerName: player.username,
      timeoutSeconds: 30
    });
  }

  if (!room.reconnectTimers) room.reconnectTimers = {};

  const userIdOrId = player.userId || socket.id;

  if (room.reconnectTimers[userIdOrId]) {
    clearTimeout(room.reconnectTimers[userIdOrId]);
  }

  room.reconnectTimers[userIdOrId] = setTimeout(() => {
    console.log(`[RoomManager] Reconnect timeout reached for ${player.username} in Room ${roomId}. Forfeiting match.`);
    room.state = 'OVER';

    if (room.draftTimer) clearInterval(room.draftTimer);
    if (room.nextRoundTimeout) clearTimeout(room.nextRoundTimeout);
    if (room.prepTimer) clearInterval(room.prepTimer);

    if (opponent && opponent.socket) {
      opponent.socket.emit('gameOver', {
        winnerId: opponentId,
        winnerName: opponent.username,
        reason: 'opponent_disconnected',
        score: {
          [player.id]: player.points,
          [opponent.id]: opponent.points
        }
      });
      opponent.socket.leave(roomId);
    }

    recordMatchToDb(room, opponentId, 'opponent_disconnected');
    cleanupRoom(roomId);
  }, 30000); // 30 seconds timer
}

/**
 * Checks if a connecting socket has a pending room waiting for reconnect
 */
function checkPendingReconnect(socket, io) {
  if (!socket.user?.userId) return;
  const userId = String(socket.user.userId);
  const roomId = userToRoom[userId];
  if (roomId && rooms[roomId] && rooms[roomId].state !== 'OVER') {
    socket.emit('pendingReconnect', { roomId });
  }
}

/**
 * Handles reconnecting a client socket back to an active match room
 */
function handleReconnectMatch(socket, token, io) {
  const decoded = auth.verifyToken(token);
  if (!decoded) {
    socket.emit('reconnectFailed', 'Invalid or expired session token.');
    return;
  }

  const userId = String(decoded.userId);
  const roomId = userToRoom[userId];
  const room = rooms[roomId];

  if (!room || room.state === 'OVER') {
    socket.emit('reconnectFailed', 'Game match is no longer active.');
    return;
  }

  // Clear disconnect timer
  if (room.reconnectTimers && (room.reconnectTimers[userId] || room.reconnectTimers[decoded.userId])) {
    clearTimeout(room.reconnectTimers[userId] || room.reconnectTimers[decoded.userId]);
    delete room.reconnectTimers[userId];
    delete room.reconnectTimers[decoded.userId];
  }

  const oldSocketId = Object.keys(room.players).find(id => 
    String(room.players[id].userId) === userId || 
    room.players[id].username?.toLowerCase() === decoded.username?.toLowerCase()
  );
  if (!oldSocketId) {
    socket.emit('reconnectFailed', 'Player data not found in room.');
    return;
  }

  const playerObj = room.players[oldSocketId];
  delete room.players[oldSocketId];
  delete playerToRoom[oldSocketId];

  // Attach new socket
  playerObj.id = socket.id;
  playerObj.socket = socket;
  playerObj.isDisconnected = false;
  room.players[socket.id] = playerObj;
  playerToRoom[socket.id] = roomId;

  socket.join(roomId);

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  if (opponent && opponent.socket) {
    opponent.socket.emit('opponentReconnected', {
      reconnectedPlayerName: playerObj.username
    });
  }

  const payload = buildStateSnapshot(room, playerObj, opponent);
  socket.emit('reconnectSuccess', payload);
  console.log(`[RoomManager] Player ${playerObj.username} reconnected to Room ${roomId}`);
}

/**
 * Handles live state sync request (e.g. tab becoming visible after being backgrounded)
 */
function handleRequestStateSync(socket, io) {
  let roomId = playerToRoom[socket.id];
  if (!roomId && socket.user?.userId) {
    roomId = userToRoom[socket.user.userId];
  }
  if (!roomId) return;

  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  const player = room.players[socket.id];
  if (!player) return;

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  const payload = buildStateSnapshot(room, player, opponent);
  socket.emit('stateSync', payload);
  console.log(`[RoomManager] State sync sent to player ${player.username} for Room ${roomId}`);
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

  recordMatchToDb(room, opponentId, 'surrender');

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
    p1.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0, leech: 0, thorn: 0 };
    p1.points = 0;
    p1.deck = deck1;
    p1.hand = drawHandFromDeck(deck1, 4);
    p1.selectedCardId = null;
    p1.locked = false;
    p1.consecutiveTimeouts = 0;
    p1.relics = {};
    p1.phoenixUsedThisRound = false;
    p1.prepRerollsLeft = 0;
    p1.activeQuest = null;
    p1.questProgress = 0;
    p1.questRerollCount = 0;
    p1.questLocked = false;
    p1.offeredQuests = [];
    p1.removalTokens = 0;
    p1.pendingBonusDraft = false;
    p1.pendingBonusPack = false;
    p1.pendingRewardNotification = null;

    p2.maxHp = MAX_HP;
    p2.hp = MAX_HP;
    p2.shield = 0;
    p2.statuses = { poison: 0, burn: 0, attackBuff: 0, weakness: 0, leech: 0, thorn: 0 };
    p2.points = 0;
    p2.deck = deck2;
    p2.hand = drawHandFromDeck(deck2, 4);
    p2.selectedCardId = null;
    p2.locked = false;
    p2.consecutiveTimeouts = 0;
    p2.relics = {};
    p2.phoenixUsedThisRound = false;
    p2.prepRerollsLeft = 0;
    p2.activeQuest = null;
    p2.questProgress = 0;
    p2.questRerollCount = 0;
    p2.questLocked = false;
    p2.offeredQuests = [];
    p2.removalTokens = 0;
    p2.pendingBonusDraft = false;
    p2.pendingBonusPack = false;
    p2.pendingRewardNotification = null;

    room.round = 1;
    room.state = 'QUEST_PHASE';
    room.draft = null;
    room.rematchRequests = {};
    room.clashHistory = [];

    console.log(`[RoomManager] Rematch started for room ${roomId}.`);
    io.to(roomId).emit('rematchStarted');

    setTimeout(() => {
      startQuestSelectionPhase(roomId, io);
    }, 1000);
  }
}

module.exports = {
  buildStateSnapshot,
  handleDisconnect,
  checkPendingReconnect,
  handleReconnectMatch,
  handleRequestStateSync,
  handleSurrender,
  handleRequestRematch
};
