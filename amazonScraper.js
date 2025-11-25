const axios = require('axios');

// Resolve links encurtados (amzn.to)
async function resolverLinkFinal(url) {
  const response = await axios.get(url, {
    maxRedirects: 5,
    validateStatus: null
  });
  return response.request.res.responseUrl || url;
}

// Extrai meta tags OG
function extrairMeta(html, name) {
  const regex = new RegExp(`<meta property="og:${name}" content="(.*?)"`);
  const match = html.match(regex);
  return match ? match[1] : null;
}

async function obterProdutoAmazon(url, afiliado) {
  try {
    const linkFinal = await resolverLinkFinal(url);

    const { data } = await axios.get(linkFinal, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const nome = extrairMeta(data, "title") || "Produto Amazon";
    const imagem = extrairMeta(data, "image");

    const precoAtualMatch = data.match(/R\$\s?([\d.,]+)/);
    const precoAtual = precoAtualMatch ? precoAtualMatch[1] : "0";

    const precoAntigoMatch = data.match(/De:\s*R\$\s?([\d.,]+)/);
    const precoAntigo = precoAntigoMatch ? precoAntigoMatch[1] : precoAtual;

    const pAnt = parseFloat(precoAntigo.replace(",", "."));
    const pAt = parseFloat(precoAtual.replace(",", "."));

    const desconto = pAnt > pAt
      ? Math.round(((pAnt - pAt) / pAnt) * 100)
      : 0;

    return {
      nome,
      precoAtual,
      precoAntigo,
      desconto,
      parcelamento: "em até 4x sem juros",
      entrega: "frete grátis Prime",
      imagem: imagem || "https://m.media-amazon.com/images/I/71ZpeFZ2bUL._AC_SL1500_.jpg",
      tags: "#amazon #ofertas #promoção #desconto",
      linkAfiliado: `${linkFinal}?tag=${afiliado}`
    };

  } catch (error) {
    console.error("Erro Amazon:", error.message);
    return null;
  }
}

module.exports = { obterProdutoAmazon };
