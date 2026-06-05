const { nanoid } = require('nanoid');

// Active matchmaking queue
// Entries: { socketId, username, socket }
let queue = [];

/**
 * Adds a socket to the matchmaking queue and checks if a match can be made
 * @param {Object} socket The player's socket instance
 * @param {string} username The player's username
 * @param {Object} io The Socket.IO server instance
 * @param {Object} roomManager The Room Manager instance
 */
function join(socket, username, io, roomManager) {
  // Check if player is already in queue
  const exists = queue.some(item => item.socketId === socket.id);
  if (exists) return;

  // Check if player is already in an active game room
  if (roomManager.isPlayerInActiveRoom(socket.id)) {
    socket.emit('error', 'You are already in an active game!');
    return;
  }

  // Sanitize username
  const name = username ? username.trim().substring(0, 15) : 'Player';
  
  // Push to queue
  queue.push({
    socketId: socket.id,
    username: name,
    socket
  });

  console.log(`[Queue] ${name} (${socket.id}) joined. Queue size: ${queue.length}`);
  
  // Broadcast updated queue count to all connected clients
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
 * @returns {number} Queue count
 */
function getQueueCount() {
  return queue.length;
}

/**
 * Broadcasts the current queue count to all connected clients
 * @param {Object} io The Socket.IO server instance
 */
function broadcastQueueCount(io) {
  if (io) {
    io.emit('queueCountUpdate', queue.length);
  }
}

/**
 * Pairs up the first two players in the queue if available
 * @param {Object} io Socket.IO server
 * @param {Object} roomManager Room manager
 */
function checkAndMatch(io, roomManager) {
  if (queue.length >= 2) {
    // Dequeue first two players
    const player1 = queue.shift();
    const player2 = queue.shift();

    // Broadcast queue size update since we removed two players
    broadcastQueueCount(io);

    // Create unique room ID
    const roomId = 'room_' + nanoid(10);
    console.log(`[Matchmaking] Match found! Creating Room ${roomId} for ${player1.username} vs ${player2.username}`);

    // Join both players to the Socket.IO room channel
    player1.socket.join(roomId);
    player2.socket.join(roomId);

    // Tell both players that a match was found
    player1.socket.emit('matchFound', {
      roomId,
      opponentName: player2.username,
      opponentId: player2.socketId,
      yourName: player1.username,
      yourId: player1.socketId
    });

    player2.socket.emit('matchFound', {
      roomId,
      opponentName: player1.username,
      opponentId: player1.socketId,
      yourName: player2.username,
      yourId: player2.socketId
    });

    // Initialize the room state
    roomManager.createRoom(roomId, player1, player2, io);
  }
}

module.exports = {
  join,
  leave,
  getQueueCount,
  broadcastQueueCount
};
