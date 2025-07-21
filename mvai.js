// Prof-Tech MVAI - Telegram Bot (Node.js + Telegraf)

const { Telegraf } = require('telegraf');
const axios = require('axios');

// ✅ Use your testing bot token
const bot = new Telegraf('7886514278:AAEsK0lq5zh1Z8g7OQzWguoWxcRwVIw48A8');

// 🧠 Roles (50 intelligent capabilities)
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
  'Agronomist', 'Anthropologist', 'Cryptographer', 'Quantum Physicist', 'Visionary'
];

let currentRole = 'Brain Master';

// 🌐 AI Endpoints
const aiAPIs = [
  'https://api.giftedtech.co.ke/api/ai/gpt4o',
  'https://api.giftedtech.co.ke/api/ai/geminiaipro',
  'https://api.giftedtech.co.ke/api/ai/meta-llama',
  'https://api.giftedtech.co.ke/api/ai/copilot',
  'https://api.giftedtech.co.ke/api/ai/ai'
];

// 📩 Handle incoming messages
bot.on('text', async (ctx) => {
  const input = ctx.message.text;
  const user = ctx.from.first_name || ctx.from.username || 'User';
  const timestamp = new Date().toLocaleString();

  let response = '🤖 Could not generate a reply.';

  for (let url of aiAPIs) {
  try {
    const { data } = await axios.get(url, {
      params: { apikey: 'gifted', q: `${currentRole}: ${input}` },
      timeout: 8000
    });

    if (data.result) {
      let cleaned = data.result
        .replace(/ChatGPT/gi, "Prof-Tech MVAI")
        .replace(/Gifted\s*AI/gi, "Prof-Tech MVAI")
        .replace(/OpenAI/gi, "Cool Shot Designs/Tech")
        .replace(/I['’`]?m an AI language model/gi, "I'm Prof-Tech MVAI, your personal AI assistant")
        .replace(/I am an AI developed by.*?[\.\n]/gi, "I'm Prof-Tech MVAI, built by Cool Shot Designs/Tech.\n")
        .replace(/I was created by.*?[\.\n]/gi, "I was created by Cool Shot Designs/Tech.\n")
        .replace(/I['’`]?m called Gifted AI/gi, "I'm Prof-Tech MVAI")
        .replace(/GiftedTech/gi, "Cool Shot Designs/Tech")
        .replace(/[“”]/g, '"'); // Normalize curly quotes

      response = `🧠 *${currentRole}*\n\n${cleaned}\n\n🕓 ${timestamp}`;
      break;
    }
  } catch (err) {
    // You can log errors if needed: console.error(err);
  }
}

  ctx.replyWithMarkdown(response);
});

// 🚀 Start Command
bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `👋 *Welcome to Prof-Tech MVAI!*\n\n*Available Roles:* ${roles.length}\n_Current Role:_ *${currentRole}*\n\nType /role to change brain mode.\nAsk anything below 👇`
  );
});

// 🧠 /role Command - List Roles
bot.command('role', (ctx) => {
  let msg = '*🧠 Choose a Brain Role:*\n\n';
  roles.forEach((role, i) => {
    msg += `/${i + 1} - ${role}\n`;
  });
  ctx.replyWithMarkdown(msg);
});

// 🔁 Switch Role via Commands: /1 to /50
roles.forEach((role, index) => {
  bot.command((index + 1).toString(), (ctx) => {
    currentRole = role;
    ctx.replyWithMarkdown(`✅ Role changed to *${currentRole}*`);
  });
});

// 🚀 Launch Bot
bot.launch();
console.log('🚀 Prof-Tech MVAI (Telegram Bot) is live!');
