const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, getTeamPlayers } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'cricket-auction-secret-key-2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Helper function to generate auction code
function generateAuctionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ===== AUTHENTICATION ROUTES =====

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, role, teamName } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (username, password, role, team)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      username,
      hashedPassword,
      role || 'bidder',
      teamName || null
    );

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, role: role || 'bidder', team: teamName || null },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: result.lastInsertRowid, username, role: role || 'bidder', team: teamName || null } });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, team: user.team },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, team: user.team }
  });
});

// ===== AUCTION ROUTES =====

// Create Auction (Admin)
app.post('/api/auctions', authenticateToken, requireAdmin, (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Auction name required' });
  }

  const code = generateAuctionCode();

  const stmt = db.prepare(`
    INSERT INTO auctions (admin_id, name, code, status)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(req.user.id, name, code, 'active');

  res.json({
    id: result.lastInsertRowid,
    adminId: req.user.id,
    name,
    code,
    code,
    status: 'active',
    currentPlayerId: null
  });
});

// Set Current Player (Admin)
app.post('/api/admin/auctions/:id/current-player', authenticateToken, requireAdmin, (req, res) => {
  const auctionId = parseInt(req.params.id);
  const { playerId } = req.body;

  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.admin_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  db.prepare('UPDATE auctions SET current_player_id = ? WHERE id = ?').run(playerId, auctionId);

  res.json({ success: true, message: 'Current player updated', currentPlayerId: playerId });
});

// Get Auction Status (Polling)
app.get('/api/auctions/:id/status', authenticateToken, (req, res) => {
  const auctionId = parseInt(req.params.id);
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);

  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  res.json({
    status: auction.status,
    currentPlayerId: auction.current_player_id
  });
});

// Get My Auctions (Admin)
app.get('/api/admin/auctions', authenticateToken, requireAdmin, (req, res) => {
  const auctions = db.prepare('SELECT * FROM auctions WHERE admin_id = ?').all(req.user.id);
  res.json(auctions.map(a => ({
    id: a.id,
    adminId: a.admin_id,
    name: a.name,
    code: a.code,
    status: a.status
  })));
});

// Join Auction (Bidder)
app.post('/api/auctions/join', authenticateToken, (req, res) => {
  const { code } = req.body;
  const auction = db.prepare('SELECT * FROM auctions WHERE code = ?').get(code.toUpperCase());

  if (!auction) {
    return res.status(404).json({ error: 'Invalid auction code' });
  }

  if (auction.status !== 'active') {
    return res.status(400).json({ error: 'Auction is not active' });
  }

  res.json({
    id: auction.id,
    name: auction.name,
    code: auction.code,
    code: auction.code,
    status: auction.status,
    currentPlayerId: auction.current_player_id
  });
});

// Restart Auction
app.post('/api/auctions/:id/restart', authenticateToken, requireAdmin, (req, res) => {
  const auctionId = parseInt(req.params.id);
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);

  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.admin_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  // Reset Auction State (Current Player)
  db.prepare(`
    UPDATE auctions 
    SET current_player_id = NULL
    WHERE id = ?
  `).run(auctionId);

  // Reset Teams
  db.prepare(`
    UPDATE teams 
    SET remaining_budget = budget
    WHERE auction_id = ?
  `).run(auctionId);

  // Reset Players
  db.prepare(`
    UPDATE players 
    SET current_bid = base_price, 
        current_bidder = NULL, 
        sold = 0, 
        sold_to = NULL, 
        sold_price = NULL
    WHERE auction_id = ?
  `).run(auctionId);

  // Clear Bids
  db.prepare('DELETE FROM bids WHERE auction_id = ?').run(auctionId);

  res.json({ success: true, message: 'Auction restarted successfully' });
});

// ===== USER ROUTES =====

// Update user team
app.put('/api/user/team', authenticateToken, (req, res) => {
  const { team } = req.body;

  db.prepare('UPDATE users SET team = ? WHERE id = ?').run(team, req.user.id);

  const updatedToken = jwt.sign(
    { id: req.user.id, username: req.user.username, role: req.user.role, team },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({ token: updatedToken, team });
});

// ===== TEAM ROUTES =====

// Admin: Add team
app.post('/api/admin/teams', authenticateToken, requireAdmin, (req, res) => {
  const { name, budget, auctionId } = req.body;

  if (!auctionId) return res.status(400).json({ error: 'Auction ID required' });

  const stmt = db.prepare(`
    INSERT INTO teams (auction_id, name, budget, remaining_budget)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(auctionId, name, budget, budget);

  res.json({
    id: result.lastInsertRowid,
    auctionId,
    name,
    budget,
    remainingBudget: budget,
    players: []
  });
});

// Get all teams
app.get('/api/teams', authenticateToken, (req, res) => {
  const { auctionId } = req.query;

  let teams;
  if (auctionId) {
    teams = db.prepare('SELECT * FROM teams WHERE auction_id = ?').all(parseInt(auctionId));
  } else {
    teams = db.prepare('SELECT * FROM teams').all();
  }

  // Add players to each team
  const teamsWithPlayers = teams.map(team => {
    const players = db.prepare(`
      SELECT * FROM players 
      WHERE sold = 1 AND sold_to = ?
    `).all(team.name);

    return {
      id: team.id,
      auctionId: team.auction_id,
      name: team.name,
      budget: team.budget,
      remainingBudget: team.remaining_budget,
      players: players
    };
  });

  res.json(teamsWithPlayers);
});

// Admin: Update team
app.put('/api/admin/teams/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, budget } = req.body;
  const teamId = parseInt(req.params.id);

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  if (budget && budget !== team.budget) {
    const budgetDifference = budget - team.budget;
    const newRemainingBudget = team.remaining_budget + budgetDifference;

    if (newRemainingBudget < 0) {
      return res.status(400).json({ error: 'New budget is too low for current spending' });
    }

    db.prepare(`
      UPDATE teams 
      SET name = ?, budget = ?, remaining_budget = ?
      WHERE id = ?
    `).run(name || team.name, budget, newRemainingBudget, teamId);
  } else {
    db.prepare('UPDATE teams SET name = ? WHERE id = ?').run(name || team.name, teamId);
  }

  const updatedTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  res.json({
    id: updatedTeam.id,
    auctionId: updatedTeam.auction_id,
    name: updatedTeam.name,
    budget: updatedTeam.budget,
    remainingBudget: updatedTeam.remaining_budget,
    players: []
  });
});

// Admin: Delete team
app.delete('/api/admin/teams/:id', authenticateToken, requireAdmin, (req, res) => {
  const teamId = parseInt(req.params.id);
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);

  if (!team) return res.status(404).json({ error: 'Team not found' });

  // Check if team has players
  const playerCount = db.prepare(`
    SELECT COUNT(*) as count FROM players 
    WHERE sold = 1 AND sold_to = ?
  `).get(team.name);

  if (playerCount.count > 0) {
    return res.status(400).json({ error: 'Cannot delete a team with players' });
  }

  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
  res.json({ success: true, message: 'Team deleted successfully' });
});

// ===== PLAYER ROUTES =====

// Admin: Add player
app.post('/api/admin/players', authenticateToken, requireAdmin, (req, res) => {
  const { name, role, basePrice, country, imageUrl, auctionId } = req.body;

  if (!auctionId) return res.status(400).json({ error: 'Auction ID required' });

  const stmt = db.prepare(`
    INSERT INTO players (auction_id, name, role, base_price, country, image_url, current_bid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    auctionId,
    name,
    role || 'All-rounder',
    basePrice || 100000,
    country || 'India',
    imageUrl || 'https://via.placeholder.com/150',
    basePrice || 100000
  );

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);

  res.json({
    id: player.id,
    auctionId: player.auction_id,
    name: player.name,
    role: player.role,
    basePrice: player.base_price,
    country: player.country,
    imageUrl: player.image_url,
    currentBid: player.current_bid,
    currentBidder: player.current_bidder,
    sold: Boolean(player.sold),
    soldTo: player.sold_to,
    soldPrice: player.sold_price
  });
});

// Get all players
app.get('/api/players', authenticateToken, (req, res) => {
  const { auctionId } = req.query;

  let players;
  if (auctionId) {
    players = db.prepare('SELECT * FROM players WHERE auction_id = ?').all(parseInt(auctionId));
  } else {
    players = db.prepare('SELECT * FROM players').all();
  }

  res.json(players.map(p => ({
    id: p.id,
    auctionId: p.auction_id,
    name: p.name,
    role: p.role,
    basePrice: p.base_price,
    country: p.country,
    imageUrl: p.image_url,
    currentBid: p.current_bid,
    currentBidder: p.current_bidder,
    sold: Boolean(p.sold),
    soldTo: p.sold_to,
    soldPrice: p.sold_price
  })));
});

// Get single player
app.get('/api/players/:id', authenticateToken, (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(parseInt(req.params.id));

  if (!player) return res.status(404).json({ error: 'Player not found' });

  res.json({
    id: player.id,
    auctionId: player.auction_id,
    name: player.name,
    role: player.role,
    basePrice: player.base_price,
    country: player.country,
    imageUrl: player.image_url,
    currentBid: player.current_bid,
    currentBidder: player.current_bidder,
    sold: Boolean(player.sold),
    soldTo: player.sold_to,
    soldPrice: player.sold_price
  });
});

// Admin: Update player
app.put('/api/admin/players/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, role, basePrice, country, imageUrl } = req.body;
  const playerId = parseInt(req.params.id);

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare(`
    UPDATE players 
    SET name = ?, role = ?, base_price = ?, country = ?, image_url = ?
    WHERE id = ?
  `).run(
    name || player.name,
    role || player.role,
    basePrice || player.base_price,
    country || player.country,
    imageUrl !== undefined ? imageUrl : player.image_url,
    playerId
  );

  const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);

  res.json({
    id: updatedPlayer.id,
    auctionId: updatedPlayer.auction_id,
    name: updatedPlayer.name,
    role: updatedPlayer.role,
    basePrice: updatedPlayer.base_price,
    country: updatedPlayer.country,
    imageUrl: updatedPlayer.image_url,
    currentBid: updatedPlayer.current_bid,
    currentBidder: updatedPlayer.current_bidder,
    sold: Boolean(updatedPlayer.sold),
    soldTo: updatedPlayer.sold_to,
    soldPrice: updatedPlayer.sold_price
  });
});

// Admin: Delete player
app.delete('/api/admin/players/:id', authenticateToken, requireAdmin, (req, res) => {
  const playerId = parseInt(req.params.id);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);

  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (player.sold) {
    return res.status(400).json({ error: 'Cannot delete a sold player' });
  }

  db.prepare('DELETE FROM players WHERE id = ?').run(playerId);
  res.json({ success: true, message: 'Player deleted successfully' });
});

// Admin: Sell player
app.post('/api/admin/players/:id/sell', authenticateToken, requireAdmin, (req, res) => {
  const playerId = parseInt(req.params.id);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);

  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (!player.current_bidder) {
    return res.status(400).json({ error: 'No bids placed for this player' });
  }

  // Update player as sold
  db.prepare(`
    UPDATE players 
    SET sold = 1, sold_to = ?, sold_price = ?
    WHERE id = ?
  `).run(player.current_bidder, player.current_bid, playerId);

  // Update team budget
  const team = db.prepare('SELECT * FROM teams WHERE name = ? AND auction_id = ?')
    .get(player.current_bidder, player.auction_id);

  if (team) {
    const newBudget = team.remaining_budget - player.current_bid;
    db.prepare('UPDATE teams SET remaining_budget = ? WHERE id = ?').run(newBudget, team.id);
  }

  // Clear active player
  db.prepare('UPDATE auctions SET current_player_id = NULL WHERE id = ?').run(player.auction_id);

  res.json({ success: true, message: 'Player sold successfully' });
});

// ===== BID ROUTES =====

// Place bid
app.post('/api/bids', authenticateToken, (req, res) => {
  const { playerId, amount, auctionId } = req.body;
  const team = req.user.team;

  if (!team) {
    return res.status(400).json({ error: 'Please select a team first' });
  }

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (player.sold) {
    return res.status(400).json({ error: 'Player already sold' });
  }

  if (amount <= player.current_bid) {
    return res.status(400).json({ error: 'Bid must be higher than current bid' });
  }

  const teamData = db.prepare('SELECT * FROM teams WHERE name = ? AND auction_id = ?')
    .get(team, auctionId);

  if (!teamData) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (amount > teamData.remaining_budget) {
    return res.status(400).json({ error: 'Insufficient budget' });
  }

  // Record bid
  db.prepare(`
    INSERT INTO bids (auction_id, player_id, team, amount)
    VALUES (?, ?, ?, ?)
  `).run(auctionId, playerId, team, amount);

  // Update player
  db.prepare(`
    UPDATE players 
    SET current_bid = ?, current_bidder = ?
    WHERE id = ?
  `).run(amount, team, playerId);

  res.json({ success: true, message: 'Bid placed successfully' });
});

// Get bid history for a player
app.get('/api/players/:id/bids', authenticateToken, (req, res) => {
  const playerId = parseInt(req.params.id);
  const bids = db.prepare(`
    SELECT * FROM bids 
    WHERE player_id = ? 
    ORDER BY timestamp DESC
  `).all(playerId);

  res.json(bids);
});

// ===== LIBRARY ROUTES =====

// Get library players
app.get('/api/admin/library/players', authenticateToken, requireAdmin, (req, res) => {
  const players = db.prepare('SELECT * FROM library_players').all();
  res.json(players.map(p => ({
    id: p.id,
    name: p.name,
    role: p.role,
    basePrice: p.base_price,
    country: p.country,
    imageUrl: p.image_url
  })));
});

// Add player to library
app.post('/api/admin/library/players', authenticateToken, requireAdmin, (req, res) => {
  const { name, role, basePrice, country, imageUrl } = req.body;

  if (!name || !role || !basePrice || !country) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO library_players (name, role, base_price, country, image_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name,
    role,
    basePrice,
    country,
    imageUrl || 'https://via.placeholder.com/150'
  );

  res.json({
    id: result.lastInsertRowid,
    name,
    role,
    basePrice,
    country,
    imageUrl
  });
});

// Delete player from library
app.delete('/api/admin/library/players/:id', authenticateToken, requireAdmin, (req, res) => {
  const playerId = parseInt(req.params.id);
  const player = db.prepare('SELECT * FROM library_players WHERE id = ?').get(playerId);

  if (!player) return res.status(404).json({ error: 'Player not found in library' });

  db.prepare('DELETE FROM library_players WHERE id = ?').run(playerId);
  res.json({ success: true, message: 'Player removed from library' });
});

// Bulk import players
app.post('/api/admin/players/bulk', authenticateToken, requireAdmin, (req, res) => {
  const { players, auctionId } = req.body;

  if (!auctionId) return res.status(400).json({ error: 'Auction ID required' });

  const stmt = db.prepare(`
    INSERT INTO players (auction_id, name, role, base_price, country, image_url, current_bid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const player of players) {
    stmt.run(
      auctionId,
      player.name,
      player.role,
      player.basePrice || 100000,
      player.country || 'India',
      player.imageUrl || 'https://via.placeholder.com/150',
      player.basePrice || 100000
    );
    count++;
  }

  res.json({ success: true, count, message: `${count} players imported successfully` });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Database: SQLite (auction.db)');
});
