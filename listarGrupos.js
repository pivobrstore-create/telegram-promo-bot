const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async qr => {
    const qrImage = await QRCode.toDataURL(qr);
    console.log("📱 ABRA ESSA URL NO NAVEGADOR PARA VER O QR:");
    console.log(qrImage);
});

client.on('ready', async () => {
    console.log("✅ WhatsApp conectado! Buscando grupos...\n");

    const chats = await client.getChats();

    chats.forEach(chat => {
        if (chat.isGroup) {
            console.log(`➡️ Grupo: ${chat.name}`);
            console.log(`   ID: ${chat.id._serialized}\n`);
        }
    });

    console.log("📌 Copie o ID correto do grupo e coloque no Render (GRUPO_ID).");
    process.exit();
});

client.initialize();
