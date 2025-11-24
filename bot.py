import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

BOT_TOKEN = os.environ.get("BOT_TOKEN")
CHANNEL_ID = os.environ.get("CHANNEL_ID")

if not BOT_TOKEN or not CHANNEL_ID:
    raise Exception("Configure BOT_TOKEN e CHANNEL_ID no Render")

def extrair_imagem_amazon(url):
    # força imagem da Amazon via OpenGraph
    return f"https://api.microlink.io/?url={url}&screenshot=true&meta=false"

def montar_texto(link):
    return f"""🔥 PRA FAZER ESTOQUEEEE!! 🔥

OFERTA IMPERDÍVEL AMAZON 👇

✅ Confira agora o preço atualizado
🚚 Frete grátis Prime
⚠️ Pode subir a qualquer momento!

Compre aqui:
{link}
"""

async def processar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    link = update.message.text

    if "amazon" not in link and "amzn.to" not in link:
        await update.message.reply_text("Envie o LINK DA AMAZON.")
        return
    
    imagem = extrair_imagem_amazon(link)
    texto = montar_texto(link)

    botoes = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛒 COMPRAR AGORA", url=link)]
    ])

    await context.bot.send_photo(update.effective_chat.id, imagem, caption=texto, reply_markup=botoes)
    await context.bot.send_photo(CHANNEL_ID, imagem, caption=texto, reply_markup=botoes)

app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, processar))

print("✅ BOT ONLINE 100% AUTOMÁTICO")
app.run_polling()
