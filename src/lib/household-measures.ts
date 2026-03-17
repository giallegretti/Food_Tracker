/**
 * Medidas caseiras comuns para alimentos brasileiros.
 * Mapeadas por substring do nome do alimento (match parcial, case-insensitive).
 * Fonte: Tabela de Medidas Caseiras (IBGE/NEPA) e referências nutricionais BR.
 *
 * Cada medida tem: label (nome da medida), grams (peso em gramas).
 */

interface HouseholdMeasure {
  label: string;
  grams: number;
}

// Matches by partial name (lowercase). Order matters — first match wins.
const MEASURES_BY_KEYWORD: Array<{
  keywords: string[];
  measures: HouseholdMeasure[];
}> = [
  // === OVOS ===
  {
    keywords: ["ovo", "ovos"],
    measures: [
      { label: "1 ovo", grams: 50 },
      { label: "2 ovos", grams: 100 },
      { label: "3 ovos", grams: 150 },
      { label: "1 clara", grams: 33 },
      { label: "1 gema", grams: 17 },
    ],
  },

  // === ARROZ ===
  {
    keywords: ["arroz"],
    measures: [
      { label: "1 col. sopa", grams: 25 },
      { label: "1 escumadeira", grams: 75 },
      { label: "1 xicara", grams: 160 },
      { label: "1 prato raso", grams: 200 },
    ],
  },

  // === FEIJAO ===
  {
    keywords: ["feijão", "feijao"],
    measures: [
      { label: "1 concha", grams: 80 },
      { label: "1 col. sopa", grams: 25 },
      { label: "1/2 concha", grams: 40 },
      { label: "2 conchas", grams: 160 },
    ],
  },

  // === LENTILHA ===
  {
    keywords: ["lentilha"],
    measures: [
      { label: "1 concha", grams: 80 },
      { label: "1 col. sopa", grams: 25 },
      { label: "2 conchas", grams: 160 },
    ],
  },

  // === PÃES ===
  {
    keywords: ["pão integral", "pao integral"],
    measures: [
      { label: "1 fatia", grams: 25 },
      { label: "2 fatias", grams: 50 },
    ],
  },
  {
    keywords: ["pão de forma", "pao de forma"],
    measures: [
      { label: "1 fatia", grams: 25 },
      { label: "2 fatias", grams: 50 },
    ],
  },
  {
    keywords: ["pão francês", "pao frances", "pão, francês"],
    measures: [
      { label: "1 unidade", grams: 50 },
      { label: "1/2 unidade", grams: 25 },
    ],
  },
  {
    keywords: ["pão de hambúrguer", "pão, hambúrguer"],
    measures: [
      { label: "1 unidade", grams: 50 },
    ],
  },
  {
    keywords: ["pão", "pao"],
    measures: [
      { label: "1 fatia", grams: 30 },
      { label: "2 fatias", grams: 60 },
      { label: "1 unidade", grams: 50 },
    ],
  },

  // === TORRADA ===
  {
    keywords: ["torrada"],
    measures: [
      { label: "1 unidade", grams: 15 },
      { label: "2 unidades", grams: 30 },
      { label: "3 unidades", grams: 45 },
    ],
  },

  // === TAPIOCA / GOMA ===
  {
    keywords: ["tapioca", "goma"],
    measures: [
      { label: "1 col. sopa", grams: 20 },
      { label: "1 porcao pequena", grams: 30 },
      { label: "1 porcao media", grams: 50 },
      { label: "1 porcao grande", grams: 80 },
    ],
  },

  // === BANANA ===
  {
    keywords: ["banana"],
    measures: [
      { label: "1 pequena", grams: 70 },
      { label: "1 media", grams: 100 },
      { label: "1 grande", grams: 130 },
    ],
  },

  // === MAÇÃ ===
  {
    keywords: ["maçã", "maca"],
    measures: [
      { label: "1 pequena", grams: 100 },
      { label: "1 media", grams: 150 },
      { label: "1 grande", grams: 200 },
    ],
  },

  // === LARANJA ===
  {
    keywords: ["laranja"],
    measures: [
      { label: "1 unidade", grams: 140 },
      { label: "1 copo suco", grams: 200 },
    ],
  },

  // === MAMÃO ===
  {
    keywords: ["mamão", "mamao"],
    measures: [
      { label: "1 fatia", grams: 100 },
      { label: "1/2 unidade", grams: 160 },
    ],
  },

  // === ABACATE ===
  {
    keywords: ["abacate"],
    measures: [
      { label: "1 col. sopa", grams: 30 },
      { label: "1/4 unidade", grams: 50 },
      { label: "1/2 unidade", grams: 100 },
    ],
  },

  // === FRANGO ===
  {
    keywords: ["frango"],
    measures: [
      { label: "1 file pequeno", grams: 100 },
      { label: "1 file medio", grams: 150 },
      { label: "1 file grande", grams: 200 },
      { label: "1 coxa", grams: 70 },
      { label: "1 sobrecoxa", grams: 100 },
    ],
  },

  // === CARNE BOVINA ===
  {
    keywords: ["patinho", "alcatra", "contra", "coxão", "lagarto", "maminha", "picanha", "acém", "acem"],
    measures: [
      { label: "1 bife pequeno", grams: 100 },
      { label: "1 bife medio", grams: 150 },
      { label: "1 bife grande", grams: 200 },
    ],
  },
  {
    keywords: ["carne moída", "carne, moída"],
    measures: [
      { label: "1 col. sopa", grams: 25 },
      { label: "1 concha", grams: 80 },
      { label: "1 porcao", grams: 100 },
      { label: "1 hamburguer", grams: 150 },
    ],
  },

  // === PEIXES ===
  {
    keywords: ["tilápia", "tilapia", "merluza", "salmão", "salmao", "pescada", "sardinha"],
    measures: [
      { label: "1 file pequeno", grams: 100 },
      { label: "1 file medio", grams: 150 },
      { label: "1 file grande", grams: 200 },
      { label: "1 posta", grams: 120 },
    ],
  },

  // === ATUM ===
  {
    keywords: ["atum"],
    measures: [
      { label: "1 lata", grams: 120 },
      { label: "1/2 lata", grams: 60 },
      { label: "1 col. sopa", grams: 20 },
    ],
  },

  // === BATATA ===
  {
    keywords: ["batata-doce", "batata doce"],
    measures: [
      { label: "1 pequena", grams: 80 },
      { label: "1 media", grams: 130 },
      { label: "1 grande", grams: 200 },
    ],
  },
  {
    keywords: ["batata"],
    measures: [
      { label: "1 pequena", grams: 80 },
      { label: "1 media", grams: 130 },
      { label: "1 grande", grams: 200 },
      { label: "1 col. sopa (pure)", grams: 40 },
    ],
  },

  // === MANDIOCA / AIPIM ===
  {
    keywords: ["mandioca", "aipim"],
    measures: [
      { label: "1 pedaco", grams: 80 },
      { label: "1 porcao", grams: 150 },
    ],
  },

  // === LEITE ===
  {
    keywords: ["leite"],
    measures: [
      { label: "1 copo", grams: 200 },
      { label: "1/2 copo", grams: 100 },
      { label: "1 xicara", grams: 240 },
    ],
  },

  // === IOGURTE ===
  {
    keywords: ["iogurte"],
    measures: [
      { label: "1 pote", grams: 170 },
      { label: "1 copo", grams: 200 },
    ],
  },

  // === QUEIJO ===
  {
    keywords: ["queijo, minas"],
    measures: [
      { label: "1 fatia", grams: 30 },
      { label: "2 fatias", grams: 60 },
    ],
  },
  {
    keywords: ["mussarela", "muçarela"],
    measures: [
      { label: "1 fatia", grams: 20 },
      { label: "2 fatias", grams: 40 },
      { label: "3 fatias", grams: 60 },
    ],
  },
  {
    keywords: ["queijo"],
    measures: [
      { label: "1 fatia", grams: 30 },
      { label: "2 fatias", grams: 60 },
      { label: "1 col. sopa (ralado)", grams: 10 },
    ],
  },

  // === PRESUNTO ===
  {
    keywords: ["presunto", "apresuntado", "peito de peru"],
    measures: [
      { label: "1 fatia", grams: 15 },
      { label: "2 fatias", grams: 30 },
      { label: "3 fatias", grams: 45 },
    ],
  },

  // === AZEITE / ÓLEOS ===
  {
    keywords: ["azeite", "óleo", "oleo"],
    measures: [
      { label: "1 col. cha", grams: 5 },
      { label: "1 col. sopa", grams: 13 },
      { label: "1 fio", grams: 5 },
    ],
  },

  // === MANTEIGA / MARGARINA ===
  {
    keywords: ["manteiga", "margarina"],
    measures: [
      { label: "1 col. cha", grams: 5 },
      { label: "1 col. sopa", grams: 13 },
      { label: "1 ponta de faca", grams: 3 },
    ],
  },

  // === AÇÚCAR ===
  {
    keywords: ["açúcar", "acucar"],
    measures: [
      { label: "1 col. cha", grams: 5 },
      { label: "1 col. sopa", grams: 15 },
      { label: "1 sache", grams: 5 },
    ],
  },

  // === FARINHA / AVEIA ===
  {
    keywords: ["aveia"],
    measures: [
      { label: "1 col. sopa", grams: 15 },
      { label: "2 col. sopa", grams: 30 },
      { label: "1/2 xicara", grams: 40 },
    ],
  },
  {
    keywords: ["farinha"],
    measures: [
      { label: "1 col. sopa", grams: 15 },
      { label: "1/2 xicara", grams: 60 },
      { label: "1 xicara", grams: 120 },
    ],
  },

  // === WHEY / PROTEINA EM PÓ ===
  {
    keywords: ["whey", "proteína", "proteina"],
    measures: [
      { label: "1 dose (30g)", grams: 30 },
      { label: "1/2 dose", grams: 15 },
    ],
  },

  // === PASTA DE AMENDOIM ===
  {
    keywords: ["amendoim", "pasta"],
    measures: [
      { label: "1 col. cha", grams: 7 },
      { label: "1 col. sopa", grams: 15 },
      { label: "2 col. sopa", grams: 30 },
    ],
  },

  // === CHOCOLATE ===
  {
    keywords: ["chocolate"],
    measures: [
      { label: "1 quadradinho", grams: 10 },
      { label: "2 quadradinhos", grams: 20 },
      { label: "1 barra pequena", grams: 25 },
    ],
  },

  // === DOCE DE LEITE ===
  {
    keywords: ["doce de leite"],
    measures: [
      { label: "1 col. cha", grams: 10 },
      { label: "1 col. sopa", grams: 20 },
    ],
  },

  // === VEGETAIS ===
  {
    keywords: ["abobrinha"],
    measures: [
      { label: "1 pequena", grams: 100 },
      { label: "1 media", grams: 180 },
      { label: "1 xicara picada", grams: 130 },
    ],
  },
  {
    keywords: ["berinjela"],
    measures: [
      { label: "1 xicara picada", grams: 80 },
      { label: "1/2 unidade", grams: 130 },
      { label: "1 unidade", grams: 260 },
    ],
  },
  {
    keywords: ["repolho"],
    measures: [
      { label: "1 xicara", grams: 70 },
      { label: "1 porcao", grams: 150 },
    ],
  },
  {
    keywords: ["abóbora", "abobora"],
    measures: [
      { label: "1 fatia", grams: 100 },
      { label: "1 xicara picada", grams: 150 },
    ],
  },
  {
    keywords: ["tomate"],
    measures: [
      { label: "1 pequeno", grams: 80 },
      { label: "1 medio", grams: 120 },
      { label: "1 grande", grams: 180 },
      { label: "2 fatias", grams: 40 },
    ],
  },
  {
    keywords: ["cebola"],
    measures: [
      { label: "1 pequena", grams: 60 },
      { label: "1 media", grams: 100 },
      { label: "1 grande", grams: 150 },
    ],
  },
  {
    keywords: ["pepino"],
    measures: [
      { label: "1/2 unidade", grams: 100 },
      { label: "1 unidade", grams: 200 },
    ],
  },
  {
    keywords: ["cenoura"],
    measures: [
      { label: "1 media", grams: 100 },
      { label: "1 col. sopa ralada", grams: 15 },
      { label: "1 grande", grams: 150 },
    ],
  },
  {
    keywords: ["alface"],
    measures: [
      { label: "1 folha", grams: 10 },
      { label: "1 porcao", grams: 30 },
      { label: "1 prato", grams: 50 },
    ],
  },

  // === MOLHO DE TOMATE ===
  {
    keywords: ["molho de tomate", "extrato de tomate"],
    measures: [
      { label: "1 col. sopa", grams: 20 },
      { label: "1/2 xicara", grams: 100 },
      { label: "1 xicara", grams: 200 },
    ],
  },

  // === TORTILHA ===
  {
    keywords: ["tortilha", "tortilla"],
    measures: [
      { label: "1 unidade", grams: 40 },
      { label: "2 unidades", grams: 80 },
    ],
  },

  // === BISCOITO ===
  {
    keywords: ["biscoito", "bolacha"],
    measures: [
      { label: "1 unidade", grams: 8 },
      { label: "3 unidades", grams: 24 },
      { label: "5 unidades", grams: 40 },
    ],
  },

  // === MACARRÃO ===
  {
    keywords: ["macarrão", "macarrao", "espaguete"],
    measures: [
      { label: "1 prato raso", grams: 200 },
      { label: "1 escumadeira", grams: 110 },
      { label: "1 pegador", grams: 80 },
    ],
  },
];

/**
 * Returns household measures for a food based on its name.
 * Falls back to generic measures if no specific match.
 */
export function getHouseholdMeasures(foodName: string): HouseholdMeasure[] {
  const nameLower = foodName.toLowerCase();

  for (const entry of MEASURES_BY_KEYWORD) {
    for (const keyword of entry.keywords) {
      if (nameLower.includes(keyword)) {
        return entry.measures;
      }
    }
  }

  // Generic fallback
  return [];
}
