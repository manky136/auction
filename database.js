const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Initialize database
const db = new Database(path.join(__dirname, 'auction.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
    // Users table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Auctions table
    db.exec(`
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    )
  `);

    // Teams table
    db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      budget INTEGER NOT NULL,
      remaining_budget INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE
    )
  `);

    // Players table
    db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      country TEXT NOT NULL,
      image_url TEXT,
      current_bid INTEGER NOT NULL,
      current_bidder TEXT,
      sold INTEGER DEFAULT 0,
      sold_to TEXT,
      sold_price INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE
    )
  `);

    // Bids table
    db.exec(`
    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      team TEXT NOT NULL,
      amount INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);

    // Library players table
    db.exec(`
    CREATE TABLE IF NOT EXISTS library_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      country TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create default admin user if no users exist
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare(`
      INSERT INTO users (username, password, role, team)
      VALUES (?, ?, ?, ?)
    `).run('admin', hashedPassword, 'admin', null);
        console.log('Default admin user created (username: admin, password: admin123)');
    }
}

// Helper functions for team players JSON field
function getTeamPlayers(teamId) {
    const players = db.prepare(`
    SELECT p.* FROM players p
    WHERE p.sold = 1 AND p.sold_to = (SELECT name FROM teams WHERE id = ?)
  `).all(teamId);
    return players;
}

// Initialize database on module load
initializeDatabase();

module.exports = {
    db,
    getTeamPlayers
};
