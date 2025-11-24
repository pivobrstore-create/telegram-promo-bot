# =========================================
# BOT TELEGRAM AMAZON - PYTHON PROFISSIONAL
# FORMATO EXATO SOLICITADO PELO CLIENTE
# =========================================

# Requisitos:
# pip install python-telegram-bot==20.7 requests beautifulsoup4

import requests
from bs4 import BeautifulSoup
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
import re

BOT_TOKEN = "SEU_TOKEN_DO_BOT"
CHANNEL_ID = "SEU_ID_DO_CANAL"  # ex: -1001234567890

# =============================
# FUNÇÕES AUXILIARES
# =============================

def get_google_image(query):
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    url = f"https://www.google.com/search?q={query}&tbm=isch"
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")
    img = soup.find("img")
    return img['src'] if img else None


def get_amazon_data(url):
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    page = requests.get(url, headers=headers)
    soup = BeautifulSoup(page.text, 'html.parser')

    title = soup.find(id='productTitle')
    title = title.get_text(strip=True) if title else "Produto Amazon"

    price = soup.select_one('.a-price .a-offscreen')
    price = price.get_text(strip=True).replace('R$', '').replace(',', '.') if price else None

    old_price = soup.select_one('.a-text-price span')
    old_price = old_price.get_text(strip=True).replace('R$', '').replace(',', '.') if old_price else None

    price = float(price) if price else None
    old_price = float(old_price) if old_price else None

    return title, price, old_price


def calculate_discount(old, new):
    if not old or not new:
        return None
    return round(((old - new) / old) * 100)


def format_offer(title, price, old_price, discount, link):
    return f"""
🔥 PRA FAZER ESTOQUEEEE!! 🔥

*{title}*

❌ R$ {old_price if old_price else ''}
✅ R$ {price}
({discount}% OFF automático)

🚚 Frete grátis Prime
⚠️ Pode subir a qualquer momento!

Compre aqui:
{link}
"""

# =============================
# BOT HANDLER
# =============================

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if "amazon" not in text and "amzn.to" not in text:
        await update.message.reply_text("Envie um link da Amazon.")
        return

    title, price, old_price = get_amazon_data(text)
    discount = calculate_discount(old_price, price)
    image = get_google_image(title)
    caption = format_offer(title, price, old_price, discount, text)

    keyboard = InlineKeyboardMarkup([[InlineKeyboardButton("🛒 COMPRAR AGORA", url=text)]])

    if image:
        await context.bot.send_photo(chat_id=update.effective_chat.id, photo=image, caption=caption, parse_mode='Markdown', reply_markup=keyboard)
        await context.bot.send_photo(chat_id=CHANNEL_ID, photo=image, caption=caption, parse_mode='Markdown', reply_markup=keyboard)
    else:
        await context.bot.send_message(chat_id=update.effective_chat.id, text=caption, parse_mode='Markdown', reply_markup=keyboard)
        await context.bot.send_message(chat_id=CHANNEL_ID, text=caption, parse_mode='Markdown', reply_markup=keyboard)


if __name__ == '__main__':
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("✅ BOT PYTHON PROFISSIONAL ATIVO")
    app.run_polling()
