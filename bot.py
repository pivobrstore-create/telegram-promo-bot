import os
import requests
from bs4 import BeautifulSoup
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")

if not BOT_TOKEN or not CHANNEL_ID:
    raise RuntimeError("Configure BOT_TOKEN e CHANNEL_ID nas variáveis do Render")

def dados_amazon(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "lxml")

    titulo = soup.find(id="productTitle")
    titulo = titulo.get_text(strip=True) if titulo else "Produto Amazon"

    preco = soup.select_one(".a-price .a-offscreen")
    preco = float(preco.text.replace("R$", "").replace(".", "").replace(",", ".")) if preco else None

    preco_antigo = soup.select_one(".a-text-price span")
    preco_antigo = float(preco_antigo.text.replace("R$", "").replace(".", "").replace(",", ".")) if preco_antigo else None

    return titulo, preco, preco_antigo


def desconto(old, new):
    if not old or not new:
        return None
    return round(((old - new) / old) * 100)


def formatar(titulo, atual, antigo, perc, link):
    msg = "🔥 PRA FAZER ESTOQUEEEE!! 🔥\n\n"
    msg += f"*{titulo}*\n\n"
    if antigo:
        msg += f"❌ R$ {antigo:.2f}\n"
    if atual:
        msg += f"✅ R$ {atual:.2f}\n"
    if perc:
        msg += f"({perc}% OFF automático)\n\n"
    msg += "🚚 Frete grátis Prime\n"
    msg += "⚠️ Pode subir a qualquer momento!\n\n"
    msg += f"Compre aqui:\n{link}"
    return msg


async def processar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    link = update.message.text

    if "amazon" not in link and "amzn.to" not in link:
        await update.message.reply_text("Envie um link válido da Amazon.")
        return

    titulo, atual, antigo = dados_amazon(link)
    perc = desconto(antigo, atual)
    texto = formatar(titulo, atual, antigo, perc, link)

    teclado = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛒 COMPRAR AGORA", url=link)]
    ])

    await context.bot.send_message(update.effective_chat.id, texto, parse_mode="Markdown", reply_markup=teclado)
    await context.bot.send_message(CHANNEL_ID, texto, parse_mode="Markdown", reply_markup=teclado)


app = Application.builder().token(BOT_TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, processar))
print("✅ BOT RODANDO CORRETAMENTE")
app.run_polling()
