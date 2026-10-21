/**
 * ELEMENT CLASH: ROOM MANAGER FACADE
 * Re-exports domain handlers from roomState, battle, prepPhase, reconnect, and quests.
 */

const roomState = require('./roomState');
const battle = require('./battle');
const prepPhase = require('./prepPhase');
const reconnect = require('./reconnect');
const quests = require('./quests');

module.exports = {
  // Shared State
  rooms: roomState.rooms,
  playerToRoom: roomState.playerToRoom,
  userToRoom: roomState.userToRoom,

  // Room Lifecycle (roomState.js)
  createRoom: roomState.createRoom,
  cleanupRoom: roomState.cleanupRoom,
  recordMatchToDb: roomState.recordMatchToDb,
  isPlayerInActiveRoom: roomState.isPlayerInActiveRoom,
  handleLeaveRoom: roomState.handleLeaveRoom,

  // Battle Core (battle.js)
  drawHandFromDeck: battle.drawHandFromDeck,
  startRound: battle.startRound,
  handleTurnTimeout: battle.handleTurnTimeout,
  handleSelectCard: battle.handleSelectCard,
  handleLockSelection: battle.handleLockSelection,
  resolveRound: battle.resolveRound,
  handleClashFinished: battle.handleClashFinished,
  proceedAfterClash: battle.proceedAfterClash,

  // Preparation & Draft Phase (prepPhase.js)
  startQuestSelectionPhase: prepPhase.startQuestSelectionPhase,
  handleSelectQuest: prepPhase.handleSelectQuest,
  handleRerollQuests: prepPhase.handleRerollQuests,
  handleSelectBonusCard: prepPhase.handleSelectBonusCard,
  handleSelectPack: prepPhase.handleSelectPack,
  handlePackRevealConfirm: prepPhase.handlePackRevealConfirm,
  startNormalDraftPhase: prepPhase.startNormalDraftPhase,
  handleRemoveCard: prepPhase.handleRemoveCard,
  handleSkipCardRemoval: prepPhase.handleSkipCardRemoval,
  handleSelectRelic: prepPhase.handleSelectRelic,
  handleRerollPrep: prepPhase.handleRerollPrep,
  advancePlayerPrepQueue: prepPhase.advancePlayerPrepQueue,
  startPrepTimer: prepPhase.startPrepTimer,
  clearPrepTimer: prepPhase.clearPrepTimer,
  autoResolvePlayerPrepQueue: prepPhase.autoResolvePlayerPrepQueue,
  proceedToQuestPhase: prepPhase.proceedToQuestPhase,

  // Reconnection & Rematch (reconnect.js)
  handleDisconnect: reconnect.handleDisconnect,
  checkPendingReconnect: reconnect.checkPendingReconnect,
  handleReconnectMatch: reconnect.handleReconnectMatch,
  handleSurrender: reconnect.handleSurrender,
  handleRequestRematch: reconnect.handleRequestRematch,

  // Quest Logic (quests.js)
  updateQuestProgress: quests.updateQuestProgress
};
