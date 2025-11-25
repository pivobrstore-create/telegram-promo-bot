const axios = require('axios');

// ================== COPYS POR NICHO ==================

const COPYS_NICHO = {
  bebidas: {
    intro: [
      "🍻 PREÇO GELADO PRA ESQUENTAR A RESENHA!",
      "🍹 BEBIDA EM PROMOÇÃO DE RESPEITO!",
      "🥃 DESCONTO PRA QUEM GOSTA DE BRINDAR BEM!",
      "🍺 ESSA NÃO DURA MUITO TEMPO NO ESTOQUE!",
      "🔥 O HAPPY HOUR COMEÇA NESSE PREÇO!",
      "💣 BEBIDA COM PREÇO DE BLACK FRIDAY!",
      "⚡ DESCONTO PRA ENCHER O FREEZER SEM PESAR!",
      "🚨 OFERTA PRA QUEM NÃO ACEITA BEBIDA MAIS OU MENOS!",
      "🍻 MOMENTO CERTO PRA FAZER AQUELA RESERVA!",
      "🔥 CHANCE BOA PRA DEIXAR O BAR EM CASA COMPLETO!"
    ],
    story: [
      "Imagina isso chegando na próxima resenha, todo mundo perguntando onde você achou esse preço.",
      "Perfeito pra deixar a bebida garantida antes da galera confirmar presença.",
      "Pra quem gosta de qualidade no copo sem sofrer na fatura.",
      "Ideal pra ter sempre aquela bebida especial esperando na geladeira."
    ]
  },
  infantil: {
    intro: [
      "👶 OFERTA ESPECIAL PRA CUIDAR DOS PEQUENOS!",
      "🍼 PREÇO AMIGO PRA QUEM PRIORIZA QUALIDADE!",
      "💙 DESCONTO EM PRODUTO INFANTIL QUE VALE A PENA!",
      "👨‍👩‍👧 CUIDADO COM OS PEQUENOS SEM ARREBENTAR O ORÇAMENTO!",
      "✨ PRODUTO INFANTIL COM PREÇO QUE FOGE DO PADRÃO!",
      "🚨 OFERTA BOA PRA FAZER ESTOQUE!",
      "💥 O MELHOR PRA CRIANÇADA COM DESCONTO REAL!",
      "🎯 PRA QUEM NÃO ABRE MÃO DO MELHOR PROS FILHOS!",
      "🔥 PROMOÇÃO INFANTIL DAquelas RARAS!",
      "📦 PERFEITO PRA DEIXAR O ARMÁRIO ABASTECIDO!"
    ],
    story: [
      "Pra quem gosta de se antecipar e não passar perrengue quando o produto acaba.",
      "Ótimo pra manter a rotina dos pequenos em dia sem susto no fim do mês.",
      "Ideal pra quem sempre escolhe a melhor opção na hora de cuidar da família.",
      "Perfeito pra deixar o estoque em dia e evitar correria de última hora."
    ]
  },
  casa: {
    intro: [
      "🏡 SUA CASA MERECE ESSA ATUALIZAÇÃO!",
      "🍽️ PROMOÇÃO PRA ORGANIZAR A COZINHA COM ESTILO!",
      "✨ PRODUTO DE CASA COM PREÇO DE OPORTUNIDADE!",
      "🔥 DESCONTO PRA QUEM AMA CASA ARRUMADA!",
      "💥 ITEM ÚTIL QUE REALMENTE FAZ DIFERENÇA NO DIA A DIA!",
      "📦 CHANCE PERFEITA PRA TROCAR OS VELHOS PELOS NOVOS!",
      "⚡ OFERTA PRA QUEM GOSTA DE CASA FUNCIONAL E BONITA!",
      "🚨 NÃO É TODO DIA QUE ESSE TIPO DE PRODUTO ENTRA EM PROMO!",
      "🎯 AJUDA REAL NA ORGANIZAÇÃO DA ROTINA!",
      "🔥 PROPOSTA PERFEITA PRA QUEM GOSTA DE VER A CASA NO CAPRICHO!"
    ],
    story: [
      "Imagina isso na sua cozinha, tudo organizado e com cara de casa nova.",
      "Perfeito pra dar aquele upgrade que você sempre enrolou pra fazer.",
      "Pra quem ama ver tudo no lugar certo, com praticidade.",
      "Ideal pra deixar o dia a dia mais leve e funcional."
    ]
  },
  tecnologia: {
    intro: [
      "⚡ TECH EM PROMOÇÃO QUE NÃO APARECE TODA HORA!",
      "💻 DESCONTO PRA QUEM AMA TECNOLOGIA ESPERTA!",
      "🎧 PRODUTO TECH COM PREÇO DIFERENCIADO!",
      "🔥 EQUIPAMENTO COM PREÇO DE OPORTUNIDADE!",
      "💣 ESSA É PRA QUEM TAVA ESPERANDO O MOMENTO CERTO!",
      "🚀 GADGET EM PROMOÇÃO PRA OTIMIZAR SEU DIA!",
      "⚠️ TECH BOM COM DESCONTO RARO!",
      "💥 OFERTA PERFEITA PRA ATUALIZAR SEU SETUP!",
      "📱 PRA QUEM GOSTA DE TECH SEM PAGAR PREÇO CHEIO!",
      "🔥 PREÇO QUE PARECE BUG MAS É REAL!"
    ],
    story: [
      "Imagina isso entrando no seu setup e facilitando sua rotina todo dia.",
      "Perfeito pra substituir aquele modelo antigo que já tá pedindo aposentadoria.",
      "Pra quem curte tecnologia inteligente que vale o investimento.",
      "Ótimo pra deixar o dia a dia mais rápido e organizado."
    ]
  },
  beleza: {
    intro: [
      "💄 CUIDADO PESSOAL EM MODO PROMOÇÃO!",
      "✨ PRODUTO DE BELEZA COM DESCONTO QUE COMPENSA!",
      "💋 CHANCE BOA PRA TURBINAR A ROTINA DE AUTOCUIDADO!",
      "🔥 SKINCARE/BELEZA COM PREÇO FUGINDO DO PADRÃO!",
      "💅 PERFEITO PRA QUEM GOSTA DE SE CUIDAR SEM GASTAR MUITO!",
      "💥 OPORTUNIDADE PRA TESTAR OU RECOMPRAR SEU QUERIDINHO!",
      "🚨 DESCONTO RARO NESSE TIPO DE PRODUTO!",
      "🎯 BOA PRA QUEM CURTE QUALIDADE DE SALÃO EM CASA!",
      "⚡ PRA COLOCAR NA NECESSAIRE SEM CULPA!",
      "🔥 IDEAL PRA ATUALIZAR SUA ROTINA DE CUIDADOS!"
    ],
    story: [
      "Imagina isso fazendo parte da sua rotina e você pensando ‘paguei bem mais barato nisso’.",
      "Perfeito pra testar e, se gostar, já sentir que valeu cada centavo.",
      "Pra quem gosta de se cuidar com produtos bons, sem exagero no preço.",
      "Ótimo pra repor antes de acabar e ainda pagar menos."
    ]
  }
};

// fallback geral, com vibe Black Friday / urgência / escassez
const COPYS_GERAL = {
  intro: [
    "🔥 OFERTA COM CARA DE BLACK FRIDAY!",
    "💣 PREÇO QUE NÃO FAZ SENTIDO FICAR ESSE BAIXO!",
    "⚠️ O TIPO DE DESCONTO QUE NÃO APARECE TODO DIA!",
    "🚨 PROMOÇÃO PERFEITA PRA APROVEITAR ENQUANTO TÁ ROLANDO!",
    "💥 PREÇO LÁ EMBAIXO PRA VOCÊ APROVEITAR!",
    "🔥 PROMOÇÃO COM CLIMA DE QUE VAI SUMIR RÁPIDO!",
    "💣 OPORTUNIDADE BOA PRA PEGAR AGORA E AGRADECER DEPOIS!",
    "⚡ DESCONTO INTELIGENTE PRA QUEM SABE FAZER CONTA!",
    "🚀 BOA PRA FAZER AQUELA COMPRA E ESQUECER DO TEMA POR UM TEMPO!",
    "🔥 PREÇO DIFERENCIADO PRA QUEM TÁ NO FEED CERTO!"
  ],
  story: [
    "Imagina olhar pra esse produto daqui um tempo e lembrar que você pegou num preço que quase ninguém viu.",
    "Pra não ser aquela pessoa que fala ‘eu vi essa oferta e não aproveitei’.",
    "É o tipo de oportunidade que aparece, você aproveita e depois só indica pros outros.",
    "Perfeito pra colocar no carrinho hoje e esquecer de se preocupar com isso depois."
  ]
};

// ================== ESCASSEZ & BLACK FRIDAY ==================

const COPYS_DESCONTO_FORTE = [
  "🔥 Desconto pesado, clima total de Black Friday.",
  "💣 Esse preço tá com cara de erro, mas tá valendo.",
  "⚠️ Desconto desse nível não costuma durar muito.",
  "🚨 Tá barato demais pro produto que é.",
  "🔥 Nível de desconto que normalmente só se vê em campanha grande."
];

const COPYS_DESCONTO_MEDIO = [
  "💰 Desconto honesto, bem interessante pra quem já tava de olho.",
  "⚡ Preço ajustado pra baixo, vale considerar forte.",
  "📉 Caiu o suficiente pra fazer sentido pegar agora.",
  "👌 Desconto redondo, boa hora pra decidir.",
  "💥 Não é absurdo, mas é o tipo de preço que já compensa."
];

const COPYS_DESCONTO_LEVE = [
  "📌 Desconto mais leve, mas já tira o peso de pagar preço cheio.",
  "💭 Se você já estava querendo, agora dói menos no bolso.",
  "🔎 Ajuste de preço pequeno, mas válido pra quem tá comparando.",
  "📉 Não é revolução, mas é melhor agora do que sem nada.",
  "💸 Ajuda a decidir sem tanta culpa."
];

const COPYS_ESCASSEZ = [
  "⏳ Essas coisas não costumam avisar quando vão voltar ao preço normal.",
  "⚠️ Se fizer sentido pra você, melhor garantir enquanto tá assim.",
  "🔔 Não dá pra saber quanto tempo esse preço fica no ar.",
  "🚨 Quando o estoque andar ou a demanda subir, o preço normalmente acompanha.",
  "⌛ Não é aquele tipo de promoção que dura semanas."
];

// ================== FUNÇÕES DE APOIO ==================

function detectarNicho(titulo) {
  const t = titulo.toLowerCase();

  if (t.includes("cerveja") || t.includes("vinho") || t.includes("licor") || t.includes("whisky") || t.includes("gin"))
    return "bebidas";

  if (t.includes("infantil") || t.includes("bebê") || t.includes("1-3 anos") || t.includes("fralda") || t.includes("lactente"))
    return "infantil";

  if (t.includes("pote") || t.includes("cozinha") || t.includes("organizador") || t.includes("hermetico") || t.includes("casa"))
    return "casa";

  if (t.includes("fone") || t.includes("headset") || t.includes("teclado") || t.includes("mouse") || t.includes("notebook") || t.includes("ssd") || t.includes("monitor"))
    return "tecnologia";

  if (t.includes("hidratante") || t.includes("creme") || t.includes("labial") || t.includes("batom") || t.includes("perfume") || t.includes("skin") || t.includes("skincare"))
    return "beleza";

  return "geral";
}

function escolherAleatorio(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function gerarBlocosCopy(nicho, desconto) {
  const base = COPYS_NICHO[nicho] || COPYS_GERAL;
  const intro = escolherAleatorio(base.intro);
  const story = escolherAleatorio(base.story);

  let blocoDesconto;
  if (desconto >= 50) {
    blocoDesconto = escolherAleatorio(COPYS_DESCONTO_FORTE);
  } else if (desconto >= 30) {
    blocoDesconto = escolherAleatorio(COPYS_DESCONTO_MEDIO);
  } else {
    blocoDesconto = escolherAleatorio(COPYS_DESCONTO_LEVE);
  }

  const escassez = escolherAleatorio(COPYS_ESCASSEZ);

  return { intro, story, blocoDesconto, escassez };
}

// ================== SCRAPER AMAZON ==================

async function resolverLinkFinal(url) {
  const res = await axios.get(url, { maxRedirects: 5, validateStatus: null });
  return res.request.res.responseUrl || url;
}

function extrairImagemAlta(html) {
  const match = html.match(/"hiRes":"(https:[^"]+)"/);
  return match ? match[1].replace(/\\u0026/g, '&') : null;
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

    const nicho = detectarNicho(nome);
    const { intro, story, blocoDesconto, escassez } = gerarBlocosCopy(nicho, desconto);

    return {
      intro,
      story,
      blocoDesconto,
      escassez,
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
