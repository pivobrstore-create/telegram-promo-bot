import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";
import schedule from "node-schedule";

/**
 * Modo Híbrido — Manual + tentativa de enriquecimento
 *
 * ENV vars:
 * BOT_TOKEN      - token do BotFather
 * CHANNEL_ID     - id do canal (-100...)
 * AFFILIATE_TAG  - pivobr-20 (padrão)
 * ADMIN_IDS      - csv (opcional) ex: 12345678,98765432
 * LIST_URLS      - csv (opcional) para agendamento
 * SCHEDULE_CRON  - cron (opcional) ex "0 * * * *"
 */

const token = process.env.BOT_TOKEN;
const channelId = process.env.CHANNEL_ID;
const AFFILIATE_TAG = process.env.AFFILIATE_TAG || "pivobr-20";
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const LIST_URLS = (process.env.LIST_URLS || "").split(",").map(s => s.trim()).filter(Boolean);
const SCHEDULE_CRON = process.env.SCHEDULE_CRON || "0 * * * *"; // por hora

if (!token) { console.error("❌ BOT_TOKEN ausente"); process.exit(1); }
if (!channelId) { console.error("❌ CHANNEL_ID ausente"); process.exit(1); }

const bot = new TelegramBot(token, { polling: true });
console.log("🚀 Bot iniciado (Modo Híbrido — Manual + Enriquecimento)");

// ------------------ CONFIG: NICHOS E FRASES ------------------

const NICHOS_KEYWORDS = {
  "beleza": ["beleza","skincare","shampoo","creme","hidratante","maquiagem","perfume","cosmético"],
  "luxo": ["luxo","importado","eau de parfum","premium","designer"],
  "saude": ["saúde","saude","vitamina","suplemento","farmacia","cuidados pessoais"],
  "aparelhos": ["secador","prancha","barbeador","depilador","massageador","aparelho"],
  "bebidas": ["café","cafe","cerveja","vinho","bebida","bebidas","whisky","gin","vodka"],
  "alimentos": ["alimento","alimentos","gourmet","chocolate","comida","snack","proteína"]
};

const FRASES = {
  general: [
    "🔥 Oferta especial! Não perca!",
    "⚡ Chance única, cai no colo e some rápido!",
    "⏳ Tempo esgotando! Aproveite AGORA!",
    "💥 Promoção quente! Só para os mais rápidos!",
    "🎯 Desconto exclusivo para você!"
  ],
  beleza: [
    "💄 Glamour com preço baixinho — imperdível!",
    "🌸 Para elevar sua rotina de beleza gastando menos!",
    "✨ Luxo acessível HOJE! Aproveite!"
  ],
  luxo: [
    "💎 Produto premium com preço comum — aproveite!",
    "✨ Luxo acessível por tempo limitado!",
    "⚡ Oferta de luxo: oportunidade rara!"
  ],
  saude: [
    "💊 Oferta de saúde com ótimo custo-benefício!",
    "🩺 Condição promocional por tempo limitado!",
    "🟢 Produto de cuidado pessoal com desconto!"
  ],
  aparelhos: [
    "⚙️ Tecnologia e autocuidado com desconto!",
    "🔧 Upgrade na rotina com grande desconto!",
    "🔥 Preço especial em aparelhos pessoais!"
  ],
  bebidas: [
    "☕ Oferta gourmet — não deixe passar!",
    "🍷 Oportunidade para os amantes de rótulos!",
    "🍺 Promoção exclusiva em bebidas!"
  ],
  alimentos: [
    "🍽 Oferta gourmet irresistível!",
    "🍫 Delícia com preço lá embaixo!",
    "🛒 Achado do dia para sua despensa!"
  ]
};

// fallback phrases combined
const ALL_FRASES = Array.from(new Set([
  ...FRASES.general,
  ...FRASES.beleza, ...FRASES.luxo, ...FRASES.saude, ...FRASES.aparelhos, ...FRASES.bebidas, ...FRASES.alimentos
]));

// ------------------ util: detectar nicho por texto/link ------------------
function detectNicho(text) {
  const low = (text || "").toLowerCase();
  for (const [nicho, keys] of Object.entries(NICHOS_KEYWORDS)) {
    for (const k of keys) {
      if (low.includes(k)) return nicho;
    }
  }
  return "general";
}

// ------------------ util: escolher frase (por nicho) ------------------
function pickPhrase(nicho) {
  const pool = (FRASES[nicho] && FRASES[nicho].length) ? [...FRASES[nicho], ...FRASES.general] : ALL_FRASES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ------------------ DEDUPE ------------------
const recent = new Set();
const DEDUPE_TTL = 1000 * 60 * 60 * 6; // 6h default
function markPosted(key) {
  recent.add(key);
  setTimeout(() => recent.delete(key), DEDUPE_TTL);
}
function isPosted(key) { return recent.has(key); }

// ------------------ AFFILIATE (mantém seu link curto se já tiver) ------------------
function toAffiliate(url) {
  try {
    if (!url) return url;
    const u = new URL(url);
    if (u.hostname.includes("amazon.")) {
      u.searchParams.set("tag", AFFILIATE_TAG);
      return u.toString();
    }
    // se já for um link curto tipo amzn.to, mantemos exatamente como mandado (não alteramos)
    return url;
  } catch (e) {
    return url;
  }
}

// ------------------ RASPAGEM LEVE AMAZON (tenta, mas se falhar usa seu texto) ------------------
async function scrapeAmazon(url) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 12_000
    });
    const $ = cheerio.load(res.data);
    const title = $("#productTitle").text().trim() ||
                  $("h1 span").first().text().trim() ||
                  $("meta[property='og:title']").attr("content") ||
                  $("title").text().trim() || null;
    let price = $("#priceblock_ourprice").text().trim() ||
                $("#priceblock_dealprice").text().trim() ||
                $("span.a-price > span.a-offscreen").first().text().trim() || null;
    price = price ? price.replace(/\s+/g," ").trim() : null;
    const image = $("#imgTagWrapperId img").attr("data-old-hires") ||
                  $("#imgTagWrapperId img").attr("src") ||
                  $("meta[property='og:image']").attr("content") || null;
    return { title, price, image };
  } catch (e) {
    return { title: null, price: null, image: null };
  }
}

// ------------------ BUILD MESSAGE (template profissional + escassez) ------------------
function buildMessage({ userText, url, scraped, nicho }) {
  const frase = pickPhrase(nicho);
  const titlePart = scraped.title ? `*${scraped.title}*` : (userText ? `*${userText.split("\n")[0]}*` : "");
  const pricePart = scraped.price ? `\n💰 ${scraped.price}` : "";
  const imgPreview = scraped.image ? scraped.image : null;
  const affiliate = toAffiliate(url);

  const header = `${frase}\n\nFLASH OFERTA!! APROVEITAAA! 🔥🔥🔥\n\n`;
  const body = `${titlePart}\n\n${userText ? userText.replace(/\n+/g, "\n") + "\n\n" : ""}${pricePart}\n\n🛒 Comprar agora:\n👉 ${affiliate}\n\n#Oferta #Desconto #Promoção`;
  return { text: header + body, image: imgPreview };
}

// ------------------ POSTAGEM: envia texto + opcionalmente imagem (se disponível) ------------------
async function postOffer({msg, userText, url, forcedNicho}) {
  const key = url || userText.split("\n")[0];
  if (isPosted(key)) {
    await bot.sendMessage(msg.chat.id, "ℹ️ Oferta já publicada recentemente (dedupe).");
    return;
  }

  const detected = detectNicho((userText || "") + " " + (url || ""));
  const nicho = forcedNicho || detected || "general";

  // tenta enriquecer se for Amazon
  let scraped = { title: null, price: null, image: null };
  if (url && url.includes("amazon.")) {
    scraped = await scrapeAmazon(url);
  }

  const payload = buildMessage({ userText, url, scraped, nicho });
  // enviar com imagem se disponível (envia como mensagem comum com preview)
  try {
    if (payload.image) {
      // manda como texto com preview (telegram normalmente faz preview)
      await bot.sendMessage(channelId, payload.text, { parse_mode: "Markdown", disable_web_page_preview: false });
    } else {
      await bot.sendMessage(channelId, payload.text, { parse_mode: "Markdown", disable_web_page_preview: false });
    }
    markPosted(key);
    await bot.sendMessage(msg.chat.id, "✔️ Oferta publicada no canal!");
  } catch (err) {
    console.error("Erro ao postar oferta:", err);
    await bot.sendMessage(msg.chat.id, "❌ Erro ao postar oferta: " + (err.message || err));
  }
}

// ------------------ HELP & USO ------------------
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "Bot ativo! 🚀\nComo usar:\n\n" +
    "1) /oferta <nicho>?  - inicia modo de envio (ex: /oferta ou /oferta beleza)\n" +
    "   Depois responda com 2-4 linhas e inclua o link na última linha.\n\n" +
    "Comandos: /status /runlist (admins) /help",
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "Formato de envio:\nLinha1: Título curto\nLinha2: Descrição ou preço antigo\nLinha3: Preço atual / info\nLinha4: Link de afiliado (amzn.to ou amazon link)\n\nEx:\nOFERTA FLASH\nDe R$499\nPor R$289\nhttps://amzn.to/xxxxx",
    { parse_mode: "Markdown" }
  );
});

// comando /oferta [nicho]
bot.onText(/\/oferta(?:\s+(\w+))?/, async (msg, match) => {
  const forced = match && match[1] ? match[1].toLowerCase() : null;
  await bot.sendMessage(msg.chat.id, "Responda esta mensagem com a oferta (última linha = link).");
  // guardaremos no handler on message usando reply_to_message
  // payload inclui forced niche, que passaremos pelo reply_to relationship
  // armazenamos temporariamente o forced nicho em map (chatId -> forced)
  bot.pendingOffer = bot.pendingOffer || {};
  bot.pendingOffer[msg.chat.id] = { forcedNicho: forced };
});

// quando usuário responde ao prompt do /oferta
bot.on("message", async (msg) => {
  if (!msg.reply_to_message) return;
  if (!msg.reply_to_message.text) return;
  if (!msg.reply_to_message.text.includes("Responda esta mensagem com a oferta")) return;

  const chatId = msg.chat.id;
  const pending = (bot.pendingOffer && bot.pendingOffer[chatId]) ? bot.pendingOffer[chatId] : {};
  delete bot.pendingOffer[chatId];

  const full = msg.text.trim();
  const lines = full.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 1) {
    return bot.sendMessage(chatId, "❌ Formato inválido. Coloque pelo menos o texto e o link na última linha.");
  }
  const link = lines[lines.length - 1];
  const userText = lines.slice(0, lines.length - 1).join("\n");
  // valida link simples
  if (!link.startsWith("http")) {
    return bot.sendMessage(chatId, "❌ Link inválido. A última linha deve ser o link (https...).");
  }
  // permissões: se ADMIN_IDS configurado, checamos
  const fromId = String(msg.from.id);
  if (ADMIN_IDS.length && !ADMIN_IDS.includes(fromId)) {
    return bot.sendMessage(chatId, "❌ Você não tem permissão para publicar ofertas.");
  }

  await postOffer({ msg, userText, url: link, forcedNicho: pending.forcedNicho });
});

// status
bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, `Bot online.\nLIST_URLS: ${LIST_URLS.length}\nDedupe(TTL h): ${DEDUPE_TTL/3600000}`);
});

// optional: run manual list (admins)
bot.onText(/\/runlist/, async (msg) => {
  const fromId = String(msg.from.id);
  if (ADMIN_IDS.length && !ADMIN_IDS.includes(fromId)) {
    return bot.sendMessage(msg.chat.id, "❌ Você não tem permissão.");
  }
  if (!LIST_URLS.length) return bot.sendMessage(msg.chat.id, "⚠️ LIST_URLS vazia.");
  await bot.sendMessage(msg.chat.id, "🔁 Iniciando processamento da lista...");
  for (const u of LIST_URLS) {
    try {
      const userText = ""; // sem texto do usuário
      const link = u;
      await postOffer({ msg, userText, url: link });
      await new Promise(r => setTimeout(r, 1400));
    } catch (e) {
      console.warn("erro runlist:", e.message || e);
    }
  }
  await bot.sendMessage(msg.chat.id, "✔️ Processamento finalizado.");
});

// scheduler (apenas ativa se LIST_URLS tiver itens)
if (LIST_URLS.length) {
  schedule.scheduleJob(SCHEDULE_CRON, async () => {
    console.log(`[${new Date().toISOString()}] Scheduler: processando LIST_URLS...`);
    for (const u of LIST_URLS) {
      try {
        await postOffer({ msg: { chat: { id: channelId }, from: { id: "scheduler" } }, userText: "", url: u });
        await new Promise(r => setTimeout(r, 1400));
      } catch (e) {
        console.warn("scheduler erro:", e.message || e);
      }
    }
  });
}

// graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
