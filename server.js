const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'cricket-auction-secret-key-2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Data storage files
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PLAYERS_FILE = path.join(__dirname, 'data', 'players.json');
const TEAMS_FILE = path.join(__dirname, 'data', 'teams.json');
const BIDS_FILE = path.join(__dirname, 'data', 'bids.json');
const AUCTIONS_FILE = path.join(__dirname, 'data', 'auctions.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize data files if they don't exist
function initDataFiles() {
  if (!fs.existsSync(USERS_FILE)) {
    const adminUser = {
      id: 1,
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      team: null
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify([adminUser], null, 2));
  }
  if (!fs.existsSync(PLAYERS_FILE)) {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(TEAMS_FILE)) {
    fs.writeFileSync(TEAMS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(BIDS_FILE)) {
    fs.writeFileSync(BIDS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(AUCTIONS_FILE)) {
    fs.writeFileSync(AUCTIONS_FILE, JSON.stringify([], null, 2));
  }
}

initDataFiles();

// Helper functions
function readJSON(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

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

// Routes

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username === username);

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
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      team: user.team
    }
  });
});

// Register
app.post('/api/register', (req, res) => {
  const { username, password, role } = req.body;
  const users = readJSON(USERS_FILE);

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Validate role
  const validRoles = ['admin', 'bidder', 'user'];
  let userRole = role || 'bidder';

  if (userRole === 'bidder') {
    userRole = 'user';
  }

  if (!validRoles.includes(userRole)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin or bidder' });
  }

  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username,
    password: bcrypt.hashSync(password, 10),
    role: userRole,
    team: null
  };

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  const token = jwt.sign(
    { id: newUser.id, username: newUser.username, role: newUser.role, team: null },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      team: null
    }
  });
});

// Get current user
app.get('/api/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// --- Auction Routes ---

// Create Auction
app.post('/api/auctions', authenticateToken, requireAdmin, (req, res) => {
  const { name } = req.body;
  const auctions = readJSON(AUCTIONS_FILE);

  const newAuction = {
    id: auctions.length > 0 ? Math.max(...auctions.map(a => a.id)) + 1 : 1,
    code: generateAuctionCode(),
    name: name || 'Cricket Auction',
    adminId: req.user.id,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  auctions.push(newAuction);
  writeJSON(AUCTIONS_FILE, auctions);

  res.json(newAuction);
});

// Get My Auctions (Admin)
app.get('/api/admin/auctions', authenticateToken, requireAdmin, (req, res) => {
  const auctions = readJSON(AUCTIONS_FILE);
  const myAuctions = auctions.filter(a => a.adminId === req.user.id);
  res.json(myAuctions);
});

// Join Auction (Bidder)
app.post('/api/auctions/join', authenticateToken, (req, res) => {
  const { code } = req.body;
  const auctions = readJSON(AUCTIONS_FILE);
  const auction = auctions.find(a => a.code === code.toUpperCase());

  if (!auction) {
    return res.status(404).json({ error: 'Invalid auction code' });
  }

  if (auction.status !== 'active') {
    return res.status(400).json({ error: 'Auction is not active' });
  }

  res.json(auction);
});

// Restart Auction
app.post('/api/auctions/:id/restart', authenticateToken, requireAdmin, (req, res) => {
  const auctionId = parseInt(req.params.id);
  const auctions = readJSON(AUCTIONS_FILE);
  const auction = auctions.find(a => a.id === auctionId);

  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.adminId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  // Reset Teams
  const teams = readJSON(TEAMS_FILE);
  teams.forEach(t => {
    if (t.auctionId === auctionId) {
      t.remainingBudget = t.budget;
      t.players = [];
    }
  });
  writeJSON(TEAMS_FILE, teams);

  // Reset Players
  const players = readJSON(PLAYERS_FILE);
  players.forEach(p => {
    if (p.auctionId === auctionId) {
      p.currentBid = p.basePrice;
      p.currentBidder = null;
      p.sold = false;
      p.soldTo = null;
      p.soldPrice = null;
    }
  });
  writeJSON(PLAYERS_FILE, players);

  // Clear Bids
  let bids = readJSON(BIDS_FILE);
  bids = bids.filter(b => b.auctionId !== auctionId);
  writeJSON(BIDS_FILE, bids);

  res.json({ success: true, message: 'Auction restarted successfully' });
});

// --- Scoped Data Routes ---

// Update user team (Scoped to Auction?) - Actually User Team is global for now, but in a real app should be per auction.
// For simplicity, we'll keep user-team mapping simple, but ideally users join a team within an auction.
// Let's assume users select a team AFTER joining an auction context on frontend.

app.put('/api/user/team', authenticateToken, (req, res) => {
  const { team } = req.body;
  const users = readJSON(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[userIndex].team = team;
  writeJSON(USERS_FILE, users);

  const updatedToken = jwt.sign(
    { id: req.user.id, username: req.user.username, role: req.user.role, team },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({ token: updatedToken, team });
});

// Admin: Add team (Scoped to Auction)
app.post('/api/admin/teams', authenticateToken, requireAdmin, (req, res) => {
  const { name, budget, auctionId } = req.body;

  if (!auctionId) return res.status(400).json({ error: 'Auction ID required' });

  const teams = readJSON(TEAMS_FILE);

  const newTeam = {
    id: teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1,
    auctionId: parseInt(auctionId),
    name,
    budget: budget || 10000000,
    remainingBudget: budget || 10000000,
    players: []
  };

  teams.push(newTeam);
  writeJSON(TEAMS_FILE, teams);

  res.json(newTeam);
});

// Get all teams (Scoped to Auction)
app.get('/api/teams', authenticateToken, (req, res) => {
  const { auctionId } = req.query;
  const teams = readJSON(TEAMS_FILE);

  if (auctionId) {
    res.json(teams.filter(t => t.auctionId === parseInt(auctionId)));
  } else {
    res.json(teams); // Fallback for legacy or admin view
  }
});

// Admin: Update team
app.put('/api/admin/teams/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, budget } = req.body;
  const teams = readJSON(TEAMS_FILE);

  const teamIndex = teams.findIndex(t => t.id === parseInt(req.params.id));
  if (teamIndex === -1) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const team = teams[teamIndex];
  teams[teamIndex].name = name || team.name;

  if (budget && budget !== team.budget) {
    const budgetDifference = budget - team.budget;
    teams[teamIndex].budget = budget;
    teams[teamIndex].remainingBudget = team.remainingBudget + budgetDifference;

    if (teams[teamIndex].remainingBudget < 0) {
      return res.status(400).json({ error: 'New budget is too low for current spending' });
    }
  }

  writeJSON(TEAMS_FILE, teams);
  res.json(teams[teamIndex]);
});

// Admin: Delete team
app.delete('/api/admin/teams/:id', authenticateToken, requireAdmin, (req, res) => {
  const teams = readJSON(TEAMS_FILE);
  const teamIndex = teams.findIndex(t => t.id === parseInt(req.params.id));

  if (teamIndex === -1) return res.status(404).json({ error: 'Team not found' });

  const team = teams[teamIndex];
  if (team.players && team.players.length > 0) {
    return res.status(400).json({ error: 'Cannot delete a team with players' });
  }

  teams.splice(teamIndex, 1);
  writeJSON(TEAMS_FILE, teams);
  res.json({ success: true, message: 'Team deleted successfully' });
});

// Admin: Add player (Scoped to Auction)
app.post('/api/admin/players', authenticateToken, requireAdmin, (req, res) => {
  const { name, role, basePrice, country, imageUrl, auctionId } = req.body;

  if (!auctionId) return res.status(400).json({ error: 'Auction ID required' });

  const players = readJSON(PLAYERS_FILE);

  const newPlayer = {
    id: players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1,
    auctionId: parseInt(auctionId),
    name,
    role: role || 'All-rounder',
    basePrice: basePrice || 100000,
    country: country || 'India',
    imageUrl: imageUrl || 'https://via.placeholder.com/150',
    currentBid: basePrice || 100000,
    currentBidder: null,
    sold: false,
    soldTo: null,
    soldPrice: null
  };

  players.push(newPlayer);
  writeJSON(PLAYERS_FILE, players);

  res.json(newPlayer);
});

// Get all players (Scoped to Auction)
app.get('/api/players', authenticateToken, (req, res) => {
  const { auctionId } = req.query;
  const players = readJSON(PLAYERS_FILE);

  if (auctionId) {
    res.json(players.filter(p => p.auctionId === parseInt(auctionId)));
  } else {
    res.json(players);
  }
});

// Get player by ID
app.get('/api/players/:id', authenticateToken, (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  const player = players.find(p => p.id === parseInt(req.params.id));

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json(player);
});

// Admin: Update player
app.put('/api/admin/players/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, role, basePrice, country, imageUrl } = req.body;
  const players = readJSON(PLAYERS_FILE);

  const playerIndex = players.findIndex(p => p.id === parseInt(req.params.id));
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const player = players[playerIndex];

  if (player.sold) {
    return res.status(400).json({ error: 'Cannot edit a sold player' });
  }

  players[playerIndex].name = name || player.name;
  players[playerIndex].role = role || player.role;
  players[playerIndex].basePrice = basePrice || player.basePrice;
  players[playerIndex].country = country || player.country;
  players[playerIndex].imageUrl = imageUrl || player.imageUrl;

  if (basePrice && !player.currentBidder) {
    players[playerIndex].currentBid = basePrice;
  }

  writeJSON(PLAYERS_FILE, players);
  res.json(players[playerIndex]);
});

// Admin: Delete player
app.delete('/api/admin/players/:id', authenticateToken, requireAdmin, (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  const playerIndex = players.findIndex(p => p.id === parseInt(req.params.id));

  if (playerIndex === -1) return res.status(404).json({ error: 'Player not found' });

  const player = players[playerIndex];
  if (player.sold) {
    return res.status(400).json({ error: 'Cannot delete a sold player' });
  }

  players.splice(playerIndex, 1);
  writeJSON(PLAYERS_FILE, players);
  res.json({ success: true, message: 'Player deleted successfully' });
});

// Place bid
app.post('/api/players/:id/bid', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const players = readJSON(PLAYERS_FILE);
  const teams = readJSON(TEAMS_FILE);
  const bids = readJSON(BIDS_FILE);

  const playerIndex = players.findIndex(p => p.id === parseInt(req.params.id));
  if (playerIndex === -1) return res.status(404).json({ error: 'Player not found' });

  const player = players[playerIndex];
  if (player.sold) return res.status(400).json({ error: 'Player already sold' });
  if (!req.user.team) return res.status(400).json({ error: 'Please select your team first' });

  // Find team in the SAME auction as the player
  const team = teams.find(t => t.name === req.user.team && t.auctionId === player.auctionId);
  if (!team) return res.status(404).json({ error: 'Team not found in this auction' });

  if (amount <= player.currentBid) return res.status(400).json({ error: 'Bid amount must be higher than current bid' });
  if (amount > team.remainingBudget) return res.status(400).json({ error: 'Insufficient budget' });

  players[playerIndex].currentBid = amount;
  players[playerIndex].currentBidder = req.user.team;

  const newBid = {
    id: bids.length > 0 ? Math.max(...bids.map(b => b.id)) + 1 : 1,
    auctionId: player.auctionId,
    playerId: player.id,
    playerName: player.name,
    team: req.user.team,
    amount,
    timestamp: new Date().toISOString(),
    bidderId: req.user.id
  };

  bids.push(newBid);
  writeJSON(BIDS_FILE, bids);
  writeJSON(PLAYERS_FILE, players);

  res.json({ success: true, player: players[playerIndex], bid: newBid });
});

// Admin: Sell player
app.post('/api/admin/players/:id/sell', authenticateToken, requireAdmin, (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  const teams = readJSON(TEAMS_FILE);

  const playerIndex = players.findIndex(p => p.id === parseInt(req.params.id));
  if (playerIndex === -1) return res.status(404).json({ error: 'Player not found' });

  const player = players[playerIndex];
  if (player.sold) return res.status(400).json({ error: 'Player already sold' });
  if (!player.currentBidder) return res.status(400).json({ error: 'No bids placed on this player' });

  const team = teams.find(t => t.name === player.currentBidder && t.auctionId === player.auctionId);
  if (team) {
    team.remainingBudget -= player.currentBid;
    team.players.push({
      id: player.id,
      name: player.name,
      role: player.role,
      price: player.currentBid,
      imageUrl: player.imageUrl
    });
    writeJSON(TEAMS_FILE, teams);
  }

  players[playerIndex].sold = true;
  players[playerIndex].soldTo = player.currentBidder;
  players[playerIndex].soldPrice = player.currentBid;

  writeJSON(PLAYERS_FILE, players);
  res.json({ success: true, player: players[playerIndex] });
});

// Get bids for a player
app.get('/api/players/:id/bids', authenticateToken, (req, res) => {
  const bids = readJSON(BIDS_FILE);
  const playerBids = bids.filter(b => b.playerId === parseInt(req.params.id));
  res.json(playerBids.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

// Get Player Library (Unique players from admin's auctions)
app.get('/api/admin/library/players', authenticateToken, requireAdmin, (req, res) => {
  const auctions = readJSON(AUCTIONS_FILE);
  const players = readJSON(PLAYERS_FILE);

  // Get all auction IDs created by this admin
  const adminAuctionIds = auctions
    .filter(a => a.adminId === req.user.id)
    .map(a => a.id);

  // Get all players from these auctions
  const adminPlayers = players.filter(p => adminAuctionIds.includes(p.auctionId));

  // Deduplicate by name (keep the latest one)
  const uniquePlayers = {};
  adminPlayers.forEach(p => {
    uniquePlayers[p.name] = p;
  });

  res.json(Object.values(uniquePlayers));
});

// Bulk Import Players
app.post('/api/admin/players/bulk', authenticateToken, requireAdmin, (req, res) => {
  const { players: newPlayersData, auctionId } = req.body;

  if (!auctionId) return res.status(400).json({ error: 'Auction ID required' });
  if (!newPlayersData || !Array.isArray(newPlayersData)) return res.status(400).json({ error: 'Invalid players data' });

  const players = readJSON(PLAYERS_FILE);
  let maxId = players.length > 0 ? Math.max(...players.map(p => p.id)) : 0;

  const createdPlayers = newPlayersData.map(p => {
    maxId++;
    return {
      id: maxId,
      auctionId: parseInt(auctionId),
      name: p.name,
      role: p.role || 'All-rounder',
      basePrice: p.basePrice || 100000,
      country: p.country || 'India',
      imageUrl: p.imageUrl || 'https://via.placeholder.com/150',
      currentBid: p.basePrice || 100000,
      currentBidder: null,
      sold: false,
      soldTo: null,
      soldPrice: null
    };
  });

  players.push(...createdPlayers);
  writeJSON(PLAYERS_FILE, players);

  res.json({ success: true, count: createdPlayers.length });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`App is live! Frontend and API available at the same URL.`);
  }
});

