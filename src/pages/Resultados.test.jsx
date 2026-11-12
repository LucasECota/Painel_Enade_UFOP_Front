import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { API_URL } from "../api";
import { simularApi } from "../test/api";
import Resultados from "./Resultados";
import { baixarPdf } from "../pdf";

// o PDF de verdade é testado em src/pdf: aqui só se confere o botão e o que ele pede
vi.mock("../pdf", () => ({ baixarPdf: vi.fn().mockResolvedValue("arquivo.pdf") }));

const resultados = {
  fonte: "INEP — Relatórios de IES do Enade (teste)",
  cursos: [
    {
      chave: "ec",
      nome: "Engenharia de Computação",
      edicoes: [
        { ano: 2019, conceito: 3, presentes: 51, populacao: 53 },
        { ano: 2023, conceito: 3, presentes: 45, populacao: 51 },
      ],
      comparacao: {
        ano: 2023,
        geral: { curso: 42.3, brasil: 41.2 }, // acima
        formacaoGeral: { curso: 52.8, brasil: 53.2 }, // abaixo
        especifico: { curso: 40, brasil: 40 }, // igual
      },
      perfil: {
        ano: 2023,
        presentes: 45,
        renda: { curso: 37.2, brasil: 27.3 },
        auxilio: { curso: 25.6, brasil: 13.1 },
        bolsa: { curso: 60.5, brasil: 31.2 },
      },
    },
    {
      chave: "si",
      nome: "Sistemas de Informação",
      edicoes: [{ ano: 2021, conceito: 4, presentes: 45, populacao: 51 }],
      comparacao: {
        ano: 2021,
        geral: { curso: 44.9, brasil: 38.3 },
        formacaoGeral: { curso: 41, brasil: 34.9 },
        especifico: { curso: 46.2, brasil: 39.4 },
      },
      perfil: {
        ano: 2021,
        presentes: 45,
        renda: { curso: 45.5, brasil: 37.3 },
        auxilio: { curso: 45.5, brasil: 10.2 },
        bolsa: { curso: 45.5, brasil: 20.9 },
      },
    },
  ],
};

const relatorios = [
  {
    ano: 2023,
    titulo: "Enade 2023 — Relatório da IES",
    descricao: "UFOP, campus João Monlevade",
    tamanhoMb: 3.2,
    arquivo: "enade-2023.pdf",
  },
  {
    ano: 2019,
    titulo: "Enade 2019 — Relatório da IES",
    descricao: "UFOP, campus João Monlevade",
    tamanhoMb: 0.5,
    arquivo: "enade-2019.pdf",
  },
];

async function renderizar() {
  simularApi({ "/resultados": resultados, "/relatorios": relatorios });
  const resultado = render(<Resultados />);
  await screen.findByText("Conceito Enade em cada edição");
  return resultado;
}

const topico = (titulo) => screen.getByText(titulo).closest("details");

describe("Resultados", () => {
  it("lista os cursos do ICEA como botões", async () => {
    await renderizar();

    expect(screen.getByRole("button", { name: "Engenharia de Computação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sistemas de Informação" })).toBeInTheDocument();
  });

  it("mostra os quatro tópicos: os de dados já abertos e os relatórios para baixar fechados", async () => {
    await renderizar();

    for (const titulo of [
      "Conceito Enade em cada edição",
      "Comparação com o Brasil — Enade 2023",
      "Perfil dos concluintes — Enade 2023",
    ]) {
      expect(topico(titulo)).toHaveAttribute("open");
    }
    expect(topico("Relatórios do INEP para baixar")).not.toHaveAttribute("open");
  });

  it("clicar no título esconde um tópico aberto, e clicar nos relatórios abre", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(screen.getByText("Conceito Enade em cada edição"));
    expect(topico("Conceito Enade em cada edição")).not.toHaveAttribute("open");
    expect(topico("Comparação com o Brasil — Enade 2023")).toHaveAttribute("open");

    await usuario.click(screen.getByText("Relatórios do INEP para baixar"));
    expect(topico("Relatórios do INEP para baixar")).toHaveAttribute("open");
  });

  it("tem o botão Baixar PDF, que pede o PDF dos resultados do curso que está na tela", async () => {
    const usuario = userEvent.setup();
    baixarPdf.mockClear();
    await renderizar();

    await usuario.click(screen.getByRole("button", { name: "Baixar PDF desta página" }));
    expect(baixarPdf).toHaveBeenLastCalledWith(
      "resultados",
      expect.objectContaining({ chave: "ec", nome: "Engenharia de Computação" }),
      expect.objectContaining({ fonte: expect.stringContaining("INEP") }),
    );

    // outro curso: o PDF é do outro curso
    await usuario.click(screen.getByRole("button", { name: "Sistemas de Informação" }));
    await usuario.click(screen.getByRole("button", { name: "Baixar PDF desta página" }));
    expect(baixarPdf).toHaveBeenLastCalledWith(
      "resultados",
      expect.objectContaining({ chave: "si" }),
      expect.anything(),
    );
  });

  describe("conceito Enade", () => {
    it("tem, em cima dos conceitos, a frase de que as notas não são comparáveis entre edições", async () => {
      await renderizar();
      const caixa = within(topico("Conceito Enade em cada edição"));
      const frase = caixa.getByText(/as notas do Enade não são comparáveis entre edições/);

      expect(frase).toHaveTextContent("para fazer a sua própria análise");
      // fica antes das colunas de conceito
      const conceitos = document.querySelector(".conceitos");
      expect(
        frase.compareDocumentPosition(conceitos) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("mostra o conceito e só o total de alunos que fizeram a prova", async () => {
      await renderizar();
      const secao = within(topico("Conceito Enade em cada edição"));

      expect(secao.getByText("2023")).toBeInTheDocument();
      expect(secao.getByText("45 alunos")).toBeInTheDocument();
      expect(secao.queryByText(/ de 51/)).not.toBeInTheDocument(); // não mostra a população
    });

    it("não tem a frase explicativa do conceito", async () => {
      const { container } = await renderizar();

      expect(container).not.toHaveTextContent(/O conceito vai de 1 a 5/);
    });
  });

  describe("comparação com o Brasil", () => {
    it("mostra selo 'acima', 'abaixo' ou 'igual' conforme a diferença", async () => {
      await renderizar();
      const secao = within(topico("Comparação com o Brasil — Enade 2023"));

      expect(secao.getByText("▲ 1,1 acima do Brasil")).toBeInTheDocument();
      expect(secao.getByText("▼ 0,4 abaixo do Brasil")).toBeInTheDocument();
      expect(secao.getByText("igual ao Brasil")).toBeInTheDocument();
    });

    it("mostra as médias do ICEA e do Brasil com uma casa decimal", async () => {
      await renderizar();
      const secao = within(topico("Comparação com o Brasil — Enade 2023"));

      expect(secao.getByText("42,3")).toBeInTheDocument();
      expect(secao.getByText("41,2")).toBeInTheDocument();
    });
  });

  describe("perfil dos concluintes", () => {
    it("mostra os percentuais arredondados, o do curso e o do Brasil", async () => {
      await renderizar();
      const secao = within(topico("Perfil dos concluintes — Enade 2023"));
      const cartao = (titulo) => within(secao.getByText(titulo).closest(".card"));

      expect(
        cartao("Renda familiar de até 3 salários mínimos").getByText("No Brasil: 27%"),
      ).toBeInTheDocument();
      expect(
        secao
          .getByText("Renda familiar de até 3 salários mínimos")
          .closest(".card")
          .querySelector(".perfil-valor"),
      ).toHaveTextContent("37%");
      // 60,5 arredonda para 61
      expect(
        secao
          .getByText("Receberam bolsa acadêmica")
          .closest(".card")
          .querySelector(".perfil-valor"),
      ).toHaveTextContent("61%");
      expect(secao.getByText(/Entre os 45 concluintes/)).toBeInTheDocument();
    });

    it("não tem o aviso sobre poucos concluintes", async () => {
      const { container } = await renderizar();

      expect(container).not.toHaveTextContent(/poucos concluintes/);
    });
  });

  it("trocar de curso atualiza todos os blocos e mantém como o leitor deixou cada tópico", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(screen.getByText("Conceito Enade em cada edição")); // esconde o tópico
    await usuario.click(screen.getByRole("button", { name: "Sistemas de Informação" }));

    // títulos acompanham o ano dos dados do curso novo (2021 para Sistemas)
    expect(screen.getByText("Comparação com o Brasil — Enade 2021")).toBeInTheDocument();
    expect(screen.getByText("Perfil dos concluintes — Enade 2021")).toBeInTheDocument();
    expect(within(topico("Conceito Enade em cada edição")).getByText("2021")).toBeInTheDocument();
    // o tópico continua escondido, como o leitor deixou, e os outros continuam abertos
    expect(topico("Conceito Enade em cada edição")).not.toHaveAttribute("open");
    expect(topico("Perfil dos concluintes — Enade 2021")).toHaveAttribute("open");
  });

  describe("relatórios do INEP", () => {
    it("explica a sigla IES", async () => {
      const { container } = await renderizar();

      expect(container).toHaveTextContent("IES significa Instituição de Educação Superior");
      expect(container).toHaveTextContent("Relatórios de IES (Instituição de Educação Superior)");
    });

    it("cada relatório tem um link de download para o ano certo", async () => {
      await renderizar();
      const secao = within(topico("Relatórios do INEP para baixar"));
      const links = within(secao.getByRole("list", { name: "Relatórios da IES" })).getAllByRole(
        "link",
        { name: "Baixar PDF" },
      );

      expect(links.map((l) => l.getAttribute("href"))).toEqual([
        `${API_URL}/relatorios/2023/download`,
        `${API_URL}/relatorios/2019/download`,
      ]);
    });

    it("não oferece relatórios de curso para baixar (eles ficam em Acertos por questão), nos cursos", async () => {
      const usuario = userEvent.setup();
      await renderizar();

      for (const nome of ["Engenharia de Computação", "Sistemas de Informação"]) {
        await usuario.click(screen.getByRole("button", { name: nome }));
        const secao = within(topico("Relatórios do INEP para baixar"));
        expect(
          secao.queryByRole("heading", { name: /Relatórios de curso/ }),
        ).not.toBeInTheDocument();
        expect(secao.queryByRole("list", { name: "Relatórios de curso" })).not.toBeInTheDocument();
        // os relatórios de IES continuam
        expect(secao.getByRole("list", { name: "Relatórios da IES" })).toBeInTheDocument();
      }
    });

    it("mostra o tamanho do arquivo com vírgula", async () => {
      await renderizar();

      expect(screen.getByText(/PDF, 3,2 MB/)).toBeInTheDocument();
      expect(screen.getByText(/PDF, 0,5 MB/)).toBeInTheDocument();
    });

    it("não tem mais os botões de filtro por ano", async () => {
      await renderizar();

      expect(screen.queryByRole("button", { name: "Todos" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "2023" })).not.toBeInTheDocument();
    });
  });

  it("avisa quando a API não responde", async () => {
    simularApi({});
    render(<Resultados />);

    expect(await screen.findByText("Não foi possível carregar os resultados.")).toBeInTheDocument();
  });
});
