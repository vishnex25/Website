// Configuration for the contact form system
const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 3001,
        host: process.env.HOST || 'localhost'
    },
    
    // Email configuration
    email: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        adminEmail: process.env.ADMIN_EMAIL,
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpSecure: process.env.SMTP_SECURE === 'true'
    },
    
    // Security configuration
    security: {
        allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
        rateLimitWindow: 15 * 60 * 1000, // 15 minutes
        rateLimitMaxRequests: 3
    },
    
    // Frontend configuration (for client-side)
    frontend: {
        getBackendUrl: () => {
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    return `http://localhost:${config.server.port}`;
                }
            }
            return '';
        }
    }
};

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ContactFormConfig = config;
}
