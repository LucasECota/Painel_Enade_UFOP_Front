// Subgrupos de disciplinas parecidas, para o menu do gráfico de evolução. Disciplina que não está
// em nenhum grupo (uma nova que apareça nos dados) cai em "Outras", no fim.
const GRUPOS = {
  formacaoGeral: [
    [
      "Sociedade e política",
      [
        "Sociologia",
        "Ciência Política",
        "Direitos Humanos e Cidadania",
        "Atualidades e Política Internacional",
        "Economia e Trabalho",
        "Geografia",
        "Saúde e Sociedade",
      ],
    ],
    [
      "Ciência, tecnologia e meio ambiente",
      [
        "Ciência e Tecnologia",
        "Ciências da Natureza",
        "Matemática",
        "Tecnologia e Sociedade",
        "Meio Ambiente e Sustentabilidade",
      ],
    ],
    [
      "Linguagem, cultura e pensamento",
      [
        "Artes e Cultura",
        "Literatura e Linguagens",
        "Língua Portuguesa e Comunicação",
        "Filosofia",
      ],
    ],
  ],
  especifico: [
    [
      "Programação e algoritmos",
      [
        "Algoritmos e Estruturas de Dados I",
        "Algoritmos e Estruturas de Dados II",
        "Algoritmos e Estruturas de Dados III",
        "Programação de Computadores I",
        "Linguagens de Programação",
        "Compiladores I",
        "Fundamentos Teóricos da Computação",
      ],
    ],
    [
      "Engenharia de software e sistemas de informação",
      [
        "Banco de Dados I",
        "Engenharia de Software I",
        "Engenharia de Software II",
        "Gerência de Projetos de Software",
        "Qualidade de Software",
        "Fundamentos de Sistemas de Informação",
        "Gestão da Informação",
        "Gestão da Tecnologia da Informação",
        "Sistemas de Apoio à Decisão",
        "Interação Humano-Computador",
        "Informática e Sociedade",
        "Segurança e Auditoria de Sistemas",
      ],
    ],
    [
      "Sistemas computacionais e redes",
      [
        "Organização e Arquitetura de Computadores I",
        "Fundamentos de Organização e Arquitetura de Computadores",
        "Sistemas Operacionais",
        "Sistemas Distribuídos",
        "Redes de Computadores I",
        "Segurança em Redes",
        "Internet das Coisas",
        "Avaliação de Desempenho de Sistemas",
      ],
    ],
    [
      "Inteligência artificial e imagens",
      ["Inteligência Artificial", "Computação Gráfica", "Processamento Digital de Imagens"],
    ],
    [
      "Eletrônica, sinais e controle",
      [
        "Circuitos Elétricos I",
        "Eletrônica I",
        "Princípios de Eletrônica Digital",
        "Microprocessadores e Microcontroladores",
        "Sinais e Sistemas",
        "Modelagem e Análise de Sistemas Lineares",
        "Sistemas de Controle I",
        "Instrumentação",
        "Fundamentos de Comunicações",
      ],
    ],
    [
      "Matemática, estatística e física",
      [
        "Cálculo Diferencial e Integral I",
        "Cálculo Diferencial e Integral III",
        "Introdução às Equações Diferenciais Ordinárias",
        "Análise Numérica",
        "Matemática Discreta",
        "Programação Linear e Inteira",
        "Probabilidade",
        "Estatística I",
        "Estatística e Probabilidade",
        "Física I",
        "Física II",
        "Física III",
      ],
    ],
    [
      "Produção e logística",
      [
        "Planejamento e Controle de Produção I",
        "Planejamento e Controle de Produção II",
        "Processos de Produção",
        "Processos de Manufatura Avançada",
        "Sistema de Desenvolvimento de Produtos",
        "Organização Industrial",
        "Logística e Gestão da Cadeia de Suprimentos",
        "Logística Reversa",
        "Simulação a Eventos Discretos",
      ],
    ],
    [
      "Qualidade, gestão e economia",
      [
        "Gestão da Qualidade",
        "Controle Estatístico de Qualidade",
        "Métodos Estatísticos em Confiabilidade",
        "Custos Industriais",
        "Engenharia Econômica",
        "Gestão de Projetos",
        "Planejamento Estratégico e Mercadológico",
        "Teoria da Administração I",
        "Teoria das Organizações",
      ],
    ],
    [
      "Ambiente, ética e segurança",
      [
        "Gestão Ambiental",
        "Fundamentos de Ciência do Ambiente",
        "Filosofia e Ética",
        "Segurança do Trabalho",
        "Ergonomia",
      ],
    ],
  ],
};

// [{ titulo, nomes }] só com as disciplinas que existem, em ordem alfabética dentro de cada grupo
export function agruparDisciplinas(nomes, componente) {
  const usados = new Set();
  const grupos = (GRUPOS[componente] ?? []).map(([titulo, membros]) => {
    const doGrupo = nomes.filter((n) => membros.includes(n));
    doGrupo.forEach((n) => usados.add(n));
    return { titulo, nomes: doGrupo };
  });
  const outras = nomes.filter((n) => !usados.has(n));
  if (outras.length) grupos.push({ titulo: "Outras", nomes: outras });
  return grupos
    .filter((g) => g.nomes.length > 0)
    .map((g) => ({ ...g, nomes: [...g.nomes].sort((a, b) => a.localeCompare(b, "pt-BR")) }));
}
