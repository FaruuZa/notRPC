require('dotenv').config();
const express = require('express');
const path = require('path');
const { PORT, CARD_POOL } = require('./constants');
const { RELIC_POOL } = require('./relics');
const { QUEST_TEMPLATES } = require('./quests');
const matchmaking = require('./matchmaking');
const roomManager = require('./roomManager');

const app = express();

// Serve static files from the public directory with no-cache headers for Discord Activity
app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Endpoint to provide public config (Discord Client ID, etc.) to client frontend
app.get('/api/config', (req, res) => {
  res.json({
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    publicServerUrl: process.env.PUBLIC_SERVER_URL || ''
  });
});

// Redirect root to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Server is running at http://localhost:${PORT}`);
  if (process.env.DISCORD_CLIENT_ID) {
    console.log(`Discord Client ID configured.`);
  }
  console.log(`====================================================`);
});

// Attach Socket.IO to the Express server with CORS enabled for Discord Activity & Proxy
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
  
  // Handle new Socket.IO connections
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
  
    // Emit initial queue count to the newly connected player
    socket.emit('queueCountUpdate', matchmaking.getQueueCount());
    
    // Emit compendium database of all cards, relics, and quest templates
    socket.emit('compendiumData', { cards: CARD_POOL, relics: Object.values(RELIC_POOL), questTemplates: QUEST_TEMPLATES });
    
    // Broadcast updated online count to all clients
    io.emit('onlineCountUpdate', io.engine.clientsCount);
  
    // Player joins the matchmaking queue
    socket.on('joinQueue', (username) => {
      matchmaking.join(socket, username, io, roomManager);
    });
  
    // Player manually leaves the matchmaking queue
    socket.on('leaveQueue', () => {
      matchmaking.leave(socket.id, io);
    });
  
    // Player selects a loser bonus card in draft phase
    socket.on('selectBonusCard', (cardTemplateId) => {
      roomManager.handleSelectBonusCard(socket, cardTemplateId, io);
    });
  
    // Player selects a pack in draft phase
    socket.on('selectPack', (packId) => {
      roomManager.handleSelectPack(socket, packId, io);
    });

    // Player selects a quest in quest selection phase
    socket.on('selectQuest', (questId) => {
      roomManager.handleSelectQuest(socket, questId, io);
    });

    // Player rerolls quests
    socket.on('rerollQuests', () => {
      roomManager.handleRerollQuests(socket, io);
    });

    // Player removes a card from deck
    socket.on('removeCard', (cardInstanceId) => {
      roomManager.handleRemoveCard(socket, cardInstanceId, io);
    });

    // Player skips card removal
    socket.on('skipCardRemoval', () => {
      roomManager.handleSkipCardRemoval(socket, io);
    });

    // Player selects a relic choice
    socket.on('selectRelic', (relicId) => {
      roomManager.handleSelectRelic(socket, relicId, io);
    });

    // Player requests a prep reroll
    socket.on('rerollPrep', () => {
      roomManager.handleRerollPrep(socket, io);
    });
  
    // Player confirms their pack reveal animation is finished
    socket.on('packRevealConfirm', () => {
      roomManager.handlePackRevealConfirm(socket, io);
    });
  
    // Player selects a card in battle
    socket.on('selectCard', (cardInstanceId) => {
      roomManager.handleSelectCard(socket, cardInstanceId, io);
    });
  
    // Player locks their selection in battle
    socket.on('lockSelection', () => {
      roomManager.handleLockSelection(socket, io);
    });

    // Player has finished the visual clash animation
    socket.on('clashFinished', () => {
      roomManager.handleClashFinished(socket, io);
    });

    // Player surrenders the match
    socket.on('surrender', () => {
      roomManager.handleSurrender(socket, io);
    });

    // Player requests a rematch after match is over
    socket.on('requestRematch', () => {
      roomManager.handleRequestRematch(socket, io);
    });

    // Player leaves the game room (returns to lobby)
    socket.on('leaveRoom', () => {
      roomManager.handleLeaveRoom(socket, io);
    });
  
    // Player disconnects (tab closed, internet drop, etc.)
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      matchmaking.leave(socket.id, io);
      roomManager.handleDisconnect(socket, io);
      
      // Broadcast updated online count to all clients
      io.emit('onlineCountUpdate', io.engine.clientsCount);
    });
  });
  
