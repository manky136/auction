// User dashboard functionality

let selectedPlayerId = null;
let currentAuction = null;
let previousBidAmount = 0;
let lastSoldPlayerId = null;

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
async function loadUserDashboard(silent = false) {
    const user = getUser();
    if (!user.team) {
        await loadTeamSelection();
        return;
    }

    document.getElementById('teamSelectionSection').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'block';

    const options = { showLoader: !silent };

    await Promise.all([
        loadMyTeamInfo(options),
        loadActivePlayer(options),
        loadSoldPlayers(options),
        loadAllTeams(options)
    ]);
}

// Load my team info
async function loadMyTeamInfo(options = {}) {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`, options);
        const myTeam = teams.find(t => t.name === getUser().team);
        const myTeamInfo = document.getElementById('myTeamInfo');

        if (!myTeam) {
            myTeamInfo.innerHTML = '<p>Team information not found.</p>';
            return;
        }

        // Squad Composition Stats
        const stats = {
            Batsman: myTeam.players.filter(p => p.role === 'Batsman').length,
            Bowler: myTeam.players.filter(p => p.role === 'Bowler').length,
            'All-rounder': myTeam.players.filter(p => p.role === 'All-rounder').length,
            'Wicket-keeper': myTeam.players.filter(p => p.role === 'Wicket-keeper').length
        };
        const total = myTeam.players.length || 1; // avoid divide by zero

        const statsHtml = `
            <div class="squad-stats-container">
                <div class="stat-row">
                    <div class="stat-label"><span>Batsmen</span> <span>${stats.Batsman}</span></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill fill-batsman" style="width: ${(stats.Batsman / total) * 100}%"></div></div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><span>Bowlers</span> <span>${stats.Bowler}</span></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill fill-bowler" style="width: ${(stats.Bowler / total) * 100}%"></div></div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><span>All-rounders</span> <span>${stats['All-rounder']}</span></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill fill-allrounder" style="width: ${(stats['All-rounder'] / total) * 100}%"></div></div>
                </div>
                 <div class="stat-row">
                    <div class="stat-label"><span>Wicket-keepers</span> <span>${stats['Wicket-keeper']}</span></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill fill-wicketkeeper" style="width: ${(stats['Wicket-keeper'] / total) * 100}%"></div></div>
                </div>
            </div>
        `;

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
            
            ${statsHtml}

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
async function loadActivePlayer(options = {}) {
    try {
        const statusRes = await apiRequest(`/auctions/${currentAuction.id}/status`, options);
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
        const player = await apiRequest(`/players/${activePlayerId}`, options);
        const bids = await apiRequest(`/players/${player.id}/bids`, options);
        const lastBid = bids[0];

        // RENDER ACTIVE PLAYER CARD
        let imageHtml = player.imageUrl || 'https://via.placeholder.com/300';

        // Check for pulse
        if (player.currentBid > previousBidAmount) {
            triggerBidPulse();
        }
        previousBidAmount = player.currentBid;

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
                    <div class="live-bid-amount ${player.id === selectedPlayerId ? 'bid-pulse' : ''}">₹${player.currentBid.toLocaleString()}</div>
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
async function loadSoldPlayers(options = {}) {
    try {
        const players = await apiRequest(`/players?auctionId=${currentAuction.id}`, options);
        const soldPlayers = players.filter(p => p.sold);
        const soldPlayersDiv = document.getElementById('soldPlayers');

        // --- 1. Top Buys Logic ---
        const topBuys = [...soldPlayers].sort((a, b) => b.soldPrice - a.soldPrice).slice(0, 5);
        const topBuysWidget = document.getElementById('topBuysWidget');
        const topBuysList = document.getElementById('topBuysList');

        if (topBuys.length > 0) {
            topBuysWidget.style.display = 'block';
            topBuysList.innerHTML = topBuys.map((p, index) => `
                <div class="top-buy-item">
                    <div class="top-buy-rank">#${index + 1}</div>
                    <div class="top-buy-info">
                        <div class="top-buy-name">${p.name}</div>
                        <div class="top-buy-team">${p.soldTo}</div>
                    </div>
                    <div class="top-buy-price">₹${(p.soldPrice / 10000000).toFixed(2)}Cr</div>
                </div>
            `).join('');
        }

        // --- 2. Celebration Logic ---
        // Find the most recently sold player (by ID usually, assuming sequential)
        // Or if we check difference from last fetch. simpler: check if last item in soldPlayers differs from state
        if (soldPlayers.length > 0) {
            const latestSold = soldPlayers[soldPlayers.length - 1]; // Assuming time order
            // Check if this player was just sold (not seen before in this session)
            if (lastSoldPlayerId && latestSold.id !== lastSoldPlayerId) {
                // New sale detected!
                triggerCelebration(latestSold.name, latestSold.soldTo, latestSold.soldPrice);
            }
            lastSoldPlayerId = latestSold.id;
        }

        soldPlayersDiv.innerHTML = '';

        if (soldPlayers.length === 0) {
            soldPlayersDiv.innerHTML = '<p class="text-muted">No players sold yet.</p>';
            return;
        }

        // Show recent sales reversed (newest first)
        [...soldPlayers].reverse().slice(0, 10).forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'glass-card compact-team-card'; // Reusing compact card
            playerCard.style.marginBottom = '10px';
            playerCard.style.padding = '10px';

            playerCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                   <div>
                       <strong style="color: white;">${player.name}</strong>
                       <div style="font-size: 0.8rem; color: #94a3b8;">${player.role}</div>
                   </div>
                   <div style="text-align: right;">
                       <div style="color: #10b981; font-weight: bold;">₹${player.soldPrice.toLocaleString()}</div>
                       <div style="font-size: 0.8rem; color: #fbbf24;">${player.soldTo}</div>
                   </div>
                </div>
            `;
            soldPlayersDiv.appendChild(playerCard);
        });
    } catch (error) {
        console.error('Error loading sold players:', error);
    }
}

// Load all teams (New feature)
async function loadAllTeams(options = {}) {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`, options);
        const allTeamsDiv = document.getElementById('allTeamsList');
        if (!allTeamsDiv) return;

        allTeamsDiv.innerHTML = '';

        teams.forEach(team => {
            const teamCard = document.createElement('div');
            // Use glass card style
            teamCard.className = 'glass-card compact';
            teamCard.style.padding = '20px';

            teamCard.innerHTML = `
                <h4 style="color: white; font-size: 1.2rem; margin-bottom: 8px;">${team.name}</h4>
                <div style="font-size: 0.9rem; color: #cbd5e1; margin-bottom: 10px;">
                    <p>Remaining: <span style="color: #10b981; font-weight: bold;">₹${team.remainingBudget.toLocaleString()}</span></p>
                    <p>Players: ${team.players.length}</p>
                </div>
                ${team.players.length > 0 ? `
                    <div class="team-players-list" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); max-height: 100px; overflow-y: auto;">
                        ${team.players.map(p => `
                            <div style="font-size: 0.8rem; color: #94a3b8; display: flex; justify-content: space-between;">
                                <span>${p.name}</span>
                                <span style="color: #64748b;">${p.role.substring(0, 3)}</span>
                            </div>
                        `).join('')}
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
        loadUserDashboard(true); // silent = true
    }
}, 5000); // Increased refresh rate for better responsiveness (5s)

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

// --- Dynamic Feature Logic ---
function triggerBidPulse() {
    const amountEl = document.querySelector('.live-bid-amount');
    if (amountEl) {
        amountEl.classList.remove('bid-pulse');
        void amountEl.offsetWidth; // Trigger reflow
        amountEl.classList.add('bid-pulse');
    }
}

function triggerCelebration(player, team, price) {
    const overlay = document.getElementById('celebrationOverlay');
    const message = document.getElementById('celebrationMessage');
    const details = document.getElementById('celebrationDetails');

    if (!overlay || !message) return;

    details.innerHTML = `<strong style='color: white;'>${player}</strong> sold to <strong style='color: #fbbf24;'>${team}</strong><br>for <span style='color: #10b981;'>₹${price.toLocaleString()}</span>`;

    overlay.style.display = 'block';
    setTimeout(() => message.classList.add('show'), 100);

    // Create confetti
    for (let i = 0; i < 50; i++) {
        createConfetti(overlay);
    }

    // Hide after 5 seconds
    setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.innerHTML = '<div id="celebrationMessage" class="celebration-message"><h2 style="font-size: 3rem; margin: 0; text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);">SOLD!</h2><div id="celebrationDetails" style="font-size: 1.5rem; margin-top: 10px; color: #cbd5e1;"></div></div>';
        }, 500);
    }, 5000);
}

function createConfetti(container) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'][Math.floor(Math.random() * 6)];
    confetti.style.animationDuration = (Math.random() * 2 + 3) + 's';
    container.appendChild(confetti);
}
