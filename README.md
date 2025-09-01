# Prof-Tech MVAI - Cool Shot AI Assistant Telegram Bot

A multi-role intelligent assistant Telegram bot powered by AI endpoints with support for 15+ languages and 100+ knowledge roles.

## Features

- 🤖 Multi-role AI assistant (Mathematician, Doctor, Developer, etc.)
- 🌍 15+ language support
- 📊 User analytics and admin panel
- 🔒 Dynamic admin recognition system
- 📢 Broadcast messaging
- 🆘 Support ticket system

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
3. Set environment variables (see Admin System section)
4. Set `TELEGRAM_TOKEN` environment variable
5. Run: `npm start`

## API Endpoints

The bot also includes AI API endpoints via FastAPI (Python):
- `POST /chat` - Chat with AI models

## Commands

- `/start` - Welcome message and introduction
- `/role` - Choose your AI expert role
- `/lang` - Select language preference
- `/about` - Information about the bot
- `/help` - List of available commands
- `/buttons` - Quick settings menu
- `/reset` - Reset your settings
- `/support <message>` - Send support request
- `/ping` - Check bot status
- `/admin` - Admin panel (admins only)
- `/admininfo` - Admin system information

## Contributing

Contact the repository owner (RayBen445) for admin access or to contribute to the project.

## License

ISC License - Cool Shot Systems