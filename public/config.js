// Configuration file for API endpoint
// Automatically detects environment and sets API URL
(function() {
    // Check if we're on localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '';
    
    // Set API base URL
    if (isLocalhost) {
        // Local development
        window.API_BASE_URL = 'http://localhost:3000/api';
    } else {
        // Production - use same origin (works when frontend and backend are on same domain)
        // This works perfectly when deployed on Render as a single service
        window.API_BASE_URL = '/api';
    }
})();

