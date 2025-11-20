import express from "express";
import axios from "axios";
import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// -------------------------------
// 🔥 FUNÇÃO: Resolver links amzn.to
// -------------------------------
async function resolveAmazonLink(url) {
    try {
        const response = await axios.get(url, { maxRedirects: 5 });
        return response.request.res.responseUrl;
    } catch (e) {
        return url;
    }
}

// --------------------------------------------
// 🔥 FUNÇÃO: Buscar dados do produto (Rainforest API)
// --------------------------------------------
async function getAmazonData(productUrl) {
    const apiKey = process.env.RAINFOREST_API_KEY;

    const response = await axios.get("https://api.rainforestapi.com/request", {
        params: {
            api_key: apiKey,
            type: "product",
            url: productUrl
        }
    });

    return response.data.product;
}

// ----------------------------------------------------
// 🔥 FUNÇÃO: Gerar texto estilo Sopromos / Rei da Promo
// ----------------------------------------------------
function gerarTextoPromocional(produto, linkAfiliado) {
    const titulo = produto.title || "Produto Amazon";
    const precoAtual = produto.buybox_winner?.price?.value || 0;
    const precoAntigo = produto.buybox_winner?.price?.raw_old_price || null;

    let desconto = 0;
    if (precoAntigo) {
        desconto = Math.round(((precoAntigo - precoAtual) / precoAntigo) * 100);
    }

    // Gatilhos de escassez
    const escassez = [
        "🔥 Estoque extremamente limitado!",
        "⏳ Pode subir a qualquer momento!",
        "⚠️ Últimas unidades!",
        "🚨 Muito abaixo da média histórica!",
        "📉 Preço reduzido por tempo limitado!"
    ];

    const fraseEscassez = escassez[Math.floor(Math.random() * escassez.length)];

    return `
🔥🔥 *PRA FAZER ESTOQUEEEEE!* 🔥🔥

*${titulo}*

${precoAntigo ? `❌ DE *R$${precoAntigo}*` : ""}  
🔥 POR *R$${precoAtual}*

${desconto > 0 ? `🟢 *${desconto}% OFF AGORA!*` : ""}

${fraseEscassez}

🛒 *Compre com Desconto:*  
${linkAfiliado}

📦 Envio rápido | Produto Amazon  
    `.trim();
}

// -----------------------------
// 🔥 RECEBENDO O LINK DO USUÁRIO
// -----------------------------
bot.on("text", async (ctx) => {
    const msg = ctx.message.text;

    if (!msg.includes("amazon") && !msg.includes("amzn.to")) {
        return ctx.reply("Envie um link da Amazon para gerar a oferta automática 🔥");
    }

    try {
        await ctx.reply("⏳ Processando oferta…");

        const linkReal = await resolveAmazonLink(msg);
        const produto = await getAmazonData(linkReal);

        const texto = gerarTextoPromocional(produto, msg);
        const imagem = produto.images?.[0]?.link;

        if (imagem) {
            await ctx.replyWithPhoto({ url: imagem }, { caption: texto, parse_mode: "Markdown" });
        } else {
            await ctx.reply(texto, { parse_mode: "Markdown" });
        }

    } catch (err) {
        console.log("Erro:", err);
        ctx.reply("❌ Não consegui gerar a oferta. Tente novamente.");
    }
});

// -----------------------------
app.get("/", (req, res) => res.send("Bot rodando"));
app.listen(3000, () => console.log("Servidor ativo"));
bot.launch();
