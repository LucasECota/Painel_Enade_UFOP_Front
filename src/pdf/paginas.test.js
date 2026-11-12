import { limpar, slug, diferenca, numero } from "./base";
import { pdfAssuntos, pdfAcertos, pdfEvolucao, pdfRankings, pdfResultados } from "./paginas";

// o texto do PDF fica no próprio arquivo; para conferir basta procurar trechos nele
const texto = (doc) => doc.output();

const acertos = (curso, brasil) => ({ curso, uf: 40, regiao: 41, catAdm: 42, orgAcad: 43, brasil });
const notas = (curso, brasil) => ({
  curso: { media: curso, desvio: 20 },
  uf: { media: 40, desvio: 20 },
  regiao: { media: 41, desvio: 20 },
  catAdm: { media: 42, desvio: 20 },
  orgAcad: { media: 43, desvio: 20 },
  brasil: { media: brasil, desvio: 20 },
});

describe("apoio dos PDFs", () => {
  it("troca os poucos símbolos que a fonte do PDF não tem, e mantém acentos", () => {
    expect(limpar("R=ρL/A ∨ B → C")).toBe("R=rhoL/A ou B -> C");
    expect(limpar("Computação — Formação")).toBe("Computação — Formação");
  });

  it("monta nome de arquivo sem acentos nem espaços", () => {
    expect(slug("Engenharia de Computação")).toBe("engenharia-de-computacao");
    expect(slug("Acertos por questão")).toBe("acertos-por-questao");
  });

  it("formata números e diferenças em português", () => {
    expect(numero(31.1)).toBe("31,1");
    expect(numero(null)).toBe("—");
    expect(diferenca(60, 50)).toBe("+10,0");
    expect(diferenca(20, 30)).toBe("-10,0");
    expect(diferenca(50, 50)).toBe("0,0");
  });
});

describe("PDF de assuntos por disciplina", () => {
  const dados = {
    totalQuestoes: 4,
    fg: {
      total: 1,
      discursivas: 0,
      disciplinas: [
        {
          nome: "Sociologia",
          qtd: 1,
          discursivas: 0,
          assuntos: ["Desigualdade social"],
          questoes: [{ id: "1", tipo: "objetiva" }],
        },
      ],
    },
    ce: {
      total: 3,
      discursivas: 1,
      disciplinas: [
        {
          nome: "Algoritmos",
          qtd: 2,
          discursivas: 1,
          assuntos: ["Quicksort", "Pilhas"],
          questoes: [
            { id: "D2", tipo: "discursiva" },
            { id: "33", tipo: "objetiva" },
          ],
        },
        { nome: "Sem assuntos", qtd: 1, discursivas: 0, assuntos: [] },
      ],
    },
  };

  it("gera o arquivo do curso, com as edições e as questões (discursivas marcadas)", async () => {
    const { doc, arquivo } = await pdfAssuntos({
      curso: "Engenharia de Computação",
      edicoes: [
        { ano: 2019, dados },
        { ano: 2023, dados },
      ],
    });
    expect(arquivo).toBe("painel-enade-engenharia-de-computacao-assuntos-por-disciplina.pdf");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const t = texto(doc);
    expect(t).toContain("Enade 2023");
    expect(t).toContain("Enade 2019");
    expect(t).toContain("Discursiva 2: Quicksort");
    expect(t).toContain("Questão 33: Pilhas");
    expect(t).not.toContain("Sem assuntos"); // disciplina sem assunto fica de fora
    // mais recente primeiro
    expect(t.indexOf("Enade 2023")).toBeLessThan(t.indexOf("Enade 2019"));
  });
});

describe("PDF de acertos por questão", () => {
  const tabela = {
    componentes: [
      {
        tipo: "formacaoGeral",
        titulo: "Formação Geral",
        questoes: [
          {
            numero: 1,
            disciplina: "Sociologia",
            tema: "Fome",
            situacao: "valida",
            gabarito: "D",
            acertos: acertos(71.1, 66.8),
          },
        ],
        discursivas: [
          {
            numero: "D1",
            disciplina: "Sociologia",
            tema: "Desigualdades",
            notas: notas(39.3, 44.1),
          },
        ],
      },
      {
        tipo: "especifico",
        titulo: "Componente Específico",
        questoes: [
          {
            numero: 10,
            disciplina: "Redes",
            tema: "OSPF",
            situacao: "valida",
            gabarito: "C",
            acertos: acertos(44.4, 33.4),
          },
          {
            numero: 17,
            disciplina: "Matemática",
            tema: null,
            situacao: "desconsiderada",
            gabarito: null,
            acertos: null,
          },
          {
            numero: 25,
            disciplina: "Sinais",
            tema: "Filtros",
            situacao: "anulada",
            gabarito: null,
            acertos: null,
          },
        ],
        discursivas: [
          { numero: "D2", disciplina: "Algoritmos", tema: "Quicksort", notas: notas(22.1, 16.9) },
        ],
      },
    ],
  };

  it("é em paisagem (as tabelas têm muitas colunas) e mostra gabarito, desconsideradas, anuladas e discursivas", async () => {
    const { doc, arquivo } = await pdfAcertos({
      curso: "Sistemas de Informação",
      edicoes: [{ ano: 2023, tabela }],
    });
    expect(arquivo).toBe("painel-enade-sistemas-de-informacao-acertos-por-questao.pdf");
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    const t = texto(doc);
    expect(t).toContain("Desconsiderada");
    expect(t).toContain("Anulada");
    expect(t).toContain("71,1");
    expect(t).toContain("66,8");
    expect(t).toContain("39,3"); // nota média da discursiva D1
    expect(t).toContain("Quicksort");
  });
});

describe("PDF de evolução, rankings e resultados", () => {
  const area = (componente, disciplina, ufop, brasil) => ({
    componente,
    disciplina,
    questoes: 1,
    ufop,
    brasil,
  });
  const desempenho = {
    nome: "Engenharia de Produção",
    edicoes: [2023, 2019],
    porEdicao: [
      {
        ano: 2023,
        areas: [
          area("especifico", "Redes", 60, 50),
          area("especifico", "Circuitos", 20, 30),
          area("formacaoGeral", "Sociologia", 70, 70),
        ],
        temas: [
          {
            componente: "especifico",
            numero: 11,
            disciplina: "Redes",
            tema: "OSPF",
            ufop: 80,
            brasil: 50,
          },
          {
            componente: "especifico",
            numero: 13,
            disciplina: "Circuitos",
            tema: "Kirchhoff",
            ufop: 20,
            brasil: 30,
          },
        ],
      },
      { ano: 2019, areas: [area("especifico", "Redes", 45, 55)], temas: [] },
    ],
  };

  it("evolução: um gráfico por disciplina, com os anos e a diferença para o Brasil", async () => {
    const { doc, arquivo } = await pdfEvolucao({ curso: "Engenharia de Produção", desempenho });
    expect(arquivo).toBe("painel-enade-engenharia-de-producao-evolucao-por-disciplina.pdf");
    const t = texto(doc);
    for (const parte of [
      "Redes",
      "Circuitos",
      "Sociologia",
      "2019",
      "2023",
      "+10,0",
      "-10,0",
      "sem quest",
    ]) {
      expect(t).toContain(parte);
    }
  });

  it("evolução com muitas disciplinas passa para mais páginas, sem cortar", async () => {
    const muitas = {
      ...desempenho,
      porEdicao: [
        {
          ano: 2023,
          areas: Array.from({ length: 40 }, (_, i) =>
            area("especifico", `Disciplina ${i + 1}`, 50 + (i % 20), 45),
          ),
          temas: [],
        },
      ],
      edicoes: [2023],
    };
    const { doc } = await pdfEvolucao({ curso: "Curso", desempenho: muitas });
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
  });

  it("rankings: listas de mais acertos e mais erros de disciplinas e temas, mais recente primeiro", async () => {
    const { doc, arquivo } = await pdfRankings({ curso: "Engenharia de Produção", desempenho });
    expect(arquivo).toBe("painel-enade-engenharia-de-producao-mais-acertos-e-mais-erros.pdf");
    const t = texto(doc);
    expect(t).toContain("Disciplinas com mais acertos");
    expect(t).toContain("Disciplinas com mais erros");
    expect(t).toContain("Temas com mais acertos");
    expect(t).toContain("OSPF");
    expect(t.indexOf("Enade 2023")).toBeLessThan(t.indexOf("Enade 2019"));
  });

  it("resultados: conceito, comparação com o Brasil e perfil dos concluintes", async () => {
    const curso = {
      nome: "Engenharia de Computação",
      edicoes: [
        { ano: 2019, conceito: 3, presentes: 51, populacao: 53 },
        { ano: 2023, conceito: 4, presentes: 45, populacao: 51 },
      ],
      comparacao: {
        ano: 2023,
        geral: { curso: 42.3, brasil: 41.2 },
        formacaoGeral: { curso: 52.8, brasil: 53.2 },
        especifico: { curso: 38.8, brasil: 37.1 },
      },
      perfil: {
        ano: 2023,
        presentes: 45,
        renda: { curso: 37.2, brasil: 27.3 },
        auxilio: { curso: 25.6, brasil: 13.1 },
        bolsa: { curso: 60.5, brasil: 31.2 },
      },
    };
    const { doc, arquivo } = await pdfResultados({ curso, fonte: "Fonte: INEP." });
    expect(arquivo).toBe("painel-enade-engenharia-de-computacao-resultados-do-enade.pdf");
    const t = texto(doc);
    for (const parte of [
      "Conceito Enade",
      "42,3",
      "41,2",
      "+1,1",
      "-0,4",
      "37,2",
      "Fonte: INEP.",
    ]) {
      expect(t).toContain(parte);
    }
  });
});
