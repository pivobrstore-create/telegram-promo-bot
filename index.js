/**
 * index.js
 * Versão final - estilo B (agressivo), env: BOT_TOKEN, RAINFOREST_API_KEY, CHANNEL_ID, AFFILIATE_TAG (opcional)
 */

import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import { Telegraf, Markup } from "telegraf";

// CONFIGURAÇÕES
const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const cache = new NodeCache({ stdTTL: 60 * 5 }); // cache 5 minutos

const RAINFOREST_KEY = process.env.RAINFOREST_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG || "";

// Fallback image (arquivo que você enviou para testes locais)
const FALLBACK_IMAGE = "/mnt/data/Captura de tela 2025-11-20 143447.png";

// Helpers ---------------------------------------------------
function safeNumber(v) {
  if (!v && v !== 0) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function currencyBR(value) {
  if (value == null) return "";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function makeAffiliateLink(originalUrl) {
  if (!AFFILIATE_TAG) return originalUrl;
  // se já contém amzn.to ou tag, retorna original (simplificação)
  if (originalUrl.includes("tag=") || originalUrl.includes("aff=")) return originalUrl;
  // adiciona parâmetro tag ao fim (forma simples)
  try {
    const u = new URL(originalUrl);
    u.searchParams.set("tag", AFFILIATE_TAG);
    return u.toString();
  } catch (e) {
    return originalUrl;
  }
}

// Resolve redirect (amzn.to -> amazon)
async function resolveAmazonLink(url) {
  try {
    const r = await axios.get(url, { maxRedirects: 5, timeout: 10000 });
    if (r.request?.res?.responseUrl) return r.request.res.responseUrl;
    return url;
  } catch (e) {
    // fallback: retornar original
    return url;
  }
}

// Pega dados da Rainforest
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
  if (!product) throw new Error("Produto não encontrado na API Rainforest");

  cache.set(cacheKey, product);
  return product;
}

// Detecta nicho simples a partir do título / categories
function detectNiche(product) {
  const title = (product.title || "").toLowerCase();
  const cats = (product.categories || []).join(" ").toLowerCase();

  const text = `${title} ${cats}`;

  const mapping = [
    { name: "bebidas", keywords: ["whisky", "vodka", "cerveja", "vinho", "bebida"] },
    { name: "eletronicos", keywords: ["fone", "notebook", "celular", "tablet", "tv", "eletrônico", "smart"] },
    { name: "beleza", keywords: ["creme", "perfume", "maquiagem", "cabelo", "beleza"] },
    { name: "cozinha", keywords: ["panela", "liquidificador", "cafeteira", "cozinha"] },
    { name: "games", keywords: ["jogo", "console", "nintendo", "playstation", "xbox", "gamer"] },
    { name: "pets", keywords: ["ração", "pet", "gato", "cachorro"] },
  ];

  for (const m of mapping) {
    for (const kw of m.keywords) {
      if (text.includes(kw)) return m.name;
    }
  }
  return "geral";
}

// Gera variações agressivas coerentes com nicho (estilo B)
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
  const arr = pool[niche] || pool["geral"];
  // escolhe aleatório
  return arr[Math.floor(Math.random() * arr.length)];
}

// Gera frase de escassez baseada no desconto
function buildScarcity(discountPercent) {
  const base = [
    "⏳ Pode subir a qualquer momento!",
    "⚠️ Estoque limitado!",
    "🚨 Oferta por tempo limitado!",
    "📉 Preço reduzido por tempo limitado!"
  ];
  if (discountPercent >= 30) {
    base.unshift("🔥 Preço MUITO abaixo da média!");
  }
  return base[Math.floor(Math.random() * base.length)];
}

// Gera o texto final do post
function gerarTextoPromocional(produto, linkAfiliado) {
  const titulo = produto.title || "Produto Amazon";
  const buybox = produto.buybox_winner || {};
  const priceObj = buybox.price || {};
  const currentRaw = safeNumber(priceObj.value);
  // a Rainforest pode retornar raw_old_price ou similar. tentamos detectar.
  let oldPriceRaw = null;
  if (priceObj.raw_old_price) {
    // pode vir como string "R$ 199,90"
    const digits = priceObj.raw_old_price.replace(/[^\d,.-]/g, "").replace(",", ".");
    oldPriceRaw = safeNumber(digits);
  } else if (produto.offers && produto.offers[0] && produto.offers[0].price) {
    oldPriceRaw = safeNumber(produto.offers[0].price.previous_price);
  }

  const current = currentRaw;
  const oldPrice = oldPriceRaw;
  let discountPercent = 0;
  if (oldPrice && current) {
    discountPercent = Math.round(((oldPrice - current) / oldPrice) * 100);
  }

  const niche = detectNiche(produto);
  const headline = buildHeadline(niche);
  const scarcity = buildScarcity(discountPercent);
  const isPrime = !!(produto.isPrime || (buybox && buybox.is_prime));
  const primeLabel = isPrime ? "🚚 Frete GRÁTIS Prime" : "";

  // Texto compacto e agressivo (estilo B)
  const parts = [];
  parts.push(`${headline}`);
  parts.push(`*${titulo}*`);
  if (oldPrice) parts.push(`❌ DE: *${currencyBR(oldPrice)}*`);
  if (current) parts.push(`🔥 POR: *${currencyBR(current)}*`);
  if (discountPercent > 0) parts.push(`🟢 *${discountPercent}% OFF AGORA!*`);
  if (primeLabel) parts.push(`${primeLabel}`);
  parts.push(`${scarcity}`);
  parts.push(`\n🛒 *Compre com Desconto:*`);
  parts.push(`${linkAfiliado}`);
  parts.push(`\n📦 Envio rápido | Produto Amazon`);

  return {
    text: parts.join("\n"),
    image: (produto.images && produto.images[0] && produto.images[0].link) || null,
    niche,
    discountPercent
  };
}

// Envia mensagem para chat e canal
async function sendToUserAndChannel(ctxOrChatId, produtoData, originalLink) {
  const linkAf = makeAffiliateLink(originalLink);
  const built = gerarTextoPromocional(produtoData, linkAf);
  const caption = built.text;
  const imageUrl = built.image || null;
  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.url("🛒 COMPRAR AGORA", linkAf)
  ]);

  // Mensagem para quem solicitou
  try {
    if (typeof ctxOrChatId === "object" && ctxOrChatId.replyWithPhoto) {
      if (imageUrl) {
        await ctxOrChatId.replyWithPhoto({ url: imageUrl }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
      } else {
        // fallback para imagem local se estiver testando localmente
        try {
          await ctxOrChatId.replyWithPhoto({ url: FALLBACK_IMAGE }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
        } catch (e) {
          await ctxOrChatId.reply(caption, { parse_mode: "Markdown", ...inlineKeyboard });
        }
      }
    } else {
      // chat id
      if (imageUrl) {
        await bot.telegram.sendPhoto(ctxOrChatId, { url: imageUrl }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
      } else {
        await bot.telegram.sendMessage(ctxOrChatId, caption, { parse_mode: "Markdown", ...inlineKeyboard });
      }
    }
  } catch (e) {
    console.error("Erro ao enviar para usuário:", e.message || e);
  }

  // Envia para canal (se configurado)
  if (CHANNEL_ID) {
    try {
      if (imageUrl) {
        await bot.telegram.sendPhoto(CHANNEL_ID, { url: imageUrl }, { caption, parse_mode: "Markdown", ...inlineKeyboard });
      } else {
        await bot.telegram.sendMessage(CHANNEL_ID, caption, { parse_mode: "Markdown", ...inlineKeyboard });
      }
    } catch (e) {
      console.error("Erro ao enviar para canal:", e.message || e);
    }
  }
}

// Listener principal
bot.on("text", async (ctx) => {
  const msg = ctx.message.text.trim();
  if (!msg.includes("amazon") && !msg.includes("amzn.to")) {
    return ctx.reply("Envie um link da Amazon (amzn.to ou amazon) para gerar oferta automática 🔥");
  }

  await ctx.reply("⏳ Processando oferta no estilo B (impactante) — um segundo...");

  try {
    const realLink = await resolveAmazonLink(msg);
    const product = await getAmazonData(realLink);

    await sendToUserAndChannel(ctx, product, msg);
  } catch (err) {
    console.error("Erro processamento:", err?.message || err);
    await ctx.reply("❌ Não foi possível gerar a oferta. Tenta enviar o link novamente ou me manda o log.");
  }
});

// Healthcheck e start express
app.get("/", (_, res) => res.send("OK - telegram promo bot"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

// Start bot
bot.launch().then(() => console.log("Bot rodando"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
