const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'element_clash_super_secret_jwt_key_2026';

/**
 * Register a new user
 */
async function registerUser(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 15) {
    throw new Error('Username must be between 3 and 15 characters.');
  }

  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  // Check if username exists
  const existing = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
  if (existing.rows.length > 0) {
    throw new Error('Username is already taken.');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user
  const result = await db.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username, created_at, wins, losses, draws, total_matches, total_damage_dealt, win_streak, max_win_streak`,
    [cleanUsername, passwordHash]
  );

  const user = result.rows[0];

  // Generate Token
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

  return { user, token };
}

/**
 * Login existing user
 */
async function loginUser(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }

  const cleanUsername = username.trim();

  // Find user
  const result = await db.query(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
    [cleanUsername]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid username or password.');
  }

  const user = result.rows[0];

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid username or password.');
  }

  // Remove password_hash from returned object
  delete user.password_hash;

  // Generate Token
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

  return { user, token };
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Fetch full profile data & stats for a user
 */
async function getUserProfile(userId) {
  const result = await db.query(
    `SELECT id, username, created_at, wins, losses, draws, total_matches, total_damage_dealt, win_streak, max_win_streak
     FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Get recent match history for a user
 */
async function getUserMatchHistory(userId, limit = 20) {
  const queryText = `
    SELECT 
      m.id,
      m.p1_score,
      m.p2_score,
      m.end_reason,
      m.created_at,
      u1.id as p1_id, u1.username as p1_name,
      u2.id as p2_id, u2.username as p2_name,
      w.username as winner_name,
      m.winner_id
    FROM matches m
    JOIN users u1 ON m.player1_id = u1.id
    JOIN users u2 ON m.player2_id = u2.id
    LEFT JOIN users w ON m.winner_id = w.id
    WHERE m.player1_id = $1 OR m.player2_id = $1
    ORDER BY m.created_at DESC
    LIMIT $2;
  `;
  const result = await db.query(queryText, [userId, limit]);
  return result.rows;
}

/**
 * Record match completion result and update stats
 */
async function recordMatchResult({ p1Id, p2Id, winnerId, p1Score, p2Score, endReason, p1Damage = 0, p2Damage = 0 }) {
  try {
    // Record match
    await db.query(
      `INSERT INTO matches (player1_id, player2_id, winner_id, p1_score, p2_score, end_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [p1Id, p2Id, winnerId, p1Score, p2Score, endReason]
    );

    // Update Player 1 Stats
    const p1IsWinner = winnerId === p1Id;
    const isDraw = winnerId === null;

    if (isDraw) {
      await db.query(
        `UPDATE users SET total_matches = total_matches + 1, draws = draws + 1, total_damage_dealt = total_damage_dealt + $1 WHERE id = $2`,
        [p1Damage, p1Id]
      );
      await db.query(
        `UPDATE users SET total_matches = total_matches + 1, draws = draws + 1, total_damage_dealt = total_damage_dealt + $1 WHERE id = $2`,
        [p2Damage, p2Id]
      );
    } else if (p1IsWinner) {
      // P1 won, P2 lost
      await db.query(
        `UPDATE users 
         SET total_matches = total_matches + 1, 
             wins = wins + 1, 
             win_streak = win_streak + 1, 
             max_win_streak = GREATEST(max_win_streak, win_streak + 1),
             total_damage_dealt = total_damage_dealt + $1 
         WHERE id = $2`,
        [p1Damage, p1Id]
      );

      await db.query(
        `UPDATE users 
         SET total_matches = total_matches + 1, 
             losses = losses + 1, 
             win_streak = 0,
             total_damage_dealt = total_damage_dealt + $1 
         WHERE id = $2`,
        [p2Damage, p2Id]
      );
    } else {
      // P2 won, P1 lost
      await db.query(
        `UPDATE users 
         SET total_matches = total_matches + 1, 
             losses = losses + 1, 
             win_streak = 0,
             total_damage_dealt = total_damage_dealt + $1 
         WHERE id = $2`,
        [p1Damage, p1Id]
      );

      await db.query(
        `UPDATE users 
         SET total_matches = total_matches + 1, 
             wins = wins + 1, 
             win_streak = win_streak + 1, 
             max_win_streak = GREATEST(max_win_streak, win_streak + 1),
             total_damage_dealt = total_damage_dealt + $1 
         WHERE id = $2`,
        [p2Damage, p2Id]
      );
    }
  } catch (err) {
    console.error('[Auth/DB Error] Failed to record match result:', err.message);
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  getUserProfile,
  getUserMatchHistory,
  recordMatchResult
};
