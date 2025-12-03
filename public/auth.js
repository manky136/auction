const API_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_URL : 'http://localhost:3000/api';

// Login
async function login(username, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Login failed');
    }

    setToken(data.token);
    setUser(data.user);
    return data.user;
}

// Register
async function register(username, password, role, teamName) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, teamName })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
    }

    setToken(data.token);
    setUser(data.user);
    return data.user;
}

// Token Management
function setToken(token) {
    localStorage.setItem('token', token);
}

function getToken() {
    return localStorage.getItem('token');
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Display User Info
function displayUserInfo() {
    const user = getUser();
    if (user) {
        const usernameDisplay = document.getElementById('adminUsername') || document.getElementById('userUsername');
        if (usernameDisplay) {
            usernameDisplay.textContent = `Welcome, ${user.username}`;
        }

        const teamDisplay = document.getElementById('userTeam');
        if (teamDisplay && user.team) {
            teamDisplay.textContent = user.team;
        }
    }
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    showLoader();
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                logout();
            }
            throw new Error(data.error || 'Something went wrong');
        }

        return data;
    } catch (error) {
        throw error;
    } finally {
        hideLoader();
    }
}

// Loader Functions
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentAuction');
    window.location.href = 'index.html';
}

// Check if user is logged in
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}
