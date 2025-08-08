#!/usr/bin/env node
/**
 * Simple HTTP server for local testing of the contact form.
 * This solves CORS issues when testing locally.
 * 
 * Usage:
 *   node local-server.js
 * 
 * Then open: http://localhost:8000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = 8000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

function serveFile(res, filePath) {
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
}

function handleFormSubmission(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        console.log('\n' + '='.repeat(50));
        console.log('📧 CONTACT FORM SUBMISSION RECEIVED');
        console.log('='.repeat(50));
        
        try {
            // Parse form data
            const formData = querystring.parse(body);
            
            Object.keys(formData).forEach(key => {
                if (key !== 'bot-field') { // Skip honeypot field
                    console.log(`${key}: ${formData[key]}`);
                }
            });
            
        } catch (error) {
            console.log('Error parsing form data:', error);
            console.log('Raw data:', body);
        }
        
        console.log('='.repeat(50));
        console.log('✅ Form submission simulated successfully!');
        console.log('In production, this would be handled by Netlify Forms');
        console.log('='.repeat(50) + '\n');
        
        // Send success response
        const successHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Form Submitted</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: green; font-size: 24px; margin-bottom: 20px; }
                .info { color: #666; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="success">✅ Form Submitted Successfully!</div>
            <div class="info">This is a local testing simulation.</div>
            <div class="info">In production, Netlify Forms will handle this.</div>
            <div class="info">Check your terminal for the submitted data.</div>
            <br>
            <a href="/">← Back to Contact Form</a>
        </body>
        </html>
        `;
        
        res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(successHtml);
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }
    
    // Handle form submission
    if (req.method === 'POST' && (pathname === '/' || pathname === '/index.html')) {
        handleFormSubmission(req, res);
        return;
    }
    
    // Serve static files
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    const filePath = path.join(__dirname, pathname);
    serveFile(res, filePath);
});

server.listen(PORT, () => {
    console.log('🚀 Starting local server for contact form testing...');
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log('📧 Form submissions will be logged to this terminal');
    console.log('🔄 Press Ctrl+C to stop the server');
    console.log('-'.repeat(60));
    console.log('✅ Server started successfully!');
    console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
    console.log('-'.repeat(60));
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use. Try a different port or stop the existing server.`);
    } else {
        console.log('❌ Error starting server:', err);
    }
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped by user');
    process.exit(0);
});
