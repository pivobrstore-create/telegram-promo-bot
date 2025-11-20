import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import cheerio from "cheerio";
import schedule from "node-schedule";

/**
 * MODO 2 - Scrape on demand (and optional list-run)
 *
 * ENV vars required:
 * - BOT_TOKEN        (token do BotFather)
 * - CHANNEL_ID       (ex: -1001234567890)
 * - AFFILIATE_TAG    (ex: pivobr-20)  default: pivobr-20
 *
 * Optional:
 * - ADMIN_IDS        (CSV de IDs que podem usar /oferta e /runlist)
 * - LIST_URLS        (CSV de URLs; se preenchido, o bot pode rodar automaticamente)
 * - SCHEDULE_CRON    (cron para executar LIST_URLS; default: '0 * * * *' => a cada hora)
 */

const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG || "pivobr-20";
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const LIST_URLS = (process.env.LIST_URLS || "").split(",").map(s => s.trim()).filter(Boolean);
const SCHEDULE_CRON = process.env.SCHEDULE_CRON || "0 * * * *"; // por hora

if (!token) {
  console.error("❌ ERRO: BOT_TOKEN não definido.");
  process.exit(1);
}
if (!channelId) {
  console.error("❌ ERRO: CHANNEL_ID não definido.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("🚀 Bot iniciado (Modo 2 - scrap on demand)");

// Simple runtime dedupe to avoid double posting
const recent = new Set();
const DEDUPE_TTL_MS = 1000 * 60 * 60 * 6; // 6h
function addDedupe(key) {
  recent.add(key);
  setTimeout(() => recent.delete(key), DEDUPE_TTL_MS);
}
function hasDedupe(key) {
  return recent.has(key);
}

// Utility: convert Amazon URL to affiliate tag
function toAmazonAffiliate(url) {
  try {
    if (!url) return url;
    const u = new URL(url);
    if (u.hostname.includes("amazon.")) {
      // set or replace tag param
      u.searchParams.set("tag", AFFILIATE_TAG);
      return u.toString();
    }
    return url;
  } catch (e) {
    return url;
  }
}

// Lightweight Amazon scrape (works na maioria dos casos)
async function scrapeAmazonProduct(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      timeout: 12_000
    });
    const $ = cheerio.load(res.data);

    const title = $("#productTitle").text().trim() ||
                  $("h1 span").first().text().trim() ||
                  $("title").text().trim() ||
                  "Produto Amazon";

    let price = $("#priceblock_ourprice").text().trim() ||
                $("#priceblock_dealprice").text().trim() ||
                $("span.a-price > span.a-offscreen").first().text().trim() ||
                $('[data-asin-price]').attr('data-asin-price') ||
                "";

    price = price ? price.replace(/\s+/g, " ").trim() : "Preço indisponível";

    // imagem (opcional)
    let image = $("#imgTagWrapperId img").attr("data-old-hires") ||
                $("#imgTagWrapperId img").attr("src") ||
                $("img#landingImage").attr("src") || "";

    return {
      title,
      price,
      image,
      url: toAmazonAffiliate(url)
    };
  } catch (err) {
    throw new Error("Falha ao raspar Amazon: " + (err.message || err));
  }
}

// Generic HTML scrape fallback (tenta extrair title/first image)
async function scrapeGeneric(url) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 10_000
    });
    const $ = cheerio.load(res.data);
    const title = $("meta[property='og:title']").attr("content") ||
                  $("meta[name='twitter:title']").attr("content") ||
                  $("title").text().trim() ||
                  "Produto";
    const image = $("meta[property='og:image']").attr("content") ||
                  $("img").first().attr("src") || "";
    return { title, price: "Preço indisponível", image, url };
  } catch (e) {
    throw new Error("Falha ao raspar página: " + (e.message || e));
  }
}

// Builds a Markdown message (escape brackets in title)
function buildMessage({ title, price, url, image, source = "Link" }) {
  const esc = txt => (txt || "").replace(/([\[\]\(\)\*_\`\-])/g, "\\$1");
  let msg = `🔥 *Oferta encontrada* 🔥\n\n*${esc(title)}*\n${price ? `💰 ${esc(price)}\n` : ""}\n🛒 [Comprar aqui](${url})\n\n🔗 Fonte: ${source}\n`;
  if (image) msg += `\n`; // preview will show image automatically
  msg += `\n_Tag: ${AFFILIATE_TAG}_`;
  return msg;
}

// Postar no canal (usa parse_mode Markdown e permite preview)
async function postOfferToChannel(payload) {
  const dedupeKey = payload.url || payload.title;
  if (hasDedupe(dedupeKey)) {
    console.log("Oferta duplicada detectada, ignorando:", dedupeKey);
    return false;
  }
  addDedupe(dedupeKey);

  const opts = { parse_mode: "Markdown", disable_web_page_preview: false };
  await bot.sendMessage(channelId, buildMessage(payload), opts);
  console.log("Oferta postada:", payload.title || payload.url);
  return true;
}

// ADMIN check helper
function isAdmin(userId) {
  if (!ADMIN_IDS.length) return true; // sem ADMIN_IDS -> todos administram
  return ADMIN_IDS.includes(String(userId));
}

// COMMANDS

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "Bot ativo! 🚀\nUse /oferta <url> para raspar e postar uma oferta.\nComandos administrativos: /runlist /status");
});

// /oferta <url>  -> raspa e posta (apenas admins se ADMIN_IDS configurado)
bot.onText(/\/oferta (.+)/, async (msg, match) => {
  const fromId = msg.from.id;
  if (!isAdmin(fromId)) return bot.sendMessage(msg.chat.id, "❌ Você não tem permissão para usar este comando.");

  const rawUrl = (match && match[1]) ? match[1].trim() : null;
  if (!rawUrl) return bot.sendMessage(msg.chat.id, "❌ Uso: /oferta <url>");

  try {
    await bot.sendMessage(msg.chat.id, "🔎 Processando link, aguarde...");
    let info;
    if (rawUrl.includes("amazon.")) {
      info = await scrapeAmazonProduct(rawUrl);
      info.source = "Amazon";
    } else {
      info = await scrapeGeneric(rawUrl);
      info.url = toAmazonAffiliate(rawUrl); // se não for Amazon, toAmazonAffiliate só retorna original
      info.source = "Página";
    }
    const posted = await postOfferToChannel(info);
    if (posted) await bot.sendMessage(msg.chat.id, "✔️ Oferta publicada no canal!");
    else await bot.sendMessage(msg.chat.id, "ℹ️ Oferta já publicada recentemente (dedupe).");
  } catch (err) {
    console.error("Erro /oferta:", err.message || err);
    await bot.sendMessage(msg.chat.id, "❌ Erro ao processar o link: " + (err.message || err));
  }
});

// /runlist -> processa LIST_URLS (apenas admins)
bot.onText(/\/runlist/, async (msg) => {
  const fromId = msg.from.id;
  if (!isAdmin(fromId)) return bot.sendMessage(msg.chat.id, "❌ Você não tem permissão para usar este comando.");
  if (!LIST_URLS.length) return bot.sendMessage(msg.chat.id, "⚠️ LIST_URLS não configurada.");

  await bot.sendMessage(msg.chat.id, "🔁 Iniciando processamento da lista de URLs...");
  for (const u of LIST_URLS) {
    try {
      if (!u) continue;
      let info;
      if (u.includes("amazon.")) {
        info = await scrapeAmazonProduct(u);
        info.source = "Amazon (lista)";
      } else {
        info = await scrapeGeneric(u);
        info.url = toAmazonAffiliate(u);
        info.source = "Página (lista)";
      }
      await postOfferToChannel(info);
      // delay curto para não floodar
      await new Promise(r => setTimeout(r, 1200));
    } catch (e) {
      console.warn("Erro ao processar URL da lista:", u, e.message || e);
    }
  }
  await bot.sendMessage(msg.chat.id, "✔️ Processamento da lista concluído.");
});

// /status
bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, `Bot online.\nLIST_URLS: ${LIST_URLS.length}\nSched: ${SCHEDULE_CRON}`);
});

// Optional scheduler: roda LIST_URLS automaticamente se definido
if (LIST_URLS.length) {
  schedule.scheduleJob(SCHEDULE_CRON, async () => {
    console.log(`[${new Date().toISOString()}] Scheduler: processando LIST_URLS...`);
    for (const u of LIST_URLS) {
      try {
        let info;
        if (u.includes("amazon.")) {
          info = await scrapeAmazonProduct(u);
          info.source = "Amazon (scheduler)";
        } else {
          info = await scrapeGeneric(u);
          info.url = toAmazonAffiliate(u);
          info.source = "Página (scheduler)";
        }
        await postOfferToChannel(info);
        await new Promise(r => setTimeout(r, 1200));
      } catch (e) {
        console.warn("Scheduler error for URL:", u, e.message || e);
      }
    }
  });
}

// graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
