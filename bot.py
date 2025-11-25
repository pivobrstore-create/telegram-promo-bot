import os
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")
RAINFOREST_KEY = os.getenv("RAINFOREST_API_KEY")

def expand_url(url):
    try:
        r = requests.get(url, allow_redirects=True, timeout=10)
        return r.url
    except:
        return url

def get_product_data(amazon_url):
    api_url = "https://api.rainforestapi.com/request"
    params = {
        "api_key": RAINFOREST_KEY,
        "type": "product",
        "url": amazon_url
    }
    r = requests.get(api_url, params=params)
    return r.json()

def gerar_post(prod, link):
    titulo = prod.get("title", "Produto Amazon")
    preco = prod.get("price", {}).get("value", 0)
    preco_antigo = prod.get("price", {}).get("raw", "")
    imagem = prod.get("main_image", {}).get("link")

    texto = f"""
🔥 PRA FAZER ESTOQUEEEE!! 🔥

{titulo}

❌ {preco_antigo}
✅ R$ {preco}
⚡ OFERTA IMPERDÍVEL

🚚 Frete grátis Prime
⚠️ Pode subir a qualquer momento!

👉 Compre aqui:
{link}
"""

    return texto, imagem


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message.text.strip()

    if "amzn.to" in msg or "amazon" in msg:
        url_expandida = expand_url(msg)
        dados = get_product_data(url_expandida)

        if "product" not in dados:
            await update.message.reply_text("❌ Erro ao buscar produto. Verifique o link.")
            return

        produto = dados["product"]
        texto, imagem = gerar_post(produto, msg)

        await context.bot.send_photo(
            chat_id=CHANNEL_ID,
            photo=imagem,
            caption=texto
        )
    else:
        await update.message.reply_text("Envie um link válido da Amazon.")


def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("✅ BOT OPERANDO AUTOMATICAMENTE")
    app.run_polling()

if __name__ == "__main__":
    main()
