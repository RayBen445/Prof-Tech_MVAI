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
 * 
 * 4. Admin Features:
 *    - /admin command and admin panel access
 *    - /broadcast command for messaging all users
 *    - Support message routing and handling
 *    - User statistics and management
 *    - Comprehensive user database with persistent storage
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');

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
let users = {}; // { userId: { id, username, firstName, lastName, isAdmin, firstSeen, lastSeen } }

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
      lastSeen: now
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
      lastSeen: new Date().toISOString()
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

// ========== Support Query Flow State ==========
let supportState = {};

// ========== Main Text Handler ==========
bot.on('text', async (ctx, next) => {
  // Update user information
  await updateUserInfo(ctx);

  // Support query logic
  if (supportState[ctx.from.id]) {
    supportState[ctx.from.id] = false; // Reset state after receiving
    for (const adminId of getAdminIds()) {
      await bot.telegram.sendMessage(
        adminId,
        `📩 Support query from ${ctx.from.first_name || 'User'} (@${ctx.from.username || 'no_username'}) (${ctx.from.id}):\n${ctx.message.text}`
      );
    }
    return ctx.reply('✅ Your support query has been sent to the admin.');
  }

  // Support request via /support
  if (ctx.message.text.startsWith('/support ')) {
    const supportText = ctx.message.text.replace('/support ', '');
    for (const adminId of getAdminIds()) {
      await bot.telegram.sendMessage(adminId, `📩 Support request from ${ctx.from.first_name || 'User'} (@${ctx.from.username || 'no_username'}):\n${supportText}`);
    }
    return ctx.reply('✅ Your support request has been sent to the team.');
  }
  // Broadcast handler (admin only)
  if (ctx.message.text.startsWith('/broadcast ')) {
    if (!isAdmin(ctx.from.id)) return;
    const msg = ctx.message.text.replace('/broadcast ', '');
    for (const userId of USER_IDS) {
      await bot.telegram.sendMessage(userId, `📢 Admin Broadcast:\n${msg}`);
    }
    return ctx.reply('✅ Broadcast sent.');
  }

  // Unknown command handler
  const knownCommands = [
    '/start', '/role', '/lang', '/about', '/reset', '/support', '/buttons', '/admin', '/ping', '/help', 
    '/users', '/promote', '/demote', '/admininfo'
  ];
  if (
    ctx.message.text.startsWith('/') &&
    !knownCommands.includes(ctx.message.text.split(' ')[0])
  ) {
    return ctx.reply('❓ Unknown command. Type /help or /about for help or /buttons for quick actions.');
  }

  // Ignore *recognized* commands, let their handlers process
  if (knownCommands.includes(ctx.message.text.split(' ')[0])) {
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
        response = `👨‍💻 *Cool Shot AI \\(Cool Shot Systems\\)*\\n${cleaned}\\n⏰ ${time}`;
        break;
      }
    } catch (err) {
      console.error('❌ AI Request Failed:', err.message);
    }
  }
  ctx.replyWithMarkdownV2(response);
});

// ========== Commands ==========

// Start Command
bot.start(async (ctx) => {
  await updateUserInfo(ctx);
  ctx.replyWithMarkdownV2(
    "👋 *Hello, I'm Cool Shot AI!*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*, your intelligent assistant is now online!\\n\\n" +
    "💡 Ask me anything:\\n🧮 Math | 💊 Health | 💻 Tech | 🎭 Creativity\\n\\n" +
    "🎓 Use /role to switch brain mode\\n🌐 Use /lang to choose language\\n🛠️ Use /buttons for quick menu\\n🔄 Use /reset to reset settings\\n🆘 Use /support <your message> for support\\n🚀 Let's go!"
  );
});

// About Command
bot.command('about', async (ctx) => {
  await updateUserInfo(ctx);
  ctx.replyWithMarkdownV2(
    "ℹ️ *About Cool Shot AI*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*\\n💡 Multi-role intelligent assistant powered by AI endpoints\\n🌐 15+ languages supported\\n🧠 100+ Knowledge Roles\\n\\n" +
    "🎓 Use /role and /lang\\n🛠️ Use /buttons for quick settings\\n🔄 Use /reset to reset settings\\n🆘 Use /support <your message> for support"
  );
});

// Help Command
bot.command('help', async (ctx) => {
  await updateUserInfo(ctx);
  ctx.replyWithMarkdownV2(
    "🆘 *Cool Shot AI Help*\\n\\n" +
    "• Use /start to see welcome\\n• /role to pick your expert mode\\n• /lang for language\\n• /about for info\\n• /reset for a fresh start\\n• /buttons for quick menu\\n• /support <your message> if you need help\\n• /ping to check bot status"
  );
});

// Support Command
bot.command('support', async (ctx) => {
  await updateUserInfo(ctx);
  ctx.replyWithMarkdownV2(
    "🆘 *Cool Shot AI Support*\\n\\n" +
    "For help or feedback, contact support@coolshotsystems.com or type /support <your message> here.\\nAdmins will respond ASAP."
  );
});

// Ping Command for Telegram
bot.command('ping', async (ctx) => {
  await updateUserInfo(ctx);
  ctx.reply('🏓 Cool Shot AI is alive!');
});

// Reset Command
bot.command('reset', async (ctx) => {
  await updateUserInfo(ctx);
  const userId = ctx.from.id;
  delete userRoles[userId];
  delete userLanguages[userId];
  ctx.reply('🔄 Settings have been reset to default.');
});

// Role Selection
bot.command('role', async (ctx) => {
  await updateUserInfo(ctx);
  ctx.reply('🧠 Choose a Brain Role:', {
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
  ctx.reply('🌍 Choose Language:', {
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
  ctx.reply('⚙️ Quick Settings:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🧠 Choose Role', callback_data: 'show_role' }],
        [{ text: '🌍 Choose Language', callback_data: 'show_lang' }],
        [{ text: 'ℹ️ About', callback_data: 'show_about' }],
        [{ text: '🔄 Reset', callback_data: 'do_reset' }],
        [{ text: '🆘 Support', callback_data: 'start_support' }],
        [{ text: '🛡️ Admin Panel', callback_data: 'show_admin' }],
        [{ text: '🏓 Ping', callback_data: 'ping_cmd' }],
        [{ text: '🆘 Help', callback_data: 'help_cmd' }]
      ]
    }
  });
});

// Admin Info Command (for troubleshooting and setup)
bot.command('admininfo', async (ctx) => {
  await updateUserInfo(ctx);
  
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

// Users List Command (RayBen only)
bot.command('users', async (ctx) => {
  await updateUserInfo(ctx);
  
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
  
  ctx.replyWithMarkdownV2(message.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1'));
});

// Promote User Command (RayBen only)
bot.command('promote', async (ctx) => {
  await updateUserInfo(ctx);
  
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
  if (!isAdmin(ctx.from.id)) return ctx.reply('⛔️ Admins only.');

  const buttons = [
    [{ text: '📊 View Stats', callback_data: 'admin_stats' }],
    [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }],
    [{ text: '🆘 View Support Requests', callback_data: 'admin_support' }]
  ];
  
  // Add user management buttons for RayBen445
  if (isRayBen(ctx.from.id)) {
    buttons.push([{ text: '👥 View All Users', callback_data: 'admin_users' }]);
  }

  ctx.reply('🛡️ Admin Panel', {
    reply_markup: {
      inline_keyboard: buttons
    }
  });
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
    await ctx.editMessageText(`🧠 Role switched to: *${escapeMarkdownV2(role)}*`, { parse_mode: 'MarkdownV2' });
    ctx.answerCbQuery(`✅ Role set to ${role}`);
  }
  // Language selection
  else if (data.startsWith('lang_')) {
    const lang = data.replace('lang_', '');
    userLanguages[userId] = lang;
    const label = languages.find(l => l.code === lang)?.label || lang;
    await ctx.editMessageText(`🌍 Language switched to: *${escapeMarkdownV2(label)}*`, { parse_mode: 'MarkdownV2' });
    ctx.answerCbQuery(`🌐 Language set to ${lang}`);
  }
  // Quick Buttons
  else if (data === 'show_role') {
    await ctx.editMessageText('🧠 Choose a Brain Role:', {
      reply_markup: {
        inline_keyboard: chunkArray(roles, 4).map(row =>
          row.map(r => ({ text: r, callback_data: `role_${r}` }))
        )
      }
    });
    ctx.answerCbQuery();
  }
  else if (data === 'show_lang') {
    await ctx.editMessageText('🌍 Choose Language:', {
      reply_markup: {
        inline_keyboard: chunkArray(languages, 3).map(row =>
          row.map(l => ({ text: l.label, callback_data: `lang_${l.code}` }))
        )
      }
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
    await ctx.editMessageText('🔄 Settings have been reset to default.');
    ctx.answerCbQuery('Settings reset!');
  }
  else if (data === 'start_support') {
    supportState[userId] = true;
    await ctx.answerCbQuery();
    await ctx.reply('🆘 Please type your support query. I will send it to the admin.');
  }
  else if (data === 'ping_cmd') {
    await ctx.answerCbQuery();
    await ctx.reply('🏓 Cool Shot AI is alive!');
  }
  else if (data === 'help_cmd') {
    await ctx.answerCbQuery();
    await ctx.replyWithMarkdownV2(
      "🆘 *Cool Shot AI Help*\\n\\n" +
      "• Use /start to see welcome\\n• /role to pick your expert mode\\n• /lang for language\\n• /about for info\\n• /reset for a fresh start\\n• /buttons for quick menu\\n• /support <your message> if you need help\\n• /ping to check bot status"
    );
  }
  // Admin Panel
  else if (data === 'show_admin') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Admins only.', { show_alert: true });
      return;
    }
    await ctx.editMessageText('🛡️ Admin Panel', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 View Stats', callback_data: 'admin_stats' }],
          [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }],
          [{ text: '🆘 View Support Requests', callback_data: 'admin_support' }]
        ]
      }
    });
    ctx.answerCbQuery();
  }
  // Admin Stats
  else if (data === 'admin_stats') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Admins only.', { show_alert: true });
      return;
    }
    const totalUsers = Object.keys(users).length;
    const adminCount = getAdminUsers().length;
    await ctx.editMessageText(`📊 Stats:\nTotal Users: ${totalUsers}\nAdmins: ${adminCount}\nRoles set: ${Object.keys(userRoles).length}\nLanguages set: ${Object.keys(userLanguages).length}`);
    ctx.answerCbQuery();
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
      await ctx.answerCbQuery('⛔️ Admins only.', { show_alert: true });
      return;
    }
    await ctx.editMessageText('📢 Send your broadcast message as /broadcast <message>');
    ctx.answerCbQuery();
  }
  // Admin Support Requests (for demo, just info)
  else if (data === 'admin_support') {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Admins only.', { show_alert: true });
      return;
    }
    await ctx.editMessageText('🆘 Support requests are forwarded here as private messages. Check your Telegram DM.');
    ctx.answerCbQuery();
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
