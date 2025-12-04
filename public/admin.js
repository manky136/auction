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
        const players = await apiRequest(`/players?auctionId=${currentAuction.id}`);
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';

        if (players.length === 0) {
            playersList.innerHTML = '<p>No players added yet.</p>';
            return;
        }

        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.sold ? 'sold' : ''}`;

            let imageHtml = player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}" class="player-image">` : '';

            if (player.sold) {
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
            } else {
                playerCard.innerHTML = `
                    ${imageHtml}
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
                    <div class="player-actions">
                        <button class="btn btn-edit" onclick="editPlayer(${player.id})">Edit</button>
                        <button class="btn btn-danger" onclick="removePlayer(${player.id})">Remove</button>
                        <button class="btn btn-success" onclick="sellPlayer(${player.id})">Sell Player</button>
                    </div>
                `;
            }

            playersList.appendChild(playerCard);
        });
    } catch (error) {
        console.error('Error loading players:', error);
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
        item.innerHTML = `
            <input type="checkbox" class="player-select" value="${player.name}" data-player='${JSON.stringify(player).replace(/'/g, "&apos;")}'>
            <div class="library-player-info">
                ${player.imageUrl ? `<img src="${player.imageUrl}" class="mini-player-img">` : ''}
                <div>
                    <strong>${player.name}</strong><br>
                    <small>${player.role} - ${player.country}</small>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
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

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
