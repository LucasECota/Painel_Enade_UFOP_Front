import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { API_URL } from "../api";
import { limparCacheDoDesempenho } from "../desempenhoCache";
import { simularApi } from "../test/api";
import DesempenhoPorArea from "./DesempenhoPorArea";

const area = (componente, disciplina, questoes, ufop, brasil) => ({
  componente,
  disciplina,
  questoes,
  ufop,
  brasil,
});
const tema = (componente, numero, disciplina, texto, ufop, brasil) => ({
  componente,
  numero,
  disciplina,
  tema: texto,
  ufop,
  brasil,
});

const dados = {
  curso: "ec",
  nome: "Engenharia de Computação",
  edicoes: [2023, 2017],
  porEdicao: [
    {
      ano: 2023,
      areas: [
        area("especifico", "Redes de Computadores I", 2, 60, 50),
        area("especifico", "Circuitos Elétricos I", 1, 20, 30),
        area("formacaoGeral", "Sociologia", 1, 70, 70),
      ],
      temas: [
        tema("especifico", 11, "Redes de Computadores I", "OSPF", 80, 50),
        tema("especifico", 12, "Redes de Computadores I", "TCP", 40, 50),
        tema("especifico", 13, "Circuitos Elétricos I", "Kirchhoff", 20, 30),
        tema("formacaoGeral", 2, "Sociologia", "Desigualdade", 70, 70),
      ],
    },
    {
      ano: 2017,
      areas: [area("especifico", "Redes de Computadores I", 1, 45, 55)],
      temas: [tema("especifico", 25, "Redes de Computadores I", "Firewall", 45, 55)],
    },
  ],
};

const TITULOS = {
  evolucao: "Desempenho de cada disciplina ao longo das edições",
  rankings: "Disciplinas e temas com mais acertos e mais erros",
};

// cada parte é uma subpágina: renderiza só a que foi pedida
async function renderizar(parte) {
  simularApi({ "/enade/ec/desempenho-areas": dados });
  const resultado = render(<DesempenhoPorArea chave="ec" anos={[2023, 2017]} parte={parte} />);
  await screen.findByText(TITULOS[parte]);
  return resultado;
}

describe("DesempenhoPorArea", () => {
  beforeEach(() => limparCacheDoDesempenho()); // cada teste começa sem dados guardados

  it("busca o desempenho do curso na API", async () => {
    const fetchFalso = simularApi({ "/enade/ec/desempenho-areas": dados });
    render(<DesempenhoPorArea chave="ec" anos={[2023]} parte="evolucao" />);

    await screen.findByText(TITULOS.evolucao);
    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/desempenho-areas`);
  });

  it("se a API devolver nenhuma edição, avisa em vez de quebrar", async () => {
    simularApi({
      "/enade/ec/desempenho-areas": { curso: "ec", nome: "X", edicoes: [], porEdicao: [] },
    });
    render(<DesempenhoPorArea chave="ec" anos={[2023]} parte="rankings" />);

    expect(await screen.findByText(/ainda não está disponível/)).toBeInTheDocument();
  });

  it("curso sem tabelas avisa que não está disponível e não busca nada", () => {
    const fetchFalso = simularApi({});
    render(<DesempenhoPorArea chave="si" anos={[]} parte="evolucao" />);

    expect(screen.getByText(/ainda não está disponível/)).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  describe("gráfico de evolução por disciplina", () => {
    const textos = () =>
      [...document.querySelectorAll(".grafico-svg text")].map((t) => t.textContent);

    it("começa pela disciplina que apareceu em mais edições, com UFOP e Brasil em cada edição", async () => {
      await renderizar("evolucao");
      expect(screen.getByRole("combobox", { name: "Disciplina" })).toHaveValue(
        "Redes de Computadores I",
      );
      expect(screen.getByRole("img", { name: /Redes de Computadores I/ })).toBeInTheDocument();
      expect(textos()).toEqual(
        expect.arrayContaining(["2017", "2023", "45,0", "55,0", "60,0", "50,0"]),
      );
      expect(textos()).toEqual(expect.arrayContaining(["▼ 10,0 p.p.", "▲ 10,0 p.p."]));
      expect(document.querySelectorAll(".grafico-barra-ufop")).toHaveLength(2);
      expect(document.querySelectorAll(".grafico-barra-brasil")).toHaveLength(2);
    });

    it("trocar a disciplina troca o gráfico; edição sem questões da disciplina é avisada", async () => {
      const usuario = userEvent.setup();
      await renderizar("evolucao");

      await usuario.selectOptions(
        screen.getByRole("combobox", { name: "Disciplina" }),
        "Circuitos Elétricos I",
      );
      expect(textos()).toEqual(expect.arrayContaining(["20,0", "30,0", "sem questões"]));
      expect(document.querySelectorAll(".grafico-barra-ufop")).toHaveLength(1);
    });

    it("o menu separa as disciplinas parecidas em subgrupos, com uma linha entre eles", async () => {
      await renderizar("evolucao");
      const menu = screen.getByRole("combobox", { name: "Disciplina" });

      const grupos = [...menu.querySelectorAll("optgroup")].map((g) => g.label);
      expect(grupos).toEqual(["Sistemas computacionais e redes", "Eletrônica, sinais e controle"]);
      expect(menu.querySelectorAll("hr")).toHaveLength(1);
      expect(
        [...menu.querySelectorAll("optgroup")[0].querySelectorAll("option")].map((o) => o.value),
      ).toEqual(["Redes de Computadores I"]);
    });

    it("alterna entre Componente Específico e Formação Geral", async () => {
      const usuario = userEvent.setup();
      await renderizar("evolucao");
      expect(screen.queryByRole("option", { name: "Sociologia" })).toBeNull();

      await usuario.click(screen.getByRole("button", { name: "Formação Geral" }));
      expect(screen.getByRole("combobox", { name: "Disciplina" })).toHaveValue("Sociologia");
      expect(screen.queryByRole("option", { name: "Redes de Computadores I" })).toBeNull();
      expect(textos()).toContain("igual ao Brasil");
    });
  });

  describe("mais acertos e mais erros por edição", () => {
    const abrirEdicao = (ano) => userEvent.click(screen.getByRole("button", { name: String(ano) }));
    const clicar = (nome) => userEvent.click(screen.getByRole("button", { name: nome }));
    const lista = (titulo) => screen.getByRole("heading", { name: titulo }).closest("div");
    const nomes = (titulo) =>
      within(lista(titulo))
        .getAllByRole("row")
        .slice(1)
        .map((tr) => within(tr).getAllByRole("cell")[0].textContent);
    const MAIS_ACERTOS_D = "Disciplinas com mais acertos (% de acerto)";
    const MAIS_ERROS_D = "Disciplinas com mais erros (% de erro)";
    const MAIS_ACERTOS_T = "Temas com mais acertos (% de acerto)";
    const MAIS_ERROS_T = "Temas com mais erros (% de erro)";

    it("só mostra as listas depois de clicar numa edição, e clicar de novo esconde", async () => {
      await renderizar("rankings");

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      await abrirEdicao(2023);
      // começa com as disciplinas: duas listas (acertos e erros), não as quatro de uma vez
      expect(screen.getAllByRole("table")).toHaveLength(2);
      await abrirEdicao(2023);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("alterna entre disciplinas e temas", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);
      expect(screen.queryByRole("heading", { name: MAIS_ACERTOS_T })).toBeNull();

      await clicar("Temas");
      expect(screen.queryByRole("heading", { name: MAIS_ACERTOS_D })).toBeNull();
      expect(nomes(MAIS_ACERTOS_T)[0]).toMatch(/^OSPF/);
      expect(nomes(MAIS_ERROS_T)[0]).toMatch(/^Kirchhoff/);
    });

    it("o leitor escolhe quantos itens ver", async () => {
      const usuario = userEvent.setup();
      await renderizar("rankings");
      await abrirEdicao(2023);
      await clicar("Temas");
      const quantos = screen.getByRole("combobox", { name: "Quantos" });

      expect(quantos).toHaveValue("5"); // padrão
      await usuario.selectOptions(quantos, "3");
      expect(nomes(MAIS_ACERTOS_T)).toHaveLength(3); // a edição só tem 3 temas
      await usuario.selectOptions(quantos, "10");
      expect(nomes(MAIS_ACERTOS_T)).toHaveLength(3); // não passa do que existe
    });

    it("no Componente Específico 'Quantos' oferece só 3, 5 e 10; na Formação Geral, nunca mais do que existe", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);
      const opcoes = () =>
        within(screen.getByRole("combobox", { name: "Quantos" }))
          .getAllByRole("option")
          .map((o) => o.textContent);

      expect(opcoes()).toEqual(["3", "5", "10"]);
      await clicar("Temas");
      expect(opcoes()).toEqual(["3", "5", "10"]);
      await clicar("Formação Geral");
      await clicar("Disciplinas");
      expect(opcoes()).toEqual(["1"]); // só Sociologia
    });

    it("as listas de erros mostram os acertos da UFOP e do Brasil (a pior disciplina ou tema primeiro)", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);
      await clicar("Temas");
      const primeira = within(lista(MAIS_ERROS_T)).getAllByRole("row")[1];
      const celulas = within(primeira).getAllByRole("cell");

      expect(celulas).toHaveLength(3);
      expect(celulas[1]).toHaveTextContent("20,0"); // acerto da UFOP
      expect(celulas[2]).toHaveTextContent("30,0"); // acerto do Brasil
    });

    it("a seta mostra a diferença da UFOP para o Brasil: verde acima, vinho abaixo, e 'igual'", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);
      const linhas = within(lista(MAIS_ACERTOS_D)).getAllByRole("row").slice(1);
      expect(linhas[0]).toHaveTextContent("60,0▲ 10,0"); // Redes: 60 contra 50
      expect(linhas[1]).toHaveTextContent("20,0▼ 10,0"); // Circuitos: 20 contra 30
      expect(within(linhas[0]).getByText("▲ 10,0")).toHaveClass("dif-acima");
      expect(within(linhas[1]).getByText("▼ 10,0")).toHaveClass("dif-abaixo");

      await clicar("Formação Geral");
      expect(screen.getAllByText("igual ao Brasil").length).toBeGreaterThan(0); // Sociologia: 70 e 70
    });

    it("os cabeçalhos mostram só acertos, nunca colunas de erros", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);

      const cabecalhos = (titulo) =>
        within(lista(titulo))
          .getAllByRole("columnheader")
          .map((c) => c.textContent);

      expect(cabecalhos(MAIS_ACERTOS_D)).toEqual(["Disciplina", "Acertos UFOP", "Acertos Brasil"]);
      expect(cabecalhos(MAIS_ERROS_D)).toEqual(["Disciplina", "Acertos UFOP", "Acertos Brasil"]);
      expect(screen.queryByText(/Clique numa edição/)).not.toBeInTheDocument();
    });

    it("as disciplinas informam quantas questões têm", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);

      expect(within(lista(MAIS_ACERTOS_D)).getByText(/^2 questões$/)).toBeInTheDocument();
    });

    it("as listas são do componente escolhido: Formação Geral e Componente Específico não se misturam", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);

      expect(nomes(MAIS_ACERTOS_D)).toEqual([
        expect.stringMatching(/^Redes de Computadores I/),
        expect.stringMatching(/^Circuitos Elétricos I/),
      ]);

      await clicar("Formação Geral");
      expect(nomes(MAIS_ACERTOS_D)).toEqual([expect.stringMatching(/^Sociologia/)]);
      await clicar("Temas");
      expect(nomes(MAIS_ACERTOS_T)).toEqual([expect.stringMatching(/^Desigualdade/)]);
    });

    it("trocar a edição troca as listas", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);
      await clicar("Temas");
      await abrirEdicao(2017);

      expect(nomes(MAIS_ACERTOS_T)).toEqual([expect.stringMatching(/^Firewall/)]);
    });
  });

  it("cada subpágina mostra só a sua parte", async () => {
    const { unmount } = await renderizar("evolucao");
    expect(screen.queryByText(TITULOS.rankings)).not.toBeInTheDocument();
    unmount();

    await renderizar("rankings");
    expect(screen.queryByText(TITULOS.evolucao)).not.toBeInTheDocument();
  });

  it("explica a fonte e que só se comparam disciplinas do mesmo curso e ano", async () => {
    const { container } = await renderizar("evolucao");

    expect(container).toHaveTextContent("Relatórios de Curso do Enade (Engenharia de Computação");
    expect(container).toHaveTextContent("comparáveis dentro do mesmo curso e ano");
  });

  it("nas listas de mais acertos e erros, a fonte só aparece depois de clicar na edição e some junto", async () => {
    const usuario = userEvent.setup();
    const { container } = await renderizar("rankings");

    expect(container).not.toHaveTextContent("Fonte: INEP");
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    expect(container).toHaveTextContent("Fonte: INEP");
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    expect(container).not.toHaveTextContent("Fonte: INEP");
  });
});
