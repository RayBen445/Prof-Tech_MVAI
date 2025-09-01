# Google Gemini API Setup Guide

## Overview
The Cool Shot AI bot now includes Google Gemini API as a fallback option when the primary AI APIs fail. This ensures maximum uptime and reliability for your bot.

## Setup Instructions

### 1. Get Google API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variable
Add the following environment variable to your deployment:

```bash
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3. Deployment Platforms

#### Render.com
1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add new environment variable:
   - Key: `GOOGLE_API_KEY`
   - Value: Your Gemini API key

#### Heroku
```bash
heroku config:set GOOGLE_API_KEY=your_gemini_api_key_here
```

#### Railway
```bash
railway variables set GOOGLE_API_KEY=your_gemini_api_key_here
```

## How It Works

### Fallback System
1. **Primary APIs**: Bot tries 5 GiftedTech AI endpoints first
2. **Fallback**: If all primary APIs fail, Google Gemini API is used
3. **Enhanced Failure**: If Gemini also fails, user gets helpful message with alternative commands

### Brand Protection
All responses maintain Cool Shot AI identity:
- Replaces "Google", "Gemini", "Bard" with "Cool Shot AI"
- Replaces Google branding with "Cool Shot Systems"
- Maintains consistent response formatting
- Preserves your bot's unique personality

### Console Logging
```
🔄 Trying Google Gemini API as fallback...
✅ Google Gemini API response successful
```

## Benefits
- **Higher Uptime**: Backup API ensures bot keeps working
- **Seamless Experience**: Users don't know which API is being used
- **Brand Consistency**: All responses maintain Cool Shot AI identity
- **Easy Setup**: Just add one environment variable
- **Cost Effective**: Only used when primary APIs fail

## Environment Variables Summary
```bash
TELEGRAM_TOKEN=your_telegram_bot_token        # Required
AI_API_KEY=gifted                            # For primary APIs
GOOGLE_API_KEY=your_gemini_api_key           # Optional fallback
```

## Status Check
The bot logs will show when Gemini is initialized:
```
🤖 Google Gemini API initialized as fallback
```

Or if not configured:
```
⚠️ Google Gemini API not available: [error message]
```