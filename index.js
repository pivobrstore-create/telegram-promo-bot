// ==============================
// index.js - BOT PROFISSIONAL
// PADRÃO DE POST SOLICITADO
// ==============================

import express from "express";
import axios from "axios";
import { Telegraf, Markup } from "telegraf";

// ==============================
// VARIÁVEIS DE AMBIENTE
// ==============================
const BOT_TOKEN = process.env.BOT_TOKEN;
const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN || !RAINFOREST_API_KEY || !CHANNEL_ID) {
  console.error("❌ Variáveis de ambiente não configuradas");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// ==============================
// FUNÇÕES AUXILIARES
// ==============================

async function expandLink(url) {
  try {
    const response = await axios.get(url, { maxRedirects: 5 });
    return response.request.res.responseUrl || url;
  } catch {
    return url;
  }
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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

function calcularDesconto(precoAntigo, precoAtual) {
  if (!precoAntigo || !precoAtual) return 0;
  return Math.round(((precoAntigo - precoAtual) / precoAntigo) * 100);
}

function gerarPost(produto, link) {
  const titulo = produto.title;
  const imagem = produto.images?.[0]?.link || null;

  const precoAtual = produto.buybox_winner?.price?.value || null;
  const precoAntigo = produto.buybox_winner?.price?.raw_old_price || null;

  const precoAntigoNumerico = precoAntigo
    ? parseFloat(precoAntigo.replace(/[R$ ]/g, '').replace(',', '.'))
    : null;

  const desconto = calcularDesconto(precoAntigoNumerico, precoAtual);

  const texto = `🔥 PRA FAZER ESTOQUEEEE!! 🔥\n\n` +
    `*${titulo}*\n\n` +
    `${precoAntigoNumerico ? `❌ ${formatCurrency(precoAntigoNumerico)}` : ''}\n` +
    `✅ ${formatCurrency(precoAtual)}\n` +
    `${desconto ? `(${desconto}% OFF)` : ''}\n\n` +
    `🚚 Frete grátis Prime\n` +
    `⚠️ Pode subir a qualquer momento!\n\n` +
    `Compre aqui:\n${link}`;

  return { texto, imagem };
}

// ==============================
// BOT PRINCIPAL
// ==============================

bot.on("text", async (ctx) => {
  const msg = ctx.message.text;

  if (!msg.includes("amazon") && !msg.includes("amzn.to")) {
    return ctx.reply("Envie um link da Amazon para gerar a oferta automática.");
  }

  try {
    const linkFinal = await expandLink(msg);
    const produto = await getProductData(linkFinal);

    const { texto, imagem } = gerarPost(produto, msg);

    const botoes = Markup.inlineKeyboard([
      Markup.button.url("🛒 COMPRAR AGORA", msg)
    ]);

    if (imagem) {
      await bot.telegram.sendPhoto(ctx.chat.id, imagem, {
        caption: texto,
        parse_mode: "Markdown",
        ...botoes
      });

      await bot.telegram.sendPhoto(CHANNEL_ID, imagem, {
        caption: texto,
        parse_mode: "Markdown",
        ...botoes
      });
    } else {
      await bot.telegram.sendMessage(ctx.chat.id, texto, {
        parse_mode: "Markdown",
        ...botoes
      });

      await bot.telegram.sendMessage(CHANNEL_ID, texto, {
        parse_mode: "Markdown",
        ...botoes
      });
    }

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Erro ao processar a oferta.");
  }
});

// ==============================
// SERVIDOR RENDER
// ==============================
app.get("/", (req, res) => res.send("BOT ONLINE ✅"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));

bot.launch();

// ==============================
// package.json
// ==============================
/*
{
  "name": "telegram-bot-promos",
  "version": "1.0.0",
  "description": "Bot Telegram Profissional de Ofertas Amazon",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "express": "^4.18.2",
    "telegraf": "^4.16.3"
  }
}
*/
