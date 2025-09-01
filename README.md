# Prof-Tech MVAI - Cool Shot AI Assistant Telegram Bot

A multi-role intelligent assistant Telegram bot powered by AI endpoints with support for 15+ languages and 100+ knowledge roles.

## Features

- 🤖 Multi-role AI assistant (Mathematician, Doctor, Developer, etc.)
- 🌍 15+ language support with Google Cloud Translate API
- 🎤 Voice interaction capabilities (Speech-to-Text & Text-to-Speech)
- 📊 User analytics and admin panel
- 🔒 Dynamic admin recognition system
- 📢 Broadcast messaging
- 🆘 Support ticket system
- 🌐 Real-time text translation in 100+ languages

## Admin System

This bot features a **Dynamic Admin Recognition System** that allows flexible admin management without code changes.

### Environment Variables

Configure admins using these environment variables:

#### `ADMIN_IDS`
Comma-separated list of Telegram user IDs:
```bash
ADMIN_IDS="6649936329,123456789,987654321"
```

#### `ADMIN_USERNAMES` 
Comma-separated list of Telegram usernames (without @):
```bash
ADMIN_USERNAMES="rayben445,admin2,moderator3"
```
*Note: Users must interact with the bot at least once for username resolution*

#### `GITHUB_ADMIN_MAPPING`
JSON mapping GitHub usernames to Telegram IDs:
```bash
GITHUB_ADMIN_MAPPING='{"RayBen445":"6649936329","contributor2":"123456789"}'
```

### Automatic Features

- **Repository Owner Recognition**: RayBen445 (repository owner) is automatically recognized as admin when properly mapped
- **Username Resolution**: Converts usernames to IDs when users interact with the bot
- **Backwards Compatibility**: Falls back to hardcoded admin ID (6649936329) if no environment variables are set

### Admin Commands

- `/admin` - Access admin panel
- `/admininfo` - View admin system status and your permissions
- `/broadcast <message>` - Send message to all users

### Adding New Admins

**Method 1: Environment Variables (Recommended)**
1. Add the user's Telegram ID to `ADMIN_IDS`
2. Restart the bot
3. User immediately has admin access

**Method 2: Username Resolution**
1. Add username to `ADMIN_USERNAMES`
2. User must interact with bot once (send any message)
3. Bot automatically promotes them to admin

**Method 3: GitHub Mapping**
1. Add GitHub username and Telegram ID to `GITHUB_ADMIN_MAPPING`
2. Restart the bot
3. Automatic admin recognition

### Admin Troubleshooting

Use the `/admininfo` command to:
- Check your current admin status
- View your Telegram ID and username
- Get instructions for becoming an admin
- See total admin count

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set environment variables:
   - `TELEGRAM_TOKEN` - Your Telegram bot token (required)
   - `GOOGLE_API_KEY` - Google Cloud API key for translation & voice features (see setup guide)
   - Admin system variables (see Admin System section above)
4. Run: `npm start`

### Google Cloud APIs Setup
For translation and voice features, see the **[Google Cloud APIs Setup Guide](GOOGLE_CLOUD_APIS_SETUP.md)** for detailed instructions on:
- Getting Google Cloud API keys
- Enabling required APIs (Translate, Speech-to-Text, Text-to-Speech)
- Platform-specific deployment configuration
- Cost information and free tier limits

## API Endpoints

The bot also includes AI API endpoints via FastAPI (Python):
- `POST /chat` - Chat with AI models

## Commands

- `/start` - Welcome message and introduction
- `/role` - Choose your AI expert role
- `/lang` - Select language preference  
- `/translate <lang_code> <text>` - Translate text to any language
- `/voice` - Voice features information and status
- `/about` - Information about the bot
- `/help` - List of available commands
- `/buttons` - Quick settings menu
- `/reset` - Reset your settings
- `/support <message>` - Send support request
- `/ping` - Check bot status
- `/apistatus` - Check AI and service APIs status
- `/admin` - Admin panel (admins only)
- `/admininfo` - Admin system information

### Voice Features
- **🎤 Voice Input**: Send voice messages for hands-free interaction
- **🔊 Voice Output**: Get both text and synthesized speech responses
- **🌍 Multi-language**: Voice processing in multiple languages
- **🎯 Smart Commands**: All text commands work with voice input

## Contributing

Contact the repository owner (RayBen445) for admin access or to contribute to the project.

## License

ISC License - Cool Shot Systems