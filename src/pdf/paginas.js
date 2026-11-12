// Um PDF para cada página de "Dados Edições Anteriores", sempre de um curso. Só tabelas e gráficos
// (sem as imagens das questões). Cada função recebe os dados já buscados na API e devolve
// { doc, arquivo }; quem chama decide salvar (doc.save) ou ver o PDF.
import {
  criarRelatorio,
  MARGEM,
  VINHO,
  CINZA,
  CINZA_ESCURO,
  SEPARADOR,
  numero,
  diferenca,
  corDaDiferenca,
  slug,
} from "./base.js";

const FONTE_ENADE = "Fonte: INEP — Relatórios de Curso do Enade (UFOP, João Monlevade).";
const SERIES_UFOP_BRASIL = [
  { nome: "UFOP", cor: VINHO },
  { nome: "Brasil", cor: CINZA },
];

const arquivo = (nomeDoCurso, pagina) => `painel-enade-${slug(nomeDoCurso)}-${slug(pagina)}.pdf`;
const ptBr = (a, b) => a.localeCompare(b, "pt-BR");
const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

// ---------------------------------------------------------------- Assuntos por disciplina

// edicoes: [{ ano, dados }], com "dados" no formato de GET /enade/<curso>?ano=<ano>
export async function pdfAssuntos({ curso, edicoes }) {
  const secao = "Assuntos por disciplina";
  const r = await criarRelatorio({ curso, secao, fonte: FONTE_ENADE });
  r.titulo(`${curso} — ${secao}`);
  r.paragrafo(
    "O que o Enade cobrou em cada edição, por disciplina e assunto. Em cada disciplina, as questões discursivas vêm primeiro, depois as objetivas.",
  );

  for (const { ano, dados } of [...edicoes].sort((a, b) => b.ano - a.ano)) {
    r.garantir(40);
    r.titulo(`Enade ${ano}`, 2);
    const partes = [`Total de questões: ${dados.totalQuestoes}`];
    for (const [nome, bloco] of [
      ["Formação Geral", dados.fg],
      ["Componente Específico", dados.ce],
    ]) {
      const disc = typeof bloco.discursivas === "number" ? bloco.discursivas : null;
      partes.push(
        disc === null
          ? `${nome}: ${bloco.total}`
          : `${nome}: ${bloco.total} (${plural(bloco.total - disc, "objetiva", "objetivas")} e ${plural(disc, "discursiva", "discursivas")})`,
      );
    }
    r.paragrafo(partes.join("  ·  "), { estilo: "bold", tamanho: 8.5 });

    for (const [nome, bloco] of [
      ["Formação Geral", dados.fg],
      ["Componente Específico", dados.ce],
    ]) {
      const disciplinas = bloco.disciplinas
        .filter((d) => d.assuntos.length > 0)
        .sort((a, b) => b.qtd - a.qtd || ptBr(a.nome, b.nome));
      if (disciplinas.length === 0) continue;
      r.garantir(30);
      r.titulo(nome, 3);
      r.tabela({
        colunas: [
          { cabecalho: "Disciplina", largura: 46 },
          { cabecalho: "Questões", largura: 24, alinhar: "center" },
          { cabecalho: "Assuntos" },
        ],
        linhas: disciplinas.map((d) => [
          d.nome,
          d.discursivas > 0
            ? `${d.qtd}\n(${plural(d.discursivas, "discursiva", "discursivas")})`
            : `${d.qtd}`,
          d.assuntos
            .map((assunto, i) => {
              const q = d.questoes?.[i];
              if (!q) return `- ${assunto}`;
              const rotulo =
                q.tipo === "discursiva" ? `Discursiva ${q.id.slice(1)}` : `Questão ${q.id}`;
              return `${rotulo}: ${assunto}`;
            })
            .join("\n"),
        ]),
      });
    }
  }
  r.finalizar();
  return { doc: r.doc, arquivo: arquivo(curso, secao) };
}

// ---------------------------------------------------------------- Acertos por questão

const GRUPOS = [
  ["curso", "UFOP"],
  ["uf", "Estado"],
  ["regiao", "Região"],
  ["catAdm", "Cat. adm."],
  ["orgAcad", "Org. acad."],
  ["brasil", "Brasil"],
];

// edicoes: [{ ano, tabela }], com "tabela" no formato de GET /enade/<curso>/questoes?ano=<ano>
export async function pdfAcertos({ curso, edicoes }) {
  const secao = "Acertos por questão";
  const r = await criarRelatorio({ curso, secao, fonte: FONTE_ENADE, orientacao: "landscape" });
  r.titulo(`${curso} — ${secao}`);
  r.paragrafo(
    "% de acertos: parcela dos concluintes que acertou a questão. A coluna UFOP é a dos concluintes deste curso na UFOP; as demais, dos concluintes do mesmo curso nos outros grupos. Em verde, a UFOP acima do Brasil; em vinho, abaixo. Desconsiderada: o INEP deixou a questão fora do cálculo da nota (critério estatístico). Anulada: anulada pela comissão.",
    { tamanho: 8 },
  );

  const colunasDosGrupos = GRUPOS.map(([, titulo]) => ({
    cabecalho: titulo,
    largura: 14,
    alinhar: "right",
  }));
  // a coluna da UFOP (índice 3 nas objetivas, 4 nas discursivas) em verde ou vinho, comparada com o Brasil
  const corDaUfop = (indice, ufopIdx, brasilIdx) => (coluna, _linha, valores) => {
    if (coluna !== indice) return null;
    const u = Number(String(valores[ufopIdx]).replace(",", "."));
    const b = Number(String(valores[brasilIdx]).replace(",", "."));
    return Number.isNaN(u) || Number.isNaN(b) ? null : corDaDiferenca(u, b);
  };

  for (const { ano, tabela } of [...edicoes].sort((a, b) => b.ano - a.ano)) {
    r.garantir(50);
    r.titulo(`Enade ${ano}`, 2);
    for (const componente of tabela.componentes) {
      if (componente.questoes.length > 0) {
        r.garantir(35);
        r.titulo(componente.titulo, 3);
        r.tabela({
          colunas: [
            { cabecalho: "Questão", largura: 15, alinhar: "center" },
            { cabecalho: "Disciplina", largura: 42 },
            { cabecalho: "Tema" },
            ...colunasDosGrupos,
            { cabecalho: "Gabarito", largura: 24, alinhar: "center" },
          ],
          linhas: componente.questoes.map((q) => {
            const valida = q.situacao === "valida";
            return [
              `${q.numero}`,
              q.disciplina || "—",
              q.tema || "—",
              ...GRUPOS.map(([chave]) => (valida ? numero(q.acertos[chave]) : "—")),
              valida ? q.gabarito : q.situacao === "anulada" ? "Anulada" : "Desconsiderada",
            ];
          }),
          corDaCelula: corDaUfop(3, 3, 8),
        });
      }
    }

    // discursivas (Formação Geral e Componente Específico juntas)
    const discursivas = tabela.componentes.flatMap((c) =>
      (c.discursivas ?? []).map((q) => ({ ...q, componente: c.titulo })),
    );
    if (discursivas.length > 0) {
      r.garantir(35);
      r.titulo("Questões discursivas — nota média (0 a 100)", 3);
      r.tabela({
        colunas: [
          { cabecalho: "Questão", largura: 15, alinhar: "center" },
          { cabecalho: "Componente", largura: 34 },
          { cabecalho: "Disciplina", largura: 38 },
          { cabecalho: "Tema" },
          ...colunasDosGrupos,
        ],
        linhas: discursivas.map((q) => [
          q.numero,
          q.componente,
          q.disciplina || "—",
          q.tema || "—",
          ...GRUPOS.map(([chave]) => numero(q.notas?.[chave]?.media)),
        ]),
        corDaCelula: corDaUfop(4, 4, 9),
      });
    }
  }
  r.finalizar();
  return { doc: r.doc, arquivo: arquivo(curso, secao) };
}

// ---------------------------------------------------------------- Evolução por disciplina

const COMPONENTES = [
  ["formacaoGeral", "Formação Geral"],
  ["especifico", "Componente Específico"],
];

// desempenho: resposta de GET /enade/<curso>/desempenho-areas
export async function pdfEvolucao({ curso, desempenho }) {
  const secao = "Evolução por disciplina";
  const r = await criarRelatorio({ curso, secao, fonte: FONTE_ENADE });
  r.titulo(`${curso} — ${secao}`);
  r.paragrafo(
    "Acerto médio dos concluintes da UFOP e do Brasil nas questões de cada disciplina, edição por edição. Abaixo do ano, a diferença da UFOP para o Brasil em pontos percentuais. As notas do Enade não são comparáveis entre edições: compare a UFOP com o Brasil na mesma edição.",
    { tamanho: 8.5 },
  );

  const anos = [...desempenho.edicoes].sort((a, b) => a - b);
  const larguraGrafico = (r.largura - 6) / 2;
  const alturaGrafico = 42;

  for (const [chave, titulo] of COMPONENTES) {
    const porDisciplina = new Map();
    for (const edicao of desempenho.porEdicao) {
      for (const a of edicao.areas.filter((x) => x.componente === chave)) {
        if (!porDisciplina.has(a.disciplina)) porDisciplina.set(a.disciplina, {});
        porDisciplina.get(a.disciplina)[edicao.ano] = a;
      }
    }
    if (porDisciplina.size === 0) continue;
    const disciplinas = [...porDisciplina.entries()].sort(
      ([na, a], [nb, b]) => Object.keys(b).length - Object.keys(a).length || ptBr(na, nb),
    );

    r.garantir(alturaGrafico + 24);
    r.titulo(titulo, 2);
    r.legenda(SERIES_UFOP_BRASIL);

    disciplinas.forEach(([nome, porAno], i) => {
      const coluna = i % 2;
      const topoDaLinha = r.y;
      if (coluna === 0) {
        r.garantir(alturaGrafico + 2);
        // linha clara e fina entre uma fileira de gráficos e a seguinte (não no topo de uma página nova)
        if (i > 0 && r.y === topoDaLinha) {
          r.doc.setDrawColor(...SEPARADOR);
          r.doc.setLineWidth(0.2);
          r.doc.line(MARGEM, r.y - 1.5, MARGEM + r.largura, r.y - 1.5);
        }
      }
      r.graficoDeBarras({
        x: MARGEM + coluna * (larguraGrafico + 6),
        largura: larguraGrafico,
        altura: alturaGrafico,
        titulo: nome,
        series: SERIES_UFOP_BRASIL,
        grupos: anos.map((ano) => {
          const d = porAno[ano];
          return {
            rotulo: `${ano}`,
            valores: d ? [d.ufop, d.brasil] : [null, null],
            rotuloBaixo: d ? diferenca(d.ufop, d.brasil) : "",
            corRotuloBaixo: d ? corDaDiferenca(d.ufop, d.brasil) : CINZA,
          };
        }),
      });
      if (coluna === 1) {
        // linha vertical clara entre os dois gráficos da fileira
        r.doc.setDrawColor(...SEPARADOR);
        r.doc.setLineWidth(0.2);
        const xMeio = MARGEM + larguraGrafico + 3;
        r.doc.line(xMeio, r.y, xMeio, r.y + alturaGrafico);
      }
      if (coluna === 1 || i === disciplinas.length - 1) r.espaco(alturaGrafico + 3);
    });
  }
  r.finalizar();
  return { doc: r.doc, arquivo: arquivo(curso, secao) };
}

// ---------------------------------------------------------------- Mais acertos e mais erros

// desempenho: resposta de GET /enade/<curso>/desempenho-areas; `quantos`: itens em cada lista
export async function pdfRankings({ curso, desempenho, quantos = 5 }) {
  const secao = "Mais acertos e mais erros";
  const r = await criarRelatorio({ curso, secao, fonte: FONTE_ENADE });
  r.titulo(`${curso} — ${secao}`);
  r.paragrafo(
    `Em cada edição, as ${quantos} disciplinas e os ${quantos} temas com mais acertos e com mais erros (menor percentual de acerto), para a Formação Geral e para o Componente Específico. UFOP e Brasil mostram o percentual de acerto; a última coluna é a diferença da UFOP para o Brasil, em pontos percentuais.`,
    { tamanho: 8.5 },
  );

  const colunas = (nome) => [
    { cabecalho: nome },
    { cabecalho: "UFOP", largura: 14, alinhar: "right" },
    { cabecalho: "Brasil", largura: 14, alinhar: "right" },
    { cabecalho: "Dif.", largura: 14, alinhar: "right" },
  ];
  const linhaDe = (item) => [
    item.nome,
    numero(item.ufop),
    numero(item.brasil),
    diferenca(item.ufop, item.brasil),
  ];
  const corDaDif = (coluna, _i, linha, lista) => {
    if (coluna !== 1 && coluna !== 3) return null;
    const item = lista.find((x) => x.nome === linha[0]);
    return item ? corDaDiferenca(item.ufop, item.brasil) : null;
  };
  const meia = (r.largura - 6) / 2;

  // duas listas lado a lado: mais acertos (esquerda) e mais erros (direita)
  const doisRankings = (nome, itens) => {
    const porAcerto = [...itens].sort((a, b) => b.ufop - a.ufop);
    const maiores = porAcerto.slice(0, quantos);
    const menores = [...porAcerto].reverse().slice(0, quantos);
    r.garantir(78);
    const topo = r.y;
    r.doc.setFont("helvetica", "bold");
    r.doc.setFontSize(8);
    r.cor(CINZA_ESCURO);
    r.doc.text(`${nome} com mais acertos`, MARGEM, topo + 2.5);
    r.doc.text(`${nome} com mais erros`, MARGEM + meia + 6, topo + 2.5);
    r.y = topo + 4.5;
    const fim1 = r.tabela({
      colunas: colunas(nome.slice(0, -1) === "Disciplina" ? "Disciplina" : "Tema"),
      linhas: maiores.map(linhaDe),
      larguraTotal: meia,
      tamanho: 7.5,
      corDaCelula: (c, i, linha) => corDaDif(c, i, linha, maiores),
    });
    r.y = topo + 4.5;
    const fim2 = r.tabela({
      colunas: colunas(nome.slice(0, -1) === "Disciplina" ? "Disciplina" : "Tema"),
      linhas: menores.map(linhaDe),
      esquerda: MARGEM + meia + 6,
      larguraTotal: meia,
      tamanho: 7.5,
      corDaCelula: (c, i, linha) => corDaDif(c, i, linha, menores),
    });
    r.y = Math.max(fim1, fim2);
  };

  for (const edicao of [...desempenho.porEdicao].sort((a, b) => b.ano - a.ano)) {
    r.garantir(95);
    r.titulo(`Enade ${edicao.ano}`, 2);
    for (const [chave, titulo] of COMPONENTES) {
      const areas = edicao.areas.filter((a) => a.componente === chave);
      const temas = edicao.temas.filter((t) => t.componente === chave);
      if (areas.length === 0) continue;
      r.titulo(titulo, 3);
      doisRankings(
        "Disciplinas",
        areas.map((a) => ({ nome: a.disciplina, ufop: a.ufop, brasil: a.brasil })),
      );
      if (temas.length > 0) {
        doisRankings(
          "Temas",
          temas.map((t) => ({
            nome: `${t.tema}\n(${t.disciplina}, questão ${t.numero})`,
            ufop: t.ufop,
            brasil: t.brasil,
          })),
        );
      }
    }
  }
  r.finalizar();
  return { doc: r.doc, arquivo: arquivo(curso, secao) };
}

// ---------------------------------------------------------------- Resultados dos cursos

// dados: um curso de GET /resultados; fonte: texto da fonte da resposta
export async function pdfResultados({ curso: dados, fonte }) {
  const nome = dados.nome;
  const secao = "Resultados do Enade";
  const r = await criarRelatorio({
    curso: nome,
    secao,
    fonte: fonte || "Fonte: INEP — Relatórios de IES do Enade.",
  });
  r.titulo(`${nome} — ${secao}`);

  // conceito Enade
  r.titulo("Conceito Enade em cada edição", 2);
  r.paragrafo(
    "Segundo o INEP, as notas do Enade não são comparáveis entre edições, porque a prova muda a cada ano. Aqui estão os dados de cada uma para fazer a sua própria análise.",
    { tamanho: 8.5 },
  );
  const edicoes = [...dados.edicoes].sort((a, b) => a.ano - b.ano);
  r.garantir(60);
  r.graficoDeBarras({
    x: MARGEM,
    largura: Math.min(r.largura, 40 * edicoes.length + 10),
    altura: 52,
    titulo: "Conceito Enade (1 a 5)",
    series: [{ nome: "Conceito", cor: VINHO }],
    maximo: 5,
    casas: 0,
    grupos: edicoes.map((e) => ({
      rotulo: `${e.ano}`,
      valores: [e.conceito],
      rotuloBaixo: `${e.presentes} alunos`,
    })),
  });
  r.espaco(54);
  r.tabela({
    colunas: [
      { cabecalho: "Edição", alinhar: "center" },
      { cabecalho: "Conceito Enade", alinhar: "center" },
      { cabecalho: "Concluintes que fizeram a prova", alinhar: "center" },
      { cabecalho: "Concluintes na população", alinhar: "center" },
    ],
    linhas: [...edicoes]
      .reverse()
      .map((e) => [`${e.ano}`, `${e.conceito}`, `${e.presentes}`, `${e.populacao}`]),
  });

  // comparação com o Brasil
  const c = dados.comparacao;
  r.garantir(90);
  r.titulo(`Comparação com o Brasil — Enade ${c.ano}`, 2);
  r.paragrafo("Média dos concluintes na prova, em uma escala de 0 a 100.", { tamanho: 8.5 });
  const itens = [
    ["Nota geral na prova", c.geral],
    ["Formação Geral", c.formacaoGeral],
    ["Componente Específico", c.especifico],
  ];
  r.legenda([
    { nome: "ICEA", cor: VINHO },
    { nome: "Brasil", cor: CINZA },
  ]);
  r.graficoDeBarras({
    x: MARGEM,
    largura: 120,
    altura: 55,
    series: SERIES_UFOP_BRASIL.map((s, i) => ({ ...s, nome: i === 0 ? "ICEA" : "Brasil" })),
    grupos: itens.map(([rotulo, v]) => ({
      rotulo,
      valores: [v.curso, v.brasil],
      rotuloBaixo: `${diferenca(v.curso, v.brasil)} p.p.`,
      corRotuloBaixo: corDaDiferenca(v.curso, v.brasil),
    })),
  });
  r.espaco(58);
  r.tabela({
    colunas: [
      { cabecalho: "Prova" },
      { cabecalho: "ICEA", alinhar: "right", largura: 28 },
      { cabecalho: "Brasil", alinhar: "right", largura: 28 },
      { cabecalho: "Diferença (p.p.)", alinhar: "right", largura: 36 },
    ],
    linhas: itens.map(([rotulo, v]) => [
      rotulo,
      numero(v.curso),
      numero(v.brasil),
      diferenca(v.curso, v.brasil),
    ]),
    corDaCelula: (coluna, i) =>
      coluna === 3 ? corDaDiferenca(itens[i][1].curso, itens[i][1].brasil) : null,
  });

  // perfil dos concluintes
  const p = dados.perfil;
  r.garantir(90);
  r.titulo(`Perfil dos concluintes — Enade ${p.ano}`, 2);
  r.paragrafo(
    `Entre os ${p.presentes} concluintes que fizeram a prova, esta é a porcentagem em cada situação, comparada com o Brasil.`,
    { tamanho: 8.5 },
  );
  const perfis = [
    ["Renda familiar de até 3 salários mínimos", p.renda],
    ["Receberam auxílio permanência", p.auxilio],
    ["Receberam bolsa acadêmica", p.bolsa],
  ];
  r.legenda([
    { nome: "ICEA", cor: VINHO },
    { nome: "Brasil", cor: CINZA },
  ]);
  r.graficoDeBarras({
    x: MARGEM,
    largura: 120,
    altura: 55,
    series: [
      { nome: "ICEA", cor: VINHO },
      { nome: "Brasil", cor: CINZA },
    ],
    grupos: perfis.map(([, v], i) => ({
      rotulo: ["Renda até 3 SM", "Auxílio", "Bolsa"][i],
      valores: [v.curso, v.brasil],
    })),
  });
  r.espaco(58);
  r.tabela({
    colunas: [
      { cabecalho: "Situação" },
      { cabecalho: "ICEA (%)", alinhar: "right", largura: 30 },
      { cabecalho: "Brasil (%)", alinhar: "right", largura: 30 },
    ],
    linhas: perfis.map(([rotulo, v]) => [rotulo, numero(v.curso), numero(v.brasil)]),
  });
  r.finalizar();
  return { doc: r.doc, arquivo: arquivo(nome, secao) };
}
