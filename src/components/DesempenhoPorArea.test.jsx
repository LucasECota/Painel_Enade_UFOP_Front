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
  evolucao: "Desempenho de cada área ao longo das edições",
  rankings: "Áreas e temas com mais acertos e mais erros",
};

// cada parte é uma subpágina: renderiza só a que foi pedida
async function renderizar(parte) {
  simularApi({ "/enade/ec/desempenho-areas": dados });
  const resultado = render(<DesempenhoPorArea chave="ec" anos={[2023, 2017]} parte={parte} />);
  await screen.findByText(TITULOS[parte]);
  return resultado;
}

const evolucao = () => within(screen.getByRole("table"));

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

  describe("evolução por área", () => {
    it("tem uma coluna por edição, da mais antiga para a mais recente", async () => {
      await renderizar("evolucao");
      const tabela = screen.getAllByRole("table")[0];
      const colunas = within(tabela)
        .getAllByRole("columnheader")
        .map((c) => c.textContent);

      expect(colunas).toEqual(["Área", "2017", "2023"]);
    });

    it("mostra o acerto da UFOP e a diferença para o Brasil, sem o número de questões", async () => {
      await renderizar("evolucao");
      const linha = evolucao().getByText("Redes de Computadores I").closest("tr");
      const celulas = within(linha).getAllByRole("cell");

      expect(celulas[1]).toHaveTextContent("45,0"); // 2017
      expect(celulas[1]).toHaveTextContent("▼ 10,0");
      expect(celulas[2]).toHaveTextContent("60,0"); // 2023
      expect(celulas[2]).toHaveTextContent("▲ 10,0");
      expect(celulas[2]).not.toHaveTextContent("questões"); // a tabela não mostra o número de questões
      expect(celulas[2]).toHaveClass("curso-acima");
      expect(celulas[1]).toHaveClass("curso-abaixo");
    });

    it("edição em que a área não apareceu fica com traço", async () => {
      await renderizar("evolucao");
      const linha = evolucao().getByText("Circuitos Elétricos I").closest("tr");

      expect(within(linha).getAllByRole("cell")[1]).toHaveTextContent("—");
    });

    it("alterna entre Componente Específico e Formação Geral", async () => {
      const usuario = userEvent.setup();
      await renderizar("evolucao");

      expect(evolucao().queryByText("Sociologia")).not.toBeInTheDocument();
      await usuario.click(screen.getByRole("button", { name: "Formação Geral" }));
      expect(evolucao().getByText("Sociologia")).toBeInTheDocument();
      expect(evolucao().queryByText("Redes de Computadores I")).not.toBeInTheDocument();
    });

    it("área igual ao Brasil não mostra seta", async () => {
      const usuario = userEvent.setup();
      await renderizar("evolucao");
      await usuario.click(screen.getByRole("button", { name: "Formação Geral" }));

      expect(screen.getByText("igual ao Brasil")).toBeInTheDocument();
    });
  });

  describe("mais acertos e mais erros por edição", () => {
    const abrirEdicao = (ano) => userEvent.click(screen.getByRole("button", { name: String(ano) }));
    const lista = (titulo) => screen.getByRole("heading", { name: titulo }).closest("div");
    const nomes = (titulo) =>
      within(lista(titulo))
        .getAllByRole("row")
        .slice(1)
        .map((tr) => within(tr).getAllByRole("cell")[0].textContent);

    it("só mostra as listas depois de clicar numa edição, e clicar de novo esconde", async () => {
      const usuario = userEvent.setup();
      await renderizar("rankings");

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      await abrirEdicao(2023);
      expect(screen.getAllByRole("table")).toHaveLength(4);
      await usuario.click(screen.getByRole("button", { name: "2023" }));
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("mostra os temas do maior para o menor acerto na edição clicada", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);

      expect(nomes("Temas com mais acertos (% de acerto)")[0]).toMatch(/^OSPF/);
      expect(nomes("Temas com mais erros (% de erro)")[0]).toMatch(/^Kirchhoff/);
    });

    it("as listas de erros mostram os acertos da UFOP e do Brasil (a pior área ou tema primeiro)", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);
      const primeira = within(lista("Temas com mais erros (% de erro)")).getAllByRole("row")[1];
      const celulas = within(primeira).getAllByRole("cell");

      expect(celulas).toHaveLength(3);
      expect(celulas[1]).toHaveTextContent("20,0"); // acerto da UFOP
      expect(celulas[2]).toHaveTextContent("30,0"); // acerto do Brasil
    });

    it("os cabeçalhos dizem se a coluna é de acertos ou de erros", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);

      const cabecalhos = (titulo) =>
        within(lista(titulo))
          .getAllByRole("columnheader")
          .map((c) => c.textContent);

      expect(cabecalhos("Áreas com mais acertos (% de acerto)")).toEqual([
        "Área",
        "Acertos UFOP",
        "Acertos Brasil",
      ]);
      // a lista de erros também mostra só acertos, para não confundir
      expect(cabecalhos("Temas com mais erros (% de erro)")).toEqual([
        "Tema",
        "Acertos UFOP",
        "Acertos Brasil",
      ]);
    });

    it("nenhuma tabela tem coluna de erros, e a frase de instrução não existe mais", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);

      expect(screen.queryByText(/Erros/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Clique numa edição/)).not.toBeInTheDocument();
    });

    it("as áreas informam o componente e quantas questões têm", async () => {
      await renderizar("rankings");
      await abrirEdicao(2023);
      const redes = within(lista("Áreas com mais acertos (% de acerto)")).getByText(/^2 questões$/);

      expect(redes).toBeInTheDocument();
    });

    it("as listas são do componente escolhido: Formação Geral e Componente Específico não se misturam", async () => {
      const usuario = userEvent.setup();
      await renderizar("rankings");
      await abrirEdicao(2023);

      // começa pelo Componente Específico: a área de Formação Geral não aparece
      expect(nomes("Áreas com mais acertos (% de acerto)")).toEqual([
        expect.stringMatching(/^Redes de Computadores I/),
        expect.stringMatching(/^Circuitos Elétricos I/),
      ]);
      expect(screen.queryByText("Desigualdade")).not.toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "Formação Geral" }));
      expect(nomes("Áreas com mais acertos (% de acerto)")).toEqual([
        expect.stringMatching(/^Sociologia/),
      ]);
      expect(nomes("Temas com mais acertos (% de acerto)")).toEqual([
        expect.stringMatching(/^Desigualdade/),
      ]);
    });

    it("trocar a edição troca as listas", async () => {
      const usuario = userEvent.setup();
      await renderizar("rankings");
      await abrirEdicao(2023);
      await usuario.click(screen.getByRole("button", { name: "2017" }));

      expect(nomes("Temas com mais acertos (% de acerto)")).toEqual([
        expect.stringMatching(/^Firewall/),
      ]);
    });
  });

  it("cada subpágina mostra só a sua parte", async () => {
    const { unmount } = await renderizar("evolucao");
    expect(screen.queryByText(TITULOS.rankings)).not.toBeInTheDocument();
    unmount();

    await renderizar("rankings");
    expect(screen.queryByText(TITULOS.evolucao)).not.toBeInTheDocument();
  });

  it("explica a fonte e que só se comparam áreas do mesmo curso e ano", async () => {
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
