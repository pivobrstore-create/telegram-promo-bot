const TelegramBot = require('node-telegram-bot-api');
const { getProductData } = require('./amazon');

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG;

if (!TOKEN || !CHANNEL_ID || !AFFILIATE_TAG) {
  throw new Error("Configure BOT_TOKEN, CHANNEL_ID e AFFILIATE_TAG.");
}

const bot = new TelegramBot(TOKEN, { polling: true });

function formatPost(p) {
  return `
🛒 ${p.title}

💰 Preço: R$ ${p.price}
❌ De: R$ ${p.oldPrice}
🔥 Desconto: ${p.discount}%

🏷️ Tags: ${p.tags.join(", ")}

📦 Comprar agora:
${p.affiliateLink}
`.trim();
}

bot.onText(/\/oferta (.+)/, async (msg, match) => {
  const link = match[1];
  const product = await getProductData(link, AFFILIATE_TAG);

  if (!product) {
    bot.sendMessage(msg.chat.id, "Erro ao coletar dados do produto.");
    return;
  }

  const mensagem = formatPost(product);
  await bot.sendMessage(CHANNEL_ID, mensagem);
  await bot.sendPhoto(CHANNEL_ID, product.image);
});

console.log("🟢 BOT Amazon Ofertas ONLINE");
