const axios = require('axios');

async function obterProdutoAmazon(url, afiliado) {
  try {
    const { data } = await axios.get(url);

    const nome = (data.match(/<title>(.*?)<\/title>/i) || ["", "Produto Amazon"])[1];
    const precoAtual = (data.match(/priceblock_ourprice">R\$\s([\d.,]+)/i) || ["", "0"])[1];
    const precoAntigo = (data.match(/priceblock_strikeprice">R\$\s([\d.,]+)/i) || ["", precoAtual])[1];

    const desconto = Math.round(((parseFloat(precoAntigo) - parseFloat(precoAtual)) / parseFloat(precoAntigo)) * 100 || 0);

    return {
      nome,
      precoAtual,
      precoAntigo,
      desconto,
      parcelamento: "até 4x sem juros",
      entrega: "frete grátis Prime",
      imagem: "https://m.media-amazon.com/images/I/71ZpeFZ2bUL._AC_SL1500_.jpg",
      tags: "#amazon #licor #bebidas #oferta",
      linkAfiliado: `${url}?tag=${afiliado}`
    };

  } catch (e) {
    return null;
  }
}

module.exports = { obterProdutoAmazon };
