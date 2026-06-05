/**
 * ELEMENT CLASH: SOCKET CONNECTIONS & EVENTS
 */

// Initialize Socket.IO Client connection
const socket = io();

// Listen for connection status
socket.on('connect', () => {
  console.log(`[Socket] Connected to server: ${socket.id}`);
});

socket.on('disconnect', () => {
  console.log(`[Socket] Disconnected from server`);
});

// Matchmaking socket event handlers
socket.on('queueCountUpdate', (count) => {
  if (window.gameManager) {
    window.gameManager.updateQueueCount(count);
  }
});

socket.on('onlineCountUpdate', (count) => {
  if (window.gameManager) {
    window.gameManager.updateOnlineCount(count);
  }
});

socket.on('matchFound', (data) => {
  if (window.gameManager) {
    window.gameManager.onMatchFound(data);
  }
});

// Draft socket event handlers
socket.on('draftStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onDraftStart(data);
  }
});

socket.on('opponentDraftLocked', () => {
  if (window.gameManager) {
    window.gameManager.onOpponentDraftLocked();
  }
});

socket.on('draftMulliganResult', (data) => {
  if (window.gameManager) {
    window.gameManager.onDraftMulliganResult(data);
  }
});

socket.on('draftFinalized', () => {
  if (window.gameManager) {
    window.gameManager.onDraftFinalized();
  }
});

// Battle socket event handlers
socket.on('roundStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onRoundStart(data);
  }
});

socket.on('selectCard', (data) => {
  if (window.gameManager) {
    window.gameManager.onOpponentSelect(data);
  }
});

socket.on('lockSelection', (data) => {
  if (window.gameManager) {
    window.gameManager.onOpponentLock(data);
  }
});

socket.on('roundReveal', (data) => {
  if (window.gameManager) {
    window.gameManager.onRoundReveal(data);
  }
});

socket.on('roundResult', (data) => {
  if (window.gameManager) {
    window.gameManager.onRoundResult(data);
  }
});

socket.on('hpUpdate', (data) => {
  if (window.gameManager) {
    window.gameManager.onHpUpdate(data);
  }
});

socket.on('playerDisconnected', (data) => {
  if (window.gameManager) {
    window.gameManager.onPlayerDisconnected(data);
  }
});

socket.on('gameOver', (data) => {
  if (window.gameManager) {
    window.gameManager.onGameOver(data);
  }
});

socket.on('error', (message) => {
  alert(message);
});

// Outbound events wrapper
const SocketService = {
  joinQueue(username) {
    socket.emit('joinQueue', username);
  },
  leaveQueue() {
    socket.emit('leaveQueue');
  },
  lockDraft(selectedInstanceIds) {
    socket.emit('lockDraft', selectedInstanceIds);
  },
  selectCard(cardInstanceId) {
    socket.emit('selectCard', cardInstanceId);
  },
  lockSelection() {
    socket.emit('lockSelection');
  }
};

// Expose globally
window.SocketService = SocketService;
