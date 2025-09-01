/**
 * Cool Shot AI Assistant Telegram Bot
 * Inspired by CS Assistant by Heritage Oladoye
 * Author: CoolShotSystems
 * 
 * ADMIN SYSTEM:
 * ============
 * Simplified admin system with persistent user management:
 * 
 * 1. Primary Admin:
 *    - RayBen445 (ID: 6649936329) is the primary admin
 *    - Only RayBen445 can promote/demote other admins
 *    - RayBen445 cannot be demoted
 * 
 * 2. User Management:
 *    - All user interactions are saved to users.json
 *    - User data includes: ID, username, first name, last name, admin status
 *    - Persistent storage survives bot restarts
 * 
 * 3. Admin Commands:
 *    - /users - View all registered users (RayBen445 only)
 *    - /promote <user_id> - Promote user to admin (RayBen445 only)  
 *    - /demote <user_id> - Demote admin user (RayBen445 only)
 *    - /admininfo - Check admin status and system info
 *    - /admin - Access admin panel with stats and tools
 *    - /apistatus - Check AI API status and configuration
 * 
 * 4. Admin Features:
 *    - /admin command and admin panel access
 *    - /broadcast command for messaging all users
 *    - Support message routing and handling
 *    - User statistics and management
 *    - Comprehensive user database with persistent storage
 * 
 * 5. AI API System:
 *    - Primary APIs: GiftedTech AI endpoints (5 different models)
 *    - Fallback API: Google Gemini API (requires GOOGLE_API_KEY env var)
 *    - All responses maintain Cool Shot AI branding and identity
 *    - Comprehensive text replacement to maintain brand consistency
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper for Telegram MarkdownV2 escaping
function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1');
}

// ========== User Data Management ==========
let userRoles = {};
let userLanguages = {};
let USER_IDS = new Set(); // Track user IDs for broadcast

// Persistent user data storage
const USERS_FILE = './users.json';
const ANALYTICS_FILE = './analytics.json';
let users = {}; // { userId: { id, username, firstName, lastName, isAdmin, firstSeen, lastSeen } }
let analytics = {
  botStartTime: new Date().toISOString(),
  commandStats: {},
  dailyStats: {},
  userActivity: {},
  totalMessages: 0,
  totalCommands: 0
};

// Load users from file
async function loadUsers() {
  try {
    if (await fs.pathExists(USERS_FILE)) {
      users = await fs.readJson(USERS_FILE);
      console.log(`📥 Loaded ${Object.keys(users).length} users from storage`);
    }
  } catch (error) {
    console.error('❌ Error loading users:', error.message);
  }
}

// Save users to file
async function saveUsers() {
  try {
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
  } catch (error) {
    console.error('❌ Error saving users:', error.message);
  }
}

// Load analytics from file
async function loadAnalytics() {
  try {
    if (await fs.pathExists(ANALYTICS_FILE)) {
      const stored = await fs.readJson(ANALYTICS_FILE);
      analytics = { ...analytics, ...stored };
      console.log('📊 Analytics data loaded');
    }
  } catch (error) {
    console.error('❌ Error loading analytics:', error.message);
  }
}

// Save analytics to file
async function saveAnalytics() {
  try {
    await fs.writeJson(ANALYTICS_FILE, analytics, { spaces: 2 });
  } catch (error) {
    console.error('❌ Error saving analytics:', error.message);
  }
}

// Track command usage
async function trackCommand(command, userId) {
  analytics.totalCommands++;
  if (!analytics.commandStats[command]) {
    analytics.commandStats[command] = 0;
  }
  analytics.commandStats[command]++;
  
  // Track user activity
  const userIdStr = userId.toString();
  if (!analytics.userActivity[userIdStr]) {
    analytics.userActivity[userIdStr] = { commands: 0, messages: 0 };
  }
  analytics.userActivity[userIdStr].commands++;
  
  await saveAnalytics();
}

// Track message
async function trackMessage(userId) {
  analytics.totalMessages++;
  const userIdStr = userId.toString();
  if (!analytics.userActivity[userIdStr]) {
    analytics.userActivity[userIdStr] = { commands: 0, messages: 0 };
  }
  analytics.userActivity[userIdStr].messages++;
  
  await saveAnalytics();
}

// Update user information
async function updateUserInfo(ctx) {
  const userId = ctx.from.id.toString();
  const now = new Date().toISOString();
  
  // Initialize user if not exists
  if (!users[userId]) {
    users[userId] = {
      id: ctx.from.id,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      lastName: ctx.from.last_name || null,
      isAdmin: false,
      firstSeen: now,
      lastSeen: now,
      messageCount: 0,
      commandCount: 0,
      notes: '' // Admin notes about user
    };
    console.log(`👤 New user registered: ${ctx.from.first_name || 'Unknown'} (@${ctx.from.username || 'no_username'}) - ID: ${ctx.from.id}`);
  } else {
    // Update existing user info
    users[userId].username = ctx.from.username || users[userId].username;
    users[userId].firstName = ctx.from.first_name || users[userId].firstName;
    users[userId].lastName = ctx.from.last_name || users[userId].lastName;
    users[userId].lastSeen = now;
  }
  
  USER_IDS.add(ctx.from.id);
  await saveUsers();
}

// ========== Admin Setup ==========
/**
 * Simplified Admin System
 * 
 * - RayBen445 (ID: 6649936329) is the primary admin
 * - Only RayBen445 can promote other users to admin
 * - Admin status is stored persistently in users.json
 * - Use /promote and /demote commands to manage admins
 */

const RAYBEN_ID = 6649936329; // RayBen445's Telegram ID

// Check if a user ID is admin
function isAdmin(userId) {
  const userIdStr = userId.toString();
  return users[userIdStr] && users[userIdStr].isAdmin;
}

// Check if user is RayBen445 (primary admin)
function isRayBen(userId) {
  return userId === RAYBEN_ID;
}

// Get all admin users
function getAdminUsers() {
  return Object.values(users).filter(user => user.isAdmin);
}

// Get admin IDs for broadcasting
function getAdminIds() {
  return getAdminUsers().map(user => user.id);
}

// Promote user to admin (only RayBen can do this)
async function promoteToAdmin(userId, promotedBy) {
  if (!isRayBen(promotedBy)) {
    return { success: false, error: 'Only RayBen445 can promote users to admin' };
  }
  
  const userIdStr = userId.toString();
  if (!users[userIdStr]) {
    return { success: false, error: 'User not found in database' };
  }
  
  if (users[userIdStr].isAdmin) {
    return { success: false, error: 'User is already an admin' };
  }
  
  users[userIdStr].isAdmin = true;
  await saveUsers();
  return { success: true };
}

// Demote admin user (only RayBen can do this, cannot demote himself)
async function demoteAdmin(userId, demotedBy) {
  if (!isRayBen(demotedBy)) {
    return { success: false, error: 'Only RayBen445 can demote admins' };
  }
  
  if (isRayBen(userId)) {
    return { success: false, error: 'RayBen445 cannot be demoted' };
  }
  
  const userIdStr = userId.toString();
  if (!users[userIdStr] || !users[userIdStr].isAdmin) {
    return { success: false, error: 'User is not an admin' };
  }
  
  users[userIdStr].isAdmin = false;
  await saveUsers();
  return { success: true };
}

// Initialize admin system
async function initializeAdminSystem() {
  await loadUsers();
  await loadAnalytics();
  
  // Ensure RayBen445 is always an admin
  const raybenIdStr = RAYBEN_ID.toString();
  if (!users[raybenIdStr]) {
    users[raybenIdStr] = {
      id: RAYBEN_ID,
      username: 'rayben445',
      firstName: 'RayBen445',
      lastName: null,
      isAdmin: true,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      messageCount: 0,
      commandCount: 0,
      notes: 'Primary Admin - Creator of Cool Shot AI'
    };
    await saveUsers();
    console.log('🛡️ RayBen445 initialized as primary admin');
  } else if (!users[raybenIdStr].isAdmin) {
    users[raybenIdStr].isAdmin = true;
    await saveUsers();
    console.log('🛡️ RayBen445 admin status restored');
  }
  
  console.log(`🛡️ Admin system initialized with ${getAdminUsers().length} admins`);
}

// ========== Roles and Languages ==========
const roles = [
  'Mathematician', 'Econometician', 'Doctor', 'Brain Master', 'Physicist', 'Chemist', 'Biologist',
  'Engineer', 'Philosopher', 'Psychologist', 'Spiritual Advisor', 'AI Researcher', 'Teacher', 'Professor',
  'Developer', 'Data Scientist', 'Statistician', 'Entrepreneur', 'Journalist', 'History Expert', 'Lawyer',
  'Accountant', 'Investor', 'Startup Mentor', 'UX Designer', 'Therapist', 'Nutritionist', 'Fitness Coach',
  'Poet', 'Author', 'Script Writer', 'Public Speaker', 'Game Developer', 'Ethical Hacker', 'Security Analyst',
  'DevOps Engineer', 'Cloud Expert', 'Geographer', 'Astronomer', 'Political Analyst', 'Environmental Scientist',
  'AI Lawyer', 'Robotics Engineer', 'Medical Researcher', 'Economist', 'Agronomist', 'Anthropologist',
  'Cryptographer', 'Quantum Physicist', 'Visionary', 'Linguist', 'AI Trainer', 'Mobile Developer',
  'Web Developer', 'Data Analyst', 'System Admin', 'Logician', 'Neuroscientist', 'Ecologist', 'Marine Biologist',
  'Meteorologist', 'Cybersecurity Expert', 'Economics Tutor', 'Healthcare Consultant', 'Project Manager',
  'Content Creator', 'SEO Expert', 'Social Media Strategist', 'Pharmacologist', 'Dentist', 'Veterinarian',
  'Music Theorist', 'AI Ethicist', 'Language Tutor', 'Blockchain Developer', 'Geneticist', 'Psychiatrist',
  'UX Researcher', 'Game Designer', 'Legal Advisor', 'Literary Critic', 'Cultural Analyst', 'Civil Engineer',
  'Mechanical Engineer', 'Electrical Engineer', 'AI Psychologist', 'Film Critic', 'Forensic Scientist',
  'Statistic Tutor', 'AI Architect', 'AI Philosopher', 'Hardware Engineer', 'Nutrition Coach', 'Space Scientist',
  'Theologian'
];

const languages = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'ar', label: '🇸🇦 Arabic' },
  { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'yo', label: '🇳🇬 Yoruba' },
  { code: 'ig', label: '🇳🇬 Igbo' },
  { code: 'zh', label: '🇨🇳 Chinese' },
  { code: 'ru', label: '🇷🇺 Russian' },
  { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'pt', label: '🇵🇹 Portuguese' },
  { code: 'it', label: '🇮🇹 Italian' },
  { code: 'tr', label: '🇹🇷 Turkish' },
  { code: 'sw', label: '🇰🇪 Swahili' }
];

// ========== AI Endpoints ==========
const aiAPIs = [
  'https://api.giftedtech.co.ke/api/ai/gpt4o',
  'https://api.giftedtech.co.ke/api/ai/geminiaipro',
  'https://api.giftedtech.co.ke/api/ai/meta-llama',
  'https://api.giftedtech.co.ke/api/ai/copilot',
  'https://api.giftedtech.co.ke/api/ai/ai'
];

// Google Gemini API Configuration
let geminiAI = null;
try {
  if (process.env.GOOGLE_API_KEY) {
    geminiAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    console.log('🤖 Google Gemini API initialized as fallback');
  }
} catch (error) {
  console.log('⚠️ Google Gemini API not available:', error.message);
}

// Google Gemini API fallback function
async function callGeminiAPI(prompt, role, lang) {
  if (!geminiAI) {
    throw new Error('Google Gemini API not configured');
  }
  
  try {
    const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create a comprehensive prompt that maintains Cool Shot AI identity
    const systemPrompt = `You are Cool Shot AI, an intelligent assistant developed by Cool Shot Systems. 
You are currently operating in ${role} mode. Respond in a helpful, professional manner.
Your name is Cool Shot AI and you were created by Cool Shot Systems.
Never mention Google, Gemini, or any other AI provider names.
Always maintain the Cool Shot AI identity and branding.

User Query: ${prompt}`;
    
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    if (text && text.trim()) {
      return {
        result: text
          .replace(/Google|Gemini|Bard|I'm an AI assistant|I'm a large language model/gi, "I'm Cool Shot AI")
          .replace(/I was (created|developed|made|built) by Google/gi, "I was created by Cool Shot Systems")
          .replace(/Google AI|Google's AI|Gemini AI/gi, "Cool Shot AI")
          .replace(/I'm here to help/gi, "I'm Cool Shot AI, here to help")
          .trim()
      };
    }
    throw new Error('Empty response from Gemini');
  } catch (error) {
    console.error('❌ Google Gemini API Error:', error.message);
    throw error;
  }
}

// ========== Support Query Flow State ==========
let supportState = {};

// ========== Main Text Handler ==========
bot.on('text', async (ctx, next) => {
  // Update user information and track activity
  await updateUserInfo(ctx);
  await trackMessage(ctx.from.id);

  // Support query logic
  if (supportState[ctx.from.id]) {
    supportState[ctx.from.id] = false; // Reset state after receiving
    const userName = ctx.from.first_name || 'User';
    const username = ctx.from.username ? `@${ctx.from.username}` : 'no_username';
    
    for (const adminId of getAdminIds()) {
      await bot.telegram.sendMessage(
        adminId,
        `📩 *New Support Request*\\n\\n` +
        `👤 **From:** ${escapeMarkdownV2(userName)} \\(${username}\\)\\n` +
        `🆔 **User ID:** \`${ctx.from.id}\`\\n\\n` +
        `💬 **Message:**\\n${escapeMarkdownV2(ctx.message.text)}`,
        { parse_mode: 'MarkdownV2' }
      );
    }
    return ctx.replyWithMarkdownV2(
      '✅ *Support Request Sent*\\n\\n' +
      '📨 Your message has been forwarded to our admin team\\!\\n' +
      '⏰ Expect a response soon\\.'
    );
  }

  // Support request via /support
  if (ctx.message.text.startsWith('/support ')) {
    const supportText = ctx.message.text.replace('/support ', '');
    const userName = ctx.from.first_name || 'User';
    const username = ctx.from.username ? `@${ctx.from.username}` : 'no_username';
    
    for (const adminId of getAdminIds()) {
      await bot.telegram.sendMessage(
        adminId, 
        `📩 *Support Request*\\n\\n` +
        `👤 **From:** ${escapeMarkdownV2(userName)} \\(${username}\\)\\n` +
        `🆔 **User ID:** \`${ctx.from.id}\`\\n\\n` +
        `💬 **Message:**\\n${escapeMarkdownV2(supportText)}`,
        { parse_mode: 'MarkdownV2' }
      );
    }
    return ctx.replyWithMarkdownV2(
      '✅ *Support Request Sent*\\n\\n' +
      '📨 Your message has been forwarded to our team\\!\\n' +
      '⏰ Expect a response soon\\.'
    );
  }
  // Broadcast handler (admin only)
  if (ctx.message.text.startsWith('/broadcast ')) {
    if (!isAdmin(ctx.from.id)) {
      return ctx.replyWithMarkdownV2('⛔️ *Access Denied*\\n\\nOnly administrators can broadcast messages\\.');
    }
    const msg = ctx.message.text.replace('/broadcast ', '');
    const adminName = ctx.from.first_name || 'Admin';
    
    for (const userId of USER_IDS) {
      await bot.telegram.sendMessage(
        userId, 
        `📢 *Admin Broadcast*\\n\\n` +
        `👤 **From:** ${escapeMarkdownV2(adminName)}\\n\\n` +
        `💬 **Message:**\\n${escapeMarkdownV2(msg)}`,
        { parse_mode: 'MarkdownV2' }
      );
    }
    return ctx.replyWithMarkdownV2(
      '✅ *Broadcast Complete*\\n\\n' +
      `📤 Message sent to ${USER_IDS.size} users\\!`
    );
  }

  // Let command handlers process first, then handle unknown commands
  if (ctx.message.text.startsWith('/')) {
    // Pass to command handlers first
    if (next) return next();
    else return;
  }

  // Normal chat AI response
  const userId = ctx.from.id;
  const role = userRoles[userId] || 'Brain Master';
  const lang = userLanguages[userId] || 'en';
  const time = new Date().toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' });

  await ctx.sendChatAction('typing');
  let response = '🤖 Sorry, I couldn’t generate a reply.';

  for (let url of aiAPIs) {
    try {
      const { data } = await axios.get(url, {
        params: {
          apikey: process.env.AI_API_KEY || 'gifted',
          q: `${role}: ${ctx.message.text}`,
          lang
        },
        timeout: 8000
      });

      if (data.result) {
        const cleaned = escapeMarkdownV2(
          data.result
            .replace(/Prof-Tech MVAI|Gifted\s*AI|ChatGPT|GiftedTech|OpenAI/gi, 'Cool Shot AI')
            .replace(/Cool Shot Designs\/Tech/gi, 'Cool Shot Systems')
            .replace(/I['’`]?m an AI language model/gi, "I'm Cool Shot AI, your intelligent assistant")
            .replace(/I was created by.*?[\\.\\n]/gi, "I was created by Cool Shot Systems.\n")
            .replace(/[“”]/g, '"')
        );
        // Beautiful response formatting
        const roleLabel = roles.includes(role) ? role : 'Brain Master';
        const langLabel = languages.find(l => l.code === lang)?.label || '🇬🇧 English';
        
        response = `🤖 *Cool Shot AI* \\| *${escapeMarkdownV2(roleLabel)}*\\n` +
                  `🌐 ${escapeMarkdownV2(langLabel)} \\| ⏰ ${time}\\n\\n` +
                  `${cleaned}\\n\\n` +
                  `✨ _Powered by Cool Shot Systems_`;
        break;
      }
    } catch (err) {
      console.error('❌ AI Request Failed:', err.message);
    }
  }
  
  // If all APIs failed, try Google Gemini as fallback
  if (response.includes("Sorry, I couldn't generate a reply") && geminiAI) {
    try {
      console.log('🔄 Trying Google Gemini API as fallback...');
      const geminiResponse = await callGeminiAPI(ctx.message.text, role, lang);
      
      if (geminiResponse.result) {
        const cleaned = escapeMarkdownV2(
          geminiResponse.result
            .replace(/Google|Gemini|Bard/gi, 'Cool Shot AI')
            .replace(/I'm an AI assistant|I'm a large language model/gi, "I'm Cool Shot AI, your intelligent assistant")
            .replace(/I was (created|developed|made|built) by Google/gi, "I was created by Cool Shot Systems")
            .replace(/Google AI|Google's AI|Gemini AI/gi, "Cool Shot AI")
            .replace(/[""]/g, '"')
        );
        
        // Beautiful response formatting
        const roleLabel = roles.includes(role) ? role : 'Brain Master';
        const langLabel = languages.find(l => l.code === lang)?.label || '🇬🇧 English';
        
        response = `🤖 *Cool Shot AI* \\| *${escapeMarkdownV2(roleLabel)}*\\n` +
                  `🌐 ${escapeMarkdownV2(langLabel)} \\| ⏰ ${time}\\n\\n` +
                  `${cleaned}\\n\\n` +
                  `✨ _Powered by Cool Shot Systems_`;
        console.log('✅ Google Gemini API response successful');
      }
    } catch (err) {
      console.error('❌ Google Gemini API Failed:', err.message);
    }
  }
  
  // If still no response, show enhanced fallback message
  if (response.includes("Sorry, I couldn't generate a reply")) {
    const roleLabel = roles.includes(role) ? role : 'Brain Master';
    const langLabel = languages.find(l => l.code === lang)?.label || '🇬🇧 English';
    
    response = `🤖 *Cool Shot AI* \\| *${escapeMarkdownV2(roleLabel)}*\\n` +
              `🌐 ${escapeMarkdownV2(langLabel)} \\| ⏰ ${time}\\n\\n` +
              `⚠️ I'm currently experiencing technical difficulties with my AI processing\\. Please try again in a moment\\!\\n\\n` +
              `💡 In the meantime, you can:\\n` +
              `• Use /games for entertainment\\n` +
              `• Use /tools for text utilities\\n` +
              `• Use /help for command list\\n\\n` +
              `✨ _Cool Shot Systems \\- Always here to help_`;
  }
  ctx.replyWithMarkdownV2(response);
});

// ========== Commands ==========

// Start Command
bot.start(async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('start', ctx.from.id);
  ctx.replyWithMarkdownV2(
    "👋 *Hello, I'm Cool Shot AI!*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*, your intelligent assistant is now online!\\n\\n" +
    "💡 Ask me anything:\\n🧮 Math | 💊 Health | 💻 Tech | 🎭 Creativity\\n\\n" +
    "🎓 Use /role to switch brain mode\\n🌐 Use /lang to choose language\\n🛠️ Use /buttons for quick menu\\n🔄 Use /reset to reset settings\\n🎮 Use /games for fun activities\\n🆘 Use /support <your message> for support\\n🚀 Let's go!"
  );
});

// About Command
bot.command('about', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('about', ctx.from.id);
  ctx.replyWithMarkdownV2(
    "ℹ️ *About Cool Shot AI*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*\\n💡 Multi-role intelligent assistant powered by AI endpoints\\n🌐 15+ languages supported\\n🧠 100+ Knowledge Roles\\n\\n" +
    "🎓 Use /role and /lang\\n🛠️ Use /buttons for quick settings\\n🔄 Use /reset to reset settings\\n🆘 Use /support <your message> for support"
  );
});

// Help Command
bot.command('help', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('help', ctx.from.id);
  ctx.replyWithMarkdownV2(
    "🆘 *Cool Shot AI Help*\\n\\n" +
    "• Use /start to see welcome\\n• /role to pick your expert mode\\n• /lang for language\\n• /about for info\\n• /reset for a fresh start\\n• /buttons for quick menu\\n• /games for fun activities\\n• /tools for text utilities\\n• /stats for bot statistics\\n• /support <your message> if you need help\\n• /ping to check bot status"
  );
});

// Support Command
bot.command('support', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('support', ctx.from.id);
  ctx.replyWithMarkdownV2(
    "🆘 *Cool Shot AI Support Center*\\n\\n" +
    "💌 *Contact Options:*\\n" +
    "• Email: support@coolshotsystems\\.com\\n" +
    "• Quick Help: `/support <your message>`\\n\\n" +
    "⚡ *Response Time:* Our admins respond ASAP\\!\\n\\n" +
    "💡 *Tip:* Be specific about your issue for faster resolution\\."
  );
});

// Ping Command for Telegram
bot.command('ping', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('ping', ctx.from.id);
  ctx.replyWithMarkdownV2('🏓 *Cool Shot AI Status: ONLINE*\\n\\n✅ All systems operational\\!');
});

// Reset Command
bot.command('reset', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('reset', ctx.from.id);
  const userId = ctx.from.id;
  delete userRoles[userId];
  delete userLanguages[userId];
  ctx.replyWithMarkdownV2(
    '🔄 *Settings Reset Complete*\\n\\n' +
    '✅ Role: Default \\(Brain Master\\)\\n' +
    '✅ Language: Default \\(English\\)\\n\\n' +
    '💡 Use /role and /lang to customize again\\!'
  );
});

// Role Selection
bot.command('role', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('role', ctx.from.id);
  ctx.replyWithMarkdownV2('🧠 *Choose Your Expert Role*\\n\\n💡 Select a role to customize AI responses:', {
    reply_markup: {
      inline_keyboard: chunkArray(roles, 4).map(row =>
        row.map(r => ({ text: r, callback_data: `role_${r}` }))
      )
    }
  });
});

// Language Selection
bot.command('lang', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('lang', ctx.from.id);
  ctx.replyWithMarkdownV2('🌍 *Choose Your Language*\\n\\n🗣️ Select your preferred language for responses:', {
    reply_markup: {
      inline_keyboard: chunkArray(languages, 3).map(row =>
        row.map(l => ({ text: l.label, callback_data: `lang_${l.code}` }))
      )
    }
  });
});

// Quick Buttons
bot.command('buttons', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('buttons', ctx.from.id);
  ctx.replyWithMarkdownV2('⚙️ *Quick Settings Menu*\\n\\n🚀 Choose an action below:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🧠 Choose Role', callback_data: 'show_role' }],
        [{ text: '🌍 Choose Language', callback_data: 'show_lang' }],
        [{ text: 'ℹ️ About Cool Shot AI', callback_data: 'show_about' }],
        [{ text: '🔄 Reset Settings', callback_data: 'do_reset' }],
        [{ text: '🆘 Get Support', callback_data: 'start_support' }],
        [{ text: '🛡️ Admin Panel', callback_data: 'show_admin' }],
        [{ text: '🎮 Games & Fun', callback_data: 'show_games' }],
        [{ text: '🛠️ Text Tools', callback_data: 'show_tools' }],
        [{ text: '📊 Bot Stats', callback_data: 'show_stats' }],
        [{ text: '🏓 System Status', callback_data: 'ping_cmd' }],
        [{ text: '📚 Help Guide', callback_data: 'help_cmd' }]
      ]
    }
  });
});

// Admin Info Command (for troubleshooting and setup)
bot.command('admininfo', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('admininfo', ctx.from.id);
  
  const isCurrentUserAdmin = isAdmin(ctx.from.id);
  const adminUsers = getAdminUsers();
  const hasUsername = ctx.from.username ? `@${ctx.from.username}` : 'No username set';
  
  let message = `🛡️ *Admin System Info*\n\n`;
  message += `👤 Your ID: \`${ctx.from.id}\`\n`;
  message += `📛 Username: ${hasUsername}\n`;
  message += `⚡ Admin Status: ${isCurrentUserAdmin ? '✅ Admin' : '❌ Not Admin'}\n`;
  message += `👥 Total Admins: ${adminUsers.length}\n`;
  message += `👥 Total Users: ${Object.keys(users).length}\n\n`;
  
  if (!isCurrentUserAdmin) {
    message += `📋 *How to become admin:*\n`;
    message += `Contact RayBen445 to promote you to admin using /promote ${ctx.from.id}`;
  } else {
    message += `🎉 You have admin privileges!\n`;
    if (isRayBen(ctx.from.id)) {
      message += `👑 You are the primary admin with promotion rights.`;
    }
  }
  
  ctx.replyWithMarkdownV2(message.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1'));
});

// API Status Command (Admin only)
bot.command('apistatus', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('apistatus', ctx.from.id);
  
  if (!isAdmin(ctx.from.id)) {
    return ctx.replyWithMarkdownV2('⛔️ *Access Denied*\\n\\nOnly administrators can check API status\\.');
  }
  
  let message = `🔧 *AI API Status Dashboard*\\n\\n`;
  
  // Check primary APIs
  message += `🎯 **Primary APIs \\(${aiAPIs.length}\\):**\\n`;
  for (let i = 0; i < aiAPIs.length; i++) {
    const url = aiAPIs[i];
    const apiName = url.includes('gpt4o') ? 'GPT-4o' : 
                   url.includes('geminiaipro') ? 'Gemini Pro' :
                   url.includes('meta-llama') ? 'Meta Llama' :
                   url.includes('copilot') ? 'Copilot' :
                   `API ${i + 1}`;
    message += `${i + 1}\\. ${escapeMarkdownV2(apiName)} \\- GiftedTech\\n`;
  }
  
  // Check Google Gemini status
  message += `\\n🤖 **Fallback API:**\\n`;
  if (geminiAI) {
    message += `✅ Google Gemini \\- *Configured & Ready*\\n`;
  } else {
    message += `⚠️ Google Gemini \\- *Not Configured*\\n`;
    message += `💡 Set GOOGLE\\_API\\_KEY environment variable to enable\\n`;
  }
  
  message += `\\n📊 **API Flow:**\\n`;
  message += `1\\. Try all ${aiAPIs.length} primary APIs sequentially\\n`;
  message += `2\\. If all fail, use Google Gemini fallback\\n`;
  message += `3\\. If still no response, show enhanced error message\\n\\n`;
  
  message += `🛡️ **Brand Protection:**\\n`;
  message += `• All responses maintain Cool Shot AI identity\\n`;
  message += `• Comprehensive text replacement ensures consistency\\n`;
  message += `• No external provider names leak through\\n\\n`;
  
  message += `✨ _Cool Shot Systems API Management_`;
  
  ctx.replyWithMarkdownV2(message);
});

// Users List Command (RayBen only)
bot.command('users', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('users', ctx.from.id);
  
  if (!isRayBen(ctx.from.id)) {
    return ctx.reply('⛔️ Only RayBen445 can view the user list.');
  }
  
  const userList = Object.values(users);
  const totalUsers = userList.length;
  const adminUsers = userList.filter(user => user.isAdmin);
  
  let message = `👥 *User Database* (${totalUsers} users)\n\n`;
  message += `🛡️ **Admins (${adminUsers.length}):**\n`;
  
  adminUsers.forEach((user, index) => {
    const name = user.firstName || 'Unknown';
    const username = user.username ? `@${user.username}` : 'No username';
    const isPrimary = user.id === RAYBEN_ID ? ' 👑' : '';
    message += `${index + 1}. ${name} (${username}) - ID: \`${user.id}\`${isPrimary}\n`;
  });
  
  message += `\n👤 **Regular Users (${totalUsers - adminUsers.length}):**\n`;
  const regularUsers = userList.filter(user => !user.isAdmin).slice(0, 20); // Limit to first 20
  
  regularUsers.forEach((user, index) => {
    const name = user.firstName || 'Unknown';
    const username = user.username ? `@${user.username}` : 'No username';
    message += `${index + 1}. ${name} (${username}) - ID: \`${user.id}\`\n`;
  });
  
  if (totalUsers - adminUsers.length > 20) {
    message += `... and ${totalUsers - adminUsers.length - 20} more users\n`;
  }
  
  message += `\n💡 Use /promote <user_id> to promote a user to admin`;
  message += `\n💡 Use /demote <user_id> to demote an admin`;
  message += `\n📝 Use /note <user_id> <note> to add notes`;
  
  ctx.replyWithMarkdownV2(message.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1'));
});

// Promote User Command (RayBen only)
bot.command('promote', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('promote', ctx.from.id);
  
  if (!isRayBen(ctx.from.id)) {
    return ctx.reply('⛔️ Only RayBen445 can promote users to admin.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    return ctx.reply('Usage: /promote <user_id>\nExample: /promote 123456789');
  }
  
  const targetUserId = parseInt(args[1]);
  if (isNaN(targetUserId)) {
    return ctx.reply('❌ Invalid user ID. Please provide a numeric user ID.');
  }
  
  const result = await promoteToAdmin(targetUserId, ctx.from.id);
  
  if (result.success) {
    const user = users[targetUserId.toString()];
    const userName = user.firstName || 'Unknown User';
    ctx.reply(`✅ ${userName} (ID: ${targetUserId}) has been promoted to admin!`);
    
    // Notify the promoted user
    try {
      await bot.telegram.sendMessage(targetUserId, '🎉 Congratulations! You have been promoted to admin by RayBen445.');
    } catch (error) {
      console.log('Could not notify promoted user:', error.message);
    }
  } else {
    ctx.reply(`❌ ${result.error}`);
  }
});

// Demote Admin Command (RayBen only)
bot.command('demote', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('demote', ctx.from.id);
  
  if (!isRayBen(ctx.from.id)) {
    return ctx.reply('⛔️ Only RayBen445 can demote admins.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    return ctx.reply('Usage: /demote <user_id>\nExample: /demote 123456789');
  }
  
  const targetUserId = parseInt(args[1]);
  if (isNaN(targetUserId)) {
    return ctx.reply('❌ Invalid user ID. Please provide a numeric user ID.');
  }
  
  const result = await demoteAdmin(targetUserId, ctx.from.id);
  
  if (result.success) {
    const user = users[targetUserId.toString()];
    const userName = user.firstName || 'Unknown User';
    ctx.reply(`✅ ${userName} (ID: ${targetUserId}) has been demoted from admin.`);
    
    // Notify the demoted user
    try {
      await bot.telegram.sendMessage(targetUserId, '📉 You have been demoted from admin by RayBen445.');
    } catch (error) {
      console.log('Could not notify demoted user:', error.message);
    }
  } else {
    ctx.reply(`❌ ${result.error}`);
  }
});

// Admin Panel Command
bot.command('admin', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('admin', ctx.from.id);
  if (!isAdmin(ctx.from.id)) {
    return ctx.replyWithMarkdownV2('⛔️ *Access Denied*\\n\\n🛡️ This command is reserved for administrators only\\.');
  }

  const buttons = [
    [{ text: '📊 View Stats', callback_data: 'admin_stats' }],
    [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
    [{ text: '🆘 Support Requests', callback_data: 'admin_support' }],
    [{ text: '⚡ Command Stats', callback_data: 'admin_commands' }],
    [{ text: '👑 Top Users', callback_data: 'admin_topusers' }],
    [{ text: '🔧 API Status', callback_data: 'admin_api_status' }]
  ];
  
  // Add user management buttons for RayBen445
  if (isRayBen(ctx.from.id)) {
    buttons.push([{ text: '👥 Manage Users', callback_data: 'admin_users' }]);
    buttons.push([{ text: '📊 Full Analytics', callback_data: 'admin_analytics' }]);
  }

  ctx.replyWithMarkdownV2('🛡️ *Admin Control Panel*\\n\\n✨ Welcome to the administrative dashboard\\!', {
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});

// Unknown Command Handler (catch-all)
bot.command('*', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('unknown', ctx.from.id);
  const command = ctx.message.text.split(' ')[0];
  ctx.replyWithMarkdownV2(
    `❓ *Unknown Command*\\n\\n` +
    `The command \`${escapeMarkdownV2(command)}\` is not recognized\\.\\n\\n` +
    `🆘 *Available Commands:*\\n` +
    `• /help \\- View all commands\\n` +
    `• /about \\- Learn about Cool Shot AI\\n` +
    `• /buttons \\- Quick action menu\\n` +
    `• /games \\- Fun activities\\n` +
    `• /tools \\- Text utilities\\n` +
    `• /start \\- Welcome message\\n\\n` +
    `💡 *Tip:* Use /help to see the complete command list\\!`
  );
});

// ========== NEW NON-API FEATURES ==========

// Bot Analytics Dashboard (Admin Only)
bot.command('analytics', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('analytics', ctx.from.id);
  
  if (!isAdmin(ctx.from.id)) {
    return ctx.replyWithMarkdownV2('⛔️ *Access Denied*\\n\\nOnly administrators can view analytics\\.');
  }
  
  const uptime = Math.floor((Date.now() - new Date(analytics.botStartTime)) / (1000 * 60 * 60 * 24));
  const totalUsers = Object.keys(users).length;
  const activeToday = Object.values(users).filter(u => {
    const lastSeen = new Date(u.lastSeen);
    const today = new Date();
    return lastSeen.toDateString() === today.toDateString();
  }).length;
  
  // Top commands
  const topCommands = Object.entries(analytics.commandStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([cmd, count], i) => `${i + 1}\\. /${escapeMarkdownV2(cmd)} \\(${count} uses\\)`)
    .join('\\n');
  
  // Most active users
  const topUsers = Object.entries(analytics.userActivity)
    .sort(([,a], [,b]) => (b.messages + b.commands) - (a.messages + a.commands))
    .slice(0, 5)
    .map(([userId, activity], i) => {
      const user = users[userId];
      const name = user ? (user.firstName || 'Unknown') : 'Unknown';
      const total = activity.messages + activity.commands;
      return `${i + 1}\\. ${escapeMarkdownV2(name)} \\(${total} interactions\\)`;
    })
    .join('\\n');

  ctx.replyWithMarkdownV2(
    `📊 *Bot Analytics Dashboard*\\n\\n` +
    `⏰ **Uptime:** ${uptime} days\\n` +
    `👥 **Total Users:** ${totalUsers}\\n` +
    `🎯 **Active Today:** ${activeToday}\\n` +
    `💬 **Total Messages:** ${analytics.totalMessages}\\n` +
    `⚡ **Total Commands:** ${analytics.totalCommands}\\n\\n` +
    `🏆 **Top Commands:**\\n${topCommands || 'No data'}\\n\\n` +
    `👑 **Most Active Users:**\\n${topUsers || 'No data'}\\n\\n` +
    `✨ _Analytics powered by Cool Shot Systems_`
  );
});

// User Activity Command (Admin Only)
bot.command('activity', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('activity', ctx.from.id);
  
  if (!isAdmin(ctx.from.id)) {
    return ctx.replyWithMarkdownV2('⛔️ *Access Denied*\\n\\nOnly administrators can view user activity\\.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length === 2) {
    // Show specific user activity
    const targetUserId = args[1];
    const user = users[targetUserId];
    const activity = analytics.userActivity[targetUserId];
    
    if (!user) {
      return ctx.reply('❌ User not found in database.');
    }
    
    const totalActivity = activity ? (activity.messages + activity.commands) : 0;
    const messages = activity ? activity.messages : 0;
    const commands = activity ? activity.commands : 0;
    
    ctx.replyWithMarkdownV2(
      `👤 *User Activity Report*\\n\\n` +
      `📛 **Name:** ${escapeMarkdownV2(user.firstName || 'Unknown')}\\n` +
      `🆔 **ID:** \`${user.id}\`\\n` +
      `👤 **Username:** ${user.username ? `@${escapeMarkdownV2(user.username)}` : 'No username'}\\n` +
      `🛡️ **Admin:** ${user.isAdmin ? '✅ Yes' : '❌ No'}\\n\\n` +
      `📊 **Activity Stats:**\\n` +
      `💬 Messages: ${messages}\\n` +
      `⚡ Commands: ${commands}\\n` +
      `🎯 Total: ${totalActivity}\\n\\n` +
      `📅 **Dates:**\\n` +
      `🆕 First Seen: ${escapeMarkdownV2(new Date(user.firstSeen).toLocaleDateString())}\\n` +
      `👁️ Last Seen: ${escapeMarkdownV2(new Date(user.lastSeen).toLocaleDateString())}\\n\\n` +
      `📝 **Notes:** ${escapeMarkdownV2(user.notes || 'No notes')}`
    );
  } else {
    // Show general activity overview
    const recentUsers = Object.values(users)
      .filter(u => {
        const lastSeen = new Date(u.lastSeen);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return lastSeen > threeDaysAgo;
      })
      .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
      .slice(0, 10);
    
    let message = `📈 *Recent User Activity*\\n\\n`;
    message += `🎯 **Active in last 3 days:** ${recentUsers.length}\\n\\n`;
    
    recentUsers.forEach((user, i) => {
      const name = user.firstName || 'Unknown';
      const username = user.username ? `@${user.username}` : 'No username';
      const isAdminBadge = user.isAdmin ? ' 🛡️' : '';
      message += `${i + 1}\\. ${escapeMarkdownV2(name)} \\(${escapeMarkdownV2(username)}\\)${isAdminBadge}\\n`;
    });
    
    message += `\\n💡 Use \`/activity <user_id>\` for detailed user stats`;
    
    ctx.replyWithMarkdownV2(message);
  }
});

// User Notes Management (RayBen445 Only)
bot.command('note', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('note', ctx.from.id);
  
  if (!isRayBen(ctx.from.id)) {
    return ctx.reply('⛔️ Only RayBen445 can manage user notes.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('Usage: /note <user_id> <note_text>\nExample: /note 123456789 Frequent user, very helpful');
  }
  
  const targetUserId = args[1];
  const noteText = args.slice(2).join(' ');
  
  if (!users[targetUserId]) {
    return ctx.reply('❌ User not found in database.');
  }
  
  users[targetUserId].notes = noteText;
  await saveUsers();
  
  const userName = users[targetUserId].firstName || 'Unknown User';
  ctx.reply(`✅ Note added for ${userName} (ID: ${targetUserId})\n📝 "${noteText}"`);
});

// Text Utilities Commands
bot.command('tools', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('tools', ctx.from.id);
  
  ctx.replyWithMarkdownV2(
    '🛠️ *Text Utilities Toolkit*\\n\\n' +
    '📝 **Available Tools:**\\n' +
    '• `/count <text>` \\- Count words and characters\\n' +
    '• `/reverse <text>` \\- Reverse text\\n' +
    '• `/upper <text>` \\- Convert to UPPERCASE\\n' +
    '• `/lower <text>` \\- Convert to lowercase\\n' +
    '• `/title <text>` \\- Convert To Title Case\\n' +
    '• `/encode <text>` \\- Base64 encode text\\n' +
    '• `/decode <text>` \\- Base64 decode text\\n\\n' +
    '💡 *Example:* `/count Hello World` will show character and word count'
  );
});

bot.command('count', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('count', ctx.from.id);
  
  const text = ctx.message.text.replace('/count ', '');
  if (!text || text === '/count') {
    return ctx.reply('Usage: /count <text>\nExample: /count Hello World');
  }
  
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  
  ctx.replyWithMarkdownV2(
    `📊 *Text Analysis Results*\\n\\n` +
    `📝 **Text:** "${escapeMarkdownV2(text)}"\\n\\n` +
    `🔢 **Statistics:**\\n` +
    `• Words: ${words}\\n` +
    `• Characters: ${chars}\\n` +
    `• Characters \\(no spaces\\): ${charsNoSpaces}\\n\\n` +
    `✨ _Analysis by Cool Shot Systems_`
  );
});

bot.command('reverse', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('reverse', ctx.from.id);
  
  const text = ctx.message.text.replace('/reverse ', '');
  if (!text || text === '/reverse') {
    return ctx.reply('Usage: /reverse <text>\nExample: /reverse Hello World');
  }
  
  const reversed = text.split('').reverse().join('');
  ctx.replyWithMarkdownV2(
    `🔄 *Text Reversal*\\n\\n` +
    `📝 **Original:** "${escapeMarkdownV2(text)}"\\n` +
    `🔄 **Reversed:** "${escapeMarkdownV2(reversed)}"\\n\\n` +
    `✨ _Powered by Cool Shot Systems_`
  );
});

bot.command('upper', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('upper', ctx.from.id);
  
  const text = ctx.message.text.replace('/upper ', '');
  if (!text || text === '/upper') {
    return ctx.reply('Usage: /upper <text>\nExample: /upper hello world');
  }
  
  ctx.replyWithMarkdownV2(
    `🔤 *UPPERCASE CONVERSION*\\n\\n` +
    `📝 **Original:** "${escapeMarkdownV2(text)}"\\n` +
    `🔤 **UPPERCASE:** "${escapeMarkdownV2(text.toUpperCase())}"\\n\\n` +
    `✨ _Powered by Cool Shot Systems_`
  );
});

bot.command('lower', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('lower', ctx.from.id);
  
  const text = ctx.message.text.replace('/lower ', '');
  if (!text || text === '/lower') {
    return ctx.reply('Usage: /lower <text>\nExample: /lower HELLO WORLD');
  }
  
  ctx.replyWithMarkdownV2(
    `🔡 *lowercase conversion*\\n\\n` +
    `📝 **Original:** "${escapeMarkdownV2(text)}"\\n` +
    `🔡 **lowercase:** "${escapeMarkdownV2(text.toLowerCase())}"\\n\\n` +
    `✨ _Powered by Cool Shot Systems_`
  );
});

bot.command('title', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('title', ctx.from.id);
  
  const text = ctx.message.text.replace('/title ', '');
  if (!text || text === '/title') {
    return ctx.reply('Usage: /title <text>\nExample: /title hello world');
  }
  
  const titleCase = text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
  
  ctx.replyWithMarkdownV2(
    `📄 *Title Case Conversion*\\n\\n` +
    `📝 **Original:** "${escapeMarkdownV2(text)}"\\n` +
    `📄 **Title Case:** "${escapeMarkdownV2(titleCase)}"\\n\\n` +
    `✨ _Powered by Cool Shot Systems_`
  );
});

bot.command('encode', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('encode', ctx.from.id);
  
  const text = ctx.message.text.replace('/encode ', '');
  if (!text || text === '/encode') {
    return ctx.reply('Usage: /encode <text>\nExample: /encode Hello World');
  }
  
  try {
    const encoded = Buffer.from(text, 'utf8').toString('base64');
    ctx.replyWithMarkdownV2(
      `🔐 *Base64 Encoding*\\n\\n` +
      `📝 **Original:** "${escapeMarkdownV2(text)}"\\n` +
      `🔐 **Encoded:** \`${escapeMarkdownV2(encoded)}\`\\n\\n` +
      `✨ _Powered by Cool Shot Systems_`
    );
  } catch (error) {
    ctx.reply('❌ Encoding failed. Please check your input.');
  }
});

bot.command('decode', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('decode', ctx.from.id);
  
  const text = ctx.message.text.replace('/decode ', '');
  if (!text || text === '/decode') {
    return ctx.reply('Usage: /decode <base64_text>\nExample: /decode SGVsbG8gV29ybGQ=');
  }
  
  try {
    const decoded = Buffer.from(text, 'base64').toString('utf8');
    ctx.replyWithMarkdownV2(
      `🔓 *Base64 Decoding*\\n\\n` +
      `🔐 **Encoded:** \`${escapeMarkdownV2(text)}\`\\n` +
      `🔓 **Decoded:** "${escapeMarkdownV2(decoded)}"\\n\\n` +
      `✨ _Powered by Cool Shot Systems_`
    );
  } catch (error) {
    ctx.reply('❌ Decoding failed. Please provide valid Base64 text.');
  }
});

// Games and Fun Features
bot.command('games', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('games', ctx.from.id);
  
  ctx.replyWithMarkdownV2(
    '🎮 *Cool Shot Games & Fun*\\n\\n' +
    '🎲 **Available Games:**\\n' +
    '• `/dice` \\- Roll a dice \\(1\\-6\\)\\n' +
    '• `/coin` \\- Flip a coin\\n' +
    '• `/number` \\- Random number \\(1\\-100\\)\\n' +
    '• `/8ball <question>` \\- Magic 8\\-ball\\n' +
    '• `/quote` \\- Get an inspirational quote\\n' +
    '• `/joke` \\- Random joke\\n' +
    '• `/fact` \\- Random fun fact\\n\\n' +
    '🎯 *Example:* `/8ball Will I be successful?`'
  );
});

bot.command('dice', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('dice', ctx.from.id);
  
  const roll = Math.floor(Math.random() * 6) + 1;
  const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][roll - 1];
  
  ctx.replyWithMarkdownV2(
    `🎲 *Dice Roll*\\n\\n` +
    `${diceEmoji} **You rolled:** ${roll}\\n\\n` +
    `🎯 _Good luck\\!_`
  );
});

bot.command('coin', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('coin', ctx.from.id);
  
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  const emoji = result === 'Heads' ? '🙂' : '🔄';
  
  ctx.replyWithMarkdownV2(
    `🪙 *Coin Flip*\\n\\n` +
    `${emoji} **Result:** ${result}\\n\\n` +
    `🎯 _Fate has decided\\!_`
  );
});

bot.command('number', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('number', ctx.from.id);
  
  const number = Math.floor(Math.random() * 100) + 1;
  
  ctx.replyWithMarkdownV2(
    `🔢 *Random Number*\\n\\n` +
    `🎯 **Your number:** ${number}\\n` +
    `📊 **Range:** 1 \\- 100\\n\\n` +
    `✨ _Generated by Cool Shot Systems_`
  );
});

bot.command('8ball', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('8ball', ctx.from.id);
  
  const question = ctx.message.text.replace('/8ball ', '');
  if (!question || question === '/8ball') {
    return ctx.reply('Usage: /8ball <question>\nExample: /8ball Will I be successful?');
  }
  
  const responses = [
    'It is certain', 'Reply hazy, try again', 'Don\'t count on it', 
    'It is decidedly so', 'Ask again later', 'My reply is no',
    'Without a doubt', 'Better not tell you now', 'My sources say no',
    'Yes definitely', 'Cannot predict now', 'Outlook not so good',
    'You may rely on it', 'Concentrate and ask again', 'Very doubtful',
    'As I see it, yes', 'Most likely', 'Outlook good',
    'Signs point to yes', 'Yes'
  ];
  
  const answer = responses[Math.floor(Math.random() * responses.length)];
  
  ctx.replyWithMarkdownV2(
    `🎱 *Magic 8\\-Ball*\\n\\n` +
    `❓ **Question:** "${escapeMarkdownV2(question)}"\\n` +
    `🔮 **Answer:** *${escapeMarkdownV2(answer)}*\\n\\n` +
    `✨ _The magic 8\\-ball has spoken\\!_`
  );
});

bot.command('quote', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('quote', ctx.from.id);
  
  const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" }
  ];
  
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  
  ctx.replyWithMarkdownV2(
    `💎 *Inspirational Quote*\\n\\n` +
    `"${escapeMarkdownV2(quote.text)}"\\n\\n` +
    `👤 *— ${escapeMarkdownV2(quote.author)}*\\n\\n` +
    `✨ _Inspiration by Cool Shot Systems_`
  );
});

bot.command('joke', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('joke', ctx.from.id);
  
  const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the programmer quit his job? Because he didn't get arrays!",
    "How do you organize a space party? You planet!",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "What do you call a fake noodle? An impasta!",
    "Why did the math book look so sad? Because it had too many problems!",
    "What's the best thing about Switzerland? I don't know, but the flag is a big plus!",
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "How does a penguin build its house? Igloos it together!",
    "Why don't robots ever panic? They have nerves of steel!"
  ];
  
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  
  ctx.replyWithMarkdownV2(
    `😂 *Random Joke*\\n\\n` +
    `🎭 ${escapeMarkdownV2(joke)}\\n\\n` +
    `😄 _Hope that made you smile\\!_`
  );
});

bot.command('fact', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('fact', ctx.from.id);
  
  const facts = [
    "Honey never spoils! Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.",
    "Octopuses have three hearts and blue blood!",
    "A group of flamingos is called a 'flamboyance'.",
    "Bananas are berries, but strawberries aren't!",
    "There are more possible games of chess than atoms in the observable universe.",
    "A shrimp's heart is in its head.",
    "Butterflies taste with their feet.",
    "The human brain uses about 20% of the body's total energy.",
    "Lightning strikes the Earth about 100 times per second.",
    "A single cloud can weigh more than a million pounds!"
  ];
  
  const fact = facts[Math.floor(Math.random() * facts.length)];
  
  ctx.replyWithMarkdownV2(
    `🧠 *Fun Fact*\\n\\n` +
    `💡 ${escapeMarkdownV2(fact)}\\n\\n` +
    `🤓 _Learn something new every day\\!_`
  );
});

// Bot Stats Command (Enhanced)
bot.command('stats', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('stats', ctx.from.id);
  
  const uptime = Math.floor((Date.now() - new Date(analytics.botStartTime)) / (1000 * 60 * 60));
  const uptimeDays = Math.floor(uptime / 24);
  const uptimeHours = uptime % 24;
  
  const totalUsers = Object.keys(users).length;
  const totalAdmins = getAdminUsers().length;
  const activeToday = Object.values(users).filter(u => {
    const lastSeen = new Date(u.lastSeen);
    const today = new Date();
    return lastSeen.toDateString() === today.toDateString();
  }).length;
  
  const userRole = userRoles[ctx.from.id] || 'Brain Master';
  const userLang = userLanguages[ctx.from.id] || 'en';
  const langLabel = languages.find(l => l.code === userLang)?.label || '🇬🇧 English';
  
  ctx.replyWithMarkdownV2(
    `📊 *Cool Shot AI Statistics*\\n\\n` +
    `⏰ **Bot Uptime:** ${uptimeDays}d ${uptimeHours}h\\n` +
    `👥 **Total Users:** ${totalUsers}\\n` +
    `🛡️ **Administrators:** ${totalAdmins}\\n` +
    `🎯 **Active Today:** ${activeToday}\\n` +
    `💬 **Total Messages:** ${analytics.totalMessages}\\n` +
    `⚡ **Total Commands:** ${analytics.totalCommands}\\n\\n` +
    `👤 **Your Settings:**\\n` +
    `🧠 Role: ${escapeMarkdownV2(userRole)}\\n` +
    `🌐 Language: ${escapeMarkdownV2(langLabel)}\\n\\n` +
    `✨ _Powered by Cool Shot Systems_`
  );
});

// Command Usage Statistics (Admin Only)
bot.command('commands', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('commands', ctx.from.id);
  
  if (!isAdmin(ctx.from.id)) {
    return ctx.replyWithMarkdownV2('⛔️ *Access Denied*\\n\\nOnly administrators can view command statistics\\.');
  }
  
  const sortedCommands = Object.entries(analytics.commandStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15);
  
  let message = `⚡ *Command Usage Statistics*\\n\\n`;
  message += `📊 **Total Commands Executed:** ${analytics.totalCommands}\\n\\n`;
  message += `🏆 **Top Commands:**\\n`;
  
  sortedCommands.forEach(([command, count], index) => {
    const percentage = ((count / analytics.totalCommands) * 100).toFixed(1);
    message += `${index + 1}\\. /${escapeMarkdownV2(command)} \\- ${count} uses \\(${percentage}%\\)\\n`;
  });
  
  if (sortedCommands.length === 0) {
    message += `No command data available yet\\.`;
  }
  
  message += `\\n✨ _Analytics by Cool Shot Systems_`;
  
  ctx.replyWithMarkdownV2(message);
});

// Top Users Command (Admin Only)  
bot.command('topusers', async (ctx) => {
  await updateUserInfo(ctx);
  await trackCommand('topusers', ctx.from.id);
  
  if (!isAdmin(ctx.from.id)) {
    return ctx.replyWithMarkdownV2('⛔️ *Access Denied*\\n\\nOnly administrators can view top users\\.');
  }
  
  const userStats = Object.entries(analytics.userActivity)
    .map(([userId, activity]) => ({
      user: users[userId],
      total: activity.messages + activity.commands,
      messages: activity.messages,
      commands: activity.commands
    }))
    .filter(entry => entry.user)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  let message = `👑 *Most Active Users*\\n\\n`;
  
  userStats.forEach((entry, index) => {
    const name = entry.user.firstName || 'Unknown';
    const username = entry.user.username ? `@${entry.user.username}` : 'No username';
    const isAdminBadge = entry.user.isAdmin ? ' 🛡️' : '';
    message += `${index + 1}\\. ${escapeMarkdownV2(name)} \\(${escapeMarkdownV2(username)}\\)${isAdminBadge}\\n`;
    message += `   💬 ${entry.messages} msgs \\| ⚡ ${entry.commands} cmds \\| 🎯 ${entry.total} total\\n\\n`;
  });
  
  if (userStats.length === 0) {
    message += `No user activity data available yet\\.`;
  }
  
  message += `✨ _Rankings by Cool Shot Systems_`;
  
  ctx.replyWithMarkdownV2(message);
});

// ========== Callback Query Handler ==========
bot.on('callback_query', async (ctx) => {
  await updateUserInfo(ctx);
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  // Role selection
  if (data.startsWith('role_')) {
    const role = data.replace('role_', '');
    userRoles[userId] = role;
    await ctx.editMessageText(
      `🧠 *Role Updated Successfully*\\n\\n` +
      `✅ Your new expert role: *${escapeMarkdownV2(role)}*\\n\\n` +
      `🚀 AI responses will now be tailored to this expertise\\!`, 
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery(`🎯 Role set to ${role}`);
  }
  // Language selection
  else if (data.startsWith('lang_')) {
    const lang = data.replace('lang_', '');
    userLanguages[userId] = lang;
    const label = languages.find(l => l.code === lang)?.label || lang;
    await ctx.editMessageText(
      `🌍 *Language Updated Successfully*\\n\\n` +
      `✅ Your new language: ${escapeMarkdownV2(label)}\\n\\n` +
      `🗣️ AI responses will now be in your selected language\\!`, 
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery(`🌐 Language set to ${label}`);
  }
  // Quick Buttons
  else if (data === 'show_role') {
    await ctx.editMessageText('🧠 *Choose Your Expert Role*\\n\\n💡 Select a role to customize AI responses:', {
      reply_markup: {
        inline_keyboard: chunkArray(roles, 4).map(row =>
          row.map(r => ({ text: r, callback_data: `role_${r}` }))
        )
      },
      parse_mode: 'MarkdownV2'
    });
    ctx.answerCbQuery();
  }
  else if (data === 'show_lang') {
    await ctx.editMessageText('🌍 *Choose Your Language*\\n\\n🗣️ Select your preferred language for responses:', {
      reply_markup: {
        inline_keyboard: chunkArray(languages, 3).map(row =>
          row.map(l => ({ text: l.label, callback_data: `lang_${l.code}` }))
        )
      },
      parse_mode: 'MarkdownV2'
    });
    ctx.answerCbQuery();
  }
  else if (data === 'show_about') {
    await ctx.editMessageText(
      "ℹ️ *About Cool Shot AI*\\n\\n" +
      "🤖 Developed by *Cool Shot Systems*\\n💡 Multi-role intelligent assistant powered by AI endpoints\\n🌐 15+ languages supported\\n🧠 100+ Knowledge Roles\\n\\n" +
      "🎓 Use /role and /lang\\n🛠️ Use /buttons for quick settings\\n🔄 Use /reset to reset settings\\n🆘 Use /support <your message> for support",
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery();
  }
  else if (data === 'do_reset') {
    delete userRoles[userId];
    delete userLanguages[userId];
    await ctx.editMessageText(
      '🔄 *Settings Reset Complete*\\n\\n' +
      '✅ Role: Default \\(Brain Master\\)\\n' +
      '✅ Language: Default \\(English\\)\\n\\n' +
      '💡 Use /role and /lang to customize again\\!',
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('✨ Settings reset successfully!');
  }
  else if (data === 'start_support') {
    supportState[userId] = true;
    await ctx.answerCbQuery('🆘 Support mode activated!');
    await ctx.editMessageText(
      '🆘 *Support Request Mode*\\n\\n' +
      '💬 Please type your support query\\. Your message will be sent directly to our admin team\\!\\n\\n' +
      '⚡ *Response Time:* Typically within a few hours',
      { parse_mode: 'MarkdownV2' }
    );
  }
  else if (data === 'ping_cmd') {
    await ctx.answerCbQuery('🏓 System online!');
    await ctx.editMessageText('🏓 *Cool Shot AI Status: ONLINE*\\n\\n✅ All systems operational\\!', { parse_mode: 'MarkdownV2' });
  }
  else if (data === 'help_cmd') {
    await ctx.answerCbQuery();
    await ctx.replyWithMarkdownV2(
      "🆘 *Cool Shot AI Help*\\n\\n" +
      "• Use /start to see welcome\\n• /role to pick your expert mode\\n• /lang for language\\n• /about for info\\n• /reset for a fresh start\\n• /buttons for quick menu\\n• /games for fun activities\\n• /tools for text utilities\\n• /stats for bot statistics\\n• /support <your message> if you need help\\n• /ping to check bot status"
    );
  }
  // New feature callbacks
  else if (data === 'show_games') {
    await ctx.editMessageText(
      '🎮 *Cool Shot Games & Fun*\\n\\n' +
      '🎲 **Available Games:**\\n' +
      '• `/dice` \\- Roll a dice \\(1\\-6\\)\\n' +
      '• `/coin` \\- Flip a coin\\n' +
      '• `/number` \\- Random number \\(1\\-100\\)\\n' +
      '• `/8ball <question>` \\- Magic 8\\-ball\\n' +
      '• `/quote` \\- Get an inspirational quote\\n' +
      '• `/joke` \\- Random joke\\n' +
      '• `/fact` \\- Random fun fact\\n\\n' +
      '🎯 *Example:* `/8ball Will I be successful?`',
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('🎮 Games menu loaded');
  }
  else if (data === 'show_tools') {
    await ctx.editMessageText(
      '🛠️ *Text Utilities Toolkit*\\n\\n' +
      '📝 **Available Tools:**\\n' +
      '• `/count <text>` \\- Count words and characters\\n' +
      '• `/reverse <text>` \\- Reverse text\\n' +
      '• `/upper <text>` \\- Convert to UPPERCASE\\n' +
      '• `/lower <text>` \\- Convert to lowercase\\n' +
      '• `/title <text>` \\- Convert To Title Case\\n' +
      '• `/encode <text>` \\- Base64 encode text\\n' +
      '• `/decode <text>` \\- Base64 decode text\\n\\n' +
      '💡 *Example:* `/count Hello World` will show character and word count',
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('🛠️ Text tools loaded');
  }
  else if (data === 'show_stats') {
    const uptime = Math.floor((Date.now() - new Date(analytics.botStartTime)) / (1000 * 60 * 60));
    const uptimeDays = Math.floor(uptime / 24);
    const uptimeHours = uptime % 24;
    
    const totalUsers = Object.keys(users).length;
    const totalAdmins = getAdminUsers().length;
    const activeToday = Object.values(users).filter(u => {
      const lastSeen = new Date(u.lastSeen);
      const today = new Date();
      return lastSeen.toDateString() === today.toDateString();
    }).length;
    
    const userRole = userRoles[ctx.from.id] || 'Brain Master';
    const userLang = userLanguages[ctx.from.id] || 'en';
    const langLabel = languages.find(l => l.code === userLang)?.label || '🇬🇧 English';
    
    await ctx.editMessageText(
      `📊 *Cool Shot AI Statistics*\\n\\n` +
      `⏰ **Bot Uptime:** ${uptimeDays}d ${uptimeHours}h\\n` +
      `👥 **Total Users:** ${totalUsers}\\n` +
      `🛡️ **Administrators:** ${totalAdmins}\\n` +
      `🎯 **Active Today:** ${activeToday}\\n` +
      `💬 **Total Messages:** ${analytics.totalMessages}\\n` +
      `⚡ **Total Commands:** ${analytics.totalCommands}\\n\\n` +
      `👤 **Your Settings:**\\n` +
      `🧠 Role: ${escapeMarkdownV2(userRole)}\\n` +
      `🌐 Language: ${escapeMarkdownV2(langLabel)}\\n\\n` +
      `✨ _Powered by Cool Shot Systems_`,
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('📊 Stats updated');
  }
  // Admin Panel
  else if (data === 'show_admin') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Access denied - Admins only!', { show_alert: true });
      return;
    }
    
    const buttons = [
      [{ text: '📊 View Stats', callback_data: 'admin_stats' }],
      [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
      [{ text: '🆘 Support Requests', callback_data: 'admin_support' }],
      [{ text: '🔧 API Status', callback_data: 'admin_api_status' }]
    ];
    
    // Add user management for RayBen445
    if (isRayBen(ctx.from.id)) {
      buttons.push([{ text: '👥 Manage Users', callback_data: 'admin_users' }]);
    }
    
    await ctx.editMessageText('🛡️ *Admin Control Panel*\\n\\n✨ Welcome to the administrative dashboard\\!', {
      reply_markup: {
        inline_keyboard: buttons
      },
      parse_mode: 'MarkdownV2'
    });
    ctx.answerCbQuery('🛡️ Admin panel loaded');
  }
  // Admin Stats
  else if (data === 'admin_stats') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Access denied - Admins only!', { show_alert: true });
      return;
    }
    const totalUsers = Object.keys(users).length;
    const adminCount = getAdminUsers().length;
    const rolesSet = Object.keys(userRoles).length;
    const langsSet = Object.keys(userLanguages).length;
    
    await ctx.editMessageText(
      `📊 *System Statistics*\\n\\n` +
      `👥 **Total Users:** ${totalUsers}\\n` +
      `🛡️ **Administrators:** ${adminCount}\\n` +
      `🧠 **Custom Roles Set:** ${rolesSet}\\n` +
      `🌍 **Languages Set:** ${langsSet}\\n\\n` +
      `✨ *System Status:* All operational`,
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('📊 Stats updated');
  }
  // Admin Users List (RayBen only)
  else if (data === 'admin_users') {
    if (!isRayBen(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Only RayBen445 can view user list.', { show_alert: true });
      return;
    }
    
    const userList = Object.values(users);
    const totalUsers = userList.length;
    const adminUsers = userList.filter(user => user.isAdmin);
    
    let message = `👥 User Database (${totalUsers} total)\n\n`;
    message += `🛡️ Admins (${adminUsers.length}):\n`;
    
    adminUsers.forEach((user, index) => {
      const name = user.firstName || 'Unknown';
      const username = user.username ? `@${user.username}` : 'No username';
      const isPrimary = user.id === RAYBEN_ID ? ' 👑' : '';
      message += `${index + 1}. ${name} (${username})${isPrimary}\n`;
    });
    
    const regularUsers = userList.filter(user => !user.isAdmin).slice(0, 10); // Show first 10 non-admins
    message += `\n👤 Recent Users (${Math.min(10, totalUsers - adminUsers.length)} of ${totalUsers - adminUsers.length}):\n`;
    
    regularUsers.forEach((user, index) => {
      const name = user.firstName || 'Unknown';
      const username = user.username ? `@${user.username}` : 'No username';
      message += `${index + 1}. ${name} (${username})\n`;
    });
    
    if (totalUsers - adminUsers.length > 10) {
      message += `... and ${totalUsers - adminUsers.length - 10} more\n`;
    }
    
    message += `\nUse /users for full list and management options.`;
    
    await ctx.editMessageText(message);
    ctx.answerCbQuery();
  }
  // Admin Broadcast
  else if (data === 'admin_broadcast') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Access denied - Admins only!', { show_alert: true });
      return;
    }
    await ctx.editMessageText(
      '📢 *Broadcast System*\\n\\n' +
      '💡 To send a message to all users:\\n' +
      '`/broadcast <your message>`\\n\\n' +
      '📤 Your message will be delivered to all registered users\\.',
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('📢 Broadcast instructions shown');
  }
  // Admin Support Requests
  else if (data === 'admin_support') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Access denied - Admins only!', { show_alert: true });
      return;
    }
    await ctx.editMessageText(
      '🆘 *Support Request System*\\n\\n' +
      '💬 Support requests are forwarded directly to your Telegram DMs\\n\\n' +
      '📨 Check your private messages for incoming support queries\\.',
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('🆘 Support system info shown');
  }
  // New admin callbacks
  else if (data === 'admin_commands') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Access denied - Admins only!', { show_alert: true });
      return;
    }
    
    const sortedCommands = Object.entries(analytics.commandStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    let message = `⚡ *Command Usage Statistics*\\n\\n`;
    message += `📊 **Total Commands:** ${analytics.totalCommands}\\n\\n`;
    message += `🏆 **Top Commands:**\\n`;
    
    sortedCommands.forEach(([command, count], index) => {
      const percentage = ((count / analytics.totalCommands) * 100).toFixed(1);
      message += `${index + 1}\\. /${escapeMarkdownV2(command)} \\- ${count} uses \\(${percentage}%\\)\\n`;
    });
    
    if (sortedCommands.length === 0) {
      message += `No command data available yet\\.`;
    }
    
    await ctx.editMessageText(message, { parse_mode: 'MarkdownV2' });
    ctx.answerCbQuery('⚡ Command stats loaded');
  }
  else if (data === 'admin_topusers') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Access denied - Admins only!', { show_alert: true });
      return;
    }
    
    const userStats = Object.entries(analytics.userActivity)
      .map(([userId, activity]) => ({
        user: users[userId],
        total: activity.messages + activity.commands,
        messages: activity.messages,
        commands: activity.commands
      }))
      .filter(entry => entry.user)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
    
    let message = `👑 *Most Active Users*\\n\\n`;
    
    userStats.forEach((entry, index) => {
      const name = entry.user.firstName || 'Unknown';
      const username = entry.user.username ? `@${entry.user.username}` : 'No username';
      const isAdminBadge = entry.user.isAdmin ? ' 🛡️' : '';
      message += `${index + 1}\\. ${escapeMarkdownV2(name)}${isAdminBadge}\\n`;
      message += `   ${escapeMarkdownV2(username)} \\| 🎯 ${entry.total} interactions\\n\\n`;
    });
    
    if (userStats.length === 0) {
      message += `No user activity data available yet\\.`;
    }
    
    await ctx.editMessageText(message, { parse_mode: 'MarkdownV2' });
    ctx.answerCbQuery('👑 Top users loaded');
  }
  else if (data === 'admin_analytics') {
    if (!isRayBen(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Only RayBen445 can view full analytics!', { show_alert: true });
      return;
    }
    
    const uptime = Math.floor((Date.now() - new Date(analytics.botStartTime)) / (1000 * 60 * 60 * 24));
    const totalUsers = Object.keys(users).length;
    const activeToday = Object.values(users).filter(u => {
      const lastSeen = new Date(u.lastSeen);
      const today = new Date();
      return lastSeen.toDateString() === today.toDateString();
    }).length;
    
    // Top commands
    const topCommands = Object.entries(analytics.commandStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cmd, count], i) => `${i + 1}\\. /${escapeMarkdownV2(cmd)} \\(${count}\\)`)
      .join('\\n');
    
    await ctx.editMessageText(
      `📊 *Full Analytics Dashboard*\\n\\n` +
      `⏰ **Uptime:** ${uptime} days\\n` +
      `👥 **Total Users:** ${totalUsers}\\n` +
      `🎯 **Active Today:** ${activeToday}\\n` +
      `💬 **Total Messages:** ${analytics.totalMessages}\\n` +
      `⚡ **Total Commands:** ${analytics.totalCommands}\\n\\n` +
      `🏆 **Top Commands:**\\n${topCommands || 'No data'}\\n\\n` +
      `✨ _Full analytics for RayBen445_`,
      { parse_mode: 'MarkdownV2' }
    );
    ctx.answerCbQuery('📊 Full analytics loaded');
  }
  else if (data === 'admin_api_status') {
    let message = `🔧 *AI API Status Dashboard*\\n\\n`;
    
    // Check primary APIs
    message += `🎯 **Primary APIs \\(${aiAPIs.length}\\):**\\n`;
    for (let i = 0; i < aiAPIs.length; i++) {
      const url = aiAPIs[i];
      const apiName = url.includes('gpt4o') ? 'GPT\\-4o' : 
                     url.includes('geminiaipro') ? 'Gemini Pro' :
                     url.includes('meta-llama') ? 'Meta Llama' :
                     url.includes('copilot') ? 'Copilot' :
                     `API ${i + 1}`;
      message += `${i + 1}\\. ${apiName} \\- GiftedTech\\n`;
    }
    
    // Check Google Gemini status
    message += `\\n🤖 **Fallback API:**\\n`;
    if (geminiAI) {
      message += `✅ Google Gemini \\- *Configured & Ready*\\n`;
    } else {
      message += `⚠️ Google Gemini \\- *Not Configured*\\n`;
      message += `💡 Set GOOGLE\\_API\\_KEY to enable fallback\\n`;
    }
    
    message += `\\n📊 **API Flow:**\\n`;
    message += `1\\. Try all ${aiAPIs.length} primary APIs sequentially\\n`;
    message += `2\\. If all fail, use Google Gemini fallback\\n`;
    message += `3\\. If still no response, show helpful error\\n\\n`;
    
    message += `🛡️ **Brand Protection:**\\n`;
    message += `• All responses maintain Cool Shot AI identity\\n`;
    message += `• Comprehensive text replacement active\\n`;
    message += `• No external provider names visible\\n\\n`;
    
    message += `✨ _Cool Shot Systems API Management_`;
    
    await ctx.editMessageText(message, { parse_mode: 'MarkdownV2' });
    ctx.answerCbQuery('🔧 API status loaded');
  }
});

// ========== Utility Functions ==========

// Splits arrays into chunks for inline keyboards
function chunkArray(array, chunkSize) {
  const temp = [];
  for (let i = 0; i < array.length; i += chunkSize)
    temp.push(array.slice(i, i + chunkSize));
  return temp;
}

// ========== Webhook & Health Endpoints ==========
bot.telegram.setWebhook('https://prof-tech-mvai.onrender.com/telegram');
app.post('/telegram', bot.webhookCallback('/telegram'));
app.get('/telegram', (req, res) => {
  res.send('🔗 Telegram webhook endpoint is active (POST only)');
});
app.get('/ping', (req, res) => {
  res.status(200).send('🏓 Cool Shot AI server is alive!');
});

// ========== Start Server ==========
app.listen(PORT, async () => {
  console.log(`✅ Cool Shot AI is live at http://localhost:${PORT}`);
  
  // Initialize the admin system
  await initializeAdminSystem();
  console.log('🚀 Bot initialization complete!');
});
