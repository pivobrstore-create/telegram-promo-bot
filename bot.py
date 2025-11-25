# =========================================
# BOT TELEGRAM AMAZON - PYTHON SIMPLES
# 100% AUTOMÁTICO (VOCÊ SÓ ENVIA O LINK)
# =========================================

import os
import time
import json
import requests

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")
RAINFOREST_API_KEY = os.getenv("RAINFOREST_API_KEY")

API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"


def get_product_data(product_url: str):
    """Busca dados do produto na Rainforest API usando o link da Amazon."""
    r = requests.get(
        "https://api.rainforestapi.com/request",
        params={
            "api_key": RAINFOREST_API_KEY,
            "type": "product",
            "url": product_url,
        },
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    product = data.get("product", {}) or {}

    title = product.get("title", "Produto Amazon")

    buybox = product.get("buybox_winner") or {}
    price_info = buybox.get("price") or {}
    current = price_info.get("value")  # preço atual

    # tenta descobrir o preço antigo
    old = None
    raw_old = price_info.get("raw_old_price")
    if isinstance(raw_old, str):
        import re

        digits = (
            re.sub(r"[^\d,\.]", "", raw_old)
            .replace(".", "")
            .replace(",", ".")
        )
        try:
            old = float(digits)
        except ValueError:
            old = None

    if old is None:
        offers = product.get("offers") or []
        if offers:
            prev = (offers[0].get("price") or {}).get("previous_price")
            if isinstance(prev, (int, float)):
                old = float(prev)

    images = product.get("images") or []
    image_url = images[0].get("link") if images else None
    is_prime = bool(product.get("is_prime") or buybox.get("is_prime"))

    return title, current, old, image_url, is_prime


def brl(value):
    """Formata número em R$ bonitinho."""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_message(title, price, old_price, discount, is_prime, link):
    """Monta o texto exatamente no padrão que você pediu."""
    linhas = []
    linhas.append("🔥 PRA FAZER ESTOQUEEEE!! 🔥")
    linhas.append("")
    linhas.append(f"*{title}*")
    linhas.append("")

    if old_price:
        linhas.append(f"❌ {brl(old_price)}")
    if price:
        linhas.append(f"✅ {brl(price)}")
    if discount:
        linhas.append(f"({discount}% OFF automático)")
    linhas.append("")

    if is_prime:
        linhas.append("🚚 Frete grátis Prime")
    linhas.append("⚠️ Pode subir a qualquer momento!")
    linhas.append("")
    linhas.append("Compre aqui:")
    linhas.append(link)

    return "\n".join(linhas)


def send_photo(chat_id, photo_url, caption, link):
    keyboard = {
        "inline_keyboard": [[{"text": "🛒 COMPRAR AGORA", "url": link}]]
    }
    data = {
        "chat_id": chat_id,
        "photo": photo_url,
        "caption": caption,
        "parse_mode": "Markdown",
        "reply_markup": json.dumps(keyboard),
    }
    requests.post(f"{API_URL}/sendPhoto", data=data, timeout=20)


def send_message(chat_id, text, link):
    keyboard = {
        "inline_keyboard": [[{"text": "🛒 COMPRAR AGORA", "url": link}]]
    }
    data = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
        "reply_markup": json.dumps(keyboard),
    }
    requests.post(f"{API_URL}/sendMessage", data=data, timeout=20)


def main():
    if not BOT_TOKEN or not CHANNEL_ID or not RAINFOREST_API_KEY:
        raise RuntimeError(
            "BOT_TOKEN, CHANNEL_ID e RAINFOREST_API_KEY precisam estar definidos"
        )

    offset = None

    while True:
        try:
            resp = requests.get(
                f"{API_URL}/getUpdates",
                params={"timeout": 50, "offset": offset},
                timeout=60,
            )
            resp.raise_for_status()
            updates = resp.json().get("result", [])

            for upd in updates:
                offset = upd["update_id"] + 1

                msg = upd.get("message") or upd.get("channel_post")
                if not msg:
                    continue

                text = msg.get("text") or ""
                if "amazon" not in text and "amzn.to" not in text:
                    continue

                chat_id = msg["chat"]["id"]
                link = text.strip()

                try:
                    title, price, old_price, image_url, is_prime = get_product_data(link)

                    discount = None
                    if old_price and price:
                        discount = round((old_price - price) / old_price * 100)

                    caption = format_message(
                        title, price, old_price, discount, is_prime, link
                    )

                    # envia pra quem mandou e pro canal
                    target_ids = [chat_id, int(CHANNEL_ID)]
                    for cid in target_ids:
                        if image_url:
                            send_photo(cid, image_url, caption, link)
                        else:
                            send_message(cid, caption, link)

                except Exception as e:
                    err_text = f"❌ Erro ao processar link: {e}"
                    requests.post(
                        f"{API_URL}/sendMessage",
                        data={"chat_id": chat_id, "text": err_text},
                        timeout=20,
                    )

        except Exception as loop_err:
            print("Erro no loop principal:", loop_err)
            time.sleep(5)


if __name__ == "__main__":
    main()
