const { nanoid } = require('nanoid');

// Active matchmaking queue
// Entries: { socketId, username, userId, socket }
let queue = [];

/**
 * Adds a socket to the matchmaking queue and checks if a match can be made
 * @param {Object} socket The player's socket instance
 * @param {string} username The player's username
 * @param {string|number} userId The player's user ID or socket ID
 * @param {Object} io The Socket.IO server instance
 * @param {Object} roomManager The Room Manager instance
 */
function join(socket, username, userId, io, roomManager, roomCode = '') {
  // Check if player is already in queue
  const exists = queue.some(item => item.socketId === socket.id || (item.userId && item.userId === userId));
  if (exists) return;

  // Check if player is already in an active game room
  if (roomManager.isPlayerInActiveRoom(socket.id, userId)) {
    socket.emit('error', 'You are already in an active game!');
    return;
  }

  // Sanitize username and roomCode
  const name = username ? username.trim().substring(0, 15) : 'Player';
  const uid = userId || socket.id;
  const cleanCode = roomCode ? String(roomCode).trim().toUpperCase() : '';
  
  // Push to queue
  queue.push({
    socketId: socket.id,
    userId: uid,
    username: name,
    socket,
    roomCode: cleanCode
  });

  console.log(`[Queue] ${name} (${uid}) joined queue${cleanCode ? ` [RoomCode: ${cleanCode}]` : ''}. Queue size: ${queue.length}`);
  
  // Broadcast updated queue count
  broadcastQueueCount(io);

  // Attempt to pair players
  checkAndMatch(io, roomManager);
}

/**
 * Removes a player from the matchmaking queue
 * @param {string} socketId The socket ID of the player leaving
 * @param {Object} io The Socket.IO server instance
 */
function leave(socketId, io) {
  const index = queue.findIndex(item => item.socketId === socketId);
  if (index !== -1) {
    const removedPlayer = queue.splice(index, 1)[0];
    console.log(`[Queue] ${removedPlayer.username} left queue. Queue size: ${queue.length}`);
    broadcastQueueCount(io);
  }
}

/**
 * Gets the current count of players searching for a game
 */
function getQueueCount() {
  return queue.length;
}

/**
 * Broadcasts current queue count
 */
function broadcastQueueCount(io) {
  if (io) {
    io.emit('queueCountUpdate', queue.length);
  }
}

/**
 * Pairs up the first two players in the queue if available
 */
function checkAndMatch(io, roomManager) {
  // Find two players with matching roomCode (or both empty for public queue)
  for (let i = 0; i < queue.length; i++) {
    const player1 = queue[i];
    const matchIndex = queue.findIndex((p2, idx) => idx > i && p2.roomCode === player1.roomCode);

    if (matchIndex !== -1) {
      const player2 = queue.splice(matchIndex, 1)[0];
      queue.splice(i, 1); // remove player1

      broadcastQueueCount(io);

      const roomId = 'room_' + nanoid(10);
      console.log(`[Matchmaking] Match found! Creating Room ${roomId} for ${player1.username} vs ${player2.username}${player1.roomCode ? ` [Code: ${player1.roomCode}]` : ''}`);

      player1.socket.join(roomId);
      player2.socket.join(roomId);

      player1.socket.emit('matchFound', {
        roomId,
        opponentName: player2.username,
        opponentId: player2.socketId,
        opponentUserId: player2.userId,
        yourName: player1.username,
        yourId: player1.socketId,
        yourUserId: player1.userId,
        roomCode: player1.roomCode
      });

      player2.socket.emit('matchFound', {
        roomId,
        opponentName: player1.username,
        opponentId: player1.socketId,
        opponentUserId: player1.userId,
        yourName: player2.username,
        yourId: player2.socketId,
        yourUserId: player2.userId,
        roomCode: player2.roomCode
      });

      roomManager.createRoom(roomId, player1, player2, io);
      break;
    }
  }
}

module.exports = {
  join,
  leave,
  getQueueCount,
  broadcastQueueCount
};
