#!/bin/bash

# SSL Certificate Setup Script for files.iqubekct.ac.in
# This script helps you obtain and configure SSL certificates

echo "🔐 SSL Certificate Setup for files.iqubekct.ac.in"
echo "=================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

# Create ssl directory
mkdir -p ssl

echo "Choose your SSL certificate option:"
echo "1) Let's Encrypt (Free, Automatic renewal)"
echo "2) Manual certificate files (You provide cert files)"
echo "3) Self-signed certificate (For testing only)"
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🔄 Setting up Let's Encrypt..."
        
        # Install certbot if not installed
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing certbot..."
            # For Ubuntu/Debian
            if command -v apt &> /dev/null; then
                apt update
                apt install -y certbot python3-certbot-nginx
            # For CentOS/RHEL
            elif command -v yum &> /dev/null; then
                yum install -y epel-release
                yum install -y certbot python3-certbot-nginx
            else
                echo "❌ Unable to install certbot automatically. Please install manually."
                exit 1
            fi
        fi

        # Get certificate
        echo "🔑 Obtaining SSL certificate for files.iqubekct.ac.in..."
        echo "Note: Make sure files.iqubekct.ac.in points to this server's IP address"
        read -p "Press Enter to continue..."
        
        certbot certonly --standalone \
            --preferred-challenges http \
            -d files.iqubekct.ac.in \
            --email your-email@example.com \
            --agree-tos \
            --non-interactive

        if [ $? -eq 0 ]; then
            # Copy certificates to ssl directory
            cp /etc/letsencrypt/live/files.iqubekct.ac.in/fullchain.pem ssl/certificate.crt
            cp /etc/letsencrypt/live/files.iqubekct.ac.in/privkey.pem ssl/private.key
            
            # Set permissions
            chmod 644 ssl/certificate.crt
            chmod 600 ssl/private.key
            
            echo "✅ Let's Encrypt certificates installed successfully!"
            echo "📅 Auto-renewal is set up via cron"
            
            # Setup auto-renewal
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && cp /etc/letsencrypt/live/files.iqubekct.ac.in/fullchain.pem $(pwd)/ssl/certificate.crt && cp /etc/letsencrypt/live/files.iqubekct.ac.in/privkey.pem $(pwd)/ssl/private.key && docker-compose -f docker-compose.prod.yml restart frontend") | crontab -
        else
            echo "❌ Failed to obtain Let's Encrypt certificate"
            echo "Make sure:"
            echo "1. files.iqubekct.ac.in points to this server"
            echo "2. Port 80 is open and not blocked by firewall"
            echo "3. No other web server is running on port 80"
            exit 1
        fi
        ;;
        
    2)
        echo "📁 Manual certificate setup..."
        echo "Please provide your certificate files:"
        echo ""
        
        read -p "Enter path to your certificate file (.crt or .pem): " cert_path
        read -p "Enter path to your private key file (.key): " key_path
        
        if [ ! -f "$cert_path" ]; then
            echo "❌ Certificate file not found: $cert_path"
            exit 1
        fi
        
        if [ ! -f "$key_path" ]; then
            echo "❌ Private key file not found: $key_path"
            exit 1
        fi
        
        # Copy files
        cp "$cert_path" ssl/certificate.crt
        cp "$key_path" ssl/private.key
        
        # Set permissions
        chmod 644 ssl/certificate.crt
        chmod 600 ssl/private.key
        
        echo "✅ Manual certificates installed successfully!"
        ;;
        
    3)
        echo "🧪 Creating self-signed certificate (TESTING ONLY)..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/private.key \
            -out ssl/certificate.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=files.iqubekct.ac.in"
        
        # Set permissions
        chmod 644 ssl/certificate.crt
        chmod 600 ssl/private.key
        
        echo "✅ Self-signed certificate created!"
        echo "⚠️  Warning: This is for testing only. Browsers will show security warnings."
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Verify certificates
echo ""
echo "🔍 Verifying certificate..."
if openssl x509 -in ssl/certificate.crt -text -noout > /dev/null 2>&1; then
    echo "✅ Certificate is valid"
    
    # Show certificate details
    echo ""
    echo "📋 Certificate Details:"
    echo "Subject: $(openssl x509 -in ssl/certificate.crt -noout -subject | sed 's/subject=//')"
    echo "Issuer: $(openssl x509 -in ssl/certificate.crt -noout -issuer | sed 's/issuer=//')"
    echo "Valid from: $(openssl x509 -in ssl/certificate.crt -noout -startdate | sed 's/notBefore=//')"
    echo "Valid until: $(openssl x509 -in ssl/certificate.crt -noout -enddate | sed 's/notAfter=//')"
    
    # Check if certificate and key match
    cert_hash=$(openssl x509 -noout -modulus -in ssl/certificate.crt | openssl md5)
    key_hash=$(openssl rsa -noout -modulus -in ssl/private.key 2>/dev/null | openssl md5)
    
    if [ "$cert_hash" = "$key_hash" ]; then
        echo "✅ Certificate and private key match"
    else
        echo "❌ Certificate and private key do not match!"
        exit 1
    fi
else
    echo "❌ Certificate is invalid"
    exit 1
fi

echo ""
echo "🎉 SSL setup complete!"
echo "Files created:"
echo "  - ssl/certificate.crt"
echo "  - ssl/private.key"
echo ""
echo "Next steps:"
echo "1. Configure your .env.prod file"
echo "2. Run: ./deploy.sh"
