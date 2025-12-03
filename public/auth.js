// Authentication and token management
// Use environment variable or fallback to localhost for development
const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api';

// Token management
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
}

function getUser() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch (e) {
        return null;
    }
}

// API request helper
async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

// Login functionality
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const data = await apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            setToken(data.token);
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'user.html';
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
}

// Register functionality
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('regErrorMessage');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');

        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const roleSelect = document.getElementById('userRole');
        const role = roleSelect ? roleSelect.value : 'bidder';

        if (!role) {
            errorDiv.textContent = 'Please select a role (Administrator or Bidder)';
            errorDiv.classList.add('show');
            return;
        }

        try {
            const data = await apiRequest('/register', {
                method: 'POST',
                body: JSON.stringify({ username, password, role })
            });

            setToken(data.token);
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'user.html';
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        }
    });
}

// Toggle between login and register
if (document.getElementById('registerLink')) {
    document.getElementById('registerLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-card').style.display = 'none';
        document.querySelector('.register-card').style.display = 'block';
    });
}

if (document.getElementById('loginLink')) {
    document.getElementById('loginLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.register-card').style.display = 'none';
        document.querySelector('.login-card').style.display = 'block';
    });
}

// Logout functionality
function logout() {
    removeToken();
    window.location.href = 'index.html';
}

// Check authentication on protected pages
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Display user info
function displayUserInfo() {
    const user = getUser();
    if (!user) return;

    if (document.getElementById('adminUsername')) {
        document.getElementById('adminUsername').textContent = `Welcome, ${user.username}`;
    }

    if (document.getElementById('userUsername')) {
        document.getElementById('userUsername').textContent = `Welcome, ${user.username}`;
    }

    if (document.getElementById('userTeam') && user.team) {
        document.getElementById('userTeam').textContent = `Team: ${user.team}`;
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            checkAuth();
            displayUserInfo();
        }
    });
} else {
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        checkAuth();
        displayUserInfo();
    }
}

