import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;
const affiliateTag = process.env.AFFILIATE_TAG;

// Inicializa o bot
const bot = new TelegramBot(token, { polling: true });

// Mensagem de boas-vindas
bot.on("message", (msg) => {
  bot.sendMessage(msg.chat.id, "Bot de ofertas iniciado com sucesso! 🔥");
});

// Função para enviar oferta para o canal
async function sendOffer() {
  try {
    const product = {
      title: "Oferta Teste 🔥",
      price: "R$ 99,90",
      link: `https://www.amazon.com.br/dp/B0CHXSGG6H?tag=${affiliateTag}`,
      image:
        "https://m.media-amazon.com/images/I/61u5X2rVJ1L._AC_SX522_.jpg",
    };

    const caption = `${product.title}\n💰 ${product.price}\n👉 ${product.link}`;

    await bot.sendPhoto(channelId, product.image, {
      caption: caption,
    });

    console.log("Oferta enviada com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar oferta:", error);
  }
}

// Envia a cada 30 minutos só para teste
setInterval(sendOffer, 30 * 60 * 1000);

