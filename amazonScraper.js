const axios = require('axios');

async function resolverLinkFinal(url) {
  const response = await axios.get(url, {
    maxRedirects: 5,
    validateStatus: null
  });
  return response.request.res.responseUrl || url;
}

function extrairMeta(html, name) {
  const match = html.match(
    new RegExp(`<meta property="og:${name}" content="(.*?)"`)
  );
  return match ? match[1] : null;
}

async function obterProdutoAmazon(url, afiliado) {
  try {
    const linkFinal = await resolverLinkFinal(url);

    const { data } = await axios.get(linkFinal, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const nome = extrairMeta(data, "title") || "Produto Amazon";
    const imagem = extrairMeta(data, "image");

    const precoAtualMatch = data.match(/R\$\s?([\d.,]+)/);
    const precoAtual = precoAtualMatch ? precoAtualMatch[1] : "0";

    const precoAntigoMatch = data.match(/De:\s*R\$\s?([\d.,]+)/);
    const precoAntigo = precoAntigoMatch ? precoAntigoMatch[1] : precoAtual;

    const desconto = precoAntigo !== precoAtual
      ? Math.round(((parseFloat(precoAntigo.replace(",", ".")) - parseFloat(precoAtual.replace(",", "."))) / parseFloat(precoAntigo.replace(",", "."))) * 100)
      : 0;

    return {
      nome,
      precoAtual,
      precoAntigo,
      desconto,
      parcelamento: "em até 4x sem juros",
      entrega: "frete grátis Prime",
      imagem,
      tags: "#amazon #oferta #promoção",
      linkAfiliado: `${linkFinal}?tag=${afiliado}`
    };

  } catch (e) {
    console.error("Erro ao buscar produto:", e.message);
    return null;
  }
}

module.exports = { obterProdutoAmazon };
