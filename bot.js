const TelegramBot = require('node-telegram-bot-api');
const { obterProdutoAmazon } = require('./amazonScraper');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
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
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' })
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('📱 Escaneie o QR Code para conectar o WhatsApp');
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado e pronto para repostar');
});

// ===== EVITAR DUPLICAÇÕES =====
if (!fs.existsSync('lastPost.json')) {
  fs.writeFileSync('lastPost.json', JSON.stringify({ texto: "" }));
}

// ===== COMANDO /OFERTA =====
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

  // PUBLICA NO TELEGRAM
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

  // ========= ENVIA PARA WHATSAPP =========
  try {

    const last = JSON.parse(fs.readFileSync('lastPost.json'));
    if (last.texto === legenda.trim()) return;

    const imageResponse = await axios.get(produto.imagem, { responseType: 'arraybuffer' });
    const media = new MessageMedia(
      'image/jpeg',
      Buffer.from(imageResponse.data).toString('base64')
    );

    await client.sendMessage(GRUPO_WHATSAPP, media, {
      caption: `${legenda.trim()}\n\n🛒 COMPRAR AGORA:\n${produto.linkAfiliado}`
    });

    fs.writeFileSync('lastPost.json', JSON.stringify({ texto: legenda.trim() }));

    console.log('📲 Oferta enviada para WhatsApp com sucesso!');

  } catch (erro) {
    console.log('Erro ao enviar para WhatsApp:', erro.message);
  }
});

console.log("✅ BOT AMAZON + WHATSAPP ONLINE – IA AVANÇADA ATIVA");
