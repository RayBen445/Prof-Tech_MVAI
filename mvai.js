// Prof-Tech MVAI - Telegram Bot (Node.js + Telegraf)

const { Telegraf } = require('telegraf');
const axios = require('axios');

// 🔐 Bot Token
const bot = new Telegraf('7886514278:AAEsK0lq5zh1Z8g7OQzWguoWxcRwVIw48A8');

// 🧠 Roles (50 intelligent minds)
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

// 🌐 AI API Endpoints
const aiAPIs = [
  'https://api.giftedtech.co.ke/api/ai/gpt4o',
  'https://api.giftedtech.co.ke/api/ai/geminiaipro',
  'https://api.giftedtech.co.ke/api/ai/meta-llama',
  'https://api.giftedtech.co.ke/api/ai/copilot',
  'https://api.giftedtech.co.ke/api/ai/ai'
];

// 💬 Chat Handler
bot.on('text', async (ctx) => {
  const input = ctx.message.text;
  const user = ctx.from.first_name || ctx.from.username || 'User';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let response = '🤖 Sorry, I couldn’t generate a reply.';

  await ctx.sendChatAction("typing");

  for (let url of aiAPIs) {
    try {
      const { data } = await axios.get(url, {
        params: { apikey: 'gifted', q: `${currentRole}: ${input}` },
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
          .replace(/I['’`]?m called Gifted AI/gi, "I'm Prof-Tech MVAI")
          .replace(/GiftedTech/gi, "Cool Shot Designs/Tech")
          .replace(/[“”]/g, '"');

        response = `💡 *Here's what I found:*\n\n${cleaned}\n\n🕓 ${time}`;
        break;
      }
    } catch (err) {
      // You may log errors here if needed
    }
  }

  ctx.replyWithMarkdown(response);
});

// 🚀 /start Command
bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `👋 *Hello, I'm Prof-Tech MVAI!*\n\n🤖 I'm your AI-powered assistant developed by *Cool Shot Designs/Tech*.\n\n💡 Ask me anything about:\n🧮 Math | 💊 Health | 📊 Economics | 💻 Tech | 🤯 Brain Logic\n\n🎓 Use /role to switch brain power.\nReady when you are! 🚀`
  );
});

// 🧠 /role Command
bot.command('role', (ctx) => {
  let msg = '*🧠 Choose a Brain Role:*\n\n';
  roles.forEach((role, i) => {
    msg += `/${i + 1} - ${role}\n`;
  });
  ctx.replyWithMarkdown(msg);
});

// 🎯 Role Switch Commands
roles.forEach((role, index) => {
  bot.command((index + 1).toString(), (ctx) => {
    currentRole = role;
    ctx.replyWithMarkdown(`✅ Role changed to *${currentRole}*`);
  });
});

// ✅ Launch
bot.launch();
console.log('🚀 Prof-Tech MVAI (Telegram Bot) is live!');
