# Google Cloud APIs Setup Guide

## Overview
The Cool Shot AI bot uses Google Cloud APIs for translation and voice features:
- **Google Cloud Translate API** - For text translation
- **Google Cloud Speech-to-Text API** - For voice input processing  
- **Google Cloud Text-to-Speech API** - For voice output generation

## 🚀 Quick Setup Guide

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click **"New Project"** (or use existing project)
4. Enter project name and click **"Create"**
5. Make sure your new project is selected (check top bar)

### Step 2: Enable Required APIs
1. In Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search and enable these APIs:
   - **Cloud Translation API** - For `/translate` command
   - **Cloud Speech-to-Text API** - For voice message processing
   - **Cloud Text-to-Speech API** - For voice responses
   - **Generative AI API** - For Gemini AI fallback

### Step 3: Create API Key
1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "API Key"**
3. **IMPORTANT**: Click **"Restrict Key"** for security:
   - **Application restrictions**: Select "None" or configure as needed
   - **API restrictions**: Select "Restrict key" and choose:
     - Cloud Translation API
     - Cloud Speech-to-Text API  
     - Cloud Text-to-Speech API
     - Generative AI API
4. Click **"Save"**
5. Copy your API key - you'll need it for the environment variable

### Step 4: Configure Environment Variable
Add this environment variable to your deployment:

```bash
GOOGLE_API_KEY=your_google_cloud_api_key_here
```

## 🌐 Deployment Platform Setup

### Render.com
1. Go to your service dashboard
2. Navigate to **"Environment"** tab
3. Add new environment variable:
   - **Key**: `GOOGLE_API_KEY`
   - **Value**: Your Google Cloud API key
4. Click **"Save Changes"** and redeploy

### Heroku
```bash
heroku config:set GOOGLE_API_KEY=your_google_cloud_api_key_here
```

### Railway
```bash
railway variables set GOOGLE_API_KEY=your_google_cloud_api_key_here
```

### Vercel
1. Go to your project dashboard
2. Navigate to **"Settings" > "Environment Variables"**
3. Add:
   - **Name**: `GOOGLE_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production (or all)

## 🎯 API Features Overview

### Translation API (`/translate` command)
```bash
/translate es Hello world        # Translates to Spanish
/translate fr Good morning       # Translates to French
/translate de How are you?       # Translates to German
```

### Voice Features
- **🎤 Voice Input**: Send voice messages to interact with the bot
- **🔊 Voice Output**: Bot responds with both text and speech
- **🌍 Multi-language**: Voice processing in multiple languages
- **🎯 Command Recognition**: All text commands work with voice

### Voice Commands Examples
```
"Help me with translation" → Activates help system
"Translate Spanish hello world" → Translates text to Spanish  
"What's your status?" → Shows bot status
"Tell me about Cool Shot AI" → Provides bot information
```

## 💰 Cost Information

### Free Tier Limits (per month)
- **Translation API**: 500,000 characters free
- **Speech-to-Text**: 60 minutes free
- **Text-to-Speech**: 1 million characters free
- **Gemini API**: Free tier available

### Pricing After Free Tier
- **Translation**: $20 per million characters
- **Speech-to-Text**: $0.024 per minute
- **Text-to-Speech**: $4-16 per million characters (varies by voice)

## 🔧 Troubleshooting

### Common Issues

#### 1. "API not enabled" error
**Solution**: Make sure all 4 APIs are enabled in Google Cloud Console

#### 2. "Invalid API key" error  
**Solution**: 
- Check API key is correct
- Ensure API restrictions include the required APIs
- Try creating a new API key

#### 3. "Quota exceeded" error
**Solution**:
- Check usage in Google Cloud Console
- Enable billing if you've exceeded free tier
- Monitor usage to avoid unexpected charges

#### 4. Voice features not working
**Check**:
- Speech-to-Text API is enabled
- Text-to-Speech API is enabled  
- API key has proper restrictions
- Bot logs show voice services as "Enabled"

### Check Bot Status
Use these commands to verify setup:
- `/apistatus` - Shows all API status including voice services
- `/voice` - Information about voice features and status
- `/ping` - General bot health check

## 🛡️ Security Best Practices

### API Key Security
1. **Restrict your API key** to only necessary APIs
2. **Never commit** API keys to source control
3. **Use environment variables** only
4. **Monitor usage** regularly in Google Cloud Console
5. **Rotate keys** periodically for security

### Recommended API Restrictions
- Cloud Translation API
- Cloud Speech-to-Text API
- Cloud Text-to-Speech API  
- Generative AI API (for Gemini fallback)

## 📊 Monitoring Usage

### Google Cloud Console
1. Go to **"APIs & Services" > "Dashboard"**
2. View API usage graphs and quotas
3. Set up billing alerts if needed
4. Monitor for unusual spikes in usage

### Bot Commands
- `/apistatus` - Shows current API availability
- Use admin panel for detailed analytics

## ✅ Verification Steps

After setup, verify everything works:

1. **Test Translation**: `/translate es Hello world`
2. **Test Voice Input**: Send a voice message to the bot
3. **Check Status**: Use `/apistatus` to see all services
4. **Voice Info**: Use `/voice` for voice feature status

Your bot now has full Google Cloud API integration! 🚀