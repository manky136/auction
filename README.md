# Cricket PPL Auction System

A web-based auction system for local cricket Premier League (PPL) player auctions.

## Features

- **Admin Dashboard**: Add teams and players to the auction
- **User Dashboard**: Login, select team, and bid on players
- **Real-time Bidding**: Place bids on available players
- **Team Management**: Track team budgets and purchased players
- **Authentication**: Secure login/register system

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Access the Application**
   - Open your browser and go to: `http://localhost:3000`
   - Default admin credentials:
     - Username: `admin`
     - Password: `admin123`

## Usage

### For Administrators

1. Login with admin credentials
2. **Add Teams**: Create teams with budget (default: ₹1,00,00,000)
3. **Add Players**: Add players with name, role, base price, and country
4. **Sell Players**: Once bidding is complete, click "Sell Player" to finalize the sale

### For Users

1. **Register**: Create a new account on the login page
2. **Login**: Use your credentials to login
3. **Select Team**: Choose your team from available teams
4. **Bid on Players**: Click "Place Bid" on any available player
5. **View Your Team**: See your purchased players and remaining budget

## Data Storage

All data is stored in JSON files in the `data/` directory:
- `users.json` - User accounts
- `teams.json` - Team information
- `players.json` - Player information
- `bids.json` - Bid history

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs

## Notes

- The system automatically creates the data directory and initializes default admin user on first run
- Bids must be higher than the current bid
- Teams cannot bid more than their remaining budget
- Players must be sold by admin to finalize the purchase

