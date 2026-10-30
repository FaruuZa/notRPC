const { nanoid } = require('nanoid');
const { MAX_HP, TURN_DURATION_SEC, AFK_TURN_DURATION_SEC, AFK_STREAK_THRESHOLD, PREP_PHASE_DURATION_SEC, CLASH_WINDOW_MS } = require('./constants');
const { evaluateClash, generateBonusPickCards, generatePacks } = require('./gameLogic');
const { RELIC_POOL } = require('./relics');
const { updateQuestProgress, generateReward, getRemovalTokenReward } = require('./quests');
const { rooms, playerToRoom, recordMatchToDb } = require('./roomState');

// Late-bound delegate helpers to avoid circular evaluation issues
function clearPrepTimer(...args) {
  return require('./prepPhase').clearPrepTimer(...args);
}
function advancePlayerPrepQueue(...args) {
  return require('./prepPhase').advancePlayerPrepQueue(...args);
}
function startPrepPhaseTimer(...args) {
  return require('./prepPhase').startPrepPhaseTimer(...args);
}
function clearPrepPhaseTimer(...args) {
  return require('./prepPhase').clearPrepPhaseTimer(...args);
}

/**
 * Draws a random starting hand from the deck
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

  // Apply Tidal Wisdom passive relic shield (+4 shield per stack)
  const p1Tidal = p1.relics.tidal_wisdom || 0;
  if (p1Tidal > 0) {
    p1.shield += p1Tidal * 4;
  }
  const p2Tidal = p2.relics.tidal_wisdom || 0;
  if (p2Tidal > 0) {
    p2.shield += p2Tidal * 4;
  }

  // Apply starting shield regen relics
  const p1StartShield = (p1.relics.relic_shield_regen_common || 0) * 3 + (p1.relics.relic_shield_regen_rare || 0) * 5 + (p1.relics.relic_shield_regen_legendary || 0) * 10;
  p1.shield += p1StartShield;
  const p2StartShield = (p2.relics.relic_shield_regen_common || 0) * 3 + (p2.relics.relic_shield_regen_rare || 0) * 5 + (p2.relics.relic_shield_regen_legendary || 0) * 10;
  p2.shield += p2StartShield;

  // Re-calculate maxHp in case vitality relics were gained
  p1.maxHp = MAX_HP + (p1.relics.relic_vitality_common || 0) * 15 + (p1.relics.relic_vitality_rare || 0) * 25 + (p1.relics.relic_vitality_epic || 0) * 40;
  p2.maxHp = MAX_HP + (p2.relics.relic_vitality_common || 0) * 15 + (p2.relics.relic_vitality_rare || 0) * 25 + (p2.relics.relic_vitality_epic || 0) * 40;

  console.log(`[RoomManager] Room ${roomId}: starting round ${room.round}`);

  p1.socket.emit('roundStart', {
    round: room.round,
    hand: p1.hand,
    selfStatus: { 
      hp: p1.hp, 
      maxHp: p1.maxHp,
      shield: p1.shield, 
      handSize: p1.hand.length, 
      statuses: p1.statuses, 
      points: p1.points, 
      deck: p1.deck,
      relics: p1.relics,
      removalTokens: p1.removalTokens || 0,
      activeQuest: p1.activeQuest ? { ...p1.activeQuest, progress: p1.questProgress } : null
    },
    opponentStatus: { 
      hp: p2.hp, 
      maxHp: p2.maxHp,
      shield: p2.shield, 
      handSize: p2.hand.length, 
      username: p2.username, 
      statuses: p2.statuses, 
      points: p2.points,
      relics: p2.relics
    }
  });

  p2.socket.emit('roundStart', {
    round: room.round,
    hand: p2.hand,
    selfStatus: { 
      hp: p2.hp, 
      maxHp: p2.maxHp,
      shield: p2.shield, 
      handSize: p2.hand.length, 
      statuses: p2.statuses, 
      points: p2.points, 
      deck: p2.deck,
      relics: p2.relics,
      removalTokens: p2.removalTokens || 0,
      activeQuest: p2.activeQuest ? { ...p2.activeQuest, progress: p2.questProgress } : null
    },
    opponentStatus: { 
      hp: p1.hp, 
      maxHp: p1.maxHp,
      shield: p1.shield, 
      handSize: p1.hand.length, 
      username: p1.username, 
      statuses: p1.statuses, 
      points: p1.points,
      relics: p1.relics
    }
  });

  room.state = 'BATTLE';

  // Authoritative turn timer per player with AFK streak shrinking
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }

  const now = Date.now();
  [p1, p2].forEach(p => {
    const isAfk = (p.consecutiveTimeouts || 0) >= AFK_STREAK_THRESHOLD;
    const duration = isAfk ? AFK_TURN_DURATION_SEC : TURN_DURATION_SEC;
    p.turnDeadline = now + (duration * 1000);
    p.socket.emit('turnTimerStarted', { duration, endsAt: p.turnDeadline });
  });

  const nextDeadline = Math.min(p1.turnDeadline, p2.turnDeadline);
  room.turnTimerEndsAt = nextDeadline;
  room.turnTimer = setTimeout(() => {
    handleTurnTimeout(roomId, io);
  }, Math.max(0, nextDeadline - Date.now()));
}

/**
 * Handles turn timeout with per-player expiration and AFK shrinking
 * Auto-plays expired players and continues timer if other player still has time.
 */
function handleTurnTimeout(roomId, io) {
  const room = rooms[roomId];
  if (!room || room.state === 'OVER' || room.state !== 'BATTLE') return;

  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }

  const now = Date.now();
  const playerIds = Object.keys(room.players);

  playerIds.forEach(id => {
    const player = room.players[id];
    if (!player.locked && player.turnDeadline && player.turnDeadline <= (now + 100)) {
      player.consecutiveTimeouts = (player.consecutiveTimeouts || 0) + 1;
      let cardInstanceId = player.selectedCardId;
      const inHand = player.hand.some(c => c.instanceId === cardInstanceId);
      if (!cardInstanceId || !inHand) {
        // Fallback: pick a Neutral card if available, else first card in hand
        const neutralCard = player.hand.find(c => c.element === 'NEUTRAL');
        const fallbackCard = neutralCard || player.hand[0];
        cardInstanceId = fallbackCard ? fallbackCard.instanceId : null;
        player.selectedCardId = cardInstanceId;
      }
      player.locked = true;

      // Notify the player of auto-play
      player.socket.emit('autoPlayTriggered', {
        cardInstanceId: player.selectedCardId
      });

      // Notify opponent that this player is locked
      const oppId = playerIds.find(pid => pid !== id);
      if (oppId && room.players[oppId]?.socket) {
        room.players[oppId].socket.emit('lockSelection', {
          opponentLocked: true
        });
      }
    }
  });

  const allLocked = playerIds.every(id => room.players[id].locked);
  if (allLocked) {
    console.log(`[RoomManager] Room ${roomId} turn timed out. Auto-played and resolving round.`);
    resolveRound(roomId, io);
  } else {
    // Re-arm timer for remaining unlocked player
    const unlockedPlayers = playerIds.map(id => room.players[id]).filter(p => !p.locked);
    if (unlockedPlayers.length > 0) {
      const nextDeadline = Math.min(...unlockedPlayers.map(p => p.turnDeadline));
      room.turnTimerEndsAt = nextDeadline;
      room.turnTimer = setTimeout(() => {
        handleTurnTimeout(roomId, io);
      }, Math.max(0, nextDeadline - Date.now()));
    }
  }
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
  player.consecutiveTimeouts = 0; // Manual lock resets AFK streak to 0!

  const opponentId = Object.keys(room.players).find(id => id !== socket.id);
  const opponent = room.players[opponentId];

  opponent.socket.emit('lockSelection', {
    opponentLocked: true
  });

  if (opponent.locked) {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
    resolveRound(roomId, io);
  } else {
    // Re-arm room.turnTimer for opponent's deadline if needed
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
    if (opponent.turnDeadline) {
      const remaining = Math.max(0, opponent.turnDeadline - Date.now());
      room.turnTimerEndsAt = opponent.turnDeadline;
      room.turnTimer = setTimeout(() => {
        handleTurnTimeout(roomId, io);
      }, remaining);
    }
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

  // Evaluate clash considering active statuses, relics, and HP
  const result = evaluateClash(card1, card2, p1.shield, p2.shield, p1.statuses, p2.statuses, p1.relics, p2.relics, p1.hp, p1.maxHp, p2.hp, p2.maxHp);

  const shieldDamageA = Math.max(0, (p1.shield + result.shieldGainA) - result.newShieldA);
  const shieldDamageB = Math.max(0, (p2.shield + result.shieldGainB) - result.newShieldB);

  // Apply clash results to server states: Phase 1 Heal (clamped) THEN Phase 2 Damage
  p1.shield = result.newShieldA;
  p2.shield = result.newShieldB;
  
  p1.maxHp = p1.maxHp || MAX_HP;
  p2.maxHp = p2.maxHp || MAX_HP;

  // Phase 1: Apply Heal and clamp to maxHp BEFORE damage
  p1.hp = Math.min(p1.maxHp, p1.hp + (result.healGainA || 0));
  p2.hp = Math.min(p2.maxHp, p2.hp + (result.healGainB || 0));

  // Phase 2: Apply Clash HP damage
  p1.hp = Math.max(0, p1.hp - result.hpDamageA);
  p2.hp = Math.max(0, p2.hp - result.hpDamageB);

  // Purifying Amulet, Briar Armor & Thorn Keyword (Clash HP Damage)
  const p1Briar = (p1.relics.relic_spite_thorns_epic || p1.relics.relic_spite_thorns_rare || 0);
  const p2Briar = (p2.relics.relic_spite_thorns_epic || p2.relics.relic_spite_thorns_rare || 0);
  const p1HasVenomheart = (p1.relics.relic_venomheart_briar_legendary || 0) > 0;
  const p2HasVenomheart = (p2.relics.relic_venomheart_briar_legendary || 0) > 0;

  let p1ThornsDmg = 0;
  let p2ThornsDmg = 0;
  let p1VenomheartPoison = 0;
  let p2VenomheartPoison = 0;

  if (result.hpDamageA > 0) {
    if ((p1.relics.relic_reactive_cleanse_legendary || 0) > 0) {
      p1.statuses.poison = 0; p1.statuses.burn = 0; p1.statuses.weakness = 0;
      io.to(roomId).emit('relicTriggered', { playerId: p1.id, relicName: 'Purifying Amulet', message: `${p1.username}'s Purifying Amulet cleansed all debuffs!` });
    }
    const briarDmg = p1Briar > 0 ? (3 * p1Briar) : 0;
    let thornVal = 0;
    if ((p1.statuses.thorn || 0) > 0) {
      thornVal = p1.statuses.thorn;
      p1.statuses.thorn = Math.max(0, p1.statuses.thorn - 1);
    }
    const totalThorns = briarDmg + thornVal;
    if (totalThorns > 0) {
      if (p1HasVenomheart) {
        const poisonGain = Math.min(3, totalThorns);
        p2VenomheartPoison += poisonGain;
        io.to(roomId).emit('relicTriggered', {
          playerId: p1.id,
          targetPlayerId: p2.id,
          relicName: 'Venomheart Briar',
          relicType: 'poison',
          poison: poisonGain,
          message: `${p1.username}'s Venomheart Briar converted Thorns into ${poisonGain} Poison on ${p2.username}!`
        });
      } else {
        p2.hp = Math.max(0, p2.hp - totalThorns);
        p2ThornsDmg += totalThorns;
        if (briarDmg > 0) {
          io.to(roomId).emit('relicTriggered', {
            playerId: p1.id,
            targetPlayerId: p2.id,
            relicName: 'Briar Armor',
            relicType: 'thorns',
            damage: briarDmg,
            message: `${p1.username}'s Briar Armor dealt ${briarDmg} thorns damage to ${p2.username}!`
          });
        }
        if (thornVal > 0) {
          io.to(roomId).emit('relicTriggered', {
            playerId: p1.id,
            targetPlayerId: p2.id,
            relicName: 'Thorn',
            relicType: 'thorns',
            damage: thornVal,
            message: `${p1.username}'s Thorn reflected ${thornVal} damage to ${p2.username}!`
          });
        }
      }
    }
  }
  if (result.hpDamageB > 0) {
    if ((p2.relics.relic_reactive_cleanse_legendary || 0) > 0) {
      p2.statuses.poison = 0; p2.statuses.burn = 0; p2.statuses.weakness = 0;
      io.to(roomId).emit('relicTriggered', { playerId: p2.id, relicName: 'Purifying Amulet', message: `${p2.username}'s Purifying Amulet cleansed all debuffs!` });
    }
    const briarDmg = p2Briar > 0 ? (3 * p2Briar) : 0;
    let thornVal = 0;
    if ((p2.statuses.thorn || 0) > 0) {
      thornVal = p2.statuses.thorn;
      p2.statuses.thorn = Math.max(0, p2.statuses.thorn - 1);
    }
    const totalThorns = briarDmg + thornVal;
    if (totalThorns > 0) {
      if (p2HasVenomheart) {
        const poisonGain = Math.min(3, totalThorns);
        p1VenomheartPoison += poisonGain;
        io.to(roomId).emit('relicTriggered', {
          playerId: p2.id,
          targetPlayerId: p1.id,
          relicName: 'Venomheart Briar',
          relicType: 'poison',
          poison: poisonGain,
          message: `${p2.username}'s Venomheart Briar converted Thorns into ${poisonGain} Poison on ${p1.username}!`
        });
      } else {
        p1.hp = Math.max(0, p1.hp - totalThorns);
        p1ThornsDmg += totalThorns;
        if (briarDmg > 0) {
          io.to(roomId).emit('relicTriggered', {
            playerId: p2.id,
            targetPlayerId: p1.id,
            relicName: 'Briar Armor',
            relicType: 'thorns',
            damage: briarDmg,
            message: `${p2.username}'s Briar Armor dealt ${briarDmg} thorns damage to ${p1.username}!`
          });
        }
        if (thornVal > 0) {
          io.to(roomId).emit('relicTriggered', {
            playerId: p2.id,
            targetPlayerId: p1.id,
            relicName: 'Thorn',
            relicType: 'thorns',
            damage: thornVal,
            message: `${p2.username}'s Thorn reflected ${thornVal} damage to ${p1.username}!`
          });
        }
      }
    }
  }

  // Leech keyword: Heals 20% x stack of direct unblocked HP damage, capped at 10 HP per trigger, consumes 1 stack
  let p1LeechHeal = 0;
  let p2LeechHeal = 0;
  if (result.hpDamageB > 0 && (p1.statuses.leech || 0) > 0) {
    const leechRatio = (p1.statuses.leech || 0) * 0.20;
    const leechHeal = Math.min(10, Math.round(result.hpDamageB * leechRatio));
    const actualHeal = Math.min(leechHeal, p1.maxHp - p1.hp);
    p1.hp = Math.min(p1.maxHp, p1.hp + actualHeal);
    p1.statuses.leech = Math.max(0, p1.statuses.leech - 1);
    p1LeechHeal = actualHeal;
    io.to(roomId).emit('relicTriggered', {
      playerId: p1.id,
      relicName: 'Leech',
      relicType: 'leech',
      heal: actualHeal,
      message: `${p1.username}'s Leech restored ${actualHeal} HP!`
    });
  }
  if (result.hpDamageA > 0 && (p2.statuses.leech || 0) > 0) {
    const leechRatio = (p2.statuses.leech || 0) * 0.20;
    const leechHeal = Math.min(10, Math.round(result.hpDamageA * leechRatio));
    const actualHeal = Math.min(leechHeal, p2.maxHp - p2.hp);
    p2.hp = Math.min(p2.maxHp, p2.hp + actualHeal);
    p2.statuses.leech = Math.max(0, p2.statuses.leech - 1);
    p2LeechHeal = actualHeal;
    io.to(roomId).emit('relicTriggered', {
      playerId: p2.id,
      relicName: 'Leech',
      relicType: 'leech',
      heal: actualHeal,
      message: `${p2.username}'s Leech restored ${actualHeal} HP!`
    });
  }

  // Helper to apply status to a player (Buff and Weakness capping at 5 removed)
  const applyStatusToPlayer = (player, statusObj) => {
    if (!statusObj) return;

    // First process Cleanse if it is present in the outcome
    if (statusObj.cleanse && statusObj.cleanse > 0) {
      player.statuses.poison = 0;
      player.statuses.burn = 0;
      player.statuses.weakness = 0;
      console.log(`[RoomManager] Player ${player.username} cleansed all debuffs.`);
    }

    // Process Dispel if present in the outcome
    if (statusObj.dispel && statusObj.dispel > 0) {
      player.statuses.attackBuff = 0;
      player.statuses.leech = 0;
      player.statuses.thorn = 0;
      console.log(`[RoomManager] Player ${player.username} was dispelled.`);
    }

    // Outbreak: doubles current poison stacks (amplifier only: 0 remains 0)
    if (statusObj.outbreak) {
      player.statuses.poison = (player.statuses.poison || 0) * 2;
      console.log(`[RoomManager] Player ${player.username} Outbreak! Poison doubled to ${player.statuses.poison}`);
    }

    // Now process other statuses (capping removed)
    Object.keys(statusObj).forEach(stat => {
      if (['cleanse', 'dispel', 'outbreak'].includes(stat)) return;
      if (stat === 'thorns') {
        player.statuses.thorn = (player.statuses.thorn || 0) + statusObj[stat];
      } else {
        player.statuses[stat] = (player.statuses[stat] || 0) + statusObj[stat];
      }
    });
  };

  // Process status effect applications from card outcomes
  const effect1 = card1.outcomes[result.outcomeA];
  const effect2 = card2.outcomes[result.outcomeB];

  // 1. Pre-tick Cleanse & Dispel check: Wipe debuffs (Cleanse) and opponent buffs (Dispel) BEFORE ticks run!
  if (effect1.applyStatus) {
    if (effect1.applyStatus.self && effect1.applyStatus.self.cleanse > 0) {
      p1.statuses.poison = 0;
      p1.statuses.burn = 0;
      p1.statuses.weakness = 0;
      console.log(`[RoomManager] Player ${p1.username} cleansed all debuffs (pre-tick).`);
    }
    if (effect1.applyStatus.opponent && effect1.applyStatus.opponent.cleanse > 0) {
      p2.statuses.poison = 0;
      p2.statuses.burn = 0;
      p2.statuses.weakness = 0;
    }
    if (effect1.applyStatus.opponent && effect1.applyStatus.opponent.dispel > 0) {
      p2.statuses.attackBuff = 0;
      p2.statuses.leech = 0;
      p2.statuses.thorn = 0;
      console.log(`[RoomManager] Player ${p2.username} was dispelled (pre-tick).`);
    }
    if (effect1.applyStatus.self && effect1.applyStatus.self.dispel > 0) {
      p1.statuses.attackBuff = 0;
      p1.statuses.leech = 0;
      p1.statuses.thorn = 0;
    }
    if (effect1.applyStatus.both && effect1.applyStatus.both.cleanse > 0) {
      p1.statuses.poison = 0; p1.statuses.burn = 0; p1.statuses.weakness = 0;
      p2.statuses.poison = 0; p2.statuses.burn = 0; p2.statuses.weakness = 0;
    }
    if (effect1.applyStatus.both && effect1.applyStatus.both.dispel > 0) {
      p1.statuses.attackBuff = 0; p1.statuses.leech = 0; p1.statuses.thorn = 0;
      p2.statuses.attackBuff = 0; p2.statuses.leech = 0; p2.statuses.thorn = 0;
    }
  }

  if (effect2.applyStatus) {
    if (effect2.applyStatus.self && effect2.applyStatus.self.cleanse > 0) {
      p2.statuses.poison = 0;
      p2.statuses.burn = 0;
      p2.statuses.weakness = 0;
      console.log(`[RoomManager] Player ${p2.username} cleansed all debuffs (pre-tick).`);
    }
    if (effect2.applyStatus.opponent && effect2.applyStatus.opponent.cleanse > 0) {
      p1.statuses.poison = 0;
      p1.statuses.burn = 0;
      p1.statuses.weakness = 0;
    }
    if (effect2.applyStatus.opponent && effect2.applyStatus.opponent.dispel > 0) {
      p1.statuses.attackBuff = 0;
      p1.statuses.leech = 0;
      p1.statuses.thorn = 0;
      console.log(`[RoomManager] Player ${p1.username} was dispelled (pre-tick).`);
    }
    if (effect2.applyStatus.self && effect2.applyStatus.self.dispel > 0) {
      p2.statuses.attackBuff = 0;
      p2.statuses.leech = 0;
      p2.statuses.thorn = 0;
    }
    if (effect2.applyStatus.both && effect2.applyStatus.both.cleanse > 0) {
      p1.statuses.poison = 0; p1.statuses.burn = 0; p1.statuses.weakness = 0;
      p2.statuses.poison = 0; p2.statuses.burn = 0; p2.statuses.weakness = 0;
    }
    if (effect2.applyStatus.both && effect2.applyStatus.both.dispel > 0) {
      p1.statuses.attackBuff = 0; p1.statuses.leech = 0; p1.statuses.thorn = 0;
      p2.statuses.attackBuff = 0; p2.statuses.leech = 0; p2.statuses.thorn = 0;
    }
  }

  // 2. Process end-of-round status damage ticks
  // Burn Rework: 3 damage per stack, blocked by Shield, instantly consumed.
  // Poison Rework: still directly bypasses Shield, stack decreases by 1.
  // These use the pre-outcome statuses (except cleansed) so newly applied poison/burn will not tick this round
  let p1BurnTick = 0, p1PoisonTick = 0;
  let p1BurnHpDmg = 0, p1BurnShieldDmg = 0;
  let p2BurnTick = 0, p2PoisonTick = 0;
  let p2BurnHpDmg = 0, p2BurnShieldDmg = 0;

  // Player 1 Ticks (incorporating Burning Core and Toxic Catalyst relics from opponent Player 2)
  if (p1.statuses.burn > 0) {
    const burnCoreVal = p2.relics.burning_core || 0;
    const totalBurnDmg = p1.statuses.burn * (3 + burnCoreVal);
    p1BurnTick = totalBurnDmg;
    if (p1.shield >= totalBurnDmg) {
      p1.shield -= totalBurnDmg;
      p1BurnShieldDmg = totalBurnDmg;
      p1BurnHpDmg = 0;
    } else {
      p1BurnShieldDmg = p1.shield;
      p1BurnHpDmg = totalBurnDmg - p1.shield;
      p1.shield = 0;
    }
    p1.hp = Math.max(0, p1.hp - p1BurnHpDmg);
    p1.statuses.burn = 0; // Burn immediately resets to 0
  }
  if (p1.statuses.poison > 0) {
    const toxicVal = p2.relics.toxic_catalyst || 0;
    p1PoisonTick = p1.statuses.poison * (1 + toxicVal);
    p1.hp = Math.max(0, p1.hp - p1PoisonTick);
    p1.statuses.poison = Math.max(0, p1.statuses.poison - 1); // Poison decreases by 1
  }

  // Player 2 Ticks (incorporating Burning Core and Toxic Catalyst relics from opponent Player 1)
  if (p2.statuses.burn > 0) {
    const burnCoreVal = p1.relics.burning_core || 0;
    const totalBurnDmg = p2.statuses.burn * (3 + burnCoreVal);
    p2BurnTick = totalBurnDmg;
    if (p2.shield >= totalBurnDmg) {
      p2.shield -= totalBurnDmg;
      p2BurnShieldDmg = totalBurnDmg;
      p2BurnHpDmg = 0;
    } else {
      p2BurnShieldDmg = p2.shield;
      p2BurnHpDmg = totalBurnDmg - p2.shield;
      p2.shield = 0;
    }
    p2.hp = Math.max(0, p2.hp - p2BurnHpDmg);
    p2.statuses.burn = 0; // Burn immediately resets to 0
  }
  if (p2.statuses.poison > 0) {
    const toxicVal = p1.relics.toxic_catalyst || 0;
    p2PoisonTick = p2.statuses.poison * (1 + toxicVal);
    p2.hp = Math.max(0, p2.hp - p2PoisonTick);
    p2.statuses.poison = Math.max(0, p2.statuses.poison - 1);
  }

  // Briar Armor (Status Tick HP Damage - Purifying Amulet is clash-only)
  const p1StatusHpDmg = p1BurnHpDmg + p1PoisonTick;
  if (p1StatusHpDmg > 0 && p1Briar > 0) {
    const thorns = 3 * p1Briar;
    if (p1HasVenomheart) {
      const poisonGain = Math.min(3, thorns);
      p2.statuses.poison = (p2.statuses.poison || 0) + poisonGain;
      io.to(roomId).emit('relicTriggered', {
        playerId: p1.id,
        targetPlayerId: p2.id,
        relicName: 'Venomheart Briar',
        relicType: 'poison',
        poison: poisonGain,
        message: `${p1.username}'s Venomheart Briar converted Briar Armor into ${poisonGain} Poison on ${p2.username}!`
      });
    } else {
      p2.hp = Math.max(0, p2.hp - thorns);
      p2ThornsDmg += thorns;
      io.to(roomId).emit('relicTriggered', {
        playerId: p1.id,
        targetPlayerId: p2.id,
        relicName: 'Briar Armor',
        relicType: 'thorns',
        damage: thorns,
        message: `${p1.username}'s Briar Armor dealt ${thorns} thorns damage to ${p2.username}!`
      });
    }
  }

  const p2StatusHpDmg = p2BurnHpDmg + p2PoisonTick;
  if (p2StatusHpDmg > 0 && p2Briar > 0) {
    const thorns = 3 * p2Briar;
    if (p2HasVenomheart) {
      const poisonGain = Math.min(3, thorns);
      p1.statuses.poison = (p1.statuses.poison || 0) + poisonGain;
      io.to(roomId).emit('relicTriggered', {
        playerId: p2.id,
        targetPlayerId: p1.id,
        relicName: 'Venomheart Briar',
        relicType: 'poison',
        poison: poisonGain,
        message: `${p2.username}'s Venomheart Briar converted Briar Armor into ${poisonGain} Poison on ${p1.username}!`
      });
    } else {
      p1.hp = Math.max(0, p1.hp - thorns);
      p1ThornsDmg += thorns;
      io.to(roomId).emit('relicTriggered', {
        playerId: p2.id,
        targetPlayerId: p1.id,
        relicName: 'Briar Armor',
        relicType: 'thorns',
        damage: thorns,
        message: `${p2.username}'s Briar Armor dealt ${thorns} thorns damage to ${p1.username}!`
      });
    }
  }

  // Apply Venomheart Briar poison converted from clash thorns (ticks starting next clash)
  if (p1VenomheartPoison > 0) {
    p1.statuses.poison = (p1.statuses.poison || 0) + p1VenomheartPoison;
  }
  if (p2VenomheartPoison > 0) {
    p2.statuses.poison = (p2.statuses.poison || 0) + p2VenomheartPoison;
  }

  // Phoenix Heart check: if HP drops to 0 or below, resurrect once per round and inflict Burn [2] on opponent
  if (p1.hp <= 0 && (p1.relics.relic_phoenix_down_legendary || 0) > 0 && !p1.phoenixUsedThisRound) {
    p1.hp = 30;
    p1.phoenixUsedThisRound = true;
    p2.statuses.burn = (p2.statuses.burn || 0) + 2;
    io.to(roomId).emit('relicTriggered', { playerId: p1.id, relicName: 'Phoenix Heart', message: `${p1.username}'s Phoenix Heart activated and inflicted Burn [2] on ${p2.username}!` });
  }
  if (p2.hp <= 0 && (p2.relics.relic_phoenix_down_legendary || 0) > 0 && !p2.phoenixUsedThisRound) {
    p2.hp = 30;
    p2.phoenixUsedThisRound = true;
    p1.statuses.burn = (p1.statuses.burn || 0) + 2;
    io.to(roomId).emit('relicTriggered', { playerId: p2.id, relicName: 'Phoenix Heart', message: `${p2.username}'s Phoenix Heart activated and inflicted Burn [2] on ${p1.username}!` });
  }

  // Store intermediate shield values before decay (after clash and status ticks)
  const shieldPostTicksA = p1.shield;
  const shieldPostTicksB = p2.shield;

  // 3. Shield Decay: On turn end, shield is reduced to Floor(Shield * 50%)
  p1.shield = Math.floor(p1.shield * 0.5);
  p2.shield = Math.floor(p2.shield * 0.5);

  const shieldDecayedA = shieldPostTicksA - p1.shield;
  const shieldDecayedB = shieldPostTicksB - p2.shield;

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

  // Helper variables for quest progress tracking
  const p1BurnOpponent = effect1.applyStatus?.opponent?.burn || 0;
  const p1PoisonOpponent = effect1.applyStatus?.opponent?.poison || 0;
  const p1BuffSelf = effect1.applyStatus?.self?.attackBuff || 0;
  const p1WeakOpponent = effect1.applyStatus?.opponent?.weakness || 0;

  const p2BurnOpponent = effect2.applyStatus?.opponent?.burn || 0;
  const p2PoisonOpponent = effect2.applyStatus?.opponent?.poison || 0;
  const p2BuffSelf = effect2.applyStatus?.self?.attackBuff || 0;
  const p2WeakOpponent = effect2.applyStatus?.opponent?.weakness || 0;

  // Add Ember Spark / Venomous Brambles extra status applications
  let p1BurnExtra = 0, p1PoisonExtra = 0;
  if (result.outcomeA === 'SUPERIOR') {
    if (card1.element === 'FIRE') p1BurnExtra += (p1.relics.ember_spark || 0);
    if (card1.element === 'NATURE') p1PoisonExtra += (p1.relics.venomous_brambles || 0);
  }
  const p1TotalBurnApplied = p1BurnOpponent + p1BurnExtra;
  const p1TotalPoisonApplied = p1PoisonOpponent + p1PoisonExtra;

  let p2BurnExtra = 0, p2PoisonExtra = 0;
  if (result.outcomeB === 'SUPERIOR') {
    if (card2.element === 'FIRE') p2BurnExtra += (p2.relics.ember_spark || 0);
    if (card2.element === 'NATURE') p2PoisonExtra += (p2.relics.venomous_brambles || 0);
  }
  const p2TotalBurnApplied = p2BurnOpponent + p2BurnExtra;
  const p2TotalPoisonApplied = p2PoisonOpponent + p2PoisonExtra;

  // 3. Now apply remaining status outcomes from this round (which will tick starting next turn)
  if (effect1.applyStatus) {
    if (effect1.applyStatus.opponent) {
      applyStatusToPlayer(p2, effect1.applyStatus.opponent);
    }
    if (effect1.applyStatus.self) {
      applyStatusToPlayer(p1, effect1.applyStatus.self);
    }
    if (effect1.applyStatus.both) {
      const snapP1 = p1.statuses.poison || 0;
      const snapP2 = p2.statuses.poison || 0;
      if (effect1.applyStatus.both.outbreak) {
        p1.statuses.poison = snapP1 * 2;
        p2.statuses.poison = snapP2 * 2;
        console.log(`[RoomManager] Outbreak Both (from ${p1.username})! P1 poison: ${p1.statuses.poison}, P2 poison: ${p2.statuses.poison}`);
      }
      Object.keys(effect1.applyStatus.both).forEach(stat => {
        if (['cleanse', 'dispel', 'outbreak'].includes(stat)) return;
        applyStatusToPlayer(p1, { [stat]: effect1.applyStatus.both[stat] });
        applyStatusToPlayer(p2, { [stat]: effect1.applyStatus.both[stat] });
      });
    }
  }

  if (effect2.applyStatus) {
    if (effect2.applyStatus.opponent) {
      applyStatusToPlayer(p1, effect2.applyStatus.opponent);
    }
    if (effect2.applyStatus.self) {
      applyStatusToPlayer(p2, effect2.applyStatus.self);
    }
    if (effect2.applyStatus.both) {
      const snapP1 = p1.statuses.poison || 0;
      const snapP2 = p2.statuses.poison || 0;
      if (effect2.applyStatus.both.outbreak) {
        p1.statuses.poison = snapP1 * 2;
        p2.statuses.poison = snapP2 * 2;
        console.log(`[RoomManager] Outbreak Both (from ${p2.username})! P1 poison: ${p1.statuses.poison}, P2 poison: ${p2.statuses.poison}`);
      }
      Object.keys(effect2.applyStatus.both).forEach(stat => {
        if (['cleanse', 'dispel', 'outbreak'].includes(stat)) return;
        applyStatusToPlayer(p1, { [stat]: effect2.applyStatus.both[stat] });
        applyStatusToPlayer(p2, { [stat]: effect2.applyStatus.both[stat] });
      });
    }
  }

  // Apply outcome statuses from relics: Ember Spark / Venomous Brambles
  if (result.outcomeA === 'SUPERIOR') {
    if (card1.element === 'FIRE' && (p1.relics.ember_spark || 0) > 0) {
      p2.statuses.burn = (p2.statuses.burn || 0) + (p1.relics.ember_spark || 0);
    }
    if (card1.element === 'NATURE' && (p1.relics.venomous_brambles || 0) > 0) {
      p2.statuses.poison = (p2.statuses.poison || 0) + (p1.relics.venomous_brambles || 0);
    }
  }
  if (result.outcomeB === 'SUPERIOR') {
    if (card2.element === 'FIRE' && (p2.relics.ember_spark || 0) > 0) {
      p1.statuses.burn = (p1.statuses.burn || 0) + (p2.relics.ember_spark || 0);
    }
    if (card2.element === 'NATURE' && (p2.relics.venomous_brambles || 0) > 0) {
      p1.statuses.poison = (p1.statuses.poison || 0) + (p2.relics.venomous_brambles || 0);
    }
  }

  // Apply outcome Buffs from relics: Defiant Heart / Last Stand (Inferior outcome gives Buff(2))
  const p1Defiant = (p1.relics.defiant_heart || p1.relics.last_stand || 0);
  if (result.outcomeA === 'INFERIOR' && p1Defiant > 0) {
    p1.statuses.attackBuff = (p1.statuses.attackBuff || 0) + p1Defiant * 2;
  }
  const p2Defiant = (p2.relics.defiant_heart || p2.relics.last_stand || 0);
  if (result.outcomeB === 'INFERIOR' && p2Defiant > 0) {
    p2.statuses.attackBuff = (p2.statuses.attackBuff || 0) + p2Defiant * 2;
  }

  // Update Quest Progress for both players
  updateQuestProgress(p1, result.outcomeA, result.damageDealtByA, result.shieldGainA, result.healGainA, card1, p1TotalBurnApplied, p1TotalPoisonApplied, p1BuffSelf, p1WeakOpponent, p2BurnTick);
  updateQuestProgress(p2, result.outcomeB, result.damageDealtByB, result.shieldGainB, result.healGainB, card2, p2TotalBurnApplied, p2TotalPoisonApplied, p2BuffSelf, p2WeakOpponent, p1BurnTick);

  // Record clash log history
  if (!room.clashHistory) room.clashHistory = [];
  const clashEntry = {
    turn: room.clashHistory.length + 1,
    round: room.round,
    p1: {
      id: p1.id,
      name: p1.username,
      cardName: card1.name,
      element: card1.element,
      outcome: result.outcomeA,
      dmgDealt: result.damageDealtByA,
      hpDmg: result.hpDamageA,
      shieldGain: result.shieldGainA,
      healGain: result.healGainA
    },
    p2: {
      id: p2.id,
      name: p2.username,
      cardName: card2.name,
      element: card2.element,
      outcome: result.outcomeB,
      dmgDealt: result.damageDealtByB,
      hpDmg: result.hpDamageB,
      shieldGain: result.shieldGainB,
      healGain: result.healGainB
    }
  };
  room.clashHistory.push(clashEntry);
  if (room.clashHistory.length > 10) room.clashHistory.shift();

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

  // Prepare roundResult payloads
  const roundResultP1 = {
    outcome: result.outcomeA,
    shieldGain: result.shieldGainA,
    healGain: result.healGainA,
    damageDealt: result.damageDealtByA,
    selfDamage: result.selfDamageA,
    totalIncomingDmg: result.totalDmgA,
    hpDamage: result.hpDamageA,
    shieldDamage: shieldDamageA,
    newShield: shieldPostTicksA, // Intermediate shield (after clash & tick, before decay)
    finalShield: p1.shield,       // Decayed shield at end of round
    shieldDecay: shieldDecayedA,  // Amount decayed
    newHp: p1.hp,
    newStatuses: p1.statuses,
    thornsDamage: p1ThornsDmg,
    opponentThornsDamage: p2ThornsDmg,
    leechHeal: p1LeechHeal,
    opponentLeechHeal: p2LeechHeal,
    statusDamage: { burn: p1BurnTick, poison: p1PoisonTick, burnHpDmg: p1BurnHpDmg, burnShieldDmg: p1BurnShieldDmg },
    activeQuest: p1.activeQuest ? { ...p1.activeQuest, progress: p1.questProgress } : null,
    clashHistory: room.clashHistory,
    
    opponentOutcome: result.outcomeB,
    opponentShieldGain: result.shieldGainB,
    opponentHealGain: result.opponentHealGain || result.healGainB,
    opponentDamageDealt: result.damageDealtByB,
    opponentSelfDamage: result.selfDamageB,
    opponentTotalIncomingDmg: result.totalDmgB,
    opponentHpDamage: result.hpDamageB,
    opponentShieldDamage: shieldDamageB,
    opponentNewShield: shieldPostTicksB, // Intermediate shield
    opponentFinalShield: p2.shield,       // Decayed shield at end of round
    opponentShieldDecay: shieldDecayedB,  // Amount decayed
    opponentNewHp: p2.hp,
    opponentNewStatuses: p2.statuses,
    opponentStatusDamage: { burn: p2BurnTick, poison: p2PoisonTick, burnHpDmg: p2BurnHpDmg, burnShieldDmg: p2BurnShieldDmg },
    
    drewNewCards: drewNewCardsP1
  };

  const roundResultP2 = {
    outcome: result.outcomeB,
    shieldGain: result.shieldGainB,
    healGain: result.healGainB,
    damageDealt: result.damageDealtByB,
    selfDamage: result.selfDamageB,
    totalIncomingDmg: result.totalDmgB,
    hpDamage: result.hpDamageB,
    shieldDamage: shieldDamageB,
    newShield: shieldPostTicksB, // Intermediate shield
    finalShield: p2.shield,       // Decayed shield at end of round
    shieldDecay: shieldDecayedB,  // Amount decayed
    newHp: p2.hp,
    newStatuses: p2.statuses,
    thornsDamage: p2ThornsDmg,
    opponentThornsDamage: p1ThornsDmg,
    leechHeal: p2LeechHeal,
    opponentLeechHeal: p1LeechHeal,
    statusDamage: { burn: p2BurnTick, poison: p2PoisonTick, burnHpDmg: p2BurnHpDmg, burnShieldDmg: p2BurnShieldDmg },
    activeQuest: p2.activeQuest ? { ...p2.activeQuest, progress: p2.questProgress } : null,
    clashHistory: room.clashHistory,
    
    opponentOutcome: result.outcomeA,
    opponentShieldGain: result.shieldGainA,
    opponentHealGain: result.healGainA,
    opponentDamageDealt: result.damageDealtByA,
    opponentSelfDamage: result.selfDamageA,
    opponentTotalIncomingDmg: result.totalDmgA,
    opponentHpDamage: result.hpDamageA,
    opponentShieldDamage: shieldDamageA,
    opponentNewShield: shieldPostTicksA, // Intermediate shield
    opponentFinalShield: p1.shield,       // Decayed shield at end of round
    opponentShieldDecay: shieldDecayedA,  // Amount decayed
    opponentNewHp: p1.hp,
    opponentNewStatuses: p1.statuses,
    opponentStatusDamage: { burn: p1BurnTick, poison: p1PoisonTick, burnHpDmg: p1BurnHpDmg, burnShieldDmg: p1BurnShieldDmg },
    
    drewNewCards: drewNewCardsP2
  };

  // Emit roundResult with new statuses, status tick damages, and clash history
  p1.socket.emit('roundResult', roundResultP1);
  p2.socket.emit('roundResult', roundResultP2);

  // Emit hpUpdate
  io.to(roomId).emit('hpUpdate', {
    [p1.id]: { hp: p1.hp, shield: p1.shield },
    [p2.id]: { hp: p2.hp, shield: p2.shield }
  });

  // Check Round End (HP reaches 0)
  let roundOver = false;
  let roundWinnerId = null;
  let loserId = null;

  if (p1.hp <= 0 && p2.hp <= 0) {
    roundOver = true;
    // Draw: nobody gets a point, both score remains same
  } else if (p1.hp <= 0) {
    roundOver = true;
    roundWinnerId = p2.id;
    loserId = p1.id;
    p2.points += 1;
  } else if (p2.hp <= 0) {
    roundOver = true;
    roundWinnerId = p1.id;
    loserId = p2.id;
    p1.points += 1;
  }

  if (roundOver) {
    console.log(`[RoomManager] Round ${room.round} Over. Winner: ${roundWinnerId || 'DRAW'}. Current Score: ${p1.username} ${p1.points} - ${p2.points} ${p2.username}`);

    // Check if match is fully completed: First To 3 Points
    const matchOver = (p1.points >= 3 || p2.points >= 3);

    // Save pending clash state
    room.pendingClashEnd = {
      roundOver: true,
      roundWinnerId: roundWinnerId,
      loserId: loserId,
      matchOver: matchOver
    };
  } else {
    room.pendingClashEnd = {
      roundOver: false
    };
  }

  // Store active clash snapshot for reconnect & state sync
  room.clashWindowEndsAt = Date.now() + CLASH_WINDOW_MS;
  room.pendingClash = {
    reveals: {
      [p1.id]: { yourCard: card1, opponentCard: card2 },
      [p2.id]: { yourCard: card2, opponentCard: card1 }
    },
    results: {
      [p1.id]: roundResultP1,
      [p2.id]: roundResultP2
    }
  };

  // Clear any existing next round timeout
  if (room.nextRoundTimeout) {
    clearTimeout(room.nextRoundTimeout);
    room.nextRoundTimeout = null;
  }

  // Initialize clash finished set
  room.clashFinishedPlayers = new Set();

  // Set fixed clash window timeout (8000 ms)
  room.nextRoundTimeout = setTimeout(() => {
    console.log(`[RoomManager] Clash window ended (${CLASH_WINDOW_MS}ms) for room ${roomId}. Proceeding.`);
    const pEnd = room.pendingClashEnd;
    if (pEnd) {
      proceedAfterClash(roomId, io, pEnd.roundOver, pEnd.roundWinnerId, pEnd.loserId, pEnd.matchOver);
    }
  }, CLASH_WINDOW_MS);
}

/**
 * Handles a client message indicating they have completed their clash animation
 */
function handleClashFinished(socket, io) {
  const roomId = playerToRoom[socket.id];
  const room = rooms[roomId];
  if (!room || room.state !== 'BATTLE' || !room.pendingClashEnd) return;

  if (!room.clashFinishedPlayers) {
    room.clashFinishedPlayers = new Set();
  }
  room.clashFinishedPlayers.add(socket.id);

  const playerIds = Object.keys(room.players);
  if (room.clashFinishedPlayers.size >= playerIds.length) {
    console.log(`[RoomManager] Both players finished clash in room ${roomId}. Proceeding immediately.`);
    if (room.nextRoundTimeout) {
      clearTimeout(room.nextRoundTimeout);
      room.nextRoundTimeout = null;
    }
    const pEnd = room.pendingClashEnd;
    proceedAfterClash(roomId, io, pEnd.roundOver, pEnd.roundWinnerId, pEnd.loserId, pEnd.matchOver);
  }
}

/**
 * Transition logic that triggers after both clients complete clash animations (or fixed window ends)
 */
function proceedAfterClash(roomId, io, roundOver, roundWinnerId, loserId, matchOver) {
  const room = rooms[roomId];
  if (!room) return;

  // Clean up pending clash state
  delete room.pendingClash;
  delete room.clashWindowEndsAt;
  delete room.pendingClashEnd;
  delete room.clashFinishedPlayers;
  if (room.nextRoundTimeout) {
    clearTimeout(room.nextRoundTimeout);
    room.nextRoundTimeout = null;
  }

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];

  if (roundOver) {
    console.log(`[RoomManager] Round ${room.round} Over. Winner: ${roundWinnerId || 'DRAW'}. Current Score: ${p1.username} ${p1.points} - ${p2.points} ${p2.username}`);

    room.draftLoserId = loserId;

    // Check quests completion for both players and award rewards
    [p1, p2].forEach(p => {
      p.questCompletedThisRound = false;
      p.completedQuestText = '';
      p.pendingRewardNotification = null;
      
      if (p.activeQuest) {
        p.completedQuestText = p.activeQuest.text; // Store quest text so client can render it (completed or not)
        const progress = p.questProgress || 0;
        const target = p.activeQuest.target;
        
        if (progress >= target) {
          p.questCompletedThisRound = true;
          
          // Guaranteed removal token yield based on quest difficulty tier (1 for EASY, 2 for MEDIUM, 3 for HARD)
          const questTier = p.activeQuest.tier || p.activeQuest.difficulty || 'EASY';
          const tokensEarned = p.activeQuest.removalTokens !== undefined ? p.activeQuest.removalTokens : getRemovalTokenReward(questTier);
          p.removalTokens = (p.removalTokens || 0) + tokensEarned;
          p.tokensEarnedThisRound = tokensEarned;

          // Hand out rewards (roll now if not pre-rolled)
          const reward = p.activeQuest.reward || generateReward(questTier);
          
          if (reward.type === 'relic') {
            const relicsOfQuality = Object.values(RELIC_POOL).filter(r => {
              if (r.quality !== reward.quality) return false;
              if ((r.unique || r.maxStacks === 1) && (p.relics[r.id] || 0) >= 1) return false;
              return true;
            });
            if (relicsOfQuality.length > 0) {
              // Pick 3 unique random relic options to choose from
              const shuffled = [...relicsOfQuality].sort(() => 0.5 - Math.random());
              const options = shuffled.slice(0, Math.min(3, shuffled.length));
              
              p.pendingRelicChoice = {
                quality: reward.quality,
                options: options.map(o => o.id),
                questText: p.activeQuest.text
              };
              p.pendingRewardNotification = tokensEarned > 0 
                ? `Unlocked: Choose a ${reward.quality} Relic & +${tokensEarned} Removal Token${tokensEarned > 1 ? 's' : ''}!`
                : `Unlocked: Choose a ${reward.quality} Relic!`;
            } else {
              p.pendingRewardNotification = tokensEarned > 0
                ? `Unlocked ${reward.quality} Relic & +${tokensEarned} Removal Token${tokensEarned > 1 ? 's' : ''}`
                : `Unlocked ${reward.quality} Relic`;
            }
          } else if (reward.type === 'bonus_draft') {
            p.pendingBonusDraft = true;
            p.pendingRewardNotification = tokensEarned > 0
              ? `${reward.text} & +${tokensEarned} Removal Token${tokensEarned > 1 ? 's' : ''}`
              : reward.text;
          } else if (reward.type === 'bonus_pack') {
            p.pendingBonusPack = true;
            p.pendingRewardNotification = tokensEarned > 0
              ? `${reward.text} & +${tokensEarned} Removal Token${tokensEarned > 1 ? 's' : ''}`
              : reward.text;
          }
        }
        
        // Clear active quest after the round ends
        p.activeQuest = null;
        p.questProgress = 0;
      }
    });

    // Emit roundFinished with quest updates
    io.to(roomId).emit('roundFinished', {
      round: room.round,
      winnerId: roundWinnerId,
      loserId: loserId,
      score: {
        [p1.id]: p1.points,
        [p2.id]: p2.points
      },
      p1Quest: {
        completed: p1.questCompletedThisRound,
        text: p1.completedQuestText,
        reward: p1.pendingRewardNotification,
        removalTokens: p1.removalTokens || 0,
        tokensEarned: p1.tokensEarnedThisRound || 0
      },
      p2Quest: {
        completed: p2.questCompletedThisRound,
        text: p2.completedQuestText,
        reward: p2.pendingRewardNotification,
        removalTokens: p2.removalTokens || 0,
        tokensEarned: p2.tokensEarnedThisRound || 0
      },
      p1Id: p1.id,
      p2Id: p2.id
    });

    const anyQuestCompleted = p1.questCompletedThisRound || p2.questCompletedThisRound;
    const displayDuration = anyQuestCompleted ? 4000 : 2500;

    // After a delay for the roundFinished overlay, trigger next phase
    room.nextRoundTimeout = setTimeout(() => {
      if (matchOver) {
        room.state = 'OVER';
        const matchWinnerId = p1.points >= 3 ? p1.id : p2.id;
        const matchWinnerName = room.players[matchWinnerId].username;

        recordMatchToDb(room, matchWinnerId, 'match_finished');

        io.to(roomId).emit('gameOver', {
          winnerId: matchWinnerId,
          winnerName: matchWinnerName,
          reason: 'match_finished',
          score: {
            [p1.id]: p1.points,
            [p2.id]: p2.points
          }
        });
      } else {
        // Transition to PREPARATION_PHASE
        room.state = 'PREPARATION_PHASE';
        
        // Clean up any prep timer in room
        clearPrepTimer(room);
        room.prepTimerSeconds = 30;

        p1.prepFinished = false;
        p2.prepFinished = false;

        [p1, p2].forEach(p => {
          p.prepQueue = [];
          p.prepRerollsLeft = 1 + (p.relics.relic_prep_reroll_common || 0) + 2 * (p.relics.relic_prep_reroll_rare || 0);

          // 1. Relic Choice
          if (p.pendingRelicChoice) {
            p.prepQueue.push({
              type: 'RELIC_CHOICE',
              quality: p.pendingRelicChoice.quality,
              options: p.pendingRelicChoice.options,
              questText: p.pendingRelicChoice.questText
            });
            p.pendingRelicChoice = null;
          }

          // 2. Pack Selection (Bonus Pack from HARD Quest if earned + Regular Pack)
          if (p.pendingBonusPack) {
            p.prepQueue.push({
              type: 'PACK_SELECTION',
              isQuestBonus: true,
              options: generatePacks(3)
            });
            p.pendingBonusPack = false;
          }
          p.prepQueue.push({
            type: 'PACK_SELECTION',
            options: generatePacks(3)
          });

          // 3. Bonus Pick (Loser Comeback / Quest Reward Bonus Draft)
          const isLoser = (room.draftLoserId === p.id);
          if (isLoser) {
            p.prepQueue.push({
              type: 'BONUS_PICK',
              isQuestBonus: false,
              options: generateBonusPickCards()
            });
          }
          if (p.pendingBonusDraft) {
            p.prepQueue.push({
              type: 'BONUS_PICK',
              isQuestBonus: true,
              options: generateBonusPickCards()
            });
            p.pendingBonusDraft = false;
          }

          // 4. Card Removal (terakhir: keputusan memangkas setelah melihat seluruh kartu baru)
          if ((p.removalTokens || 0) > 0 && p.deck.length > 4) {
            p.prepQueue.push({
              type: 'CARD_REMOVAL',
              tokensAvailable: p.removalTokens,
              minDeckSize: 4
            });
          }
        });

        delete room.draftLoserId;

        // Start 1 single prep phase timer for the room (90 seconds)
        clearPrepPhaseTimer(room);
        startPrepPhaseTimer(room, io, PREP_PHASE_DURATION_SEC);

        // Start processing prep queues for both players
        [p1, p2].forEach(p => {
          advancePlayerPrepQueue(p, room, io);
        });
      }
    }, displayDuration);
  } else {
    // Round is not over, start next card clash turn immediately!
    startRound(roomId, io);
  }
}

module.exports = {
  drawHandFromDeck,
  startRound,
  handleTurnTimeout,
  handleSelectCard,
  handleLockSelection,
  resolveRound,
  handleClashFinished,
  proceedAfterClash
};
