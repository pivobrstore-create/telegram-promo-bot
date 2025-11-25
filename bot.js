
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
  throw new Error("Defina BOT_TOKEN e CHANNEL_ID nas variáveis de ambiente.");
}

const bot = new TelegramBot(TOKEN, { polling: true });

function formatPromo(category, link) {
  return `
🔥 PROMOÇÃO EM ${category.toUpperCase()} 🔥

💥 Oferta especial detectada!
⏳ Pode acabar a qualquer momento.

👉 Garanta agora:
${link}

#promoção #${category.toLowerCase()} #desconto #oferta
`.trim();
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "🤖 BOT DE PROMOÇÕES ATIVO\n\n" +
    "Use:\n" +
    "/promo CATEGORIA LINK\n\n" +
    "Exemplo:\n" +
    "/promo tecnologia https://amazon.com/..."
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "📌 Comandos disponíveis:\n\n" +
    "/start - Inicia o bot\n" +
    "/help - Ajuda\n" +
    "/promo <categoria> <link> - Publicar promoção"
  );
});

bot.onText(/\/promo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split(" ");

  if (args.length < 2) {
    bot.sendMessage(chatId, "Uso correto: /promo CATEGORIA LINK");
    return;
  }

  const category = args[0];
  const link = args[1];
  const message = formatPromo(category, link);

  bot.sendMessage(CHANNEL_ID, message, { parse_mode: "HTML" })
    .then(() => bot.sendMessage(chatId, "✅ Promoção enviada ao canal!"))
    .catch(err => bot.sendMessage(chatId, "❌ Erro ao enviar promoção."));
});

console.log("BOT ONLINE...");
