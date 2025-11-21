// ==============================
// index.js - BOT PREMIUM PROFISSIONAL (CORRIGIDO)
// SEM ERROS DE SINTAXE
// ==============================

import express from "express";
import axios from "axios";
import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN || !RAINFOREST_API_KEY || !CHANNEL_ID) {
  console.error("❌ Configure BOT_TOKEN, RAINFOREST_API_KEY e CHANNEL_ID");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// Expande link amzn.to
async function expandLink(url) {
  try {
    const r = await axios.get(url, { maxRedirects: 5 });
    return r.request.res.responseUrl || url;
  } catch {
    return url;
  }
}

function brl(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function getProductData(url) {
  const r = await axios.get('https://api.rainforestapi.com/request', {
    params: {
      api_key: RAINFOREST_API_KEY,
      type: 'product',
      url: url
    }
  });
  return r.data.product;
}

function calcDiscount(oldPrice, newPrice) {
  if (!oldPrice || !newPrice) return null;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
}

function montarPost(produto, link) {
  const title = produto.title;
  const image = produto.images?.[0]?.link || null;
  const priceNow = produto.buybox_winner?.price?.value || 0;

  const rawOld = produto.buybox_winner?.price?.raw_old_price;
  const oldPrice = rawOld ? parseFloat(rawOld.replace(/[R$ ]/g, '').replace(',', '.')) : null;

  const percent = calcDiscount(oldPrice, priceNow);

  const texto = `🔥 PRA FAZER ESTOQUEEEE!! 🔥\n\n` +
  `*${title}*\n\n` +
  (oldPrice ? `❌ ${brl(oldPrice)}\n` : '') +
  `✅ ${brl(priceNow)}\n` +
  (percent ? `(${percent}% OFF automático)\n\n` : '\n') +
  `🚚 Frete grátis Prime\n` +
  `⚠️ Pode subir a qualquer momento!\n\n` +
  `Compre aqui:\n${link}`;

  return { texto, image };
}

bot.on('text', async (ctx) => {
  const msg = ctx.message.text;

  if (!msg.includes('amazon') && !msg.includes('amzn.to')) {
    return ctx.reply('Envie o link da Amazon para gerar oferta automática.');
  }

  try {
    const finalLink = await expandLink(msg);
    const produto = await getProductData(finalLink);
    const { texto, image } = montarPost(produto, msg);

    const keyboard = Markup.inlineKeyboard([
      Markup.button.url('🛒 COMPRAR AGORA', msg)
    ]);

    if (image) {
      await bot.telegram.sendPhoto(ctx.chat.id, image, { caption: texto, parse_mode: 'Markdown', ...keyboard });
      await bot.telegram.sendPhoto(CHANNEL_ID, image, { caption: texto, parse_mode: 'Markdown', ...keyboard });
    } else {
      await bot.telegram.sendMessage(ctx.chat.id, texto, { parse_mode: 'Markdown', ...keyboard });
      await bot.telegram.sendMessage(CHANNEL_ID, texto, { parse_mode: 'Markdown', ...keyboard });
    }

  } catch (err) {
    console.error(err);
    ctx.reply('❌ Erro ao gerar oferta.');
  }
});

app.get('/', (_, res) => res.send('BOT PROFISSIONAL ONLINE ✅'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando...'));

bot.launch();

// ==============================
// package.json (CRIE ESTE ARQUIVO SEPARADO)
// ==============================
// {
//   "name": "telegram-bot-premium",
//   "version": "2.0.0",
//   "main": "index.js",
//   "type": "module",
//   "scripts": { "start": "node index.js" },
//   "dependencies": {
//     "axios": "^1.6.7",
//     "express": "^4.18.2",
//     "telegraf": "^4.16.3"
//   }
// }
