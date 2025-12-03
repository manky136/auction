// Home page functionality - Modal management

// Check if user is already logged in
function checkLoggedIn() {
    const user = getUser();
    if (user) {
        // Redirect to appropriate dashboard
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'user.html';
        }
    }
}

// Show login modal
function showLoginModal() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'block';
}

// Show register modal
function showRegisterModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'block';
}

// Close modals
function closeModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Navbar buttons
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    
    // Hero buttons
    const heroSignInBtn = document.getElementById('heroSignInBtn');
    const heroSignUpBtn = document.getElementById('heroSignUpBtn');
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    
    // Register/Login toggle links
    const registerLink = document.getElementById('registerLink');
    const loginLink = document.getElementById('loginLink');
    
    // Navbar buttons
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', showLoginModal);
    }
    
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', showRegisterModal);
    }
    
    // Hero buttons
    if (heroSignInBtn) {
        heroSignInBtn.addEventListener('click', showLoginModal);
    }
    
    if (heroSignUpBtn) {
        heroSignUpBtn.addEventListener('click', showRegisterModal);
    }
    
    // Close buttons
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Toggle links
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterModal();
        });
    }
    
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        
        if (e.target === loginModal) {
            closeModals();
        }
        if (e.target === registerModal) {
            closeModals();
        }
    });
    
    // Add home-page class to body
    document.body.classList.add('home-page');
    
    // Check if user is already logged in
    checkLoggedIn();
});

