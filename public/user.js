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
            teamSelectionList.innerHTML = '<p style="color: #cbd5e1;">No teams available. Please contact admin.</p>';
            return;
        }

        teams.forEach(team => {
            const teamCard = document.createElement('div');
            // Use glass card for team selection items too, or just a nice hoverable div
            teamCard.className = 'team-card';
            teamCard.style.background = 'rgba(255,255,255,0.05)';
            teamCard.style.border = '1px solid rgba(255,255,255,0.1)';
            teamCard.style.color = 'white';

            teamCard.innerHTML = `
                <h3 style="color:white; font-size: 1.5rem; margin-bottom: 10px;">${team.name}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left;">
                    <p style="color: #94a3b8;">Budget: <br><span style="color:white; font-weight:bold;">₹${team.budget.toLocaleString()}</span></p>
                    <p style="color: #94a3b8;">Remaining: <br><span style="color: #10b981; font-weight:bold;">₹${team.remainingBudget.toLocaleString()}</span></p>
                </div>
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
            <div style="margin-bottom: 20px;">
                <div style="font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Remaining Purse</div>
                <div style="font-size: 2.5rem; font-weight: 800; color: #10b981; text-shadow: 0 0 20px rgba(16, 185, 129, 0.3);">₹${myTeam.remainingBudget.toLocaleString()}</div>
            </div>
            
            <div style="display: grid; gap: 10px;">
                <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span style="color: #cbd5e1;">Total Budget</span>
                    <span style="font-weight: bold; color: white;">₹${myTeam.budget.toLocaleString()}</span>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; display: flex; justify-content: space-between;">
                    <span style="color: #cbd5e1;">Squad Size</span>
                    <span style="font-weight: bold; color: white;">${myTeam.players.length}/25</span>
                </div>
            </div>

            ${myTeam.players.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h4 style="color: #94a3b8; margin-bottom: 10px;">Squad</h4>
                    <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
                        ${myTeam.players.map(p => `
                            <div style="min-width: 60px; text-align: center;">
                                ${p.imageUrl ? `<img src="${p.imageUrl}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #555; object-fit: cover;">` : '<div style="width: 50px; height: 50px; border-radius: 50%; background: #333; margin: 0 auto;"></div>'}
                                <div style="font-size: 0.7rem; color: #cbd5e1; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px;">${p.name.split(' ')[0]}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
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

        // Clear header from previous style if exists, or just clear container
        container.innerHTML = '';

        // Hide/Show Waiting Screen vs Player
        if (!activePlayerId) {
            container.innerHTML = `
                <div class="glass-card wait-screen">
                    <div class="radar-spinner"></div>
                    <h2 style="font-size: 2rem; margin-bottom: 10px; color: white;">Auction Paused</h2>
                    <p style="font-size: 1.2rem; color: #94a3b8;">Waiting for the Auctioneer to announce the next player...</p>
                    <div style="margin-top: 30px; font-size: 0.9rem; color: #64748b;">LIVE FEED • WAITING SIGNAL</div>
                </div>
            `;
            return;
        }

        // Fetch active player details
        const player = await apiRequest(`/players/${activePlayerId}`);
        const bids = await apiRequest(`/players/${player.id}/bids`);
        const lastBid = bids[0];

        // RENDER ACTIVE PLAYER CARD
        let imageHtml = player.imageUrl || 'https://via.placeholder.com/300';

        const card = document.createElement('div');
        card.className = 'glass-card hero-active-player';

        card.innerHTML = `
            <div class="hero-player-img-container">
                <img src="${imageHtml}" alt="${player.name}" class="hero-player-img">
            </div>
            
            <div class="hero-player-info">
                <div style="margin-bottom: 5px;">
                    <span class="hero-stat-badge" style="background: #e11d48; border-color: #e11d48; color: white;">LIVE AUCTION</span>
                    <span class="hero-stat-badge">${player.auctionId ? '#' + player.auctionId : '#001'}</span>
                </div>
                
                <h1>${player.name}</h1>
                
                <div class="hero-details-grid">
                    <div class="hero-stat-badge">🏏 ${player.role}</div>
                    <div class="hero-stat-badge">🌍 ${player.country}</div>
                    <div class="hero-stat-badge">💰 Base: ₹${player.basePrice.toLocaleString()}</div>
                </div>

                <div class="live-bid-container">
                    <div class="live-bid-label">Current Highest Bid</div>
                    <div class="live-bid-amount">₹${player.currentBid.toLocaleString()}</div>
                    <div class="bid-holder">
                        ${player.currentBidder ?
                `Held by <span style="color: #fbbf24; font-weight: bold;">${player.currentBidder}</span>` :
                '<span style="opacity: 0.5;">No Bids Yet</span>'}
                    </div>
                </div>
                
                <button onclick="openBidModal(${player.id})" class="btn-mega-bid">
                    💰 Place Bid
                </button>
            </div>
        `;

        container.appendChild(card);

    } catch (error) {
        console.error('Error loading active player:', error);
        document.getElementById('availablePlayers').innerHTML = '<p class="glass-card" style="padding: 20px; color: red;">Error connection to auction server.</p>';
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
