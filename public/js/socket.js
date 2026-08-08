/**
 * ELEMENT CLASH: SOCKET CONNECTIONS & EVENTS
 */

// Detect Discord Activity Environment (discordsays.com domain)
const isDiscordActivity = window.location.hostname.includes('discordsays.com');

// Initialize Socket.IO Client connection
const socket = io({
  transports: ['websocket', 'polling']
});

// Discord Activity SDK Helper
window.discordApp = {
  isActivity: isDiscordActivity,
  sdk: null,
  user: null,
  async init() {
    if (!isDiscordActivity || !window.DiscordSDK) {
      console.log('[Discord SDK] Running in standard browser / standalone mode.');
      return;
    }

    try {
      // Fetch server configuration
      const res = await fetch('/api/config').catch(() => null);
      if (!res || !res.ok) return;
      const config = await res.json();
      
      if (!config.discordClientId) {
        console.log('[Discord SDK] DISCORD_CLIENT_ID is not set in .env.');
        return;
      }

      const { DiscordSDK } = window.DiscordSDK;
      this.sdk = new DiscordSDK(config.discordClientId);
      await this.sdk.ready();
      console.log('[Discord SDK] Discord SDK Ready!');

      // Attempt authorization (optional - user info)
      try {
        await this.sdk.commands.authorize({
          client_id: config.discordClientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify']
        });
        console.log('[Discord SDK] Discord Activity Authorized.');
      } catch (authErr) {
        console.warn('[Discord SDK] OAuth authorization skipped/failed:', authErr.message || authErr);
      }
    } catch (err) {
      console.warn('[Discord SDK] Init status:', err.message || err);
    }
  }
};

// Initialize Discord SDK safely when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.discordApp) {
    window.discordApp.init().catch(err => console.warn('[Discord SDK Error]', err));
  }
});

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

socket.on('compendiumData', (data) => {
  if (window.gameManager) {
    window.gameManager.setCompendiumData(data);
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

// Quest & Card Removal socket event handlers
socket.on('questSelectionStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onQuestSelectionStart(data);
  }
});

socket.on('questLocked', (data) => {
  if (window.gameManager) {
    window.gameManager.onQuestLocked(data);
  }
});

socket.on('waitingForOpponentQuest', () => {
  if (window.gameManager) {
    window.gameManager.onWaitingForOpponentQuest();
  }
});

socket.on('cardRemovalStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onCardRemovalStart(data);
  }
});

socket.on('removalConfirmed', () => {
  if (window.gameManager) {
    window.gameManager.onRemovalConfirmed();
  }
});

socket.on('waitingForOpponentRemoval', () => {
  if (window.gameManager) {
    window.gameManager.onWaitingForOpponentRemoval();
  }
});

socket.on('opponentRemovalConfirmed', () => {
  if (window.gameManager) {
    window.gameManager.onOpponentRemovalConfirmed();
  }
});

socket.on('relicChoiceStart', (data) => {
  if (window.gameManager) {
    window.gameManager.onRelicChoiceStart(data);
  }
});

socket.on('relicChosen', (data) => {
  if (window.gameManager) {
    window.gameManager.onRelicChosen(data);
  }
});

socket.on('relicTriggered', (data) => {
  if (window.gameManager) {
    window.gameManager.onRelicTriggered(data);
  }
});

socket.on('waitingForOpponentRelicChoice', () => {
  if (window.gameManager) {
    window.gameManager.onWaitingForOpponentRelicChoice();
  }
});

socket.on('prepFinished', () => {
  if (window.gameManager) {
    window.gameManager.onPrepFinished();
  }
});

socket.on('prepTimerStarted', (data) => {
  if (window.gameManager) {
    window.gameManager.onPrepTimerStarted(data);
  }
});

socket.on('prepTimerTick', (data) => {
  if (window.gameManager) {
    window.gameManager.onPrepTimerTick(data);
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
  },
  selectQuest(questId) {
    socket.emit('selectQuest', questId);
  },
  rerollQuests() {
    socket.emit('rerollQuests');
  },
  removeCard(cardInstanceId) {
    socket.emit('removeCard', cardInstanceId);
  },
  skipCardRemoval() {
    socket.emit('skipCardRemoval');
  },
  selectRelic(relicId) {
    socket.emit('selectRelic', relicId);
  },
  rerollPrep() {
    socket.emit('rerollPrep');
  }
};

// Expose globally
window.SocketService = SocketService;
