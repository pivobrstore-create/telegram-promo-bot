import requests
from bs4 import BeautifulSoup
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

BOT_TOKEN = "COLE_SEU_TOKEN_AQUI"
CHANNEL_ID = -100XXXXXXXXXX  # ID do canal

def pegar_dados_amazon(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")

    titulo = soup.find(id="productTitle")
    titulo = titulo.get_text(strip=True) if titulo else "Produto Amazon"

    preco = soup.select_one(".a-price .a-offscreen")
    preco = float(preco.get_text().replace("R$", "").replace(",", ".").strip()) if preco else None

    preco_antigo = soup.select_one(".a-text-price span")
    preco_antigo = float(preco_antigo.get_text().replace("R$", "").replace(",", ".").strip()) if preco_antigo else None

    return titulo, preco, preco_antigo

def pegar_imagem_google(produto):
    query = produto.replace(" ", "+")
    url = f"https://www.google.com/search?q={query}&tbm=isch"
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")
    img = soup.find("img")
    return img["src"] if img else None

def desconto(a, b):
    if not a or not b:
        return None
    return round(((a - b) / a) * 100)

def montar_post(nome, preco, preco_antigo, perc, link):
    return f"""
🔥 PRA FAZER ESTOQUEEEE!! 🔥

*{nome}*

❌ R$ {preco_antigo if preco_antigo else ""}
✅ R$ {preco}
({perc}% OFF automático)

🚚 Frete grátis Prime
⚠️ Pode subir a qualquer momento!

Compre aqui:
{link}
"""

async def responder(update: Update, context: ContextTypes.DEFAULT_TYPE):
    link = update.message.text

    if "amazon" not in link and "amzn.to" not in link:
        await update.message.reply_text("Envie um link da Amazon.")
        return

    nome, preco, preco_antigo = pegar_dados_amazon(link)
    img = pegar_imagem_google(nome)
    perc = desconto(preco_antigo, preco)

    msg = montar_post(nome, preco, preco_antigo, perc, link)

    teclado = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛒 COMPRAR AGORA", url=link)]
    ])

    if img:
        await context.bot.send_photo(update.effective_chat.id, img, caption=msg, parse_mode="Markdown", reply_markup=teclado)
        await context.bot.send_photo(CHANNEL_ID, img, caption=msg, parse_mode="Markdown", reply_markup=teclado)
    else:
        await context.bot.send_message(update.effective_chat.id, msg, parse_mode="Markdown", reply_markup=teclado)
        await context.bot.send_message(CHANNEL_ID, msg, parse_mode="Markdown", reply_markup=teclado)

if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, responder))
    print("✅ BOT PROFISSIONAL ONLINE")
    app.run_polling()
