const axios = require('axios');

const IMAGEM_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg";

// resolve links encurtados
async function resolverLinkFinal(url) {
  const res = await axios.get(url, { maxRedirects: 5, validateStatus: null });
  return res.request.res.responseUrl || url;
}

// extrai meta tags
function extrairMeta(html, tag) {
  const regex = new RegExp(`<meta property="og:${tag}" content="(.*?)"`);
  const match = html.match(regex);
  return match ? match[1] : null;
}

async function validarImagem(url) {
  try {
    const head = await axios.head(url);
    return head.headers['content-type'].startsWith('image');
  } catch {
    return false;
  }
}

async function obterProdutoAmazon(url, afiliado) {
  try {
    const linkFinal = await resolverLinkFinal(url);

    const { data } = await axios.get(linkFinal, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const nome = extrairMeta(data, "title") || "Produto Amazon";
    let imagem = extrairMeta(data, "image") || IMAGEM_FALLBACK;

    if (!(await validarImagem(imagem))) {
      imagem = IMAGEM_FALLBACK;
    }

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
