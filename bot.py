# =========================================
# BOT TELEGRAM AMAZON - PYTHON PROFISSIONAL
# VERSÃO DEFINITIVA – 100% AUTOMÁTICO ✅
# COMPATÍVEL COM RENDER E python-telegram-bot v20+
# =========================================

"""
✅ OBJETIVO ORIGINAL CONFIRMADO
Você só envia o LINK DA AMAZON com seu afiliado
O BOT faz TODO o resto:
- Pega título
- Pega preço atual
- Pega preço antigo
- Calcula % OFF
- Busca imagem melhor no Google
- Publica no canal automaticamente

FORMATO:
🔥 PRA FAZER ESTOQUEEEE!! 🔥
Produto
❌ Preço antigo
✅ Preço atual (%OFF)
... etc
"""

# ================================
# ARQUIVOS NECESSÁRIOS
# ================================
# bot.py  (este código)
# requirements.txt com:
# python-telegram-bot==20.7
# requests
# beautifulsoup4

# Start Command no Render:
# python bot.py

import os
import requests
from bs4 import BeautifulSoup
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

# ================================
# VARIÁVEIS DO RENDER
# ================================
BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")

if not BOT_TOKEN or not CHANNEL_ID:
    raise Exception("Defina BOT_TOKEN e CHANNEL_ID nas Environment Variables do Render")

# ================================
# FUNÇÕES CORE
# ================================

def buscar_imagem_google(query):
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(f"https://www.google.com/search?q={query}&tbm=isch", headers=headers)
    soup = BeautifulSoup(r.text, 'html.parser')
    img = soup.select_one('img')
    return img['src'] if img else None


def pegar_dados_amazon(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    page = requests.get(url, headers=headers)
    soup = BeautifulSoup(page.text, 'html.parser')

    titulo = soup.find(id='productTitle')
    titulo = titulo.get_text(strip=True) if titulo else "Produto Amazon"

    preco = soup.select_one('.a-price .a-offscreen')
    preco = float(preco.text.replace('R$', '').replace('.', '').replace(',', '.')) if preco else None

    preco_antigo = soup.select_one('.a-text-price span')
    preco_antigo = float(preco_antigo.text.replace('R$', '').replace('.', '').replace(',', '.')) if preco_antigo else None

    return titulo, preco, preco_antigo


def calcular_desconto(antigo, atual):
    if not antigo or not atual:
        return None
    return round(((antigo - atual) / antigo) * 100)


def montar_post(titulo, preco, preco_antigo, desconto, link):
    texto = "🔥 PRA FAZER ESTOQUEEEE!! 🔥\n\n"
    texto += f"*{titulo}*\n\n"

    if preco_antigo:
        texto += f"❌ R$ {preco_antigo:.2f}\n"
    if preco:
        texto += f"✅ R$ {preco:.2f}\n"
    if desconto:
        texto += f"({desconto}% OFF automático)\n\n"

    texto += "🚚 Frete grátis Prime\n"
    texto += "⚠️ Pode subir a qualquer momento!\n\n"
    texto += f"Compre aqui:\n{link}"

    return texto

# ================================
# HANDLER PRINCIPAL
# ================================

async def processar_link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    link = update.message.text

    if "amazon" not in link and "amzn.to" not in link:
        await update.message.reply_text("Envie apenas links da Amazon.")
        return

    titulo, preco, preco_antigo = pegar_dados_amazon(link)
    desconto = calcular_desconto(preco_antigo, preco)
    imagem = buscar_imagem_google(titulo)
    texto = montar_post(titulo, preco, preco_antigo, desconto, link)

    teclado = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛒 COMPRAR AGORA", url=link)]
    ])

    if imagem:
        await context.bot.send_photo(chat_id=update.effective_chat.id, photo=imagem, caption=texto, parse_mode="Markdown", reply_markup=teclado)
        await context.bot.send_photo(chat_id=CHANNEL_ID, photo=imagem, caption=texto, parse_mode="Markdown", reply_markup=teclado)
    else:
        await context.bot.send_message(chat_id=update.effective_chat.id, text=texto, parse_mode="Markdown", reply_markup=teclado)
        await context.bot.send_message(chat_id=CHANNEL_ID, text=texto, parse_mode="Markdown", reply_markup=teclado)

# ================================
# INICIALIZAÇÃO
# ================================

app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, processar_link))

print("✅ BOT AUTOMÁTICO PROFISSIONAL ATIVO")
app.run_polling()
