import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { API_URL } from "../api";
import { simularApi } from "../test/api";
import TabelaQuestoes from "./TabelaQuestoes";

const valida = (numero, curso, brasil, extra = {}) => ({
  numero,
  disciplina: "Redes de Computadores I",
  tema: `Tema da questão ${numero}`,
  imagem: `2023/ec-${numero}.webp`,
  situacao: "valida",
  gabarito: "C",
  acertos: { curso, uf: 36.6, regiao: 30.7, catAdm: 37.0, orgAcad: 34.2, brasil },
  respostas: { A: 4.4, B: 15.6, C: curso, D: 22.2, E: 13.3, SI: 0 },
  ...extra,
});

const tabela = (ano = 2023) => ({
  curso: "ec",
  ano,
  fonte: "INEP — fonte de teste",
  componentes: [
    {
      tipo: "formacaoGeral",
      titulo: "Formação Geral",
      questoes: [valida(1, 71.1, 66.8, { disciplina: null, tema: null })],
    },
    {
      tipo: "especifico",
      titulo: "Componente Específico",
      questoes: [
        valida(10, 31.1, 38.2), // curso abaixo do Brasil
        valida(11, 44.4, 33.4), // curso acima do Brasil
        {
          numero: 17,
          disciplina: "Matemática Discreta",
          tema: null,
          situacao: "desconsiderada",
          gabarito: null,
          acertos: null,
          respostas: null,
        },
        {
          numero: 25,
          disciplina: "Sinais e Sistemas",
          tema: "Filtros",
          situacao: "anulada",
          gabarito: null,
          acertos: null,
          respostas: null,
        },
      ],
    },
  ],
});

const linha = (numero) =>
  screen.getByText(String(numero), { selector: "td.questao-numero .numero" }).closest("tr");

// nada aparece até o leitor clicar no ano
const abrirAno = (ano) => userEvent.click(screen.getByRole("button", { name: String(ano) }));

describe("TabelaQuestoes", () => {
  it("mostra um bloco para Formação Geral e outro para Componente Específico", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);

    expect(await screen.findByRole("heading", { name: "Formação Geral" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Componente Específico" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acertos por questão — Enade 2023" }),
    ).toBeInTheDocument();
  });

  it("cada questão tem um botão 'Ver' ao lado do número, que abre a imagem e o gabarito", async () => {
    const usuario = userEvent.setup();
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    const botao = within(linha(10)).getByRole("button", { name: "Ver questão" });
    expect(botao).toHaveTextContent("Ver");
    await usuario.click(botao);
    expect(screen.getByRole("dialog", { name: "Questão 10" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      `${API_URL}/enade/imagens/2023/ec-10.webp`,
    );
    expect(screen.getByText("Gabarito: C")).toBeInTheDocument();
    await usuario.keyboard("{Escape}");

    // sem imagem, não há botão (a questão 17 do teste não tem)
    expect(within(linha(17)).queryByRole("button", { name: "Ver questão" })).toBeNull();
  });

  describe("esconder e mostrar as tabelas", () => {
    it("as tabelas já abrem visíveis, e a setinha do título esconde e mostra cada uma", async () => {
      const usuario = userEvent.setup();
      simularApi({ "/enade/ec/questoes": tabela() });
      render(<TabelaQuestoes chave="ec" anos={[2023]} />);
      await usuario.click(screen.getByRole("button", { name: "2023" }));
      await screen.findByText("Tema da questão 10");
      const secao = (titulo) => screen.getByRole("heading", { name: titulo }).closest("details");

      expect(secao("Formação Geral")).toHaveAttribute("open");
      expect(secao("Componente Específico")).toHaveAttribute("open");

      await usuario.click(screen.getByRole("heading", { name: "Formação Geral" }));
      expect(secao("Formação Geral")).not.toHaveAttribute("open");
      expect(secao("Componente Específico")).toHaveAttribute("open"); // a outra não muda

      await usuario.click(screen.getByRole("heading", { name: "Formação Geral" }));
      expect(secao("Formação Geral")).toHaveAttribute("open");
    });
  });

  describe("questões discursivas", () => {
    const notas = (curso, brasil) => ({
      curso: { media: curso, desvio: 20 },
      uf: { media: 40, desvio: 20 },
      regiao: { media: 41, desvio: 20 },
      catAdm: { media: 42, desvio: 20 },
      orgAcad: { media: 43, desvio: 20 },
      brasil: { media: brasil, desvio: 20 },
    });
    const comDiscursivas = () => {
      const t = tabela();
      t.componentes[0].discursivas = [
        {
          numero: "D1",
          disciplina: "Sociologia",
          tema: "Desigualdades sociais",
          imagem: "2023/fg-d1.webp",
          notas: notas(39.3, 44.1),
        },
      ];
      t.componentes[1].discursivas = [
        {
          numero: "D2",
          disciplina: "Algoritmos",
          tema: "Quicksort",
          imagem: "2023/ec-d2.webp",
          notas: notas(22.1, 16.9),
        },
      ];
      return t;
    };
    async function abrirComDiscursivas() {
      const usuario = userEvent.setup();
      simularApi({ "/enade/ec/questoes": comDiscursivas() });
      render(<TabelaQuestoes chave="ec" anos={[2023]} />);
      await usuario.click(screen.getByRole("button", { name: "2023" }));
      await screen.findByRole("heading", { name: "Questões discursivas" });
      return usuario;
    }
    const tabelaDasDiscursivas = () => document.querySelector(".tabela-discursivas");

    it("uma tabela só, com as discursivas de Formação Geral e do Componente Específico, e a nota média da UFOP e do Brasil", async () => {
      await abrirComDiscursivas();
      const linhas = within(tabelaDasDiscursivas()).getAllByRole("row").slice(2);

      expect(linhas).toHaveLength(2);
      expect(linhas[0]).toHaveTextContent("D1Ver");
      expect(linhas[0]).toHaveTextContent("Formação Geral");
      expect(linhas[0]).toHaveTextContent("39,344,1"); // UFOP e Brasil
      expect(linhas[1]).toHaveTextContent("D2Ver");
      expect(linhas[1]).toHaveTextContent("Componente Específico");
      expect(linhas[1]).toHaveTextContent("22,116,9");
      // a cor segue a das objetivas: UFOP abaixo do Brasil em D1, acima em D2
      expect(within(linhas[0]).getAllByRole("cell")[4]).toHaveClass("curso-abaixo");
      expect(within(linhas[1]).getAllByRole("cell")[4]).toHaveClass("curso-acima");
    });

    it("'Ver todas as colunas' mostra a nota média de todos os grupos", async () => {
      const usuario = await abrirComDiscursivas();
      await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

      const cabecalhos = within(tabelaDasDiscursivas())
        .getAllByRole("columnheader")
        .map((c) => c.textContent);
      expect(cabecalhos).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^UFOP/),
          "Estado",
          "Região",
          "Cat. adm.",
          "Brasil",
        ]),
      );
      const linha = within(tabelaDasDiscursivas()).getByText("Quicksort").closest("tr");
      expect(linha).toHaveTextContent("22,140,041,042,043,016,9");
    });

    it("tem os mesmos filtros: ordenar pelas colunas, em ordem alfabética ou pela nota", async () => {
      const usuario = await abrirComDiscursivas();
      const numeros = () =>
        [...tabelaDasDiscursivas().querySelectorAll("td.questao-numero .numero")].map(
          (td) => td.textContent,
        );
      const botao = (nome) =>
        within(tabelaDasDiscursivas()).getByRole("button", { name: new RegExp(`^${nome}`) });

      expect(numeros()).toEqual(["D1", "D2"]);
      await usuario.click(botao("Questão"));
      expect(numeros()).toEqual(["D2", "D1"]);

      await usuario.click(botao("Disciplina")); // Algoritmos, Sociologia
      expect(numeros()).toEqual(["D2", "D1"]);
      await usuario.click(botao("Disciplina"));
      expect(numeros()).toEqual(["D1", "D2"]);

      await usuario.click(botao("Tema")); // Desigualdades..., Quicksort...
      expect(numeros()).toEqual(["D1", "D2"]);

      await usuario.click(botao("UFOP")); // 22,1 antes de 39,3
      expect(numeros()).toEqual(["D2", "D1"]);
      expect(botao("UFOP").closest("th")).toHaveAttribute("aria-sort", "ascending");
      await usuario.click(botao("UFOP"));
      expect(numeros()).toEqual(["D1", "D2"]);
    });

    it("o grupo da comparação é escolhido no cabeçalho, e vale também para a cor", async () => {
      const usuario = await abrirComDiscursivas();
      const seletor = within(tabelaDasDiscursivas()).getByRole("combobox", {
        name: "Comparar a UFOP com",
      });
      expect(seletor).toHaveValue("brasil");

      await usuario.selectOptions(seletor, "uf"); // UF: 40,0 em todas
      const linha = within(tabelaDasDiscursivas()).getByText("Quicksort").closest("tr");
      expect(linha).toHaveTextContent("22,140,0"); // UFOP e Estado
      expect(within(linha).getAllByRole("cell")[4]).toHaveClass("curso-abaixo"); // 22,1 < 40,0
    });

    it("o botão Ver abre a discursiva só com a imagem, sem gabarito", async () => {
      const usuario = await abrirComDiscursivas();
      const linha = within(tabelaDasDiscursivas()).getByText("Quicksort").closest("tr");

      await usuario.click(within(linha).getByRole("button", { name: "Ver questão" }));
      expect(screen.getByRole("dialog", { name: "Questão discursiva 2" })).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute(
        "src",
        `${API_URL}/enade/imagens/2023/ec-d2.webp`,
      );
      expect(within(screen.getByRole("dialog")).queryByText(/Gabarito/)).toBeNull();
    });

    it("sem discursivas na resposta, a tabela não aparece", async () => {
      simularApi({ "/enade/ec/questoes": tabela() });
      render(<TabelaQuestoes chave="ec" anos={[2023]} />);
      await userEvent.click(screen.getByRole("button", { name: "2023" }));
      await screen.findByText("Tema da questão 10");

      expect(screen.queryByRole("heading", { name: "Questões discursivas" })).toBeNull();
    });
  });

  it("ao abrir uma questão desconsiderada, mostra o gabarito da prova; a anulada fica sem gabarito", async () => {
    const usuario = userEvent.setup();
    const t = tabela();
    const ce = t.componentes[1].questoes;
    ce.find((q) => q.numero === 17).gabaritoDaProva = "D"; // desconsiderada
    ce.find((q) => q.numero === 17).imagem = "2023/ec-17.webp";
    ce.find((q) => q.numero === 25).imagem = "2023/ec-25.webp"; // anulada
    simularApi({ "/enade/ec/questoes": t });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Tema da questão 10");

    await usuario.click(within(linha(17)).getByRole("button", { name: "Ver questão" }));
    expect(screen.getByText(/Gabarito: D \(questão desconsiderada/)).toBeInTheDocument();
    // a tabela continua mostrando "Desconsiderada" na coluna do gabarito
    expect(within(linha(17)).getByText("Desconsiderada")).toBeInTheDocument();
    await usuario.keyboard("{Escape}");

    await usuario.click(within(linha(25)).getByRole("button", { name: "Ver questão" }));
    const janela = within(screen.getByRole("dialog"));
    expect(janela.getByText(/anulada pela comissão/)).toBeInTheDocument();
    expect(janela.queryByText(/Gabarito: /)).toBeNull();
  });

  it("os relatórios para baixar ficam numa caixa fechada, uma linha por edição, com o tamanho", async () => {
    simularApi({
      "/relatorios/curso": [
        {
          curso: "ec",
          ano: 2017,
          titulo: "Enade 2017 — Relatório do curso",
          descricao: "UFOP",
          tamanhoMb: 1.1,
        },
        { curso: "si", ano: 2017, titulo: "Outro curso", descricao: "UFOP", tamanhoMb: 9 },
      ],
      "/enade/ec/questoes": tabela(2017),
    });
    render(<TabelaQuestoes chave="ec" anos={[2017, 2014]} />);

    const caixa = screen.getByText("Relatórios do INEP para baixar").closest("details");
    expect(caixa).not.toHaveAttribute("open"); // começa fechada
    expect(await within(caixa).findByText(/PDF, 1,1 MB/)).toBeInTheDocument();
    const links = within(caixa).getAllByRole("link", { name: "Baixar PDF" });
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      `${API_URL}/relatorios/curso/ec/2017/download`,
      `${API_URL}/relatorios/curso/ec/2014/download`, // sem dados da API: lista igual, sem tamanho
    ]);
    expect(screen.queryByText("Outro curso")).toBeNull();
  });

  it("busca a tabela do curso e do ano clicado", async () => {
    const fetchFalso = simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023, 2019]} />);
    await abrirAno(2023);

    await screen.findByText("Tema da questão 10");
    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/questoes?ano=2023`);
  });

  it("depois do número da questão vêm as colunas de disciplina e tema", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    const celulas = [...linha(10).querySelectorAll("td")].map((c) => c.textContent);
    expect(celulas.slice(0, 3)).toEqual(["10Ver", "Redes de Computadores I", "Tema da questão 10"]);
  });

  it("mostra por padrão só o curso, o Brasil e o gabarito, com vírgula e uma casa decimal", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    const celulas = [...linha(10).querySelectorAll("td")].map((c) => c.textContent);
    expect(celulas).toEqual([
      "10Ver",
      "Redes de Computadores I",
      "Tema da questão 10",
      "31,1",
      "38,2",
      "C",
    ]);
    expect(screen.queryByRole("columnheader", { name: "Estado" })).not.toBeInTheDocument();
  });

  it("'Ver todas as colunas' acrescenta UF, região, categoria, organização e as respostas A–E", async () => {
    const usuario = userEvent.setup();
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

    for (const titulo of [
      "Estado",
      "Região",
      "Cat. adm.",
      "Org. acad.",
      "A",
      "B",
      "C",
      "D",
      "E",
      "SI",
    ]) {
      expect(screen.getAllByRole("columnheader", { name: titulo }).length).toBeGreaterThan(0);
    }
    const celulas = [...linha(10).querySelectorAll("td")].map((c) => c.textContent);
    expect(celulas).toEqual([
      "10Ver",
      "Redes de Computadores I",
      "Tema da questão 10",
      "31,1",
      "36,6",
      "30,7",
      "37,0",
      "34,2",
      "38,2",
      "C",
      "4,4",
      "15,6",
      "31,1",
      "22,2",
      "13,3",
      "0,0",
    ]);
    expect(screen.getByRole("button", { name: "Ver menos colunas" })).toBeInTheDocument();
  });

  it("a resposta do gabarito fica destacada nas colunas completas", async () => {
    const usuario = userEvent.setup();
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");
    await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

    expect(linha(10).querySelectorAll("td.certa")).toHaveLength(1);
    expect(linha(10).querySelector("td.certa")).toHaveTextContent("31,1");
  });

  it("destaca em cor discreta se o curso ficou acima ou abaixo do Brasil", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    expect(within(linha(10)).getByText("31,1")).toHaveClass("curso-abaixo");
    expect(within(linha(11)).getByText("44,4")).toHaveClass("curso-acima");
  });

  it("questão sem disciplina ou tema mostra um traço", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    const celulas = [...linha(1).querySelectorAll("td")].map((c) => c.textContent);
    expect(celulas.slice(0, 3)).toEqual(["1Ver", "—", "—"]);
  });

  it("questão desconsiderada ou anulada não mostra percentuais e tem o motivo no lugar do gabarito", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    expect([...linha(17).querySelectorAll("td")].map((c) => c.textContent)).toEqual([
      "17",
      "Matemática Discreta",
      "—",
      "—",
      "—",
      "Desconsiderada",
    ]);
    expect([...linha(25).querySelectorAll("td")].map((c) => c.textContent)).toEqual([
      "25",
      "Sinais e Sistemas",
      "Filtros",
      "—",
      "—",
      "Anulada",
    ]);
    expect(linha(17)).toHaveClass("questao-fora");
  });

  it("explica o que significam % de acertos, desconsiderada e anulada, e cita a fonte", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    const { container } = render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);
    await screen.findByText("Tema da questão 10");

    expect(container).toHaveTextContent(
      "Desconsiderada: o INEP deixou a questão fora do cálculo da nota",
    );
    expect(container).toHaveTextContent("Anulada: anulada pela comissão");
    expect(container).toHaveTextContent("Fonte: INEP — fonte de teste.");
  });

  it("sempre mostra os botões de ano, e a tabela só aparece depois de clicar", async () => {
    const fetchFalso = simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023, 2019]} />);

    expect(screen.getByRole("button", { name: "2023" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2019" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // nenhuma tabela é buscada antes do clique (só a lista de relatórios, para a caixa de downloads)
    expect(fetchFalso).not.toHaveBeenCalledWith(expect.stringContaining("/enade/"));
  });

  it("com um ano só, o botão do ano também aparece e a tabela espera o clique", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);

    expect(screen.getByRole("button", { name: "2023" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("clicar em outro ano troca a tabela, e clicar de novo no mesmo ano esconde", async () => {
    const usuario = userEvent.setup();
    const fetchFalso = simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023, 2019]} />);

    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Tema da questão 10");
    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/questoes?ano=2023`);

    await usuario.click(screen.getByRole("button", { name: "2019" }));
    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/questoes?ano=2019`);

    await usuario.click(screen.getByRole("button", { name: "2019" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/Acertos por questão — Enade/)).not.toBeInTheDocument();
  });

  it("ao trocar de ano, a tabela anterior fica na tela até a nova chegar", async () => {
    const usuario = userEvent.setup();
    const pendentes = {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        const ano = String(url).match(/\?ano=(\d+)/)?.[1];
        if (!ano) return Promise.reject(new Error("só a tabela é controlada aqui"));
        return new Promise((resolve) => {
          pendentes[ano] = () =>
            resolve({ ok: true, json: () => Promise.resolve(tabela(Number(ano))) });
        });
      }),
    );
    render(<TabelaQuestoes chave="ec" anos={[2023, 2019]} />);

    await usuario.click(screen.getByRole("button", { name: "2023" }));
    pendentes["2023"]();
    await screen.findByText("Acertos por questão — Enade 2023");

    await usuario.click(screen.getByRole("button", { name: "2019" }));
    expect(screen.getByText("Acertos por questão — Enade 2023")).toBeInTheDocument(); // não some
    expect(document.querySelector(".carregando")).not.toBeNull();

    pendentes["2019"]();
    await screen.findByText("Acertos por questão — Enade 2019");
    expect(screen.queryByText("Acertos por questão — Enade 2023")).not.toBeInTheDocument();
    expect(document.querySelector(".carregando")).toBeNull();
  });

  it("sem nenhum ano disponível, avisa e não busca nada", () => {
    const fetchFalso = simularApi({});
    render(<TabelaQuestoes chave="si" anos={[]} />);

    expect(screen.getByText(/ainda não está disponível para este curso/)).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("avisa quando a tabela não carrega", async () => {
    simularApi({});
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await abrirAno(2023);

    expect(
      await screen.findByText("Não foi possível carregar a tabela de questões."),
    ).toBeInTheDocument();
  });
});

describe("TabelaQuestoes: ordenar, comparar e explicações", () => {
  async function abrir() {
    const usuario = userEvent.setup();
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Tema da questão 10");
    return usuario;
  }
  // números das questões do Componente Específico, na ordem em que aparecem
  const ordemDaProva = () =>
    [...document.querySelectorAll("table")[1].querySelectorAll("td.questao-numero .numero")].map(
      (td) => Number(td.textContent),
    );
  const cabecalho = (nome) => screen.getAllByRole("button", { name: new RegExp(`^${nome}`) })[1];

  describe("ordenar", () => {
    it("começa pelo número da questão, em ordem crescente", async () => {
      await abrir();

      expect(ordemDaProva()).toEqual([10, 11, 17, 25]);
      expect(cabecalho("Questão").closest("th")).toHaveAttribute("aria-sort", "ascending");
    });

    it("clicar em Questão inverte a ordem, e de novo volta", async () => {
      const usuario = await abrir();

      await usuario.click(cabecalho("Questão"));
      expect(ordemDaProva()).toEqual([25, 17, 11, 10]);
      expect(cabecalho("Questão").closest("th")).toHaveAttribute("aria-sort", "descending");

      await usuario.click(cabecalho("Questão"));
      expect(ordemDaProva()).toEqual([10, 11, 17, 25]);
    });

    it("clicar em UFOP ordena pelo acerto, do menor para o maior, e de novo do maior para o menor", async () => {
      const usuario = await abrir();

      await usuario.click(cabecalho("UFOP"));
      // 31,1 (questão 10) e 44,4 (questão 11); as sem percentual ficam no fim
      expect(ordemDaProva()).toEqual([10, 11, 17, 25]);

      await usuario.click(cabecalho("UFOP"));
      expect(ordemDaProva()).toEqual([11, 10, 17, 25]);
      expect(cabecalho("UFOP").closest("th")).toHaveAttribute("aria-sort", "descending");
    });

    it("as questões anuladas e desconsideradas ficam no fim, qualquer que seja o sentido", async () => {
      const usuario = await abrir();

      await usuario.click(cabecalho("UFOP"));
      await usuario.click(cabecalho("UFOP"));

      expect(ordemDaProva().slice(-2)).toEqual([17, 25]);
    });

    it("clicar em Disciplina ordena em ordem alfabética, e de novo na ordem contrária", async () => {
      const usuario = await abrir();

      await usuario.click(cabecalho("Disciplina"));
      // Matemática Discreta, Redes (10 e 11), Sinais e Sistemas
      expect(ordemDaProva()).toEqual([17, 10, 11, 25]);
      expect(cabecalho("Disciplina").closest("th")).toHaveAttribute("aria-sort", "ascending");

      await usuario.click(cabecalho("Disciplina"));
      expect(ordemDaProva()).toEqual([25, 10, 11, 17]);
      expect(cabecalho("Disciplina").closest("th")).toHaveAttribute("aria-sort", "descending");
    });

    it("clicar em Tema ordena em ordem alfabética, com as questões sem tema sempre no fim", async () => {
      const usuario = await abrir();

      await usuario.click(cabecalho("Tema"));
      // Filtros, Tema da questão 10, Tema da questão 11 e, por último, a sem tema (17)
      expect(ordemDaProva()).toEqual([25, 10, 11, 17]);

      await usuario.click(cabecalho("Tema"));
      expect(ordemDaProva()).toEqual([11, 10, 25, 17]);
    });

    it("só uma coluna fica ordenada por vez (a outra volta a ficar sem ordem)", async () => {
      const usuario = await abrir();

      await usuario.click(cabecalho("UFOP"));

      expect(cabecalho("UFOP").closest("th")).toHaveAttribute("aria-sort", "ascending");
      expect(cabecalho("Questão").closest("th")).toHaveAttribute("aria-sort", "none");
    });

    it("cada tabela tem a sua ordem: ordenar o Componente Específico não muda a Formação Geral", async () => {
      const usuario = await abrir();
      const questaoDe = (indice) =>
        screen.getAllByRole("button", { name: /^Questão/ })[indice].closest("th");

      await usuario.click(cabecalho("Questão")); // a tabela do Componente Específico

      expect(questaoDe(1)).toHaveAttribute("aria-sort", "descending");
      expect(questaoDe(0)).toHaveAttribute("aria-sort", "ascending"); // a Formação Geral continua como estava
    });
  });

  describe("comparar com outro grupo", () => {
    it("a tabela resumida começa comparando com o Brasil, e a escolha fica no cabeçalho", async () => {
      await abrir();
      const seletores = screen.getAllByRole("combobox", { name: "Comparar a UFOP com" });

      expect(seletores).toHaveLength(2); // um por tabela
      expect(seletores[0]).toHaveValue("brasil");
      expect(seletores[0].closest("th")).not.toBeNull();
      expect([...seletores[0].options].map((o) => o.textContent)).toEqual([
        "Estado (UF)",
        "Região",
        "Categoria administrativa",
        "Organização acadêmica",
        "Brasil",
      ]);
    });

    it("escolher Estado troca o valor da coluna e a cor do número da UFOP", async () => {
      const usuario = await abrir();
      const linha10 = () =>
        screen.getByText("10", { selector: "td.questao-numero .numero" }).closest("tr");

      expect(within(linha10()).getByText("38,2")).toBeInTheDocument(); // Brasil
      expect(within(linha10()).getByText("31,1")).toHaveClass("curso-abaixo");

      await usuario.selectOptions(
        screen.getAllByRole("combobox", { name: "Comparar a UFOP com" })[1],
        "uf",
      );

      expect(within(linha10()).getByText("36,6")).toBeInTheDocument(); // Estado
      expect(within(linha10()).queryByText("38,2")).not.toBeInTheDocument();
      expect(within(linha10()).getByText("31,1")).toHaveClass("curso-abaixo"); // 31,1 < 36,6
    });

    it("cada tabela tem a sua escolha: mudar uma não muda a outra", async () => {
      const usuario = await abrir();
      const seletores = () => screen.getAllByRole("combobox", { name: "Comparar a UFOP com" });

      await usuario.selectOptions(seletores()[0], "regiao"); // Formação Geral

      expect(seletores()[0]).toHaveValue("regiao");
      expect(seletores()[1]).toHaveValue("brasil");
    });

    it("a cor muda conforme o grupo: abaixo do Brasil, mas acima da Região (31,1 contra 38,2 e 30,7)", async () => {
      const usuario = await abrir();
      const linha10 = () =>
        screen.getByText("10", { selector: "td.questao-numero .numero" }).closest("tr");

      expect(within(linha10()).getByText("31,1")).toHaveClass("curso-abaixo");

      await usuario.selectOptions(
        screen.getAllByRole("combobox", { name: "Comparar a UFOP com" })[1],
        "regiao",
      );

      expect(within(linha10()).getByText("30,7")).toBeInTheDocument();
      expect(within(linha10()).getByText("31,1")).toHaveClass("curso-acima");
    });

    it("na tabela completa os grupos aparecem todos como colunas e cada tabela tem o seu seletor de cor, acima dela", async () => {
      const usuario = await abrir();

      await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

      const seletores = screen.getAllByRole("combobox", { name: "Comparar a UFOP com" });
      expect(seletores).toHaveLength(2); // um por tabela
      expect(seletores[0].closest("th")).toBeNull();
      expect(screen.getAllByRole("columnheader", { name: "Brasil" }).length).toBeGreaterThan(0);
    });
  });

  describe("explicações ao passar o mouse", () => {
    const tituloDe = (nome) =>
      screen.getAllByRole("columnheader", { name: nome })[0].getAttribute("title");

    it("cada coluna da tabela completa explica o que significa", async () => {
      const usuario = await abrir();
      await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

      expect(tituloDe("Estado")).toMatch(/mesmo estado da UFOP \(Minas Gerais\)/);
      expect(tituloDe("Região")).toMatch(/mesma Grande Região da UFOP \(Sudeste\)/);
      expect(tituloDe("Cat. adm.")).toMatch(/mesma categoria da UFOP \(pública federal\)/);
      expect(tituloDe("Org. acad.")).toMatch(/universidade/);
      expect(tituloDe("Brasil")).toMatch(/todo o país/);
    });

    it("gabarito, alternativas e SI também têm explicação", async () => {
      const usuario = await abrir();
      await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

      expect(tituloDe("Gabarito")).toMatch(/Alternativa correta.*Anulada.*Desconsiderada/);
      expect(tituloDe("C")).toBe("Percentual de concluintes da UFOP que marcaram a alternativa C.");
      expect(tituloDe("SI")).toMatch(/sem resposta ou marcaram mais de uma/);
    });

    it("na tabela resumida, o grupo escolhido também explica o que é", async () => {
      const usuario = await abrir();

      await usuario.selectOptions(
        screen.getAllByRole("combobox", { name: "Comparar a UFOP com" })[0],
        "orgAcad",
      );

      expect(screen.getAllByRole("combobox", { name: "Comparar a UFOP com" })[0]).toHaveAttribute(
        "title",
        expect.stringMatching(/universidade/),
      );
    });
  });
});
