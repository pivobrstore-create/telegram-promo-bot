/**
 * index.js - Versão PREMIUM
 * - Exibe preço antigo riscado
 * - %OFF em destaque
 * - Chamada por nicho (variações inteligentes estilo B)
 * - Frase emocional por nicho
 * - Envia para usuário e canal
 * - /ultimas para histórico
 *
 * Variáveis de ambiente necessárias:
 * BOT_TOKEN, RAINFOREST_API_KEY, CHANNEL_ID, AFFILIATE_TAG (opcional)
 *
 * Fallback image (arquivo uploadado): /mnt/data/Captura de tela 2025-11-20 143447.png
 */

import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import { Telegraf, Markup } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const cache = new NodeCache({ stdTTL: 60 * 5 });
const RAINFOREST_KEY = process.env.RAINFOREST_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG || "";
const FALLBACK_IMAGE = "/mnt/data/Captura de tela 2025-11-20 143447.png";

// Histórico em memória (últimas ofertas)
const history = [];

// ---------- Helpers ----------
function safeNumber(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}
function currencyBR(value) {
  if (value == null) return "";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function makeAffiliateLink(originalUrl) {
  if (!AFFILIATE_TAG) return originalUrl;
  try {
    const u = new URL(originalUrl);
    // Amazon usa 'tag' como parâmetro de afiliado (simplificação)
    if (!u.searchParams.get("tag")) u.searchParams.set("tag", AFFILIATE_TAG);
    return u.toString();
  } catch (e) {
    return originalUrl;
  }
}

// Resolve redirect (amzn.to -> amazon)
async function resolveAmazonLink(url) {
  try {
    const r = await axios.get(url, { maxRedirects: 5, timeout: 10000 });
    return r.request?.res?.responseUrl || url;
  } catch (e) {
    return url;
  }
}

// Pega dados Rainforest (com cache)
async function getAmazonData(productUrl) {
  const cacheKey = `rf:${productUrl}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const resp = await axios.get("https://api.rainforestapi.com/request", {
    params: {
      api_key: RAINFOREST_KEY,
      type: "product",
      url: productUrl
    },
    timeout: 15000
  });

  const product = resp.data?.product || null;
  if (!product) throw new Error("Produto não retornado pela Rainforest");
  cache.set(cacheKey, product);
  return product;
}

// Detecta nicho
function detectNiche(product) {
  const title = (product.title || "").toLowerCase();
  const cats = (product.categories || []).join(" ").toLowerCase();
  const text = `${title} ${cats}`;

  const mapping = [
    { name: "bebidas", keywords: ["whisky","vodka","cerveja","vinho","bebida","whiskey","ron"] },
    { name: "eletronicos", keywords: ["fone","notebook","celular","tablet","tv","smart","headphone","ssd"] },
    { name: "beleza", keywords: ["creme","perfume","maquiagem","cabelo","beleza"] },
    { name: "cozinha", keywords: ["panela","cafeteira","liquidificador","cozinha","prato"] },
    { name: "games", keywords: ["jogo","console","playstation","xbox","nintendo","gamer"] },
    { name: "pets", keywords: ["ração","pet","gato","cachorro","shampoo pet"] }
  ];
  for (const m of mapping) for (const kw of m.keywords) if (text.includes(kw)) return m.name;
  return "geral";
}

// Headline por nicho (variações)
function buildHeadline(niche) {
  const pool = {
    bebidas: ["🔥 PRA FAZER ESTOQUE!!!", "🥃 ACHADO QUENTE!"],
    eletronicos: ["⚡ OFERTA RELÂMPAGO!", "🚀 PREÇO ESTOURADO!"],
    beleza: ["🌟 ACHADO DO DIA!", "💥 PROMOÇÃO IMPERDÍVEL!"],
    cozinha: ["🍳 PREÇO DE OCASIÃO!", "🔥 OFERTA TOP!"],
    games: ["🎮 OFERTA GAMER!", "⚡ PEGOU, LEVOU!"],
    pets: ["🐾 MEGA PROMO PET!", "🔥 OFERTA PARA SEU PET!"],
    geral: ["🔥 PREÇO ESTOURADO!!!", "⚡ OFERTA RELÂMPAGO!"]
  };
  const arr = pool[niche] || pool.geral;
  return arr[Math.floor(Math.random()*arr.length)];
}

// Frase emocional curta por nicho
function emotionalLine(niche) {
  const pool = {
    bebidas: ["Um dos rótulos mais procurados — perfeito pra presentear ou estoque!"],
    eletronicos: ["Upgrade certeiro — ótimo custo-benefício pra quem precisa agora."],
    beleza: ["Produto com avaliação alta — garanta o seu antes que acabe."],
    cozinha: ["Peça que facilita sua rotina na cozinha — preço raro."],
    games: ["Ótima adição pra sua setup/game nights."],
    pets: ["Seu pet merece — oferta perfeita para manter estoque."],
    geral: ["Aproveite enquanto o preço está assim — pode subir a qualquer momento."]
  };
  return pool[niche] || pool.geral;
}

// Scarcity line
function buildScarcity(discountPercent) {
  const base = [
    "⏳ Pode subir a qualquer momento!",
    "⚠️ Estoque limitado!",
    "🚨 Oferta por tempo limitado!"
  ];
  if (discountPercent >= 30) base.unshift("🔥 Preço MUITO abaixo da média!");
  return base[Math.floor(Math.random()*base.length)];
}

// Tenta obter preços antigos / atuais com segurança
function extractPrices(product) {
  const buybox = product.buybox_winner || {};
  const priceObj = buybox.price || {};
  // current
  const current = safeNumber(priceObj.value) || null;

  // attempts to get old price
  let oldPrice = null;
  if (priceObj.raw_old_price) {
    const digits = String(priceObj.raw_old_price).replace(/[^\d,.-]/g, "").replace(",",".");
    oldPrice = safeNumber(digits);
  }
  // fallback: offers array
  if (!oldPrice && product.offers && product.offers.length) {
    const o = product.offers[0];
    if (o.price && o.price.previous_price) oldPrice = safeNumber(o.price.previous_price);
  }
  // final fallback: estimated from price_history or null
  return { current, oldPrice };
}

// Gera texto final (Markdown compatível com Telegram)
function gerarTextoPromocional(produto, linkAfiliado) {
  const titulo = produto.title || "Produto Amazon";
  const { current, oldPrice } = extractPrices(produto);
  let discountPercent = 0;
  if (oldPrice && current) discountPercent = Math.round(((oldPrice - current)/oldPrice)*100);

  const niche = detectNiche(produto);
  const headline = buildHeadline(niche);
  const emotional = emotionalLine(niche);
  const scarcity = buildScarcity(discountPercent);
  const isPrime = !!(produto.isPrime || (produto.buybox_winner && produto.buybox_winner.is_prime));

  // Monta texto com Markdown — riscado usa ~texto~
  const lines = [];
  lines.push(`${headline}`);
  lines.push(`*${titulo}*`);
  if (oldPrice) lines.push(`~❌ DE: ${currencyBR(oldPrice)}~`); // riscado
  if (current) lines.push(`🔥 *POR: ${currencyBR(current)}*`);
  if (discountPercent > 0) lines.push(`🟢 *${discountPercent}% OFF AGORA!*`);
  if (isPrime) lines.push(`🚚 *Frete GRÁTIS Prime*`);
  lines.push(`\n${emotional}`);
  lines.push(`${scarcity}`);
  lines.push(`\n🛒 *Compre com Desconto:*`);
  lines.push(`${linkAfiliado}`);
  lines.push(`\n📦 Envio rápido | Produto Amazon`);

  return {
    text: lines.join("\n"),
    image: (produto.images && produto.images[0] && produto.images[0].link) || null,
    niche,
    discountPercent
  };
}

// Envia para usuário e para o canal. Salva no histórico.
async function sendToUserAndChannel(ctxOrChatId, produtoData, originalLink) {
  const linkAf = makeAffiliateLink(originalLink);
  const built = gerarTextoPromocional(produtoData, linkAf);
  const caption = built.text;
  const imageUrl = built.image || null;
  const inlineKeyboard = Markup.inlineKeyboard([ Markup.button.url("🛒 COMPRAR AGORA", linkAf) ]);

  // Envia para solicitante
  try {
    if (typeof ctxOrChatId === "object" && ctxOrChatId.replyWithPhoto) {
      if (imageUrl) await ctxOrChatId.replyWithPhoto({ url: imageUrl }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
      else {
        try {
          await ctxOrChatId.replyWithPhoto({ url: FALLBACK_IMAGE }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
        } catch (e) {
          await ctxOrChatId.reply(caption, { parse_mode: "Markdown", ...inlineKeyboard });
        }
      }
    } else {
      if (imageUrl) await bot.telegram.sendPhoto(ctxOrChatId, { url: imageUrl }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
      else await bot.telegram.sendMessage(ctxOrChatId, caption, { parse_mode: "Markdown", ...inlineKeyboard });
    }
  } catch (e) {
    console.error("Erro ao enviar para solicitante:", e?.message || e);
  }

  // Envia para canal
  if (CHANNEL_ID) {
    try {
      if (imageUrl) await bot.telegram.sendPhoto(CHANNEL_ID, { url: imageUrl }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
      else await bot.telegram.sendMessage(CHANNEL_ID, caption, { parse_mode: "Markdown", ...inlineKeyboard });
    } catch (e) {
      console.error("Erro ao enviar para canal:", e?.message || e);
    }
  }

  // Salva histórico (mantém até 50 itens)
  try {
    const item = {
      title: produtoData.title || "Produto",
      link: linkAf,
      price: produtoData.buybox_winner?.price?.value || null,
      time: new Date().toISOString()
    };
    history.unshift(item);
    if (history.length > 50) history.pop();
  } catch (e) { /* ignore */ }
}

// Comando /ultimas
bot.command("ultimas", async (ctx) => {
  if (!history.length) return ctx.reply("Nenhuma oferta registrada ainda.");
  const top = history.slice(0,10);
  const lines = top.map((h, i) => `${i+1}. ${h.title}\n${h.link}\n— ${h.time}`).join("\n\n");
  await ctx.reply(`Últimas ofertas:\n\n${lines}`);
});

// Listener principal
bot.on("text", async (ctx) => {
  const msg = ctx.message.text.trim();
  if (!msg.includes("amazon") && !msg.includes("amzn.to")) {
    return ctx.reply("Envie um link da Amazon (amzn.to ou amazon) para gerar oferta automática 🔥");
  }

  await ctx.reply("⏳ Processando oferta PREMIUM — aguarda um segundo...");

  try {
    const realLink = await resolveAmazonLink(msg);
    const product = await getAmazonData(realLink);
    await sendToUserAndChannel(ctx, product, msg);
  } catch (err) {
    console.error("Erro no processamento:", err?.message || err);
    await ctx.reply("❌ Não foi possível gerar a oferta. Tenta enviar o link novamente.");
  }
});

// Healthcheck e start
app.get("/", (_, res) => res.send("OK - telegram promo bot (premium)"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
bot.launch().then(() => console.log("Bot rodando (premium)"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
