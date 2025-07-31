// 🚀 Cool Shot AI - Telegram Bot (Node.js + Telegraf + Express)

const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

let userRoles = {};
let userLanguages = {};

const roles = [
  'Mathematician', 'Econometician', 'Doctor', 'Brain Master', 'Physicist',
  'Chemist', 'Biologist', 'Engineer', 'Philosopher', 'Psychologist',
  'Spiritual Advisor', 'AI Researcher', 'Teacher', 'Professor', 'Developer',
  'Data Scientist', 'Statistician', 'Entrepreneur', 'Journalist', 'History Expert',
  'Lawyer', 'Accountant', 'Investor', 'Startup Mentor', 'UX Designer',
  'Therapist', 'Nutritionist', 'Fitness Coach', 'Poet', 'Author',
  'Script Writer', 'Public Speaker', 'Game Developer', 'Ethical Hacker', 'Security Analyst',
  'DevOps Engineer', 'Cloud Expert', 'Geographer', 'Astronomer', 'Political Analyst',
  'Environmental Scientist', 'AI Lawyer', 'Robotics Engineer', 'Medical Researcher', 'Economist',
  'Agronomist', 'Anthropologist', 'Cryptographer', 'Quantum Physicist', 'Visionary',
  'Linguist', 'AI Trainer', 'Mobile Developer', 'Web Developer', 'Data Analyst',
  'System Admin', 'Logician', 'Neuroscientist', 'Ecologist', 'Marine Biologist',
  'Meteorologist', 'Cybersecurity Expert', 'Economics Tutor', 'Healthcare Consultant', 'Project Manager',
  'Content Creator', 'SEO Expert', 'Social Media Strategist', 'Pharmacologist', 'Dentist',
  'Veterinarian', 'Music Theorist', 'AI Ethicist', 'Language Tutor', 'Blockchain Developer',
  'Geneticist', 'Psychiatrist', 'UX Researcher', 'Game Designer', 'Legal Advisor',
  'Literary Critic', 'Cultural Analyst', 'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer',
  'AI Psychologist', 'Film Critic', 'Forensic Scientist', 'Statistic Tutor', 'AI Architect',
  'AI Philosopher', 'Hardware Engineer', 'Nutrition Coach', 'Space Scientist', 'Theologian'
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

const aiAPIs = [
  'https://api.giftedtech.co.ke/api/ai/gpt4o',
  'https://api.giftedtech.co.ke/api/ai/geminiaipro',
  'https://api.giftedtech.co.ke/api/ai/meta-llama',
  'https://api.giftedtech.co.ke/api/ai/copilot',
  'https://api.giftedtech.co.ke/api/ai/ai'
];

// 📩 TEXT MESSAGE HANDLER
bot.on('text', async (ctx) => {
  const input = ctx.message.text;
  const userId = ctx.from.id;
  if (input.startsWith('/')) return;

  const role = userRoles[userId] || 'Brain Master';
  const lang = userLanguages[userId] || 'en';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  await ctx.sendChatAction('typing');
  let response = '🤖 Sorry, I couldn’t generate a reply.';

  for (let url of aiAPIs) {
    try {
      const { data } = await axios.get(url, {
        params: { apikey: 'gifted', q: `${role}: ${input}`, lang },
        timeout: 8000
      });
      if (data.result) {
        const cleaned = data.result
          .replace(/Prof-Tech MVAI|Gifted\s*AI|ChatGPT|GiftedTech|OpenAI/gi, 'Cool Shot AI')
          .replace(/Cool Shot Designs\/Tech/gi, 'Cool Shot Systems')
          .replace(/I['’`]?m an AI language model/gi, "I'm Cool Shot AI, your intelligent assistant")
          .replace(/I was created by.*?[\\.\\n]/gi, "I was created by Cool Shot Systems.\\n")
          .replace(/[“”]/g, '"');

        response = `👨‍💻 *Cool Shot AI (Most Valued AI)*\n\n${cleaned}\n\n⏰ ${time}`;
        break;
      }
    } catch (err) {}
  }

  ctx.replyWithMarkdownV2(response);
});

// 🎬 COMMAND HANDLERS
bot.start((ctx) => {
  ctx.replyWithMarkdownV2(
    "👋 *Hello, I'm Cool Shot AI!*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*, your intelligent assistant is now online\\!\\n\\n" +
    "💡 Ask me anything:\\n🧮 Math | 💊 Health | 💻 Tech | 🎭 Creativity\\n\\n" +
    "🎓 Use /role to switch brain mode\\n🌐 Use /lang to choose language\\n🚀 Let’s go\\!"
  );
});

bot.command('about', (ctx) => {
  ctx.replyWithMarkdownV2(
    "ℹ️ *About Cool Shot AI*\\n\\n" +
    "🤖 Developed by *Cool Shot Systems*\\n💡 Multi-role intelligent assistant powered by AI endpoints\\n🌐 15+ languages supported\\n🧠 100+ Knowledge Roles\\n\\n" +
    "🎯 Use /role and /lang\\n🔄 Use /reset to reset settings"
  );
});

bot.command('reset', (ctx) => {
  const userId = ctx.from.id;
  delete userRoles[userId];
  delete userLanguages[userId];
  ctx.reply('🔄 Settings have been reset to default.');
});

bot.command('role', (ctx) => {
  ctx.reply('🧠 Choose a Brain Role:', {
    reply_markup: {
      inline_keyboard: roles.map((r, i) => [{ text: `${i + 1}. ${r}`, callback_data: `role_${r}` }])
    }
  });
});

bot.command('lang', (ctx) => {
  ctx.reply('🌍 Choose Language:', {
    reply_markup: {
      inline_keyboard: languages.map((l) => [{ text: l.label, callback_data: `lang_${l.code}` }])
    }
  });
});

// 🧠 CALLBACK QUERY HANDLER
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  if (data.startsWith('role_')) {
    const role = data.replace('role_', '');
    userRoles[userId] = role;
    await ctx.editMessageText(`🧠 Role switched to: *${role}*`, { parse_mode: 'Markdown' });
    ctx.answerCbQuery(`✅ Role set to ${role}`);
  } else if (data.startsWith('lang_')) {
    const lang = data.replace('lang_', '');
    userLanguages[userId] = lang;
    const label = languages.find(l => l.code === lang)?.label;
    await ctx.editMessageText(`🌍 Language switched to: *${label}*`, { parse_mode: 'Markdown' });
    ctx.answerCbQuery(`🌐 Language set to ${lang}`);
  }
});

// 🌐 WEBHOOK SETUP
bot.telegram.setWebhook('https://cool-shot-ai.onrender.com/telegram');
app.post('/telegram', bot.webhookCallback('/telegram'));
});

// 🔧 SERVER STATUS & CHAT ENDPOINT
app.get('/', (req, res) => {
  res.send('Cool Shot AI Server is Running ✅');
});

app.post('/chat', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

  const python = spawn('python3', ['model.py', prompt]);
  let output = '';
  python.stdout.on('data', data => output += data.toString());
  python.stderr.on('data', data => console.error('Python error:', data.toString()));
  python.on('close', code => {
    if (code !== 0) return res.status(500).json({ error: 'Model failed.' });
    res.json({ response: output.trim() });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Cool Shot AI is live at http://localhost:${PORT}`);
});
