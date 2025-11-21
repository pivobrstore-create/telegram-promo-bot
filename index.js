import express from "express";
import axios from "axios";
import { Telegraf } from "telegraf";

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Resolver link amzn.to para link real
async function resolveAmazonLink(url) {
  try {
    const res = await axios.get(url, { maxRedirects: 5 });
    return res.request.res.responseUrl;
  } catch {
    return url;
  }
}

// Buscar dados do produto na Rainforest
async function getProductData(url) {
  const response = await axios.get("https://api.rainforestapi.com/request", {
    params: {
      api_key: RAINFOREST_API_KEY,
      type: "product",
      url: url
    }
  });
  return response.data.product;
}

// Gerar texto da oferta no padrão solicitado
function gerarOferta(produto, link) {
  const titulo = produto.title;
  const precoAtual = produto.buybox_winner?.price?.value || 0;
  const precoAntigo = produto.buybox_winner?.price?.raw_old_price;

  let desconto = 0;
  if (precoAntigo) {
    const antigo = parseFloat(precoAntigo.replace("R$", "").replace(",", "."));
    desconto = Math.round(((antigo - precoAtual) / antigo) * 100);
  }

  const prime = produto.buybox_winner?.is_prime ? "🚚 Frete grátis Prime" : "";

  return `🔥 PRA FAZER ESTOQUEEEE!! 🔥

*${titulo}*

${precoAntigo ? `❌ R$ ${precoAntigo}` : ""}
✅ R$ ${precoAtual}
${desconto > 0 ? `(${desconto}% OFF automático)` : ""}

${prime}
⚠️ Pode subir a qualquer momento!

Compre aqui:
${link}`;
}

// Quando receber link
bot.on("text", async (ctx) => {
  const msg = ctx.message.text;

  if (!msg.includes("amazon") && !msg.includes("amzn.to")) {
    return ctx.reply("Envie um link da Amazon para gerar a oferta 🔥");
  }

  try {
    await ctx.reply("⏳ Gerando oferta profissional...");

    const linkReal = await resolveAmazonLink(msg);
    const produto = await getProductData(linkReal);
    const oferta = gerarOferta(produto, msg);
    const imagem = produto.images?.[0]?.link;

    // Envia no chat
    await ctx.replyWithPhoto({ url: imagem }, { caption: oferta, parse_mode: "Markdown" });

    // Envia no canal automaticamente
    await bot.telegram.sendPhoto(CHANNEL_ID, { url: imagem }, {
      caption: oferta,
      parse_mode: "Markdown"
    });

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Erro ao gerar oferta. Tente novamente.");
  }
});

// Servidor Render
app.get("/", (req, res) => res.send("BOT ONLINE"));
app.listen(process.env.PORT || 3000);

bot.launch();
