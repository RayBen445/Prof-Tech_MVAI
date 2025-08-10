/**
 * Cool Shot AI Assistant Telegram Bot
 * Inspired by CS Assistant by Heritage Oladoye
 * Author: CoolShotSystems
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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

// ========== Admin Setup ==========
const ADMIN_IDS = [6649936329]; // Add more admin IDs as needed

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
  USER_IDS.add(ctx.from.id);

  // Support query logic
  if (supportState[ctx.from.id]) {
    supportState[ctx.from.id] = false; // Reset state after receiving
    for (const adminId of ADMIN_IDS) {
      await bot.telegram.sendMessage(
        adminId,
        `📩 Support query from @${ctx.from.username || ctx.from.id} (${ctx.from.id}):\n${ctx.message.text}`
      );
    }
    return ctx.reply('✅ Your support query has been sent to the admin.');
  }

  // Support request via /support
  if (ctx.message.text.startsWith('/support ')) {
    const supportText = ctx.message.text.replace('/support ', '');
    for (const adminId of ADMIN_IDS) {
      await bot.telegram.sendMessage(adminId, `📩 Support request from @${ctx.from.username || ctx.from.id}:\n${supportText}`);
    }
    return ctx.reply('✅ Your support request has been sent to the team.');
  }
  // Broadcast handler (admin only)
  if (ctx.message.text.startsWith('/broadcast ')) {
    if (!ADMIN_IDS.includes(ctx.from.id)) return;
    const msg = ctx.message.text.replace('/broadcast ', '');
    for (const userId of USER_IDS) {
      await bot.telegram.sendMessage(userId, `📢 Admin Broadcast:\n${msg}`);
    }
    return ctx.reply('✅ Broadcast sent.');
  }

  // Unknown command handler
  const knownCommands = [
    '/start', '/role', '/lang', '/about', '/reset', '/support', '/buttons', '/admin', '/ping', '/help'
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
bot.start((ctx) => {
  USER_IDS.add(ctx.from.id);
  ctx.replyWithMarkdownV2(
    "👋 *Hello, I'm Cool Shot AI!*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*, your intelligent assistant is now online!\\n\\n" +
    "💡 Ask me anything:\\n🧮 Math | 💊 Health | 💻 Tech | 🎭 Creativity\\n\\n" +
    "🎓 Use /role to switch brain mode\\n🌐 Use /lang to choose language\\n🛠️ Use /buttons for quick menu\\n🔄 Use /reset to reset settings\\n🆘 Use /support <your message> for support\\n🚀 Let's go!"
  );
});

// About Command
bot.command('about', (ctx) => {
  USER_IDS.add(ctx.from.id);
  ctx.replyWithMarkdownV2(
    "ℹ️ *About Cool Shot AI*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*\\n💡 Multi-role intelligent assistant powered by AI endpoints\\n🌐 15+ languages supported\\n🧠 100+ Knowledge Roles\\n\\n" +
    "🎓 Use /role and /lang\\n🛠️ Use /buttons for quick settings\\n🔄 Use /reset to reset settings\\n🆘 Use /support <your message> for support"
  );
});

// Help Command
bot.command('help', (ctx) => {
  USER_IDS.add(ctx.from.id);
  ctx.replyWithMarkdownV2(
    "🆘 *Cool Shot AI Help*\\n\\n" +
    "• Use /start to see welcome\\n• /role to pick your expert mode\\n• /lang for language\\n• /about for info\\n• /reset for a fresh start\\n• /buttons for quick menu\\n• /support <your message> if you need help\\n• /ping to check bot status"
  );
});

// Support Command
bot.command('support', (ctx) => {
  USER_IDS.add(ctx.from.id);
  ctx.replyWithMarkdownV2(
    "🆘 *Cool Shot AI Support*\\n\\n" +
    "For help or feedback, contact support@coolshotsystems.com or type /support <your message> here.\\nAdmins will respond ASAP."
  );
});

// Ping Command for Telegram
bot.command('ping', (ctx) => {
  ctx.reply('🏓 Cool Shot AI is alive!');
});

// Reset Command
bot.command('reset', (ctx) => {
  USER_IDS.add(ctx.from.id);
  const userId = ctx.from.id;
  delete userRoles[userId];
  delete userLanguages[userId];
  ctx.reply('🔄 Settings have been reset to default.');
});

// Role Selection
bot.command('role', (ctx) => {
  USER_IDS.add(ctx.from.id);
  ctx.reply('🧠 Choose a Brain Role:', {
    reply_markup: {
      inline_keyboard: chunkArray(roles, 4).map(row =>
        row.map(r => ({ text: r, callback_data: `role_${r}` }))
      )
    }
  });
});

// Language Selection
bot.command('lang', (ctx) => {
  USER_IDS.add(ctx.from.id);
  ctx.reply('🌍 Choose Language:', {
    reply_markup: {
      inline_keyboard: chunkArray(languages, 3).map(row =>
        row.map(l => ({ text: l.label, callback_data: `lang_${l.code}` }))
      )
    }
  });
});

// Quick Buttons
bot.command('buttons', (ctx) => {
  USER_IDS.add(ctx.from.id);
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

// Admin Panel Command
bot.command('admin', (ctx) => {
  USER_IDS.add(ctx.from.id);
  if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply('⛔️ Admins only.');

  ctx.reply('🛡️ Admin Panel', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 View Stats', callback_data: 'admin_stats' }],
        [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }],
        [{ text: '🆘 View Support Requests', callback_data: 'admin_support' }]
      ]
    }
  });
});

// ========== Callback Query Handler ==========
bot.on('callback_query', async (ctx) => {
  USER_IDS.add(ctx.from.id);
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
    if (!ADMIN_IDS.includes(ctx.from.id)) {
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
    if (!ADMIN_IDS.includes(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Admins only.', { show_alert: true });
      return;
    }
    await ctx.editMessageText(`📊 Stats:\nUsers: ${USER_IDS.size}\nRoles set: ${Object.keys(userRoles).length}\nLanguages set: ${Object.keys(userLanguages).length}`);
    ctx.answerCbQuery();
  }
  // Admin Broadcast
  else if (data === 'admin_broadcast') {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
      await ctx.answerCbQuery('⛔️ Admins only.', { show_alert: true });
      return;
    }
    await ctx.editMessageText('📢 Send your broadcast message as /broadcast <message>');
    ctx.answerCbQuery();
  }
  // Admin Support Requests (for demo, just info)
  else if (data === 'admin_support') {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
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
app.listen(PORT, () => {
  console.log(`✅ Cool Shot AI is live at http://localhost:${PORT}`);
});
