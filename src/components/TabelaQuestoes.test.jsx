import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { API_URL } from "../api";
import { simularApi } from "../test/api";
import TabelaQuestoes from "./TabelaQuestoes";

const valida = (numero, curso, brasil, extra = {}) => ({
  numero,
  disciplina: "Redes de Computadores I",
  tema: `Tema da questão ${numero}`,
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
  screen.getByText(String(numero), { selector: "td.questao-numero" }).closest("tr");

describe("TabelaQuestoes", () => {
  it("mostra um bloco para Formação Geral e outro para Componente Específico", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);

    expect(await screen.findByText("Formação Geral", { selector: "summary" })).toBeInTheDocument();
    expect(screen.getByText("Componente Específico", { selector: "summary" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acertos por questão — Enade 2023" }),
    ).toBeInTheDocument();
  });

  it("busca a tabela do curso e do ano mais recente", async () => {
    const fetchFalso = simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023, 2019]} />);

    await screen.findByText("Tema da questão 10");
    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/questoes?ano=2023`);
  });

  it("depois do número da questão vêm as colunas de disciplina e tema", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await screen.findByText("Tema da questão 10");

    const celulas = [...linha(10).querySelectorAll("td")].map((c) => c.textContent);
    expect(celulas.slice(0, 3)).toEqual(["10", "Redes de Computadores I", "Tema da questão 10"]);
  });

  it("mostra por padrão só o curso, o Brasil e o gabarito, com vírgula e uma casa decimal", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await screen.findByText("Tema da questão 10");

    const celulas = [...linha(10).querySelectorAll("td")].map((c) => c.textContent);
    expect(celulas).toEqual([
      "10",
      "Redes de Computadores I",
      "Tema da questão 10",
      "31,1",
      "38,2",
      "C",
    ]);
    expect(screen.queryByRole("columnheader", { name: "UF" })).not.toBeInTheDocument();
  });

  it("'Ver todas as colunas' acrescenta UF, região, categoria, organização e as respostas A–E", async () => {
    const usuario = userEvent.setup();
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await screen.findByText("Tema da questão 10");

    await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

    for (const titulo of [
      "UF",
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
      "10",
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
    await screen.findByText("Tema da questão 10");
    await usuario.click(screen.getByRole("button", { name: "Ver todas as colunas" }));

    expect(linha(10).querySelectorAll("td.certa")).toHaveLength(1);
    expect(linha(10).querySelector("td.certa")).toHaveTextContent("31,1");
  });

  it("destaca em cor discreta se o curso ficou acima ou abaixo do Brasil", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await screen.findByText("Tema da questão 10");

    expect(within(linha(10)).getByText("31,1")).toHaveClass("curso-abaixo");
    expect(within(linha(11)).getByText("44,4")).toHaveClass("curso-acima");
  });

  it("questão sem disciplina ou tema mostra um traço", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await screen.findByText("Tema da questão 10");

    const celulas = [...linha(1).querySelectorAll("td")].map((c) => c.textContent);
    expect(celulas.slice(0, 3)).toEqual(["1", "—", "—"]);
  });

  it("questão desconsiderada ou anulada não mostra percentuais e tem o motivo no lugar do gabarito", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
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
    await screen.findByText("Tema da questão 10");

    expect(container).toHaveTextContent(
      "Desconsiderada: o INEP deixou a questão fora do cálculo da nota",
    );
    expect(container).toHaveTextContent("Anulada: anulada pela comissão");
    expect(container).toHaveTextContent("Fonte: INEP — fonte de teste.");
  });

  it("com mais de um ano, mostra os botões e troca a tabela ao escolher outro ano", async () => {
    const usuario = userEvent.setup();
    const fetchFalso = simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023, 2019]} />);
    await screen.findByText("Tema da questão 10");

    await usuario.click(screen.getByRole("button", { name: "2019" }));

    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/questoes?ano=2019`);
  });

  it("com um ano só, não mostra botões de ano", async () => {
    simularApi({ "/enade/ec/questoes": tabela() });
    render(<TabelaQuestoes chave="ec" anos={[2023]} />);
    await screen.findByText("Tema da questão 10");

    expect(screen.queryByRole("button", { name: "2023" })).not.toBeInTheDocument();
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

    expect(
      await screen.findByText("Não foi possível carregar a tabela de questões."),
    ).toBeInTheDocument();
  });
});
