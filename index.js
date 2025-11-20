// index.js - Modo "Rei da Promo" (automático: envie só o link)
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG || "pivobr-20";
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

// fallback image (você forneceu esta URL)
const GLOBAL_FALLBACK_IMAGE = "https://m.media-amazon.com/images/I/51653ltvYsL._AC_SX679_.jpg";
// alternativa local (se você subir arquivo no servidor, pode colocar o caminho local)
/* const GLOBAL_FALLBACK_IMAGE = "/opt/render/project/src/assets/fallback.jpg"; */

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error("❌ Defina BOT_TOKEN e CHANNEL_ID nas env vars.");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("🚀 Bot REI DA PROMO iniciado (modo automático).");

// runtime dedupe
const posted = new Set();
const DEDUPE_TTL_MS = 1000 * 60 * 60 * 6;
function markPosted(key) { posted.add(key); setTimeout(() => posted.delete(key), DEDUPE_TTL_MS); }
function isPosted(key) { return posted.has(key); }

// util para detectar amazon / amzn.to
function findAmazonLink(text) {
  if (!text) return null;
  const re = /(https?:\/\/\S*amzn\.to\/\S+|https?:\/\/\S*amazon\.[^\s/]+\/\S+)/i;
  const m = text.match(re);
  return m ? m[0] : null;
}

// expande amzn.to (segue redirects)
async function expandShortUrl(url) {
  try {
    const head = await axios.head(url, { maxRedirects: 5, timeout: 8000 });
    return head.request?.res?.responseUrl || url;
  } catch (e) {
    return url;
  }
}

// converte amazon long link para afiliado (mantém amzn.to se curto)
function toAffiliate(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("amazon.")) {
      u.searchParams.set("tag", AFFILIATE_TAG);
      return u.toString();
    }
    return url; // amzn.to ou outros mantêm
  } catch (e) {
    return url;
  }
}

// raspagem leve Amazon (title, price, listPrice, image)
async function scrapeAmazon(url) {
  try {
    const finalUrl = url.includes("amzn.to") ? await expandShortUrl(url) : url;
    const res = await axios.get(finalUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 14000
    });
    const $ = cheerio.load(res.data);

    const title = $("#productTitle").text().trim()
      || $("meta[property='og:title']").attr("content")
      || $("title").text().trim() || null;

    let price = $("#priceblock_ourprice").text().trim()
      || $("#priceblock_dealprice").text().trim()
      || $("span.a-price > span.a-offscreen").first().text().trim()
      || null;

    let listPrice = $("span.priceBlockStrikePriceString").text().trim()
      || $("#priceblock_ourprice_oldprice").text().trim() || null;

    const image = $("#imgTagWrapperId img").attr("data-old-hires")
      || $("#imgTagWrapperId img").attr("src")
      || $("meta[property='og:image']").attr("content") || null;

    // limpeza
    const clean = s => s ? s.replace(/\s+/g, " ").trim() : null;

    return {
      title: clean(title),
      price: clean(price),
      listPrice: clean(listPrice),
      image,
      finalUrl: finalUrl
    };
  } catch (e) {
    return { title: null, price: null, listPrice: null, image: null, finalUrl: url };
  }
}

// fallback: busca imagem no Google Images (scrape simples)
// nota: scraping do Google pode falhar por captchas, mas funciona muitas vezes
async function googleImageSearch(productName) {
  try {
    const q = encodeURIComponent(productName);
    const url = `https://www.google.com/search?tbm=isch&q=${q}`;
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    // Seleciona imagens. Estrutura do Google muda, tentamos alguns seletores
    const img = $("img").toArray().map(i => $(i).attr("src") || $(i).attr("data-src")).find(Boolean);
    if (img && img.startsWith("http")) return img;
    // tentar metadados inline
    const m = res.data.match(/"ou":"(https?:\/\/[^"]+)"/);
    if (m && m[1]) return m[1];
    return null;
  } catch (e) {
    return null;
  }
}

// calcula % desconto
function calcDiscount(listPriceStr, priceStr) {
  try {
    if (!listPriceStr || !priceStr) return null;
    const num = s => Number((s.replace(/[^\d,.-]/g, "").replace(",", ".")).trim());
    const lp = num(listPriceStr);
    const p = num(priceStr);
    if (!lp || !p || lp <= p) return null;
    const pct = Math.round(((lp - p) / lp) * 100);
    return pct;
  } catch (e) { return null; }
}

// detecta emoji por nicho simples baseado no título
function detectEmoji(text) {
  const t = (text || "").toLowerCase();
  if (/(café|cafe|espresso|grãos|torra|capsula|cápsula)/i.test(t)) return "☕";
  if (/(perfume|perfumes|maquiagem|skincare|cosmetico|cosmético|hidratante)/i.test(t)) return "💄";
  if (/(secador|prancha|barbeador|depilador|aparelho)/i.test(t)) return "⚙️";
  if (/(vinho|whisky|vodka|gin|cerveja|bebida)/i.test(t)) return "🍷";
  if (/(suplemento|vitamina|omega|ômega|saúde)/i.test(t)) return "🩺";
  if (/(tenis|sapato|calçado|tênis|camisa|blusa)/i.test(t)) return "👟";
  return "🔥";
}

// monta legenda (caption) profissional
function buildCaption({ phrase, title, listPrice, price, discountPct, affiliateUrl }) {
  const lines = [];
  if (phrase) lines.push(phrase);
  lines.push("");
  lines.push("*FLASH OFERTA!! APROVEITAAA!* 🔥🔥🔥");
  lines.push("");
  if (title) lines.push(`*${escapeMarkdown(title)}*`);
  lines.push("");
  if (listPrice) lines.push(`❌ De: ${escapeMarkdown(listPrice)}`);
  if (price) lines.push(`✅ Por: ${escapeMarkdown(price)}`);
  if (discountPct !== null) lines.push(`💸 Economia: ${discountPct}% OFF`);
  lines.push("");
  lines.push("🛒 *Compre Aqui:*");
  lines.push(`${escapeMarkdown(affiliateUrl)}`);
  lines.push("");
  lines.push("#Oferta #Desconto #Promoção");
  return lines.join("\n");
}

function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// envia imagem + legenda + botão
async function sendOfferToChannel({ imageUrl, caption, affiliateUrl }) {
  try {
    // botão inline
    const reply_markup = {
      inline_keyboard: [[{ text: "🛒 COMPRAR AGORA", url: affiliateUrl }]]
    };
    // se imageUrl é uma URL http(s) -> sendPhoto por URL
    if (imageUrl && imageUrl.startsWith("http")) {
      await bot.sendPhoto(CHANNEL_ID, imageUrl, { caption, parse_mode: "Markdown", reply_markup });
      return true;
    }
    // fallback: envia só a mensagem com botão
    await bot.sendMessage(CHANNEL_ID, caption, { parse_mode: "Markdown", reply_markup });
    return true;
  } catch (err) {
    console.warn("Erro ao enviar oferta:", err.message || err);
    try {
      await bot.sendMessage(CHANNEL_ID, caption, { parse_mode: "Markdown" });
      return true;
    } catch (e) {
      console.error("Falha final ao enviar:", e.message || e);
      return false;
    }
  }
}

// quando receber qualquer mensagem, checar se contém link Amazon/amzn.to
bot.on("message", async (msg) => {
  try {
    if (!msg.text) return;
    const link = findAmazonLink(msg.text);
    if (!link) return; // mensagem normal, ignora

    // permissions: se ADMIN_IDS definido, só admins podem postar automaticamente
    const fromId = String(msg.from.id);
    if (ADMIN_IDS.length && !ADMIN_IDS.includes(fromId)) {
      // responde no privado dizendo que não tem permissão
      return bot.sendMessage(msg.chat.id, "❌ Você não tem permissão para postar ofertas automaticamente.");
    }

    // confirma pro usuário que está processando (resposta privada)
    await bot.sendMessage(msg.chat.id, "🔎 Recebi o link. Processando a oferta agora...");

    // dedupe por link
    const dedupeKey = link;
    if (isPosted(dedupeKey)) {
      await bot.sendMessage(msg.chat.id, "ℹ️ Oferta já publicada recentemente (dedupe).");
      return;
    }

    // tenta raspagem Amazon
    let scraped = await scrapeAmazon(link);

    // se sem imagem, tenta google search (fallback)
    if (!scraped.image) {
      const nameQuery = scraped.title || "produto";
      const gimg = await googleImageSearch(nameQuery);
      scraped.image = gimg || GLOBAL_FALLBACK_IMAGE;
    }

    // calcula desconto
    const discountPct = calcDiscount(scraped.listPrice, scraped.price);

    // define emoji e frase de escassez
    const emoji = detectEmoji(scraped.title || msg.text);
    const phrases = [
      `${emoji} Promoção exclusiva!`,
      `${emoji} Oferta especial! Não perca!`,
      `${emoji} Oferta limitada — corre!`,
      `${emoji} Últimas unidades! Aproveite!`
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    // affiliate link: se amzn.to -> mantem; se amazon long -> adiciona tag
    const affiliate = toAffiliate(link);

    // build caption
    const caption = buildCaption({
      phrase,
      title: scraped.title || null,
      listPrice: scraped.listPrice || null,
      price: scraped.price || null,
      discountPct: discountPct ?? null,
      affiliateUrl: affiliate
    });

    // send to channel (imagem + caption + botão)
    const ok = await sendOfferToChannel({ imageUrl: scraped.image || GLOBAL_FALLBACK_IMAGE, caption, affiliateUrl: affiliate });
    if (ok) {
      markPosted(dedupeKey);
      // responde privado e informa link postado
      await bot.sendMessage(msg.chat.id, "✔️ Oferta publicada no canal com sucesso!");
    } else {
      await bot.sendMessage(msg.chat.id, "❌ Falha ao publicar no canal. Verifique logs.");
    }
  } catch (err) {
    console.error("Erro geral:", err);
    // avisa o usuário
    try { await bot.sendMessage(msg.chat.id, "❌ Erro ao processar o link: " + (err.message || err)); } catch(e){}
  }
});

// comando /status
bot.onText(/\/status/, (m) => {
  bot.sendMessage(m.chat.id, "Bot online (modo automático). Envie apenas o link da Amazon para criar uma oferta.");
});

// graceful
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
