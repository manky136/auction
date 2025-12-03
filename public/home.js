// Home page functionality for simple login/register page

// Tab switching
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.querySelector('.auth-tab:first-child');
    const registerTab = document.querySelector('.auth-tab:last-child');

    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
    } else {
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
    }
}

// Toggle team name field
function toggleTeamName(role) {
    const teamNameGroup = document.getElementById('teamNameGroup');
    if (role === 'user') {
        teamNameGroup.style.display = 'block';
        document.getElementById('regTeamName').required = true;
    } else {
        teamNameGroup.style.display = 'none';
        document.getElementById('regTeamName').required = false;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Hide loader initially
    hideLoader();

    // Check if user is already logged in
    const user = getUser();
    if (user) {
        // Redirect to lobby page
        window.location.href = 'lobby.html';
        return;
    }

    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const user = await login(username, password);
                // Redirect to lobby after successful login
                window.location.href = 'lobby.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Handle register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            const role = document.getElementById('regRole').value;
            const teamName = document.getElementById('regTeamName').value;

            try {
                const user = await register(username, password, role, teamName);
                // Redirect to lobby after successful registration
                window.location.href = 'lobby.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }
});
