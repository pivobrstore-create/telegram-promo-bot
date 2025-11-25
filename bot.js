const TelegramBot = require('node-telegram-bot-api');
const { obterProdutoAmazon } = require('./amazonScraper');

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/oferta (.+)/, async (msg, match) => {
  const linkProduto = match[1];

  const produto = await obterProdutoAmazon(linkProduto, AFFILIATE_LINK);

  if (!produto) {
    bot.sendMessage(msg.chat.id, "Erro ao buscar produto.");
    return;
  }

  const legenda = `
🔥 TA NA HORA DE COMPRAR HEINNN! 🔥🔥

${produto.nome}

❌ R$${produto.precoAntigo}
✅ R$${produto.precoAtual}
💥 Desconto de ${produto.desconto}%

${produto.parcelamento}
(${produto.entrega})

${produto.tags}

🛒 Compre aqui:
${produto.linkAfiliado}
`;

  await bot.sendPhoto(CHANNEL_ID, produto.imagem, { caption: legenda });
  await bot.sendMessage(msg.chat.id, "✅ Oferta publicada!");
});

console.log("BOT AMAZON ONLINE");
