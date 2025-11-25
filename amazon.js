const axios = require('axios');

function gerarLinkAfiliado(url, tag) {
  return `${url}?tag=${tag}`;
}

async function getProductData(url, affiliateTag) {
  try {
    const response = await axios.get(url);
    const html = response.data;

    const title = html.match(/<title>(.*?)<\/title>/i)[1];
    const price = (html.match(/R\$\s?([\d.,]+)/) || [null, "0"])[1];
    const oldPrice = (html.match(/De:\s*R\$([\d.,]+)/) || [null, price])[1];

    const discount = Math.round(
      ((oldPrice - price) / oldPrice) * 100 || 0
    );

    return {
      title,
      price,
      oldPrice,
      discount,
      image: "https://via.placeholder.com/300",
      tags: ["amazon", "oferta", "desconto"],
      affiliateLink: gerarLinkAfiliado(url, affiliateTag)
    };
  } catch (e) {
    return null;
  }
}

module.exports = { getProductData };
