const axios = require('axios');

async function resolverLinkFinal(url) {
  const res = await axios.get(url, { maxRedirects: 5, validateStatus: null });
  return res.request.res.responseUrl || url;
}

function extrairImagemAlta(html) {
  const match = html.match(/"hiRes":"(https:[^"]+)"/);
  if (match) return match[1].replace(/\\u0026/g, '&');
  return "https://m.media-amazon.com/images/I/71ZpeFZ2bUL._AC_SL1500_.jpg";
}

function extrairTitulo(html) {
  const match = html.match(/<title>(.*?)<\/title>/);
  return match ? match[1].replace("Amazon.com.br:", "").trim() : "Produto Amazon";
}

async function obterProdutoAmazon(url, afiliado) {
  try {
    const linkFinal = await resolverLinkFinal(url);

    const { data } = await axios.get(linkFinal, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const nome = extrairTitulo(data);
    const imagem = extrairImagemAlta(data);

    const precoAtualMatch = data.match(/R\$\s?([\d.,]+)/);
    const precoAtual = precoAtualMatch ? precoAtualMatch[1] : "0";

    const precoAntigoMatch = data.match(/De:\s*R\$\s?([\d.,]+)/);
    const precoAntigo = precoAntigoMatch ? precoAntigoMatch[1] : precoAtual;

    const pAnt = parseFloat(precoAntigo.replace(",", "."));
    const pAt = parseFloat(precoAtual.replace(",", "."));

    const desconto = pAnt > pAt ? Math.round(((pAnt - pAt) / pAnt) * 100) : 0;

    return {
      nome,
      precoAtual,
      precoAntigo,
      desconto,
      parcelamento: "em até 4x sem juros",
      entrega: "frete grátis Prime",
      imagem,
      tags: "#amazon #ofertas #promoção #desconto",
      linkAfiliado: `${linkFinal}?tag=${afiliado}`
    };

  } catch (e) {
    console.error("Erro Amazon:", e.message);
    return null;
  }
}

module.exports = { obterProdutoAmazon };
