#!/bin/bash

# SSL Certificate Setup Script
# This script creates self-signed certificates for development
# For production, replace with Let's Encrypt or proper SSL certificates

echo "Setting up SSL certificates..."

# Create SSL directories
mkdir -p ssl/certs
mkdir -p ssl/private

# Generate self-signed certificate (for development/testing)
# Replace this with proper certificates for production
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/private/nginx-selfsigned.key \
    -out ssl/certs/nginx-selfsigned.crt \
    -subj "/C=IN/ST=Your_State/L=Your_City/O=iQube/OU=IT/CN=files.iqubekct.ac.in"

echo "Self-signed certificates created."
echo ""
echo "⚠️  WARNING: These are self-signed certificates for development only!"
echo "For production, use proper SSL certificates from a trusted CA or Let's Encrypt."
echo ""
echo "To use Let's Encrypt certificates:"
echo "1. Install certbot"
echo "2. Run: certbot certonly --standalone -d files.iqubekct.ac.in"
echo "3. Copy certificates:"
echo "   cp /etc/letsencrypt/live/files.iqubekct.ac.in/fullchain.pem ssl/certs/"
echo "   cp /etc/letsencrypt/live/files.iqubekct.ac.in/privkey.pem ssl/private/"
echo ""

# Set proper permissions
chmod 600 ssl/private/nginx-selfsigned.key
chmod 644 ssl/certs/nginx-selfsigned.crt

echo "SSL setup completed!"
