import os
import re
import requests
from bs4 import BeautifulSoup
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "✅ Envie o link da Amazon com seu afiliado que eu crio a oferta automaticamente."
    )

def coletar_dados_amazon(url):
    r = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(r.text, "html.parser")

    titulo = soup.find(id="productTitle")
    preco = soup.find("span", class_="a-offscreen")
    imagem = soup.find("img", id="landingImage")

    nome = titulo.get_text(strip=True) if titulo else "Produto Amazon"
    valor = preco.get_text(strip=True).replace("R$", "").strip() if preco else "0,00"
    img = imagem["src"] if imagem else None

    return nome, valor, img

async def gerar_oferta(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text.strip()

    if "amazon" not in url:
        await update.message.reply_text("❌ Envie um link válido da Amazon.")
        return

    nome, preco_atual, imagem = coletar_dados_amazon(url)

    mensagem = f"""
🔥 PRA FAZER ESTOQUEEEE!! 🔥

{nome}

❌ Preço antigo: R$ ---,--
✅ Preço atual: R$ {preco_atual}

🚚 Frete grátis Prime
⚠️ Pode subir a qualquer momento!

👉 Compre aqui:
{url}
"""

    if imagem:
        await context.bot.send_photo(
            chat_id=CHANNEL_ID,
            photo=imagem,
            caption=mensagem
        )
    else:
        await context.bot.send_message(
            chat_id=CHANNEL_ID,
            text=mensagem
        )

def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, gerar_oferta))

    print("🤖 BOT ONLINE...")
    app.run_polling()

if __name__ == "__main__":
    main()
