# =========================================
# BOT TELEGRAM AMAZON - PYTHON PROFISSIONAL
# PRONTO PARA RODAR NO RENDER ✅
# =========================================

# ✅ COMO USAR:
# 1. Crie um arquivo chamado: bot.py
# 2. Crie um arquivo chamado: requirements.txt
# 3. Configure as variáveis no Render (Environment Variables):
#    BOT_TOKEN = token do BotFather
#    CHANNEL_ID = id do seu canal (ex: -1001234567890)
#
# ✅ Start Command no Render:
# python bot.py

# ================================
# requirements.txt (conteúdo)
# ================================
# python-telegram-bot==20.7
# requests
# beautifulsoup4

import os
import requests
from bs4 import BeautifulSoup
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

# 🔐 Variáveis de ambiente (SEGURAS)
BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")

if not BOT_TOKEN or not CHANNEL_ID:
    raise Exception("Configure BOT_TOKEN e CHANNEL_ID nas variáveis do Render")

# =============================
# BUSCAR IMAGEM PROFISSIONAL (GOOGLE)
# =============================

def get_google_image(query):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"https://www.google.com/search?q={query}&tbm=isch"
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")
    img = soup.find("img")
    return img['src'] if img else None

# =============================
# SCRAP AMAZON
# =============================

def get_amazon_data(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    page = requests.get(url, headers=headers)
    soup = BeautifulSoup(page.text, 'html.parser')

    title = soup.find(id='productTitle')
    title = title.get_text(strip=True) if title else "Produto Amazon"

    price = soup.select_one('.a-price .a-offscreen')
    price = float(price.text.replace('R$', '').replace('.', '').replace(',', '.')) if price else None

    old_price = soup.select_one('.a-text-price span')
    old_price = float(old_price.text.replace('R$', '').replace('.', '').replace(',', '.')) if old_price else None

    return title, price, old_price

# =============================
# CÁLCULO DESCONTO
# =============================

def calculate_discount(old, new):
    if not old or not new:
        return None
    return round(((old - new) / old) * 100)

# =============================
# FORMATAÇÃO FINAL (PADRÃO PROFISSIONAL)
# =============================

def format_post(title, price, old_price, discount, link):
    texto = f"🔥 PRA FAZER ESTOQUEEEE!! 🔥\n\n"
    texto += f"*{title}*\n\n"

    if old_price:
        texto += f"❌ R$ {old_price:.2f}\n"
    if price:
        texto += f"✅ R$ {price:.2f}\n"

    if discount:
        texto += f"({discount}% OFF automático)\n\n"

    texto += "🚚 Frete grátis Prime\n"
    texto += "⚠️ Pode subir a qualquer momento!\n\n"
    texto += f"Compre aqui:\n{link}"

    return texto

# =============================
# BOT HANDLER
# =============================

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text

    if "amazon" not in url and "amzn.to" not in url:
        await update.message.reply_text("Envie um link válido da Amazon.")
        return

    title, price, old_price = get_amazon_data(url)
    discount = calculate_discount(old_price, price)
    image = get_google_image(title)
    caption = format_post(title, price, old_price, discount, url)

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛒 COMPRAR AGORA", url=url)]
    ])

    if image:
        await context.bot.send_photo(update.effective_chat.id, image, caption=caption, parse_mode='Markdown', reply_markup=keyboard)
        await context.bot.send_photo(CHANNEL_ID, image, caption=caption, parse_mode='Markdown', reply_markup=keyboard)
    else:
        await context.bot.send_message(update.effective_chat.id, caption, parse_mode='Markdown', reply_markup=keyboard)
        await context.bot.send_message(CHANNEL_ID, caption, parse_mode='Markdown', reply_markup=keyboard)

# =============================
# INICIALIZAÇÃO
# =============================

app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

print("✅ BOT PYTHON PROFISSIONAL EM EXECUÇÃO")
app.run_polling()
