const { MAX_HP, PREP_PHASE_DURATION_SEC, PREP_STEP_TIMEOUT_SEC } = require('./constants');
const { PACK_POOL } = require('./packs');
const { RELIC_POOL } = require('./relics');
const { generatePlayerQuests } = require('./quests');
const { generatePackCards, generateBonusPickCards, generatePacks } = require('./gameLogic');
const { rooms, playerToRoom } = require('./roomState');

// Late-bound delegate helpers to avoid circular evaluation issues
function startRound(...args) {
  return require('./battle').startRound(...args);
}
function drawHandFromDeck(...args) {
  return require('./battle').drawHandFromDeck(...args);
}

/**
 * Starts the quest selection phase by generating and sending 3 quests to each player
 */
function startQuestSelectionPhase(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  clearPrepPhaseTimer(room);

  room.state = 'QUEST_PHASE';
  console.log(`[RoomManager] Room ${roomId}: starting Quest Phase for round ${room.round}`);

  const playerIds = Object.keys(room.players);
  playerIds.forEach(id => {
    const p = room.players[id];
    p.offeredQuests = generatePlayerQuests(p.deck, p.relics);
    p.questRerollCount = 0;
    p.questLocked = false;
    p.activeQuest = null;
    p.questProgress = 0;

    // Sub-phase timers removed: no timer in quest selection.

    p.socket.emit('questSelectionStart', {
      quests: p.offeredQuests,
      rerollsLeft: 1,
      deck: p.deck,
      relics: p.relics
    });
  });
}

/**
 * Handles quest selection
 */
function handleSelectQuest(socket, questId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'QUEST_PHASE') return;

  const player = room.players[socket.id];
  if (player.questLocked) return;

  const chosenQuest = player.offeredQuests.find(q => q.id === questId);
  if (!chosenQuest) return;

  clearPlayerPrepTimer(player);

  player.activeQuest = chosenQuest;
  player.questProgress = 0;
  player.questLocked = true;

  console.log(`[RoomManager] Player ${player.username} selected quest: ${chosenQuest.text}`);
  socket.emit('questLocked', chosenQuest);

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  if (opponent.questLocked) {
    // Both players locked. Transition to BATTLE!
    room.state = 'BATTLE';
    console.log(`[RoomManager] Both players locked quests in Room ${roomId}. Starting BATTLE.`);
    startRound(roomId, io);
  } else {
    // Notify opponent we are waiting for them
    opponent.socket.emit('waitingForOpponentQuest');
  }
}

/**
 * Handles quest rerolls (limit of 1 per phase)
 */
function handleRerollQuests(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'QUEST_PHASE') return;

  const player = room.players[socket.id];
  if (player.questLocked || player.questRerollCount >= 1) return;

  player.questRerollCount += 1;
  player.offeredQuests = generatePlayerQuests(player.deck, player.relics);

  console.log(`[RoomManager] Player ${player.username} rerolled quests.`);
  socket.emit('questSelectionStart', {
    quests: player.offeredQuests,
    rerollsLeft: 0,
    deck: player.deck,
    relics: player.relics
  });
}

/**
 * Handles choosing a bonus card (loser comeback or quest bonus draft)
 */
function handleSelectBonusCard(socket, cardTemplateId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'BONUS_PICK') return;

  const cardTemplate = currentStep.options.find(c => c.templateId === cardTemplateId);
  if (!cardTemplate) {
    console.log(`[RoomManager] Card template ${cardTemplateId} not found in available draft pools for player ${player.username}`);
    return;
  }

  player.deck.push(cardTemplate);
  socket.emit('bonusPickLocked', cardTemplate);

  // Shift step and advance queue
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Handles selecting a pack in draft phase
 */
function handleSelectPack(socket, packId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'PACK_SELECTION') return;

  if (!currentStep.options.includes(packId)) return;

  const cards = generatePackCards(packId);
  player.deck.push(...cards);

  console.log(`[RoomManager] Player ${player.username} selected pack ${packId}. Added 4 cards.`);

  // Transform PACK_SELECTION step to PACK_REVEAL step
  player.prepQueue[0] = {
    type: 'PACK_REVEAL',
    packId: packId,
    cards: cards
  };

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
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'PACK_REVEAL') return;

  console.log(`[RoomManager] Player ${player.username} confirmed pack reveal.`);

  // Shift step and advance queue
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Starts normal draft phase (loser pick and pack selection)
 */
function startNormalDraftPhase(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state === 'OVER') return;

  room.state = 'DRAFT_PHASE';

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  const p1OfferedPacks = generatePacks(3);
  const p2OfferedPacks = generatePacks(3);

  const draftLoserId = room.draftLoserId;
  delete room.draftLoserId;

  room.draft = {
    loserId: draftLoserId,
    bonusChosen: draftLoserId ? false : true,
    p1PackChosen: false,
    p2PackChosen: false,
    p1RevealConfirmed: false,
    p2RevealConfirmed: false,
    p1OfferedPacks: p1OfferedPacks,
    p2OfferedPacks: p2OfferedPacks,
    bonusCards: draftLoserId ? generateBonusPickCards() : []
  };

  room.draft.p1BonusDraft = p1.pendingBonusDraft;
  room.draft.p2BonusDraft = p2.pendingBonusDraft;

  p1.pendingBonusDraft = false;
  p2.pendingBonusDraft = false;

  room.draft.p1BonusCards = room.draft.p1BonusDraft ? generateBonusPickCards() : [];
  room.draft.p2BonusCards = room.draft.p2BonusDraft ? generateBonusPickCards() : [];

  room.draft.p1BonusChosen = !room.draft.p1BonusDraft;
  room.draft.p2BonusChosen = !room.draft.p2BonusDraft;

  const p1NeedsBonus = (draftLoserId === p1.id) || room.draft.p1BonusDraft;
  const p2NeedsBonus = (draftLoserId === p2.id) || room.draft.p2BonusDraft;

  if (p1NeedsBonus) {
    const cards = (draftLoserId === p1.id) ? room.draft.bonusCards : room.draft.p1BonusCards;
    p1.socket.emit('bonusPickStart', { 
      cards: cards,
      isQuestBonus: (draftLoserId === p1.id) ? false : true
    });
  } else {
    p1.socket.emit('waitingForOpponentBonus');
  }

  if (p2NeedsBonus) {
    const cards = (draftLoserId === p2.id) ? room.draft.bonusCards : room.draft.p2BonusCards;
    p2.socket.emit('bonusPickStart', { 
      cards: cards,
      isQuestBonus: (draftLoserId === p2.id) ? false : true
    });
  } else {
    p2.socket.emit('waitingForOpponentBonus');
  }

  if (!p1NeedsBonus && !p2NeedsBonus) {
    room.draft.bonusChosen = true;
    p1.socket.emit('packSelectionStart', {
      packs: p1OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
    });
    p2.socket.emit('packSelectionStart', {
      packs: p2OfferedPacks.map(p => ({ id: p, ...PACK_POOL[p] }))
    });
  }
}

/**
 * Handles a card removal request using removal tokens
 */
function handleRemoveCard(socket, cardInstanceId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'CARD_REMOVAL') return;

  // Enforce removal tokens > 0 and deck.length > 4 (min deck size 4)
  if ((player.removalTokens || 0) <= 0 || player.deck.length <= 4) return;

  const idx = player.deck.findIndex(c => c.instanceId === cardInstanceId);
  if (idx !== -1) {
    const removed = player.deck.splice(idx, 1);
    player.removalTokens = Math.max(0, (player.removalTokens || 0) - 1);
    console.log(`[RoomManager] Player ${player.username} burned card: ${removed[0].name}. Remaining tokens: ${player.removalTokens}`);
  }

  // If player still has tokens and deck > 4, keep CARD_REMOVAL active so they can burn more cards if desired
  if (player.removalTokens > 0 && player.deck.length > 4) {
    socket.emit('cardRemovalStart', { 
      deck: player.deck,
      removalTokens: player.removalTokens,
      minDeckSize: 4
    });
  } else {
    socket.emit('removalConfirmed', { removalTokens: player.removalTokens });
    player.prepQueue.shift();
    advancePlayerPrepQueue(player, room, io);
  }
}

/**
 * Handles skipping card removal (keeps remaining removal tokens in inventory)
 */
function handleSkipCardRemoval(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'CARD_REMOVAL') return;

  console.log(`[RoomManager] Player ${player.username} skipped card removal, saving ${player.removalTokens} tokens.`);
  socket.emit('removalConfirmed', { removalTokens: player.removalTokens });
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Handles choosing a relic from the options offered by quest completions
 */
function handleSelectRelic(socket, relicId, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;

  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;

  const currentStep = player.prepQueue[0];
  if (!currentStep || currentStep.type !== 'RELIC_CHOICE') return;

  // Verify the relic is in options
  if (!currentStep.options.includes(relicId)) return;

  // Award the relic!
  const selectedRelic = RELIC_POOL[relicId];
  if (selectedRelic && (selectedRelic.unique || selectedRelic.maxStacks === 1)) {
    player.relics[relicId] = 1;
  } else {
    player.relics[relicId] = (player.relics[relicId] || 0) + 1;
  }

  // Apply HP buff immediately if it is a vitality relic
  if (relicId.startsWith('relic_vitality_')) {
    const buffVal = relicId === 'relic_vitality_common' ? 15 
                  : relicId === 'relic_vitality_rare' ? 25 
                  : 40; // epic
    player.maxHp = (player.maxHp || MAX_HP) + buffVal;
    player.hp += buffVal;
  }

  // Notify client of success
  socket.emit('relicChosen', { relicId, name: selectedRelic ? selectedRelic.name : relicId });

  // Shift step and advance queue
  player.prepQueue.shift();
  advancePlayerPrepQueue(player, room, io);
}

/**
 * Handles prep phase rerolling of relics or packs
 */
function handleRerollPrep(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'PREPARATION_PHASE') return;
  const player = room.players[socket.id];
  if (!player || player.prepFinished) return;
  if (!player.prepRerollsLeft || player.prepRerollsLeft <= 0) return;
  
  const currentStep = player.prepQueue[0];
  if (!currentStep) return;
  
  player.prepRerollsLeft -= 1;
  
  if (currentStep.type === 'RELIC_CHOICE') {
    const relicsOfQuality = Object.values(RELIC_POOL).filter(r => {
      if (r.quality !== currentStep.quality) return false;
      if ((r.unique || r.maxStacks === 1) && (player.relics[r.id] || 0) >= 1) return false;
      return true;
    });
    const shuffled = [...relicsOfQuality].sort(() => 0.5 - Math.random());
    const options = shuffled.slice(0, Math.min(3, shuffled.length));
    currentStep.options = options.map(o => o.id);
    player.socket.emit('relicChoiceStart', {
      quality: currentStep.quality,
      options: options,
      questText: currentStep.questText,
      prepRerollsLeft: player.prepRerollsLeft
    });
  } else if (currentStep.type === 'PACK_SELECTION') {
    currentStep.options = generatePacks(3);
    player.socket.emit('packSelectionStart', {
      packs: currentStep.options.map(p => ({ id: p, ...PACK_POOL[p] })),
      prepRerollsLeft: player.prepRerollsLeft
    });
  }
}

/**
 * Starts 1 single countdown timer for the entire preparation phase (encompassing all prep steps)
 */
function startPrepPhaseTimer(room, io, duration = PREP_PHASE_DURATION_SEC) {
  clearPrepPhaseTimer(room);

  room.prepPhaseEndsAt = Date.now() + (duration * 1000);

  // Broadcast single prep timer to room
  io.to(room.id).emit('prepTimerStarted', {
    duration: duration,
    secondsLeft: duration,
    endsAt: room.prepPhaseEndsAt
  });

  room.prepPhaseTimer = setTimeout(() => {
    handlePrepPhaseTimeout(room, io);
  }, duration * 1000);
}

/**
 * Clears the single preparation phase timer
 */
function clearPrepPhaseTimer(room) {
  if (room && room.prepPhaseTimer) {
    clearTimeout(room.prepPhaseTimer);
    room.prepPhaseTimer = null;
    room.prepPhaseEndsAt = null;
  }
}

/**
 * Handles timeout for the entire preparation phase
 * Auto-resolves any player who hasn't completed all steps, then proceeds.
 */
function handlePrepPhaseTimeout(room, io) {
  clearPrepPhaseTimer(room);

  if (!room || room.state === 'OVER' || room.state !== 'PREPARATION_PHASE') return;

  console.log(`[RoomManager] Prep Phase single timer expired for room ${room.id}. Auto-resolving pending player(s).`);

  const playerIds = Object.keys(room.players);
  playerIds.forEach(id => {
    const p = room.players[id];
    if (!p.prepFinished) {
      autoResolvePlayerPrepQueue(p, room, io);
    }
  });

  proceedToQuestPhase(room, io);
}

/**
 * Deprecated: sub-phase timers removed per user requirements.
 * Prep phase uses 1 single room-level timer (60s). Sub-phases do not have timers.
 */
function startPlayerPrepTimer(player, room, io, stepType, duration = 60) {
  clearPlayerPrepTimer(player);
}

/**
 * Clears an individual player's timer
 */
function clearPlayerPrepTimer(player) {
  if (player && player.prepStepTimer) {
    clearTimeout(player.prepStepTimer);
    player.prepStepTimer = null;
    player.prepStepEndsAt = null;
  }
}

/**
 * Handles timeout for quest selection
 */
function handlePlayerPrepTimeout(player, room, io) {
  clearPlayerPrepTimer(player);

  if (!room || room.state === 'OVER') return;

  if (room.state === 'QUEST_PHASE') {
    if (!player.questLocked) {
      if (!player.offeredQuests || player.offeredQuests.length === 0) {
        player.offeredQuests = generatePlayerQuests(player.deck, player.relics);
      }
      const chosenQuest = player.offeredQuests[Math.floor(Math.random() * player.offeredQuests.length)];
      player.activeQuest = chosenQuest;
      player.questProgress = 0;
      player.questLocked = true;

      console.log(`[RoomManager] Quest timeout for ${player.username}. Auto-selected: ${chosenQuest.text}`);
      player.socket.emit('questLocked', chosenQuest);

      const opponentId = Object.keys(room.players).find(id => id !== player.id);
      const opponent = room.players[opponentId];

      if (opponent && opponent.questLocked) {
        room.state = 'BATTLE';
        console.log(`[RoomManager] Both players locked quests in Room ${room.id}. Starting BATTLE.`);
        startRound(room.id, io);
      } else if (opponent) {
        opponent.socket.emit('waitingForOpponentQuest');
      }
    }
  }
}

/**
 * Helper to advance a player's preparation session queue
 */
function advancePlayerPrepQueue(player, room, io) {
  if (!player.prepQueue || player.prepQueue.length === 0) {
    player.prepFinished = true;
    player.socket.emit('prepFinished');
    
    // Check if both players are finished
    const playerIds = Object.keys(room.players);
    const p1 = room.players[playerIds[0]];
    const p2 = room.players[playerIds[1]];
    
    if (p1.prepFinished && p2.prepFinished) {
      clearPrepPhaseTimer(room);
      clearPrepTimer(room);
      proceedToQuestPhase(room, io);
    }
    return;
  }

  const nextStep = player.prepQueue[0];

  if (nextStep.type === 'RELIC_CHOICE') {
    player.socket.emit('relicChoiceStart', {
      quality: nextStep.quality,
      options: nextStep.options.map(id => RELIC_POOL[id]),
      questText: nextStep.questText,
      prepRerollsLeft: player.prepRerollsLeft
    });
  } else if (nextStep.type === 'CARD_REMOVAL') {
    player.socket.emit('cardRemovalStart', {
      deck: player.deck,
      removalTokens: player.removalTokens || 0,
      minDeckSize: 4
    });
  } else if (nextStep.type === 'BONUS_PICK') {
    player.socket.emit('bonusPickStart', {
      cards: nextStep.options,
      isQuestBonus: nextStep.isQuestBonus
    });
  } else if (nextStep.type === 'PACK_SELECTION') {
    player.socket.emit('packSelectionStart', {
      packs: nextStep.options.map(p => ({ id: p, ...PACK_POOL[p] })),
      prepRerollsLeft: player.prepRerollsLeft,
      isQuestBonus: nextStep.isQuestBonus || false
    });
  } else if (nextStep.type === 'PACK_REVEAL') {
    player.socket.emit('packRevealStart', {
      packName: PACK_POOL[nextStep.packId].name,
      packColor: PACK_POOL[nextStep.packId].color,
      cards: nextStep.cards
    });
  }
}

/**
 * Backwards-compatible room timer stubs
 */
function startPrepTimer(room, io) {
  startPrepPhaseTimer(room, io);
}

function clearPrepTimer(room) {
  clearPrepPhaseTimer(room);
  if (room && room.players) {
    Object.values(room.players).forEach(p => clearPlayerPrepTimer(p));
  }
}

/**
 * Automatically resolves all remaining choices in a player's preparation queue
 */
function autoResolvePlayerPrepQueue(player, room, io) {
  clearPlayerPrepTimer(player);
  console.log(`[RoomManager] Auto-resolving prep queue for player ${player.username}. Steps remaining: ${player.prepQueue ? player.prepQueue.length : 0}`);

  while (player.prepQueue && player.prepQueue.length > 0) {
    const step = player.prepQueue.shift();

    if (step.type === 'RELIC_CHOICE') {
      const relicId = step.options[0];
      if (relicId) {
        player.relics[relicId] = (player.relics[relicId] || 0) + 1;
        if (relicId.startsWith('relic_vitality_')) {
          const buffVal = relicId === 'relic_vitality_common' ? 15 
                        : relicId === 'relic_vitality_rare' ? 25 
                        : 40; // epic
          player.maxHp = (player.maxHp || MAX_HP) + buffVal;
          player.hp += buffVal;
        }
        console.log(`[RoomManager] Auto-resolved relic choice for ${player.username}: selected ${relicId}`);
      }
    } else if (step.type === 'CARD_REMOVAL') {
      console.log(`[RoomManager] Auto-resolved card removal for ${player.username}: skipped`);
    } else if (step.type === 'BONUS_PICK') {
      const cardOption = step.options[0];
      if (cardOption) {
        player.deck.push(cardOption);
        console.log(`[RoomManager] Auto-resolved bonus card pick for ${player.username}: selected ${cardOption.name}`);
      }
    } else if (step.type === 'PACK_SELECTION') {
      const packId = step.options[0];
      if (packId) {
        const cards = generatePackCards(packId);
        player.deck.push(...cards);
        console.log(`[RoomManager] Auto-resolved pack selection for ${player.username}: selected ${packId}`);
      }
    } else if (step.type === 'PACK_REVEAL') {
      console.log(`[RoomManager] Auto-resolved pack reveal for ${player.username}: confirmed`);
    }
  }

  player.prepFinished = true;
}

/**
 * Transitions both players from preparation to play session (quest selection)
 */
function proceedToQuestPhase(room, io) {
  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  clearPlayerPrepTimer(p1);
  clearPlayerPrepTimer(p2);
  clearPrepPhaseTimer(room);
  clearPrepTimer(room);

  p1.maxHp = MAX_HP + (p1.relics.relic_vitality_common || 0) * 15 + (p1.relics.relic_vitality_rare || 0) * 25 + (p1.relics.relic_vitality_epic || 0) * 40;
  p2.maxHp = MAX_HP + (p2.relics.relic_vitality_common || 0) * 15 + (p2.relics.relic_vitality_rare || 0) * 25 + (p2.relics.relic_vitality_epic || 0) * 40;

  p1.hp = p1.maxHp;
  p2.hp = p2.maxHp;
  p1.shield = 0;
  p2.shield = 0;

  p1.phoenixUsedThisRound = false;
  p2.phoenixUsedThisRound = false;

  p1.statuses = { poison: 0, burn: 0, attackBuff: (p1.relics.relic_focused_soul || 0) * 5, weakness: 0, leech: 0, thorn: 0 };
  p2.statuses = { poison: 0, burn: 0, attackBuff: (p2.relics.relic_focused_soul || 0) * 5, weakness: 0, leech: 0, thorn: 0 };

  p1.hand = drawHandFromDeck(p1.deck, 4);
  p2.hand = drawHandFromDeck(p2.deck, 4);

  room.round += 1;
  room.state = 'QUEST_PHASE';

  console.log(`[RoomManager] Room ${room.id}: Starting Round ${room.round} Quest Phase`);

  delete p1.prepQueue;
  delete p2.prepQueue;
  delete p1.prepFinished;
  delete p2.prepFinished;

  startQuestSelectionPhase(room.id, io);
}

module.exports = {
  startQuestSelectionPhase,
  handleSelectQuest,
  handleRerollQuests,
  handleSelectBonusCard,
  handleSelectPack,
  handlePackRevealConfirm,
  startNormalDraftPhase,
  handleRemoveCard,
  handleSkipCardRemoval,
  handleSelectRelic,
  handleRerollPrep,
  advancePlayerPrepQueue,
  startPrepTimer,
  clearPrepTimer,
  startPrepPhaseTimer,
  clearPrepPhaseTimer,
  handlePrepPhaseTimeout,
  startPlayerPrepTimer,
  clearPlayerPrepTimer,
  handlePlayerPrepTimeout,
  autoResolvePlayerPrepQueue,
  proceedToQuestPhase
};
