#!/usr/bin/env python3
"""
Simple HTTP server for local testing of the contact form.
This solves CORS issues when testing locally.

Usage:
    python local-server.py

Then open: http://localhost:8000
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import parse_qs
import json

class ContactFormHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for contact form testing"""
        if self.path == '/' or self.path == '/index.html':
            # Handle Netlify Forms simulation
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            print("\n" + "="*50)
            print("📧 CONTACT FORM SUBMISSION RECEIVED")
            print("="*50)
            
            try:
                # Try to parse as form data
                if 'application/x-www-form-urlencoded' in self.headers.get('Content-Type', ''):
                    form_data = parse_qs(post_data.decode('utf-8'))
                    for key, value in form_data.items():
                        print(f"{key}: {value[0] if value else ''}")
                else:
                    # Try to parse as multipart form data
                    print("Raw form data received:")
                    print(post_data.decode('utf-8', errors='ignore'))
                    
            except Exception as e:
                print(f"Error parsing form data: {e}")
                print("Raw data:", post_data)
            
            print("="*50)
            print("✅ Form submission simulated successfully!")
            print("In production, this would be handled by Netlify Forms")
            print("="*50 + "\n")
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Send a simple success page
            success_html = """
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
            """
            self.wfile.write(success_html.encode())
            
        else:
            # Handle other POST requests
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def main():
    PORT = 8000
    
    print("🚀 Starting local server for contact form testing...")
    print(f"📍 Server will run at: http://localhost:{PORT}")
    print("📧 Form submissions will be logged to this terminal")
    print("🔄 Press Ctrl+C to stop the server")
    print("-" * 60)
    
    try:
        with socketserver.TCPServer(("", PORT), ContactFormHandler) as httpd:
            print(f"✅ Server started successfully!")
            print(f"🌐 Open your browser to: http://localhost:{PORT}")
            print("-" * 60)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port or stop the existing server.")
        else:
            print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    main()
