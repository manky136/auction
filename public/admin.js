// Admin dashboard functionality

// Initialize admin dashboard
async function initAdmin() {
    if (!checkAuth()) return;
    
    const user = getUser();
    if (user.role !== 'admin') {
        alert('Access denied. Admin only.');
        window.location.href = 'index.html';
        return;
    }

    displayUserInfo();
    loadTeams();
    loadPlayers();

    // Add team form
    document.getElementById('addTeamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const teamData = {
            name: formData.get('name'),
            budget: parseInt(formData.get('budget'))
        };

        try {
            await apiRequest('/admin/teams', {
                method: 'POST',
                body: JSON.stringify(teamData)
            });
            e.target.reset();
            loadTeams();
            showSuccess('Team added successfully!');
        } catch (error) {
            showError(error.message);
        }
    });

    // Add player form
    document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const playerData = {
            name: formData.get('name'),
            role: formData.get('role'),
            basePrice: parseInt(formData.get('basePrice')),
            country: formData.get('country')
        };

        try {
            await apiRequest('/admin/players', {
                method: 'POST',
                body: JSON.stringify(playerData)
            });
            e.target.reset();
            loadPlayers();
            showSuccess('Player added successfully!');
        } catch (error) {
            showError(error.message);
        }
    });
}

// Load teams
async function loadTeams() {
    try {
        const teams = await apiRequest('/teams');
        const teamsList = document.getElementById('teamsList');
        teamsList.innerHTML = '';

        if (teams.length === 0) {
            teamsList.innerHTML = '<p>No teams added yet.</p>';
            return;
        }

        teams.forEach(team => {
            const teamCard = document.createElement('div');
            teamCard.className = 'team-card';
            teamCard.innerHTML = `
                <h3>${team.name}</h3>
                <p><strong>Budget:</strong> ₹${team.budget.toLocaleString()}</p>
                <p><strong>Remaining:</strong> ₹${team.remainingBudget.toLocaleString()}</p>
                <p><strong>Players:</strong> ${team.players.length}</p>
            `;
            teamsList.appendChild(teamCard);
        });
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Load players
async function loadPlayers() {
    try {
        const players = await apiRequest('/players');
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';

        if (players.length === 0) {
            playersList.innerHTML = '<p>No players added yet.</p>';
            return;
        }

        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.sold ? 'sold' : ''}`;
            
            if (player.sold) {
                playerCard.innerHTML = `
                    <h3>${player.name}</h3>
                    <div class="player-info">
                        <strong>Role:</strong> ${player.role}
                    </div>
                    <div class="player-info">
                        <strong>Country:</strong> ${player.country}
                    </div>
                    <div class="sold-info">
                        <div class="amount">₹${player.soldPrice.toLocaleString()}</div>
                        <div>Sold to: ${player.soldTo}</div>
                    </div>
                `;
            } else {
                playerCard.innerHTML = `
                    <h3>${player.name}</h3>
                    <div class="player-info">
                        <strong>Role:</strong> ${player.role}
                    </div>
                    <div class="player-info">
                        <strong>Country:</strong> ${player.country}
                    </div>
                    <div class="player-info">
                        <strong>Base Price:</strong> ₹${player.basePrice.toLocaleString()}
                    </div>
                    <div class="current-bid">
                        <div class="amount">₹${player.currentBid.toLocaleString()}</div>
                        ${player.currentBidder ? `<div class="current-bidder">Current Bidder: ${player.currentBidder}</div>` : '<div class="current-bidder">No bids yet</div>'}
                    </div>
                    <button class="btn btn-success" onclick="sellPlayer(${player.id})">Sell Player</button>
                `;
            }
            
            playersList.appendChild(playerCard);
        });
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

// Sell player
async function sellPlayer(playerId) {
    if (!confirm('Are you sure you want to sell this player to the current highest bidder?')) {
        return;
    }

    try {
        await apiRequest(`/admin/players/${playerId}/sell`, {
            method: 'POST'
        });
        loadPlayers();
        loadTeams();
        showSuccess('Player sold successfully!');
    } catch (error) {
        showError(error.message);
    }
}

// Show success message
function showSuccess(message) {
    // Create or update success message
    let successDiv = document.querySelector('.success-message');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        document.querySelector('.container').prepend(successDiv);
    }
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 3000);
}

// Show error message
function showError(message) {
    alert(message); // Simple alert for now
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

