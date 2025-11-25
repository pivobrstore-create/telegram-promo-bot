const TelegramBot = require('node-telegram-bot-api');
const { obterProdutoAmazon } = require('./amazonScraper');

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;

if (!TOKEN || !CHANNEL_ID || !AFFILIATE_LINK) {
  throw new Error("Configure BOT_TOKEN, CHANNEL_ID e AFFILIATE_LINK no Render.");
}

const bot = new TelegramBot(TOKEN, {
  polling: {
    autoStart: true,
    interval: 300,
    params: { timeout: 10 }
  }
});

bot.onText(/\/oferta (.+)/, async (msg, match) => {
  const linkProduto = match[1];

  try {
    const produto = await obterProdutoAmazon(linkProduto, AFFILIATE_LINK);

    if (!produto) {
      await bot.sendMessage(msg.chat.id, "❌ Erro ao gerar oferta.");
      return;
    }

    const legenda = `
🔥 TA NA HORA DE COMPRAR HEINNN! 🔥🔥

${produto.nome}

❌ R$ ${produto.precoAntigo}
✅ R$ ${produto.precoAtual}
💥 Desconto de ${produto.desconto}%

📦 ${produto.parcelamento}
🚚 ${produto.entrega}

${produto.tags}

🛒 COMPRE AQUI:
${produto.linkAfiliado}
`;

    try {
      await bot.sendPhoto(CHANNEL_ID, produto.imagem, { caption: legenda.trim() });
    } catch (imgError) {
      console.log("Falha ao enviar imagem, enviando texto...");
      await bot.sendMessage(CHANNEL_ID, legenda.trim());
    }

    await bot.sendMessage(msg.chat.id, "✅ Oferta publicada com sucesso!");

  } catch (e) {
    console.error("Erro geral:", e.message);
  }
});

console.log("✅ BOT AMAZON ONLINE");
