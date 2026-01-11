// Admin dashboard functionality

let currentAuction = null;

// Initialize admin dashboard
async function initAdmin() {
    if (!checkAuth()) return;

    const user = getUser();
    if (user.role !== 'admin') {
        alert('Access denied. Admin only.');
        window.location.href = 'lobby.html';
        return;
    }

    // Get current auction context
    const auctionData = localStorage.getItem('currentAuction');
    if (!auctionData) {
        window.location.href = 'lobby.html';
        return;
    }
    currentAuction = JSON.parse(auctionData);
    document.getElementById('auctionTitle').textContent = `🏏 ${currentAuction.name} (Code: ${currentAuction.code})`;

    displayUserInfo();
    loadTeams();
    loadPlayers();

    // Add team form
    document.getElementById('addTeamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const teamData = {
            name: formData.get('name'),
            budget: parseInt(formData.get('budget')),
            auctionId: currentAuction.id
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
            country: formData.get('country'),
            imageUrl: formData.get('imageUrl'),
            auctionId: currentAuction.id
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

    // Edit player form
    document.getElementById('editPlayerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerId = document.getElementById('editPlayerId').value;
        const formData = new FormData(e.target);
        const playerData = {
            name: formData.get('name'),
            role: formData.get('role'),
            basePrice: parseInt(formData.get('basePrice')),
            country: formData.get('country'),
            imageUrl: formData.get('imageUrl')
        };

        try {
            await apiRequest(`/admin/players/${playerId}`, {
                method: 'PUT',
                body: JSON.stringify(playerData)
            });
            closeEditModal();
            loadPlayers();
            showSuccess('Player updated successfully!');
        } catch (error) {
            showError(error.message);
        }
    });

    // Edit team form
    document.getElementById('editTeamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const teamId = document.getElementById('editTeamId').value;
        const formData = new FormData(e.target);
        const teamData = {
            name: formData.get('name'),
            budget: parseInt(formData.get('budget'))
        };

        try {
            await apiRequest(`/admin/teams/${teamId}`, {
                method: 'PUT',
                body: JSON.stringify(teamData)
            });
            closeEditTeamModal();
            loadTeams();
            showSuccess('Team updated successfully!');
        } catch (error) {
            showError(error.message);
        }
    });
}

// Load teams
async function loadTeams() {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`);
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
                <div class="player-actions">
                    <button class="btn btn-edit" onclick="editTeam(${team.id})">Edit</button>
                    <button class="btn btn-danger" onclick="removeTeam(${team.id})">Remove</button>
                </div>
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
        // Fetch status first to know active player and players list
        const [statusRes, players] = await Promise.all([
            apiRequest(`/auctions/${currentAuction.id}/status`),
            apiRequest(`/players?auctionId=${currentAuction.id}`)
        ]);

        const playersList = document.getElementById('playersList');
        const activePlayerCard = document.getElementById('activePlayerCard');
        const activePlayerSection = document.getElementById('activePlayerSection');

        playersList.innerHTML = '';
        activePlayerCard.innerHTML = '';

        if (players.length === 0) {
            playersList.innerHTML = '<p>No players added yet.</p>';
            activePlayerSection.style.display = 'none';
            return;
        }

        const activePlayerId = statusRes.currentPlayerId;
        let hasActive = false;

        players.forEach(player => {
            // If this is the active player, show in separate section
            if (activePlayerId && player.id === activePlayerId && !player.sold) {
                hasActive = true;
                activePlayerSection.style.display = 'block';

                let imageHtml = player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}" class="player-image" style="width: 150px; height: 150px;">` : '';

                activePlayerCard.innerHTML = `
                    <div style="display: flex; gap: 20px; align-items: center;">
                        ${imageHtml}
                        <div style="flex: 1;">
                            <h2 style="margin: 0; color: #3b82f6;">${player.name}</h2>
                            <p style="font-size: 1.1rem; color: #555;">${player.role} | ${player.country}</p>
                            <div class="current-bid" style="margin-top: 15px; padding: 15px; background: #eeffee; border: 2px solid #4caf50;">
                                <div style="font-size: 0.9rem; color: #666;">Current Bid</div>
                                <div class="amount" style="font-size: 2rem;">₹${player.currentBid.toLocaleString()}</div>
                                ${player.currentBidder ? `<div class="current-bidder" style="font-size: 1.2rem; font-weight: bold; color: #2e7d32;">🏆 ${player.currentBidder}</div>` : '<div class="current-bidder">No bids yet</div>'}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button class="btn btn-success" style="font-size: 1.2rem; padding: 10px 20px;" onclick="sellPlayer(${player.id})">🔨 SELL NOW</button>
                        </div>
                    </div>
                `;
                return; // Don't add to main list
            }

            // Normal list rendering
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.sold ? 'sold' : ''}`;

            let imageHtml = player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}" class="player-image">` : '';

            if (player.sold) {
                playerCard.innerHTML = `
                    ${imageHtml}
                    <h3>${player.name}</h3>
                    <div class="player-info"><strong>Role:</strong> ${player.role}</div>
                    <div class="sold-info">
                        <div class="amount">₹${player.soldPrice.toLocaleString()}</div>
                        <div>Sold to: ${player.soldTo}</div>
                    </div>
                `;
            } else {
                // Unsold player
                playerCard.innerHTML = `
                    ${imageHtml}
                    <h3>${player.name}</h3>
                    <div class="player-info">
                        <strong>Role:</strong> ${player.role}<br>
                        <strong>Base:</strong> ₹${player.basePrice.toLocaleString()}
                    </div>
                    <div class="player-actions">
                        <button class="btn btn-primary" onclick="startBidding(${player.id})">📢 Start Bidding</button>
                        <button class="btn btn-edit" onclick="editPlayer(${player.id})">Edit</button>
                        <button class="btn btn-danger" onclick="removePlayer(${player.id})">Remove</button>
                    </div>
                `;
            }

            playersList.appendChild(playerCard);
        });

        if (!hasActive) {
            activePlayerSection.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading players:', error);
    }
}

// Start Bidding
async function startBidding(playerId) {
    try {
        await apiRequest(`/admin/auctions/${currentAuction.id}/current-player`, {
            method: 'POST',
            body: JSON.stringify({ playerId })
        });
        loadPlayers();
        showSuccess('Bidding started for player!');
    } catch (error) {
        showError(error.message);
    }
}

// Stop Bidding
async function stopBidding() {
    try {
        await apiRequest(`/admin/auctions/${currentAuction.id}/current-player`, {
            method: 'POST',
            body: JSON.stringify({ playerId: null })
        });
        loadPlayers();
        showSuccess('Bidding stopped.');
    } catch (error) {
        showError(error.message);
    }
}

// Restart Auction
async function restartAuction() {
    if (!confirm('WARNING: This will reset all bids, team budgets, and player statuses for THIS auction. This cannot be undone. Are you sure?')) {
        return;
    }

    try {
        await apiRequest(`/auctions/${currentAuction.id}/restart`, {
            method: 'POST'
        });
        loadTeams();
        loadPlayers();
        showSuccess('Auction restarted successfully!');
    } catch (error) {
        showError(error.message);
    }
}

// Export Auction Data
async function exportAuctionData() {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`);
        const players = await apiRequest(`/players?auctionId=${currentAuction.id}`);

        const exportData = {
            auction: currentAuction,
            teams: teams,
            players: players,
            exportedAt: new Date().toISOString()
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `auction_data_${currentAuction.code}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (error) {
        alert('Failed to export data: ' + error.message);
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

// Edit player
async function editPlayer(playerId) {
    try {
        const player = await apiRequest(`/players/${playerId}`);

        // Populate form
        document.getElementById('editPlayerId').value = player.id;
        document.getElementById('editPlayerName').value = player.name;
        document.getElementById('editPlayerRole').value = player.role;
        document.getElementById('editBasePrice').value = player.basePrice;
        document.getElementById('editCountry').value = player.country;
        document.getElementById('editPlayerImage').value = player.imageUrl || '';

        // Show modal
        document.getElementById('editPlayerModal').style.display = 'flex';
    } catch (error) {
        showError(error.message);
    }
}

// Remove player
async function removePlayer(playerId) {
    if (!confirm('Are you sure you want to remove this player from the auction?')) {
        return;
    }

    try {
        await apiRequest(`/admin/players/${playerId}`, {
            method: 'DELETE'
        });
        loadPlayers();
        showSuccess('Player removed successfully!');
    } catch (error) {
        showError(error.message);
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editPlayerModal').style.display = 'none';
}

// Edit team
async function editTeam(teamId) {
    try {
        const teams = await apiRequest(`/teams?auctionId=${currentAuction.id}`);
        const team = teams.find(t => t.id === teamId);

        if (!team) {
            showError('Team not found');
            return;
        }

        // Populate form
        document.getElementById('editTeamId').value = team.id;
        document.getElementById('editTeamName').value = team.name;
        document.getElementById('editTeamBudget').value = team.budget;

        // Show modal
        document.getElementById('editTeamModal').style.display = 'flex';
    } catch (error) {
        showError(error.message);
    }
}

// Remove team
async function removeTeam(teamId) {
    if (!confirm('Are you sure you want to remove this team?')) {
        return;
    }

    try {
        await apiRequest(`/admin/teams/${teamId}`, {
            method: 'DELETE'
        });
        loadTeams();
        showSuccess('Team removed successfully!');
    } catch (error) {
        showError(error.message);
    }
}

// Close edit team modal
function closeEditTeamModal() {
    document.getElementById('editTeamModal').style.display = 'none';
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

// --- Player Library Functions ---

let libraryPlayers = [];

async function openImportModal() {
    try {
        const players = await apiRequest('/admin/library/players');
        libraryPlayers = players;
        renderLibrary(players);
        document.getElementById('importPlayersModal').style.display = 'flex';
    } catch (error) {
        showError('Failed to load library: ' + error.message);
    }
}

function closeImportModal() {
    document.getElementById('importPlayersModal').style.display = 'none';
}

function renderLibrary(players) {
    const list = document.getElementById('libraryList');
    list.innerHTML = '';

    if (players.length === 0) {
        list.innerHTML = '<p>No players in library yet.</p>';
        return;
    }

    players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="player-select" value="${player.name}" data-player='${JSON.stringify(player).replace(/'/g, "&apos;")}'>
                <div class="library-player-info" style="display: flex; align-items: center; gap: 10px;">
                    ${player.imageUrl ? `<img src="${player.imageUrl}" class="mini-player-img" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : ''}
                    <div>
                        <strong>${player.name}</strong><br>
                        <small>${player.role} - ${player.country}</small>
                    </div>
                </div>
            </div>
            <button onclick="deleteLibraryPlayer(${player.id})" class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;">🗑️</button>
        `;
        list.appendChild(item);
    });
}

async function deleteLibraryPlayer(id) {
    if (!confirm('Are you sure you want to remove this player from the library?')) return;

    try {
        await apiRequest(`/admin/library/players/${id}`, { method: 'DELETE' });

        // Refresh library
        const players = await apiRequest('/admin/library/players');
        libraryPlayers = players;
        renderLibrary(players);
        filterLibrary(); // Re-apply filter if active
        showSuccess('Player removed from library');
    } catch (error) {
        showError('Failed to delete: ' + error.message);
    }
}

function filterLibrary() {
    const query = document.getElementById('librarySearch').value.toLowerCase();
    const filtered = libraryPlayers.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query) ||
        p.country.toLowerCase().includes(query)
    );
    renderLibrary(filtered);
}

async function importSelectedPlayers() {
    const checkboxes = document.querySelectorAll('.player-select:checked');
    const selectedPlayers = Array.from(checkboxes).map(cb => JSON.parse(cb.dataset.player));

    if (selectedPlayers.length === 0) {
        alert('Please select players to import');
        return;
    }

    try {
        const response = await apiRequest('/admin/players/bulk', {
            method: 'POST',
            body: JSON.stringify({
                players: selectedPlayers,
                auctionId: currentAuction.id
            })
        });

        showSuccess(`Successfully imported ${response.count} players!`);
        closeImportModal();
        loadPlayers();
    } catch (error) {
        showError('Import failed: ' + error.message);
    }
}

// --- Add to Library Functions ---

function openAddToLibraryModal() {
    document.getElementById('addToLibraryModal').style.display = 'flex';
}

function closeAddToLibraryModal() {
    document.getElementById('addToLibraryModal').style.display = 'none';
    document.getElementById('addToLibraryForm').reset();
}

document.getElementById('addToLibraryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const playerData = {
        name: formData.get('name'),
        role: formData.get('role'),
        basePrice: parseInt(formData.get('basePrice')),
        country: formData.get('country'),
        imageUrl: formData.get('imageUrl')
    };

    try {
        await apiRequest('/admin/library/players', {
            method: 'POST',
            body: JSON.stringify(playerData)
        });

        showSuccess('Player added to library successfully!');
        closeAddToLibraryModal();

        // Refresh library list
        const players = await apiRequest('/admin/library/players');
        libraryPlayers = players;
        renderLibrary(players);

        // Re-apply filter if any
        filterLibrary();
    } catch (error) {
        showError('Failed to add player to library: ' + error.message);
    }
});

async function saveToLibrary(playerId) {
    try {
        // Get player details
        const player = await apiRequest(`/players/${playerId}`);

        // Add to library
        await apiRequest('/admin/library/players', {
            method: 'POST',
            body: JSON.stringify({
                name: player.name,
                role: player.role,
                basePrice: player.basePrice,
                country: player.country,
                imageUrl: player.imageUrl
            })
        });

        showSuccess('Player saved to library!');
    } catch (error) {
        showError('Failed to save to library: ' + error.message);
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
