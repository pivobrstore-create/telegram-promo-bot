// ==============================
// index.js - BOT PREMIUM PROFISSIONAL
// FORMATO EXATO SOLICITADO PELO CLIENTE
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

async function expandLink(url) {
  try {
    const response = await axios.get(url, { maxRedirects: 5 });
    return response.request.res.responseUrl || url;
  } catch {
    return url;
  }
}

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function getProduct(link) {
  const r = await axios.get('https://api.rainforestapi.com/request', {
    params: { api_key: RAINFOREST_API_KEY, type: 'product', url: link }
  });
  return r.data.product;
}

function calcPercent(oldPrice, newPrice) {
  if (!oldPrice || !newPrice) return null;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
}

function buildPost(p, link) {
  const title = p.title;
  const image = p.images?.[0]?.link;

  const atual = p.buybox_winner?.price?.value || 0;
  const rawOld = p.buybox_winner?.price?.raw_old_price;
  const antigo = rawOld ? parseFloat(rawOld.replace(/[R$ ]/g,'').replace(',','.')) : null;
  const percent = calcPercent(antigo, atual);

  const texto = `🔥 PRA FAZER ESTOQUEEEE!! 🔥

` +
`*${title}*

` +
(antigo ? `❌ ${brl(antigo)}
` : '') +
`✅ ${brl(atual)}
` +
(percent ? `(${percent}% OFF automático)

` : '
') +
`🚚 Frete grátis Prime
` +
`⚠️ Pode subir a qualquer momento!

` +
`Compre aqui:
${link}`;

  return { texto, image };
}

bot.on('text', async (ctx) => {
  const msg = ctx.message.text;

  if (!msg.includes('amazon') && !msg.includes('amzn.to')) {
    return ctx.reply('Envie o link da Amazon para gerar a oferta automática.');
  }

  try {
    const finalLink = await expandLink(msg);
    const produto = await getProduct(finalLink);

    const { texto, image } = buildPost(produto, msg);

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
  } catch (e) {
    console.error(e);
    ctx.reply('❌ Falha ao gerar oferta.');
  }
});

app.get('/', (_, res) => res.send('BOT PREMIUM ATIVO ✅'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor online...'));

bot.launch();

/* ==============================
package.json
==============================
{
  "name": "telegram-bot-premium",
  "version": "2.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "axios": "^1.6.7",
    "express": "^4.18.2",
    "telegraf": "^4.16.3"
  }
}
*/
