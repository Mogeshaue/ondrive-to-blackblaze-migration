# OneDrive to Backblaze B2 Migration Web Application

A comprehensive web-based application that allows users to migrate selected files and folders from Microsoft OneDrive to Backblaze B2 using Rclone, with a zero command-line experience.

## 🚀 Features

- **Microsoft OAuth 2.0 Authentication**: Secure login with Microsoft accounts
- **File Explorer Interface**: Browse OneDrive files and folders with search functionality
- **Multi-Select**: Choose multiple files and folders for migration
- **Real-time Progress**: Live progress tracking with WebSocket updates
- **Rclone Integration**: Uses Rclone for reliable file transfers
- **Modern UI**: Clean, responsive interface built with Material-UI
- **Error Handling**: Comprehensive error handling and user feedback

## 📋 Prerequisites

- Node.js 16+ and npm
- Rclone (will be installed automatically by setup script)
- Microsoft Azure App Registration
- Backblaze B2 Account and Application Keys

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd onedrive-b2-migration
```

### 2. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Install Node.js dependencies
- Install Rclone (if not present)
- Create configuration files from templates
- Build the frontend application

### 3. Configure Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in the details:
   - Name: "OneDrive to B2 Migration"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: "Web" → `http://localhost:3000/auth/microsoft/callback`
5. After creation, note down:
   - Application (client) ID
   - Directory (tenant) ID
6. Go to "Certificates & secrets" and create a new client secret
7. Go to "API permissions" and add:
   - Microsoft Graph → Delegated → Files.Read.All
   - Microsoft Graph → Delegated → offline_access

### 4. Configure Backblaze B2

1. Log in to your [Backblaze B2 account](https://secure.backblaze.com/b2_buckets.htm)
2. Create a new bucket or use an existing one
3. Go to "App Keys" and create a new application key
4. Note down:
   - Key ID
   - Application Key
   - Bucket Name

### 5. Update Configuration Files

#### Update `.env` file:

```env
# Microsoft OAuth Configuration
MS_CLIENT_ID=your_microsoft_client_id
MS_CLIENT_SECRET=your_microsoft_client_secret
MS_TENANT_ID=your_tenant_id
MS_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Backblaze B2 Configuration
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_NAME=your_b2_bucket_name

# Application Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret_key_here

# Rclone Configuration
RCLONE_PATH=/usr/bin/rclone
RCLONE_CONFIG_PATH=/path/to/rclone.conf

# Security
CORS_ORIGIN=http://localhost:5173
```

#### Update `rclone.conf` file:

```ini
[b2]
type = b2
account = your_b2_account_id
key = your_b2_application_key
hard_delete = false
versions = false
```

## 🚀 Running the Application

### Development Mode

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend (in development)
cd client
npm run dev
```

### Production Mode

```bash
# Build frontend
npm run build

# Start application
npm start
```

The application will be available at:
- Frontend: http://localhost:5173 (development) or http://localhost:3000 (production)
- Backend API: http://localhost:3000

## 📖 Usage

### 1. Authentication
- Click "Sign in with Microsoft"
- You'll be redirected to Microsoft's login page
- Enter your credentials and authorize the application
- You'll be redirected back to the application

### 2. File Selection
- Browse your OneDrive files and folders using the file explorer
- Use the search functionality to find specific files
- Select files and folders by checking the checkboxes
- View selected items in the migration panel

### 3. Migration
- Click "Start Migration" to begin the transfer
- Monitor real-time progress and logs
- Files will be transferred to B2 under `b2://<BUCKET>/users/<email_prefix>/`
- Receive completion notification when done

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MS_CLIENT_ID` | Microsoft OAuth client ID | Yes |
| `MS_CLIENT_SECRET` | Microsoft OAuth client secret | Yes |
| `MS_TENANT_ID` | Microsoft tenant ID | Yes |
| `MS_REDIRECT_URI` | OAuth callback URL | Yes |
| `B2_APPLICATION_KEY_ID` | B2 application key ID | Yes |
| `B2_APPLICATION_KEY` | B2 application key | Yes |
| `B2_BUCKET_NAME` | B2 bucket name | Yes |
| `PORT` | Server port | No (default: 3000) |
| `SESSION_SECRET` | Session encryption key | Yes |
| `RCLONE_PATH` | Path to Rclone executable | No |
| `CORS_ORIGIN` | Frontend origin for CORS | No |

### Rclone Configuration

The application uses Rclone for file transfers. The B2 backend is configured in `rclone.conf`:

```ini
[b2]
type = b2
account = your_b2_account_id
key = your_b2_application_key
hard_delete = false
versions = false
```

## 🔒 Security Features

- **OAuth 2.0**: Secure authentication with Microsoft
- **Token Encryption**: OAuth tokens are encrypted in session storage
- **CORS Protection**: Proper CORS configuration
- **Rate Limiting**: API rate limiting to prevent abuse
- **Session Security**: Secure session cookies
- **Input Validation**: All inputs are validated

## 🐛 Troubleshooting

### Common Issues

1. **OAuth Redirect Error**
   - Ensure the redirect URI in Azure matches exactly: `http://localhost:3000/auth/microsoft/callback`
   - Check that the client ID and secret are correct

2. **Rclone Not Found**
   - Ensure Rclone is installed and available in PATH
   - Update `RCLONE_PATH` in `.env` if needed

3. **B2 Authentication Error**
   - Verify B2 application key and key ID
   - Ensure the bucket exists and is accessible

4. **File Transfer Failures**
   - Check network connectivity
   - Verify file permissions in OneDrive
   - Check B2 bucket permissions

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=*
```

## 📁 Project Structure

```
onedrive-b2-migration/
├── server.js              # Main Express server
├── package.json           # Backend dependencies
├── .env                   # Environment configuration
├── rclone.conf           # Rclone configuration
├── setup.sh              # Setup script
├── README.md             # This file
└── client/               # React frontend
    ├── package.json      # Frontend dependencies
    ├── src/
    │   ├── components/   # React components
    │   ├── contexts/     # React contexts
    │   ├── services/     # API and socket services
    │   ├── types/        # TypeScript types
    │   └── App.tsx       # Main app component
    └── public/           # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the configuration documentation
- Open an issue on GitHub

## 🔄 Updates

To update the application:

```bash
git pull origin main
npm install
cd client && npm install && npm run build
npm start
```

---

**Note**: This application is designed for personal and organizational use. Ensure compliance with Microsoft and Backblaze terms of service when using this tool.
