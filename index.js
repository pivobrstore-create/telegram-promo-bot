import TelegramBot from "node-telegram-bot-api";

const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;

if (!token) {
  console.error("❌ ERRO: A variável BOT_TOKEN não está definida.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log("🚀 Bot iniciado com sucesso!");

// ------------------------- /start -------------------------
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Bot ativo! 🚀\nUse /postar <mensagem> para enviar ao canal."
  );
});

// ------------------------- /postar <texto> -------------------------
bot.onText(/\/postar (.+)/, (msg, match) => {
  const texto = match[1];

  if (!channelId) {
    return bot.sendMessage(msg.chat.id, "❌ ERRO: CHANNEL_ID não configurado.");
  }

  bot.sendMessage(channelId, texto)
    .then(() => bot.sendMessage(msg.chat.id, "✔️ Mensagem enviada ao canal!"))
    .catch((err) => bot.sendMessage(msg.chat.id, "❌ Erro: " + err.message));
});

// Ignora comandos e evita duplicações
bot.on("message", (msg) => {
  if (msg.text?.startsWith("/")) return;
});

// Finalização segura (Render reinicia corretamente)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
