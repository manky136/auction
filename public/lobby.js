// Lobby functionality

async function initLobby() {
    if (!checkAuth()) return;

    const user = getUser();
    document.getElementById('usernameDisplay').textContent = user.username;

    if (user.role === 'admin') {
        document.getElementById('adminSection').style.display = 'block';
        loadMyAuctions();
    } else {
        document.getElementById('userSection').style.display = 'block';
    }

    hideLoader();

    // Create Auction (Admin)
    const createForm = document.getElementById('createAuctionForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('auctionName').value;

            try {
                const auction = await apiRequest('/auctions', {
                    method: 'POST',
                    body: JSON.stringify({ name })
                });

                loadMyAuctions();
                document.getElementById('auctionName').value = '';
                alert(`Auction created! Code: ${auction.code}`);
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Join Auction (Bidder)
    const joinForm = document.getElementById('joinAuctionForm');
    if (joinForm) {
        joinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('auctionCode').value;

            try {
                const auction = await apiRequest('/auctions/join', {
                    method: 'POST',
                    body: JSON.stringify({ code })
                });

                // Store auction context
                localStorage.setItem('currentAuction', JSON.stringify(auction));
                window.location.href = 'user.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }
}

async function loadMyAuctions() {
    try {
        const auctions = await apiRequest('/admin/auctions');
        const list = document.getElementById('adminAuctionsList');
        list.innerHTML = '';

        if (auctions.length === 0) {
            list.innerHTML = '<p>No auctions created yet.</p>';
            return;
        }

        auctions.forEach(auction => {
            const card = document.createElement('div');
            card.className = 'team-card'; // Reusing team-card style
            card.innerHTML = `
                <h3>${auction.name}</h3>
                <div class="auction-code" style="background: #f0f0f0; padding: 5px; border-radius: 4px; text-align: center; margin: 10px 0; font-family: monospace; font-size: 1.2rem; font-weight: bold;">
                    ${auction.code}
                </div>
                <p>Status: <span class="badge ${auction.status === 'active' ? 'badge-success' : 'badge-secondary'}">${auction.status}</span></p>
                <button class="btn btn-primary" onclick="enterAuction(${auction.id}, '${auction.code}', '${auction.name}')">Enter Dashboard</button>
            `;
            list.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading auctions:', error);
    }
}

function enterAuction(id, code, name) {
    const auction = { id, code, name };
    localStorage.setItem('currentAuction', JSON.stringify(auction));
    window.location.href = 'admin.html';
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLobby);
} else {
    initLobby();
}
