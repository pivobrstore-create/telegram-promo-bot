const TelegramBot = require('node-telegram-bot-api');
const { obterProdutoAmazon } = require('./amazonScraper');

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;

if (!TOKEN || !CHANNEL_ID || !AFFILIATE_LINK) {
  throw new Error("Configure BOT_TOKEN, CHANNEL_ID e AFFILIATE_LINK no Render.");
}

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/oferta (.+)/, async (msg, match) => {
  const linkProduto = match[1];

  const produto = await obterProdutoAmazon(linkProduto, AFFILIATE_LINK);

  if (!produto) {
    return bot.sendMessage(msg.chat.id, "❌ Não consegui montar a oferta desse produto.");
  }

  const legenda = `
${produto.intro} 🔥

${produto.nome}

${produto.story}

❌ R$ ${produto.precoAntigo}
✅ R$ ${produto.precoAtual}
💥 Desconto de ${produto.desconto}%

${produto.blocoDesconto}
${produto.escassez}

📦 ${produto.parcelamento}
🚚 ${produto.entrega}

${produto.tags}
`;

  await bot.sendPhoto(CHANNEL_ID, produto.imagem, {
    caption: legenda.trim(),
    reply_markup: {
      inline_keyboard: [[
        {
          text: "🛒 COMPRAR AGORA",
          url: produto.linkAfiliado
        }
      ]]
    }
  });

  await bot.sendMessage(msg.chat.id, "✅ Oferta publicada com IA avançada!");
});

console.log("✅ BOT AMAZON ONLINE – IA AVANÇADA DE COPY");
