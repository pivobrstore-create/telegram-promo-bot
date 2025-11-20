// index.js (Versão: postagem estilo "Flash Oferta" com imagem + botão + enriquecimento Amazon)
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";

const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG || "pivobr-20";
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

// Caminho local da imagem que você subiu como fallback (fornecido nos assets)
const LOCAL_FALLBACK_IMAGE = "/mnt/data/Captura de tela 2025-11-20 091155.png";

// configs
const DEDUPE_TTL_MS = 1000 * 60 * 60 * 6; // 6h dedupe runtime

if (!token) { console.error("❌ BOT_TOKEN ausente"); process.exit(1); }
if (!channelId) { console.error("❌ CHANNEL_ID ausente"); process.exit(1); }

const bot = new TelegramBot(token, { polling: true });
console.log("🚀 Bot iniciado (Postagem estilo: imagem + oferta)");

// dedupe simples
const posted = new Set();
function markPosted(key) {
  posted.add(key);
  setTimeout(() => posted.delete(key), DEDUPE_TTL_MS);
}
function isPosted(key) { return posted.has(key); }

// escape para Markdown
function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// detecta nicho simples para emoji
function detectEmoji(text) {
  const t = (text || "").toLowerCase();
  if (/(café|cafe|espresso|grãos|grãos|torra|cápsulas|capsulas)/i.test(t)) return "☕";
  if (/(perfume|perfumes|perfume|maquiagem|skincare|cosmético|cosmetico|hidratante)/i.test(t)) return "💄";
  if (/(secador|prancha|barbeador|depilador|aparelho|massageador)/i.test(t)) return "⚙️";
  if (/(vinho|whisky|vodka|gin|cerveja)/i.test(t)) return "🍷";
  if (/(suplement|vitamina|ômega|omega|suplemento)/i.test(t)) return "🩺";
  if (/(gourmet|chocolate|alimento|alimentos|comida|snack|proteína|proteina)/i.test(t)) return "🍽️";
  return "🔥";
}

// transforma amzn long link para incluir tag (mantém amzn.to se já curto)
function toAffiliate(url) {
  try {
    if (!url) return url;
    const u = new URL(url);
    if (u.hostname.includes("amazon.")) {
      u.searchParams.set("tag", AFFILIATE_TAG);
      return u.toString();
    }
    // curto amzn.to -> mantemos
    return url;
  } catch (e) {
    return url;
  }
}

// tentativa de raspagem Amazon (retorna title, price, listPrice, image)
async function scrapeAmazon(url) {
  try {
    // Expande se for amzn.to (faz HEAD para seguir redirecionamento)
    let finalUrl = url;
    if (url.includes("amzn.to")) {
      const resp = await axios.head(url, { maxRedirects: 5, timeout: 8000 });
      finalUrl = resp.request?.res?.responseUrl || url;
    }

    const res = await axios.get(finalUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 12000
    });
    const $ = cheerio.load(res.data);

    const title = $("#productTitle").text().trim()
      || $("meta[property='og:title']").attr("content")
      || $("title").text().trim() || null;

    // Preço atual e preço antigo (tentativas com seletores comuns)
    let price = $("#priceblock_ourprice").text().trim()
      || $("#priceblock_dealprice").text().trim()
      || $("span.a-price > span.a-offscreen").first().text().trim()
      || null;

    let listPrice = $("#priceblock_ourprice_oldprice").text().trim()
      || $("span.priceBlockStrikePriceString").text().trim()
      || null;

    // imagens comuns
    let image = $("#imgTagWrapperId img").attr("data-old-hires")
      || $("#imgTagWrapperId img").attr("src")
      || $("meta[property='og:image']").attr("content")
      || null;

    // normaliza strings
    price = price ? price.replace(/\s+/g, " ").trim() : null;
    listPrice = listPrice ? listPrice.replace(/\s+/g, " ").trim() : null;

    return { title, price, listPrice, image, finalUrl };
  } catch (err) {
    // se falhar, retorna empties e não lança
    return { title: null, price: null, listPrice: null, image: null, finalUrl: url };
  }
}

// constrói legenda (caption) no estilo exato pedido
function buildCaption({ headerPhrase, title, userText, listPrice, price, affiliateUrl }) {
  const lines = [];

  // headerPhrase (ex: "☕ Promoção especial em café! ☕")
  if (headerPhrase) lines.push(headerPhrase);

  lines.push(""); // separador
  lines.push("*FLASH OFERTA!! APROVEITAAA!* 🔥🔥🔥");
  lines.push(""); // separador

  if (title) {
    lines.push(`*${escapeMarkdown(title)}*`);
    lines.push("");
  } else if (userText) {
    const firstLine = userText.split("\n")[0] || "";
    if (firstLine) { lines.push(`*${escapeMarkdown(firstLine)}*`); lines.push(""); }
  }

  if (listPrice) lines.push(`❌ De: ${escapeMarkdown(listPrice)}`);
  if (price) lines.push(`✅ Por: ${escapeMarkdown(price)}`);

  // incluir o resto do texto do usuário (exceto link) se tiver
  if (userText) {
    const userLines = userText.split("\n").filter(Boolean);
    // remove a primeira linha caso tenha sido usada como título
    if (userLines.length > 1) {
      lines.push("");
      lines.push(...userLines.slice(1).map(l => escapeMarkdown(l)));
    }
  }

  lines.push("");
  lines.push("🛒 *Compre Aqui:*");
  lines.push(`${escapeMarkdown(affiliateUrl)}`);
  lines.push("");
  lines.push("#Oferta #Desconto #Promoção");

  return lines.join("\n");
}

// posta imagem + caption + botão (tenta usar imagem raspada, senão local fallback)
async function postPhotoWithCaption({ chatMsg, imageUrl, caption, affiliateUrl }) {
  try {
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🛒 COMPRAR AGORA", url: affiliateUrl }]]
      }
    };

    // se tiver uma URL de imagem (http/https), manda como photo via URL
    if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("https"))) {
      await bot.sendPhoto(channelId, imageUrl, { caption, parse_mode: "Markdown", reply_markup: opts.reply_markup });
      return true;
    }

    // se for caminho local (ex: /mnt/data/...), manda foto do arquivo local
    if (imageUrl && imageUrl.startsWith("/")) {
      await bot.sendPhoto(channelId, imageUrl, { caption, parse_mode: "Markdown", reply_markup: opts.reply_markup });
      return true;
    }

    // se nada disso, envia apenas texto + botão
    await bot.sendMessage(channelId, caption, opts);
    return true;
  } catch (err) {
    console.warn("Erro ao enviar foto:", err.message || err);
    // tenta fallback: enviar texto
    try {
      await bot.sendMessage(channelId, caption, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🛒 COMPRAR AGORA", url: affiliateUrl }]]
        }
      });
      return true;
    } catch (e) {
      console.error("Erro ao enviar mensagem fallback:", e.message || e);
      return false;
    }
  }
}

// handler principal: /oferta comando inicia prompt
bot.onText(/\/oferta(?:\s+(\w+))?/, async (msg, match) => {
  const forced = match && match[1] ? match[1].toLowerCase() : null;
  // checa permissões (se ADMIN_IDS definido)
  const fromId = String(msg.from.id);
  if (ADMIN_IDS.length && !ADMIN_IDS.includes(fromId)) {
    return bot.sendMessage(msg.chat.id, "❌ Você não tem permissão para usar este comando.");
  }

  await bot.sendMessage(msg.chat.id, "Responda esta mensagem com a oferta (última linha = link).");
  bot.pendingOffer = bot.pendingOffer || {};
  bot.pendingOffer[msg.chat.id] = { forcedNicho: forced };
});

// responder ao prompt do /oferta
bot.on("message", async (msg) => {
  if (!msg.reply_to_message) return;
  if (!msg.reply_to_message.text) return;
  if (!msg.reply_to_message.text.includes("Responda esta mensagem with")) {
    // compatibilidade multi-idioma, checa frase do prompt
  }
  if (!msg.reply_to_message.text.includes("Responda esta mensagem com a oferta")) return;

  const chatId = msg.chat.id;
  const pending = (bot.pendingOffer && bot.pendingOffer[chatId]) ? bot.pendingOffer[chatId] : {};
  delete bot.pendingOffer[chatId];

  const full = msg.text.trim();
  const lines = full.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 1) return bot.sendMessage(chatId, "❌ Formato inválido. Coloque pelo menos texto + link na última linha.");

  const link = lines[lines.length - 1];
  const userText = lines.slice(0, lines.length - 1).join("\n");

  if (!link.startsWith("http")) return bot.sendMessage(chatId, "❌ A última linha deve ser o link (https...).");

  // dedupe por link
  const dedupeKey = link;
  if (isPosted(dedupeKey)) {
    return bot.sendMessage(chatId, "ℹ️ Oferta já publicada recentemente (dedupe).");
  }

  // detect emoji / nicho por texto e link
  const detectedText = (userText + " " + link).toLowerCase();
  const emoji = detectEmoji(detectedText);
  const headerPhrase = `${emoji} Promoção exclusiva!`;

  // tenta enriquecer (scrape Amazon)
  let scraped = { title: null, price: null, listPrice: null, image: null, finalUrl: link };
  if (link.includes("amazon." ) || link.includes("amzn.to")) {
    scraped = await scrapeAmazon(link);
  }

  // affiliate transform
  const affiliateUrl = toAffiliate(link);

  // se raspagem não achou imagem, usar fallback local (arquivo que você subiu)
  const imageToUse = scraped.image || LOCAL_FALLBACK_IMAGE;

  // construir legenda
  const caption = buildCaption({
    headerPhrase,
    title: scraped.title,
    userText,
    listPrice: scraped.listPrice,
    price: scraped.price,
    affiliateUrl
  });

  // postar foto com legenda + botão
  const ok = await postPhotoWithCaption({ chatMsg: msg, imageUrl: imageToUse, caption, affiliateUrl });

  if (ok) {
    markPosted(dedupeKey);
    await bot.sendMessage(chatId, "✔️ Oferta publicada no canal!");
  } else {
    await bot.sendMessage(chatId, "❌ Falha ao publicar a oferta. Verifique logs.");
  }
});

// /status
bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, "Bot online e pronto para postar ofertas.");
});

// graceful
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
