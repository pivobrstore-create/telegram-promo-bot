import TelegramBot from "node-telegram-bot-api";

const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;
const affiliateTag = process.env.AFFILIATE_TAG;

// Inicia o bot
const bot = new TelegramBot(TOKEN, { polling: true });

// Mensagem padrão
console.log("Bot iniciado...");

// ------------------- COMANDO /start -------------------
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Bot ativo! 🚀 Use /postar <mensagem> para enviar ao canal.");
});

// ------------------- COMANDO /postar -------------------
bot.onText(/\/postar (.+)/, (msg, match) => {
  const texto = match[1];

  bot.sendMessage(channelId, texto)
    .then(() => {
      bot.sendMessage(msg.chat.id, "✔️ Mensagem enviada ao canal!");
    })
    .catch((err) => {
      bot.sendMessage(msg.chat.id, "❌ Erro ao enviar:\n" + err.message);
    });
});

// ------------------- SE FOR SÓ TEXTO NORMAL -------------------
bot.on("message", (msg) => {
  if (msg.text.startsWith("/")) return; // evita conflito
});
