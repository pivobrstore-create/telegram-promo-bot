require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { obterProdutoAmazon } = require('./amazonScraper');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const axios = require('axios');
const fs = require('fs');

// ===== VARIÁVEIS =====
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const GRUPO_WHATSAPP = process.env.GRUPO_ID;

if (!TOKEN || !CHANNEL_ID || !AFFILIATE_LINK || !GRUPO_WHATSAPP) {
  throw new Error("Configure BOT_TOKEN, CHANNEL_ID, AFFILIATE_LINK e GRUPO_ID no Render.");
}

// ===== BOT TELEGRAM =====
const bot = new TelegramBot(TOKEN, { polling: true });

// ===== BOT WHATSAPP =====
let whatsappPronto = false;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR CODE REAL E LEGÍVEL
client.on('qr', async qr => {
  const qrImage = await QRCode.toDataURL(qr);
  console.log('📱 COPIE este link e cole no navegador para ver o QR Code:');
  console.log(qrImage);
});

// Quando conectar
client.on('ready', () => {
  whatsappPronto = true;
  console.log('✅ WhatsApp conectado e pronto para repostar');
});

// ===== CONTROLE DE DUPLICAÇÃO =====
if (!fs.existsSync('lastPost.json')) {
  fs.writeFileSync('lastPost.json', JSON.stringify({ texto: "" }));
}

// ===== COMANDO /OFERTA =====
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

    // ===== ENVIA PARA TELEGRAM =====
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

    await bot.sendMessage(msg.chat.id, "✅ Oferta publicada com IA avançada!");

    // ===== ENVIA PARA WHATSAPP =====
    if (!whatsappPronto) {
      console.log('⏳ WhatsApp ainda não está pronto. Aguarde conexão...');
      return;
    }

    const last = JSON.parse(fs.readFileSync('lastPost.json'));
    if (last.texto === legenda) return;

    const imageResponse = await axios.get(produto.imagem, { responseType: 'arraybuffer' });
    const media = new MessageMedia(
      'image/jpeg',
      Buffer.from(imageResponse.data).toString('base64')
    );

    await client.sendMessage(GRUPO_WHATSAPP, media, {
      caption: `${legenda}\n\n🛒 COMPRAR AGORA:\n${produto.linkAfiliado}`
    });

    fs.writeFileSync('lastPost.json', JSON.stringify({ texto: legenda }));
    console.log('📲 Oferta enviada para WhatsApp com sucesso!');

  } catch (erro) {
    console.log('❌ Erro no processamento:', erro.message);
  }
});

// ===== LOG FINAL =====
console.log("✅ BOT AMAZON + WHATSAPP ONLINE – IA AVANÇADA ATIVA");

// Inicializa WhatsApp
client.initialize();
