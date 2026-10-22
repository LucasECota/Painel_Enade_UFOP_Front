import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { API_URL } from "../api";
import { simularApi, simularTela } from "../test/api";
import Edicoes from "./Edicoes";

const cursos = [
  { chave: "ec", nome: "Engenharia de Computação", anos: [2023, 2019, 2017] },
  { chave: "ee", nome: "Engenharia Elétrica", anos: [2023, 2019] }, // a API ainda pode mandar; o site esconde
  { chave: "ep", nome: "Engenharia de Produção", anos: [2023, 2019] },
  { chave: "si", nome: "Sistemas de Informação", anos: [2021, 2017] },
];

const dadosDoCurso = {
  totalQuestoes: 40,
  fg: { total: 10, disciplinas: [] },
  ce: {
    total: 30,
    disciplinas: [
      { nome: "Compiladores I", qtd: 1, assuntos: ["Análise léxica"] },
      { nome: "Redes de Computadores I", qtd: 3, assuntos: ["OSPF", "TCP e UDP"] },
      { nome: "Sem assuntos cadastrados", qtd: 5, assuntos: [] },
    ],
  },
};

const cardDoCurso = (nome) => screen.getByRole("button", { name: new RegExp(nome) });

async function renderizar({ celular = false } = {}) {
  simularTela({ celular });
  const fetchFalso = simularApi({ "/enade/cursos": cursos, "/enade/ec": dadosDoCurso });
  render(<Edicoes />);
  await screen.findByRole("button", { name: /Engenharia de Computação/ });
  return fetchFalso;
}

describe("Edições", () => {
  it("explica o que a página mostra", async () => {
    await renderizar();

    expect(screen.getByRole("heading", { name: "Edições do Enade" })).toBeInTheDocument();
    expect(screen.getByText(/Escolha um curso e uma edição/)).toBeInTheDocument();
  });

  it("mostra só os cursos do AvaliaUFOP, nessa ordem, e esconde Engenharia Elétrica", async () => {
    await renderizar();
    const nomes = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    expect(nomes).toEqual([
      "Engenharia de Computação",
      "Engenharia de Produção",
      "Sistemas de Informação",
    ]);
    expect(screen.queryByText("Engenharia Elétrica")).not.toBeInTheDocument();
  });

  it("ao escolher um curso mostra as duas edições mais recentes", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(cardDoCurso("Computação"));

    expect(screen.getByRole("button", { name: "2023" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2019" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2017" })).not.toBeInTheDocument();
  });

  it("ao escolher o ano busca na API o curso e o ano certos", async () => {
    const usuario = userEvent.setup();
    const fetchFalso = await renderizar();

    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText(/Total de questões: 40/);

    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec?ano=2023`);
  });

  it("ordena as disciplinas pela quantidade de questões e esconde as sem assunto", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Redes de Computadores I");

    const nomes = [...document.querySelectorAll(".disciplina-nome")].map((e) => e.textContent);
    expect(nomes).toEqual(["Redes de Computadores I", "Compiladores I"]); // 3 questões antes de 1; sem assuntos fora
  });

  it("usa 'questão' no singular e 'questões' no plural, sem mostrar a contagem de assuntos", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Redes de Computadores I");

    expect(screen.getByText("3 questões")).toBeInTheDocument();
    expect(screen.getByText("1 questão")).toBeInTheDocument();
    expect(screen.queryByText(/assuntos?$/)).not.toBeInTheDocument();
  });

  it("clicar de novo no curso aberto fecha as opções", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(cardDoCurso("Computação"));
    expect(screen.getByText("Edições com assuntos disponíveis:")).toBeInTheDocument();
    expect(within(cardDoCurso("Computação")).getByText("Fechar ↑")).toBeInTheDocument();

    await usuario.click(cardDoCurso("Computação"));
    expect(screen.queryByText("Edições com assuntos disponíveis:")).not.toBeInTheDocument();
    expect(within(cardDoCurso("Computação")).getByText("Ver edições ↓")).toBeInTheDocument();
  });

  it("trocar de curso fecha o anterior e abre o novo", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(cardDoCurso("Sistemas"));

    expect(within(cardDoCurso("Computação")).getByText("Ver edições ↓")).toBeInTheDocument();
    expect(within(cardDoCurso("Sistemas")).getByText("Fechar ↑")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2021" })).toBeInTheDocument();
  });

  describe("posição do painel de detalhes", () => {
    it("no computador fica abaixo de todos os cards", async () => {
      const usuario = userEvent.setup();
      await renderizar({ celular: false });
      await usuario.click(cardDoCurso("Computação"));

      expect(document.querySelector(".detalhes-curso")).not.toBeInTheDocument();
      const grade = document.querySelector(".card-grid");
      expect(grade.nextElementSibling).toHaveTextContent("Edições com assuntos disponíveis:");
    });

    it("no celular fica logo abaixo do card do curso escolhido e empurra os outros", async () => {
      const usuario = userEvent.setup();
      await renderizar({ celular: true });
      await usuario.click(cardDoCurso("Computação"));

      const painel = document.querySelector(".detalhes-curso");
      expect(painel).toBeInTheDocument();
      expect(painel.previousElementSibling).toBe(cardDoCurso("Computação"));
      expect(painel.nextElementSibling).toBe(cardDoCurso("Produção"));
    });
  });
});
