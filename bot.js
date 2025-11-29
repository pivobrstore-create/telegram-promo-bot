require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { obterProdutoAmazon } = require('./amazonScraper');

// =====================
// VARIÁVEIS
// =====================
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;

if (!TOKEN || !CHANNEL_ID || !AFFILIATE_LINK) {
    throw new Error("Configure BOT_TOKEN, CHANNEL_ID e AFFILIATE_LINK no Render.");
}

// =====================
// BOT DO TELEGRAM
// =====================
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/oferta (.+)/, async (msg, match) => {
    const linkProduto = match[1];

    try {
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
`.trim();

        // =====================
        // PUBLICA NO CANAL
        // =====================
        await bot.sendPhoto(CHANNEL_ID, produto.imagem, {
            caption: legenda,
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: "🛒 COMPRAR AGORA",
                        url: produto.linkAfiliado
                    }
                ]]
            }
        });

        // Confirmação para o usuário que enviou o comando
        await bot.sendMessage(msg.chat.id, "✅ Oferta publicada com IA avançada!");

    } catch (erro) {
        console.log("❌ Erro no processamento:", erro.message);
        bot.sendMessage(msg.chat.id, "❌ Ocorreu um erro ao gerar a oferta.");
    }
});

// =====================
console.log("✅ BOT AMAZON TELEGRAM ONLINE – IA ATIVA");
