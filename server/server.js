require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const auth = require('./auth');
const { PORT } = require('./constants');
const { CARD_POOL } = require('./cards');
const { RELIC_POOL } = require('./relics');
const { QUEST_TEMPLATES } = require('./quests');
const matchmaking = require('./matchmaking');
const roomManager = require('./roomManager');

const app = express();

// Parse JSON bodies
app.use(express.json());

// Initialize PostgreSQL database
db.initDb();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Public config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    publicServerUrl: process.env.PUBLIC_SERVER_URL || ''
  });
});

// Middleware for authenticated REST routes
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = auth.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }
  req.user = decoded;
  next();
}

// REST Auth & Profile Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await auth.registerUser(username, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await auth.loginUser(username, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateUser, async (req, res) => {
  try {
    const profile = await auth.getUserProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', authenticateUser, async (req, res) => {
  try {
    const profile = await auth.getUserProfile(req.user.userId);
    res.json({ stats: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', authenticateUser, async (req, res) => {
  try {
    const history = await auth.getUserMatchHistory(req.user.userId);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// Attach Socket.IO to the Express server
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    const decoded = auth.verifyToken(token);
    if (decoded) {
      socket.user = decoded; // { userId, username }
    }
  }
  next();
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id} ${socket.user ? `(User: ${socket.user.username} #${socket.user.userId})` : '(Guest)'}`);

  // Emit initial queue count
  socket.emit('queueCountUpdate', matchmaking.getQueueCount());
  
  // Emit compendium database
  socket.emit('compendiumData', { cards: CARD_POOL, relics: Object.values(RELIC_POOL), questTemplates: QUEST_TEMPLATES });
  
  // Broadcast online count
  io.emit('onlineCountUpdate', io.engine.clientsCount);

  // Check if player has an active room waiting for reconnection
  if (socket.user) {
    roomManager.checkPendingReconnect(socket, io);
  }

  // Socket Events
  socket.on('reconnectMatch', (token) => {
    roomManager.handleReconnectMatch(socket, token, io);
  });

  socket.on('requestStateSync', () => {
    roomManager.handleRequestStateSync(socket, io);
  });

  socket.on('joinQueue', (data) => {
    const customUsername = typeof data === 'object' && data !== null ? data.username : data;
    const roomCode = typeof data === 'object' && data !== null ? data.roomCode : '';
    const name = socket.user ? socket.user.username : (customUsername || 'Guest');
    const userId = socket.user ? socket.user.userId : socket.id;
    matchmaking.join(socket, name, userId, io, roomManager, roomCode);
  });

  socket.on('leaveQueue', () => {
    matchmaking.leave(socket.id, io);
  });

  socket.on('selectBonusCard', (cardTemplateId) => {
    roomManager.handleSelectBonusCard(socket, cardTemplateId, io);
  });

  socket.on('selectPack', (packId) => {
    roomManager.handleSelectPack(socket, packId, io);
  });

  socket.on('selectQuest', (questId) => {
    roomManager.handleSelectQuest(socket, questId, io);
  });

  socket.on('rerollQuests', () => {
    roomManager.handleRerollQuests(socket, io);
  });

  socket.on('removeCard', (cardInstanceId) => {
    roomManager.handleRemoveCard(socket, cardInstanceId, io);
  });

  socket.on('skipCardRemoval', () => {
    roomManager.handleSkipCardRemoval(socket, io);
  });

  socket.on('selectRelic', (relicId) => {
    roomManager.handleSelectRelic(socket, relicId, io);
  });

  socket.on('rerollPrep', () => {
    roomManager.handleRerollPrep(socket, io);
  });

  socket.on('packRevealConfirm', () => {
    roomManager.handlePackRevealConfirm(socket, io);
  });

  socket.on('selectCard', (cardInstanceId) => {
    roomManager.handleSelectCard(socket, cardInstanceId, io);
  });

  socket.on('lockSelection', () => {
    roomManager.handleLockSelection(socket, io);
  });

  socket.on('clashFinished', () => {
    roomManager.handleClashFinished(socket, io);
  });

  socket.on('surrender', () => {
    roomManager.handleSurrender(socket, io);
  });

  socket.on('requestRematch', () => {
    roomManager.handleRequestRematch(socket, io);
  });

  socket.on('leaveRoom', () => {
    roomManager.handleLeaveRoom(socket, io);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    matchmaking.leave(socket.id, io);
    roomManager.handleDisconnect(socket, io);
    io.emit('onlineCountUpdate', io.engine.clientsCount);
  });
});
