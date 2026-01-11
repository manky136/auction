// User dashboard functionality

let selectedPlayerId = null;
let currentAuction = null;

// Initialize user dashboard
async function initUser() {
    if (!checkAuth()) return;

    const user = getUser();
    if (user.role === 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    // Get current auction context
    const auctionData = localStorage.getItem('currentAuction');
    if (!auctionData) {
        window.location.href = 'lobby.html';
        return;
    }
    currentAuction = JSON.parse(auctionData);

    // Display auction info
    const navContainer = document.querySelector('.nav-container h1');
    if (navContainer) {
        navContainer.textContent = `🏏 ${currentAuction.name}`;
    }

    displayUserInfo();

    // Check if user has selected a team
    if (!user.team) {
        await loadTeamSelection();
    } else {
        await loadUserDashboard();
    }

    // Setup bid modal
    setupBidModal();
}

// Load team selection
async function loadTeamSelection() {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`);
        const teamSelectionSection = document.getElementById('teamSelectionSection');
        const teamSelectionList = document.getElementById('teamSelectionList');

        teamSelectionSection.style.display = 'block';
        document.getElementById('userDashboard').style.display = 'none';

        teamSelectionList.innerHTML = '';

        if (teams.length === 0) {
            teamSelectionList.innerHTML = '<p>No teams available. Please contact admin.</p>';
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
            teamCard.addEventListener('click', () => selectTeam(team.name));
            teamSelectionList.appendChild(teamCard);
        });
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Select team
async function selectTeam(teamName) {
    try {
        const data = await apiRequest('/user/team', {
            method: 'PUT',
            body: JSON.stringify({ team: teamName })
        });

        setToken(data.token);
        displayUserInfo();
        await loadUserDashboard();
    } catch (error) {
        alert(error.message);
    }
}

// Load user dashboard
async function loadUserDashboard() {
    const user = getUser();
    if (!user.team) {
        await loadTeamSelection();
        return;
    }

    document.getElementById('teamSelectionSection').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'block';

    await loadMyTeamInfo();
    await loadActivePlayer();
    await loadSoldPlayers();
    await loadAllTeams();
}

// Load my team info
async function loadMyTeamInfo() {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`);
        const myTeam = teams.find(t => t.name === getUser().team);
        const myTeamInfo = document.getElementById('myTeamInfo');

        if (!myTeam) {
            myTeamInfo.innerHTML = '<p>Team information not found.</p>';
            return;
        }

        myTeamInfo.innerHTML = `
            <div class="team-info-item">
                <strong>Team Name:</strong> ${myTeam.name}
            </div>
            <div class="team-info-item">
                <strong>Total Budget:</strong> ₹${myTeam.budget.toLocaleString()}
            </div>
            <div class="team-info-item">
                <strong>Remaining Budget:</strong> ₹${myTeam.remainingBudget.toLocaleString()}
            </div>
            <div class="team-info-item">
                <strong>Players Purchased:</strong> ${myTeam.players.length}
                ${myTeam.players.length > 0 ? `
                    <div class="team-players-list">
                        ${myTeam.players.map(p => `
                            <div class="team-player">
                                ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" class="mini-player-img">` : ''}
                                <div>
                                    <strong>${p.name}</strong><br>
                                    ${p.role} - ₹${p.price.toLocaleString()}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error loading team info:', error);
    }
}

// Load active player (Sequential Flow)
async function loadActivePlayer() {
    try {
        const statusRes = await apiRequest(`/auctions/${currentAuction.id}/status`);
        const activePlayerId = statusRes.currentPlayerId;
        const container = document.getElementById('availablePlayers');

        container.innerHTML = '';

        // Update header if exists
        const header = container.previousElementSibling;
        if (header && header.tagName === 'H2') header.textContent = '🔥 Current Player to Bid';

        if (!activePlayerId) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 3rem; margin-bottom: 20px;">⏳</div>
                    <h3>Waiting for Admin...</h3>
                    <p>The next player will be announced shortly. Please wait.</p>
                </div>
            `;
            return;
        }

        // Fetch active player details
        const player = await apiRequest(`/players/${activePlayerId}`);

        // Also fetch latest bids for this player to show live updates
        const bids = await apiRequest(`/players/${player.id}/bids`);
        const lastBid = bids[0];

        let imageHtml = player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}" class="player-image" style="width: 200px; height: 200px; margin: 0 auto; display: block; border-radius: 50%;">` : '';

        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.style.maxWidth = '600px';
        playerCard.style.margin = '0 auto';
        playerCard.style.textAlign = 'center';

        playerCard.innerHTML = `
            ${imageHtml}
            <h2 style="font-size: 2rem; margin: 10px 0;">${player.name}</h2>
            <div class="player-info" style="justify-content: center;">
                <strong>Role:</strong> ${player.role} | <strong>Country:</strong> ${player.country}
            </div>
            <div class="player-info" style="justify-content: center;">
                <strong>Base Price:</strong> ₹${player.basePrice.toLocaleString()}
            </div>
            
            <div class="current-bid" style="margin: 20px 0; padding: 20px; background: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px;">
                <div style="font-size: 1rem; color: #555;">Current Highest Bid</div>
                <div class="amount" style="font-size: 2.5rem; color: #1565c0;">₹${player.currentBid.toLocaleString()}</div>
                ${player.currentBidder ?
                `<div class="current-bidder" style="font-size: 1.2rem; margin-top: 10px;">Held by: <strong>${player.currentBidder}</strong></div>` :
                '<div class="current-bidder">No bids yet</div>'}
            </div>

            <button class="btn btn-bid" style="font-size: 1.3rem; padding: 15px 40px; width: 100%;" onclick="openBidModal(${player.id})">💰 PLACE BID</button>
        `;

        if (lastBid) {
            // Optional: Add some animation or indication of new bid if we were fancy
        }

        container.appendChild(playerCard);

    } catch (error) {
        console.error('Error loading active player:', error);
        document.getElementById('availablePlayers').innerHTML = '<p>Error loading auction status.</p>';
    }
}

// Load sold players
async function loadSoldPlayers() {
    try {
        const players = await apiRequest(`/players?auctionId=${currentAuction.id}`);
        const soldPlayers = players.filter(p => p.sold);
        const soldPlayersDiv = document.getElementById('soldPlayers');

        soldPlayersDiv.innerHTML = '';

        if (soldPlayers.length === 0) {
            soldPlayersDiv.innerHTML = '<p>No players sold yet.</p>';
            return;
        }

        soldPlayers.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card sold';

            let imageHtml = player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}" class="player-image">` : '';

            playerCard.innerHTML = `
                ${imageHtml}
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
            soldPlayersDiv.appendChild(playerCard);
        });
    } catch (error) {
        console.error('Error loading sold players:', error);
    }
}

// Load all teams (New feature)
async function loadAllTeams() {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`);
        const allTeamsDiv = document.getElementById('allTeamsList');
        if (!allTeamsDiv) return;

        allTeamsDiv.innerHTML = '';

        teams.forEach(team => {
            const teamCard = document.createElement('div');
            teamCard.className = 'team-card compact';
            teamCard.innerHTML = `
                <h4>${team.name}</h4>
                <p>Remaining: ₹${team.remainingBudget.toLocaleString()}</p>
                <p>Players: ${team.players.length}</p>
                ${team.players.length > 0 ? `
                    <div class="team-players-list">
                        ${team.players.map(p => `<small>${p.name} (${p.role})</small>`).join('<br>')}
                    </div>
                ` : ''}
            `;
            allTeamsDiv.appendChild(teamCard);
        });
    } catch (error) {
        console.error('Error loading all teams:', error);
    }
}

// Setup bid modal
function setupBidModal() {
    const modal = document.getElementById('bidModal');
    const closeBtn = document.querySelector('.close');

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    document.getElementById('bidForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseInt(document.getElementById('bidAmount').value);

        try {
            await apiRequest(`/bids`, {
                method: 'POST',
                body: JSON.stringify({
                    playerId: selectedPlayerId,
                    amount: amount,
                    auctionId: currentAuction.id
                })
            });

            modal.style.display = 'none';
            await loadUserDashboard();
            alert('Bid placed successfully!');
        } catch (error) {
            alert(error.message);
        }
    });
}

// Open bid modal
async function openBidModal(playerId) {
    selectedPlayerId = playerId;
    const modal = document.getElementById('bidModal');

    try {
        const player = await apiRequest(`/players/${playerId}`);
        const bids = await apiRequest(`/players/${playerId}/bids`);

        let imageHtml = player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}" class="player-image-modal">` : '';

        document.getElementById('bidPlayerInfo').innerHTML = `
            ${imageHtml}
            <h3>${player.name}</h3>
            <p><strong>Role:</strong> ${player.role}</p>
            <p><strong>Country:</strong> ${player.country}</p>
            <p><strong>Base Price:</strong> ₹${player.basePrice.toLocaleString()}</p>
        `;

        document.getElementById('currentBid').textContent = player.currentBid.toLocaleString();

        // Set default bid to current + 10k, but allow any amount > current
        const defaultBid = player.currentBid + 10000;
        document.getElementById('bidAmount').value = defaultBid;
        document.getElementById('bidAmount').min = player.currentBid + 1;

        // Store current bid for calculation
        document.getElementById('bidAmount').dataset.currentBid = player.currentBid;

        // Display bid history
        const bidHistory = document.getElementById('bidHistory');
        if (bids.length > 0) {
            bidHistory.innerHTML = '<h4>Bid History</h4>' + bids.slice(0, 10).map(bid => `
                <div class="bid-item">
                    <span class="bid-team">${bid.team}</span>
                    <span class="bid-amount">₹${bid.amount.toLocaleString()}</span>
                </div>
            `).join('');
        } else {
            bidHistory.innerHTML = '<p>No bids yet.</p>';
        }

        modal.style.display = 'block';
    } catch (error) {
        alert(error.message);
    }
}

// Refresh dashboard periodically
setInterval(() => {
    const user = getUser();
    if (user && user.team && currentAuction) {
        loadUserDashboard();
    }
}, 10000); // Refresh every 10 seconds

// Increase bid amount
function increaseBid(amount) {
    const bidInput = document.getElementById('bidAmount');
    const currentBid = parseInt(bidInput.dataset.currentBid || 0);
    const currentInput = parseInt(bidInput.value || currentBid);

    // If input is less than current bid, start from current bid
    const baseAmount = currentInput < currentBid ? currentBid : currentInput;

    bidInput.value = baseAmount + amount;
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUser);
} else {
    initUser();
}
