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

// Draft / Rework socket event handlers
socket.on('roundFinished', (data) => {
  if (window.gameManager) {
    window.gameManager.onRoundFinished(data);
  }
});

socket.on('bonusPickStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onBonusPickStart(data);
  }
});

socket.on('waitingForOpponentBonus', () => {
  if (window.gameManager) {
    window.gameManager.onWaitingForOpponentBonus();
  }
});

socket.on('bonusPickLocked', (data) => {
  if (window.gameManager) {
    window.gameManager.onBonusPickLocked(data);
  }
});

socket.on('packSelectionStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onPackSelectionStart(data);
  }
});

socket.on('packRevealStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onPackRevealStart(data);
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
  if (window.UI && window.UI.showToast) {
    window.UI.showToast(message);
  } else {
    console.error('Game Error:', message);
  }
});

socket.on('rematchRequested', () => {
  if (window.gameManager) {
    window.gameManager.onRematchRequested();
  }
});

socket.on('rematchStarted', () => {
  if (window.gameManager) {
    window.gameManager.onRematchStarted();
  }
});

socket.on('opponentLeftRoom', () => {
  if (window.gameManager) {
    window.gameManager.onOpponentLeftRoom();
  }
});

// Outbound events wrapper
const SocketService = {
  joinQueue(username) {
    socket.emit('joinQueue', username);
  },
  leaveQueue() {
    socket.emit('leaveQueue');
  },
  selectCard(cardInstanceId) {
    socket.emit('selectCard', cardInstanceId);
  },
  lockSelection() {
    socket.emit('lockSelection');
  },
  selectBonusCard(cardTemplateId) {
    socket.emit('selectBonusCard', cardTemplateId);
  },
  selectPack(packId) {
    socket.emit('selectPack', packId);
  },
  packRevealConfirm() {
    socket.emit('packRevealConfirm');
  },
  surrender() {
    socket.emit('surrender');
  },
  requestRematch() {
    socket.emit('requestRematch');
  },
  leaveRoom() {
    socket.emit('leaveRoom');
  },
  clashFinished() {
    socket.emit('clashFinished');
  }
};

// Expose globally
window.SocketService = SocketService;
