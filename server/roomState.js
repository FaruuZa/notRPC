const { MAX_HP } = require('./constants');
const { generateStarterDeck } = require('./gameLogic');
const { generateMatchRaritySchedule } = require('./quests');
const auth = require('./auth');

// Active game rooms map: roomId -> roomState
const rooms = {};

// Socket to Room Map for O(1) lookups: socket.id -> roomId
const playerToRoom = {};

// User to Room Map for reconnect recovery: userId -> roomId
const userToRoom = {};

// Late-bound delegate helpers to avoid circular evaluation issues
function drawHandFromDeck(...args) {
  return require('./battle').drawHandFromDeck(...args);
}
function startQuestSelectionPhase(...args) {
  return require('./prepPhase').startQuestSelectionPhase(...args);
}

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
        userId: player1.userId || player1.socketId,
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
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0, leech: 0 },
        relics: {},
        phoenixUsedThisRound: false,
        prepRerollsLeft: 0,
        activeQuest: null,
        questProgress: 0,
        questRerollCount: 0,
        questLocked: false,
        offeredQuests: [],
        removalTokens: 0,
        pendingBonusDraft: false,
        pendingRewardNotification: null
      },
      [player2.socketId]: {
        id: player2.socketId,
        userId: player2.userId || player2.socketId,
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
        statuses: { poison: 0, burn: 0, attackBuff: 0, weakness: 0, leech: 0 },
        relics: {},
        phoenixUsedThisRound: false,
        prepRerollsLeft: 0,
        activeQuest: null,
        questProgress: 0,
        questRerollCount: 0,
        questLocked: false,
        offeredQuests: [],
        removalTokens: 0,
        pendingBonusDraft: false,
        pendingRewardNotification: null
      }
    },
    reconnectTimers: {},
    round: 1,
    raritySchedule: generateMatchRaritySchedule(10),
    state: 'QUEST_PHASE'
  };

  // Map sockets and userIds to room
  playerToRoom[player1.socketId] = roomId;
  playerToRoom[player2.socketId] = roomId;
  if (player1.userId) userToRoom[player1.userId] = roomId;
  if (player2.userId) userToRoom[player2.userId] = roomId;

  console.log(`[RoomManager] Room ${roomId} created. Starting Quest Selection Phase...`);

  // Small delay to allow matchmaking screen to play transition
  setTimeout(() => {
    startQuestSelectionPhase(roomId, io);
  }, 1600);
}

/**
 * Helper to cleanup and delete a room
 */
function cleanupRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.draftTimer) clearInterval(room.draftTimer);
  if (room.nextRoundTimeout) clearTimeout(room.nextRoundTimeout);
  if (room.prepTimer) clearInterval(room.prepTimer);

  Object.keys(room.players).forEach(socketId => {
    const p = room.players[socketId];
    if (p && p.userId) delete userToRoom[p.userId];
    delete playerToRoom[socketId];
  });

  delete rooms[roomId];
  console.log(`[RoomManager] Room ${roomId} cleared.`);
}

/**
 * Helper to record match outcome to PostgreSQL database
 */
function recordMatchToDb(room, winnerId, endReason) {
  if (!room || room.dbRecorded) return;
  room.dbRecorded = true;

  const playerIds = Object.keys(room.players);
  if (playerIds.length < 2) return;

  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  const p1UserId = parseInt(p1.userId, 10);
  const p2UserId = parseInt(p2.userId, 10);

  if (isNaN(p1UserId) || isNaN(p2UserId)) {
    return; // Guest user
  }

  let winnerUserId = null;
  if (winnerId && room.players[winnerId]) {
    winnerUserId = parseInt(room.players[winnerId].userId, 10);
    if (isNaN(winnerUserId)) winnerUserId = null;
  }

  auth.recordMatchResult({
    p1Id: p1UserId,
    p2Id: p2UserId,
    winnerId: winnerUserId,
    p1Score: p1.points,
    p2Score: p2.points,
    endReason: endReason || 'match_finished'
  }).catch(err => console.error('[RoomManager] DB match record failed:', err));
}

/**
 * Returns true if player is already inside an active room
 */
function isPlayerInActiveRoom(socketId, userId) {
  if (playerToRoom[socketId]) return true;
  if (userId && userToRoom[userId]) {
    const roomId = userToRoom[userId];
    const room = rooms[roomId];
    return room && room.state !== 'OVER';
  }
  return false;
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

module.exports = {
  rooms,
  playerToRoom,
  userToRoom,
  createRoom,
  cleanupRoom,
  recordMatchToDb,
  isPlayerInActiveRoom,
  handleLeaveRoom
};
