// Prof-Tech MVAI - Telegram Bot (Node.js + Telegraf + Express)

const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

const bot = new Telegraf('7886514278:AAEsK0lq5zh1Z8g7OQzWguoWxcRwVIw48A8');
const app = express();

app.use(bodyParser.json());

let userRoles = {}; // Store user roles
let userLanguages = {}; // Store user language choices

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
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'sw', label: 'Swahili' }
];

const aiAPIs = [
  'https://api.giftedtech.co.ke/api/ai/gpt4o',
  'https://api.giftedtech.co.ke/api/ai/geminiaipro',
  'https://api.giftedtech.co.ke/api/ai/meta-llama',
  'https://api.giftedtech.co.ke/api/ai/copilot',
  'https://api.giftedtech.co.ke/api/ai/ai'
];

bot.on('text', async (ctx) => {
  const input = ctx.message.text;
  const userId = ctx.from.id;
  const role = userRoles[userId] || 'Brain Master';
  const lang = userLanguages[userId] || 'en';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  await ctx.sendChatAction("typing");
  let response = '🤖 Sorry, I couldn’t generate a reply.';

  for (let url of aiAPIs) {
    try {
      const { data } = await axios.get(url, {
        params: { apikey: 'gifted', q: `${role}: ${input}`, lang },
        timeout: 8000
      });
      if (data.result) {
        const cleaned = data.result
          .replace(/ChatGPT/gi, "Prof-Tech MVAI")
          .replace(/Gifted\s*AI/gi, "Prof-Tech MVAI")
          .replace(/OpenAI/gi, "Cool Shot Designs/Tech")
          .replace(/I['’`]?m an AI language model/gi, "I'm Prof-Tech MVAI, your AI companion")
          .replace(/I am an AI developed by.*?[\.\n]/gi, "I'm Prof-Tech MVAI, built by Cool Shot Designs/Tech.\n")
          .replace(/I was created by.*?[\.\n]/gi, "I was created by Cool Shot Designs/Tech.\n")
          .replace(/GiftedTech/gi, "Cool Shot Designs/Tech")
          .replace(/[“”]/g, '"');

        response = `🤖 *Prof-Tech MVAI (Most Valued AI):*\n\n

${cleaned}

🕓 ${time}`;
        break;
      }
    } catch (err) {}
  }

  ctx.replyWithMarkdown(response);
});

bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `👋 *Hello, I'm Prof-Tech MVAI!*

🤖 I'm your AI-powered assistant developed by *Cool Shot Designs/Tech*.

💡 Ask me anything about:
🧮 Math | 💊 Health | 📊 Economics | 💻 Tech | 🤯 Brain Logic

🎓 Use /role to switch brain power.
🌐 Use /lang to change language.
Ready when you are! 🚀`
  );
});

bot.command('role', (ctx) => {
  ctx.reply('🧠 Choose a Brain Role:', {
    reply_markup: {
      inline_keyboard: roles.map((r, i) => [{ text: `${i + 1} - ${r}`, callback_data: `role_${r}` }])
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

bot.on('callback_query', (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  if (data.startsWith('role_')) {
    userRoles[userId] = data.replace('role_', '');
    ctx.answerCbQuery(`✅ Role set to ${userRoles[userId]}`);
  } else if (data.startsWith('lang_')) {
    userLanguages[userId] = data.replace('lang_', '');
    ctx.answerCbQuery(`🌐 Language set to ${userLanguages[userId]}`);
  }
});

bot.telegram.setWebhook('https://prof-tech-mvai.onrender.com/telegram');
app.use(bot.webhookCallback('/telegram'));

app.get('/', (req, res) => {
  res.send('Prof-Tech MVAI Server Running ✅');
});

app.listen(3000, () => {
  console.log('🌐 Express Server running at http://localhost:3000');
});
