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

  // Map 'bidder' to 'user' for backward compatibility
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

// Update user team
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

// Admin: Add team
app.post('/api/admin/teams', authenticateToken, requireAdmin, (req, res) => {
  const { name, budget } = req.body;
  const teams = readJSON(TEAMS_FILE);

  const newTeam = {
    id: teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1,
    name,
    budget: budget || 10000000,
    remainingBudget: budget || 10000000,
    players: []
  };

  teams.push(newTeam);
  writeJSON(TEAMS_FILE, teams);

  res.json(newTeam);
});

// Get all teams
app.get('/api/teams', authenticateToken, (req, res) => {
  const teams = readJSON(TEAMS_FILE);
  res.json(teams);
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

  // Update team details
  teams[teamIndex].name = name || team.name;

  // If budget is being updated, adjust remaining budget proportionally
  if (budget && budget !== team.budget) {
    const budgetDifference = budget - team.budget;
    teams[teamIndex].budget = budget;
    teams[teamIndex].remainingBudget = team.remainingBudget + budgetDifference;

    // Ensure remaining budget doesn't go negative
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
  if (teamIndex === -1) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const team = teams[teamIndex];

  // Prevent deletion if team has players
  if (team.players && team.players.length > 0) {
    return res.status(400).json({ error: 'Cannot delete a team with players' });
  }

  // Remove team
  teams.splice(teamIndex, 1);
  writeJSON(TEAMS_FILE, teams);

  res.json({ success: true, message: 'Team deleted successfully' });
});

// Admin: Add player
app.post('/api/admin/players', authenticateToken, requireAdmin, (req, res) => {
  const { name, role, basePrice, country } = req.body;
  const players = readJSON(PLAYERS_FILE);

  const newPlayer = {
    id: players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1,
    name,
    role: role || 'All-rounder',
    basePrice: basePrice || 100000,
    country: country || 'India',
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

// Get all players
app.get('/api/players', authenticateToken, (req, res) => {
  const players = readJSON(PLAYERS_FILE);
  res.json(players);
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
  const { name, role, basePrice, country } = req.body;
  const players = readJSON(PLAYERS_FILE);

  const playerIndex = players.findIndex(p => p.id === parseInt(req.params.id));
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const player = players[playerIndex];

  if (player.sold) {
    return res.status(400).json({ error: 'Cannot edit a sold player' });
  }

  // Update player details
  players[playerIndex].name = name || player.name;
  players[playerIndex].role = role || player.role;
  players[playerIndex].basePrice = basePrice || player.basePrice;
  players[playerIndex].country = country || player.country;

  // Update current bid if base price changed and no bids placed yet
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
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const player = players[playerIndex];

  if (player.sold) {
    return res.status(400).json({ error: 'Cannot delete a sold player' });
  }

  // Remove player
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
  const users = readJSON(USERS_FILE);

  const playerIndex = players.findIndex(p => p.id === parseInt(req.params.id));
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const player = players[playerIndex];

  if (player.sold) {
    return res.status(400).json({ error: 'Player already sold' });
  }

  if (!req.user.team) {
    return res.status(400).json({ error: 'Please select your team first' });
  }

  const team = teams.find(t => t.name === req.user.team);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (amount <= player.currentBid) {
    return res.status(400).json({ error: 'Bid amount must be higher than current bid' });
  }

  if (amount > team.remainingBudget) {
    return res.status(400).json({ error: 'Insufficient budget' });
  }

  // Update player
  players[playerIndex].currentBid = amount;
  players[playerIndex].currentBidder = req.user.team;

  // Record bid
  const newBid = {
    id: bids.length > 0 ? Math.max(...bids.map(b => b.id)) + 1 : 1,
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
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const player = players[playerIndex];

  if (player.sold) {
    return res.status(400).json({ error: 'Player already sold' });
  }

  if (!player.currentBidder) {
    return res.status(400).json({ error: 'No bids placed on this player' });
  }

  const team = teams.find(t => t.name === player.currentBidder);
  if (team) {
    team.remainingBudget -= player.currentBid;
    team.players.push({
      id: player.id,
      name: player.name,
      role: player.role,
      price: player.currentBid
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`App is live! Frontend and API available at the same URL.`);
  }
});

