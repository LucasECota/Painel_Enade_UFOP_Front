import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { API_URL } from "../api";
import { limparCacheDoDesempenho } from "../desempenhoCache";
import { simularApi, simularTela } from "../test/api";
import Edicoes from "./Edicoes";

const cursos = [
  {
    chave: "ec",
    nome: "Engenharia de Computação",
    anos: [2023, 2019, 2017],
    anosComAssuntos: [2023, 2017], // 2019 não tem assuntos: o site só mostra as edições que a API indicar
    anosComQuestoes: [2023],
  },
  { chave: "ee", nome: "Engenharia Elétrica", anos: [2023, 2019] }, // a API ainda pode mandar; o site esconde
  { chave: "ep", nome: "Engenharia de Produção", anos: [2023, 2019], anosComQuestoes: [2023] },
  { chave: "si", nome: "Sistemas de Informação", anos: [2021, 2017], anosComQuestoes: [] },
];

const dadosDoCurso = {
  totalQuestoes: 40,
  fg: {
    total: 10,
    discursivas: 2,
    disciplinas: [
      { nome: "Sociologia", qtd: 2, assuntos: ["Desigualdade social", "Gênero e trabalho"] },
    ],
  },
  ce: {
    total: 30,
    discursivas: 3,
    disciplinas: [
      { nome: "Compiladores I", qtd: 1, assuntos: ["Análise léxica"] },
      {
        nome: "Redes de Computadores I",
        qtd: 3,
        assuntos: ["OSPF", "TCP e UDP"],
        questoes: [
          {
            id: "11",
            tipo: "objetiva",
            tema: "OSPF",
            gabarito: "C",
            situacao: "valida",
            imagem: "2023/ec-11.webp",
          },
          {
            id: "12",
            tipo: "objetiva",
            tema: "TCP e UDP",
            gabarito: null,
            situacao: "anulada",
            imagem: "2023/ec-12.webp",
          },
        ],
      },
      {
        nome: "Algoritmos e Estruturas de Dados I",
        qtd: 2,
        discursivas: 1,
        assuntos: ["Busca binária", "Pilhas e filas"],
      },
      { nome: "Sem assuntos cadastrados", qtd: 5, assuntos: [] },
    ],
  },
};

const tabelaDeQuestoes = {
  curso: "ec",
  ano: 2023,
  fonte: "INEP — fonte de teste",
  componentes: [
    {
      tipo: "especifico",
      titulo: "Componente Específico",
      questoes: [
        {
          numero: 11,
          disciplina: "Redes de Computadores I",
          tema: "Protocolo OSPF e algoritmo de Dijkstra",
          situacao: "valida",
          gabarito: "C",
          acertos: {
            curso: 44.4,
            uf: 36.6,
            regiao: 30.7,
            catAdm: 37.0,
            orgAcad: 34.2,
            brasil: 33.4,
          },
          respostas: { A: 4.4, B: 15.6, C: 44.4, D: 22.2, E: 13.3, SI: 0 },
        },
      ],
    },
  ],
};

const cardDoCurso = (nome) => screen.getByRole("button", { name: new RegExp(nome) });

async function renderizar({ celular = false } = {}) {
  simularTela({ celular });
  const fetchFalso = simularApi({
    "/enade/cursos": cursos,
    "/enade/ec/desempenho-areas": {
      curso: "ec",
      nome: "Engenharia de Computação",
      edicoes: [2023],
      porEdicao: [
        {
          ano: 2023,
          areas: [
            { componente: "especifico", disciplina: "Redes", questoes: 1, ufop: 50, brasil: 40 },
          ],
          temas: [],
        },
      ],
    },
    "/enade/ec/questoes": tabelaDeQuestoes,
    "/enade/ec": dadosDoCurso,
  });
  render(<Edicoes />);
  await screen.findByRole("button", { name: /Engenharia de Computação/ });
  return fetchFalso;
}

describe("Edições", () => {
  beforeEach(() => limparCacheDoDesempenho());

  it("explica o que a página mostra", async () => {
    await renderizar();

    expect(screen.getByRole("heading", { name: "Edições do Enade" })).toBeInTheDocument();
    expect(screen.getByText(/Escolha um curso para ver o que o Enade cobrou/)).toBeInTheDocument();
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

  it("ao escolher um curso mostra todas as edições que têm assuntos", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(cardDoCurso("Computação"));

    expect(screen.getByRole("button", { name: "2023" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2017" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2019" })).not.toBeInTheDocument();
  });

  it("se a API não informar as edições com assuntos, usa as duas mais recentes", async () => {
    const usuario = userEvent.setup();
    await renderizar();

    await usuario.click(cardDoCurso("Sistemas"));

    expect(screen.getByRole("button", { name: "2021" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2017" })).toBeInTheDocument();
  });

  it("ao escolher o ano busca na API o curso e o ano certos", async () => {
    const usuario = userEvent.setup();
    const fetchFalso = await renderizar();

    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText(/Total de questões: 40/);

    expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec?ano=2023`);
  });

  it("clicar de novo no mesmo ano esconde o conteúdo dos assuntos", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));

    expect(screen.queryByText(/Total de questões/)).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText(/Total de questões: 40/);

    await usuario.click(screen.getByRole("button", { name: "2023" }));
    expect(screen.queryByText(/Total de questões/)).not.toBeInTheDocument();
    expect(document.querySelector(".disciplinas")).toBeNull();
  });

  it("mostra quantas questões são objetivas e quantas são discursivas, no total e em cada componente", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));

    const total = await screen.findByText("Total de questões: 40");
    expect(total).toHaveTextContent(/^Total de questões: 40$/);
    expect(screen.getByText(/^Formação Geral: 10/)).toHaveTextContent(
      "Formação Geral: 10 (8 objetivas e 2 discursivas)",
    );
    expect(screen.getByText(/^Componente Específico: 30/)).toHaveTextContent(
      "Componente Específico: 30 (27 objetivas e 3 discursivas)",
    );
  });

  describe("troca de ano sem piscar", () => {
    // Respostas controladas à mão: cada pedido de ?ano=... só responde quando o teste mandar
    function apiComRespostasManuais() {
      simularTela({ celular: false });
      const pendentes = {};
      vi.stubGlobal(
        "fetch",
        vi.fn((url) => {
          const u = String(url);
          const responder = (dados) =>
            Promise.resolve({ ok: true, json: () => Promise.resolve(dados) });
          if (u.endsWith("/enade/cursos")) return responder(cursos);
          const ano = u.match(/\?ano=(\d+)/)?.[1];
          return new Promise((resolve) => {
            pendentes[ano] = () => resolve({ ok: true, json: () => Promise.resolve(dadosDoCurso) });
          });
        }),
      );
      return pendentes;
    }

    it("ao trocar de ano, o conteúdo do ano anterior fica na tela (com o título do ano certo) até o novo chegar", async () => {
      const usuario = userEvent.setup();
      const pendentes = apiComRespostasManuais();
      render(<Edicoes />);
      await screen.findByRole("button", { name: /Engenharia de Computação/ });
      await usuario.click(cardDoCurso("Computação"));

      await usuario.click(screen.getByRole("button", { name: "2023" }));
      pendentes["2023"]();
      expect(
        await screen.findByText("Disciplinas (Componente Específico) — 2023"),
      ).toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "2017" }));

      // a resposta de 2017 ainda não chegou: o conteúdo de 2023 continua (sem a página encolher)
      expect(screen.getByText("Disciplinas (Componente Específico) — 2023")).toBeInTheDocument();
      expect(document.querySelector(".carregando")).not.toBeNull();

      pendentes["2017"]();
      expect(
        await screen.findByText("Disciplinas (Componente Específico) — 2017"),
      ).toBeInTheDocument();
      expect(document.querySelector(".carregando")).toBeNull();
    });

    it("uma resposta atrasada de outro ano não sobrescreve a do ano clicado por último", async () => {
      const usuario = userEvent.setup();
      const pendentes = apiComRespostasManuais();
      render(<Edicoes />);
      await screen.findByRole("button", { name: /Engenharia de Computação/ });
      await usuario.click(cardDoCurso("Computação"));

      await usuario.click(screen.getByRole("button", { name: "2023" }));
      await usuario.click(screen.getByRole("button", { name: "2017" }));
      pendentes["2017"]();
      await screen.findByText("Disciplinas (Componente Específico) — 2017");

      pendentes["2023"](); // a resposta de 2023 chega atrasada
      await waitFor(() => {
        expect(screen.getByText("Disciplinas (Componente Específico) — 2017")).toBeInTheDocument();
      });
      expect(
        screen.queryByText("Disciplinas (Componente Específico) — 2023"),
      ).not.toBeInTheDocument();
    });

    it("clicar de novo no mesmo ano esconde tudo na hora, sem esperar a rede", async () => {
      const usuario = userEvent.setup();
      const pendentes = apiComRespostasManuais();
      render(<Edicoes />);
      await screen.findByRole("button", { name: /Engenharia de Computação/ });
      await usuario.click(cardDoCurso("Computação"));
      await usuario.click(screen.getByRole("button", { name: "2023" }));
      pendentes["2023"]();
      await screen.findByText("Disciplinas (Componente Específico) — 2023");

      await usuario.click(screen.getByRole("button", { name: "2023" }));

      expect(screen.queryByText(/Disciplinas \(/)).not.toBeInTheDocument();
    });
  });

  it("ordena as disciplinas pela quantidade de questões e esconde as sem assunto", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Redes de Computadores I");

    const nomes = [...document.querySelectorAll(".disciplina-nome")].map((e) => e.textContent);
    // Formação Geral primeiro; no Componente Específico, 3 questões, depois 2, depois 1;
    // a disciplina sem assuntos fica de fora
    expect(nomes).toEqual([
      "Sociologia",
      "Redes de Computadores I",
      "Algoritmos e Estruturas de Dados I",
      "Compiladores I",
    ]);
  });

  it("mostra as disciplinas e os assuntos da Formação Geral antes das do Componente Específico", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Sociologia");

    const titulos = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
      .filter((t) => t.startsWith("Disciplinas ("));
    expect(titulos).toEqual([
      "Disciplinas (Formação Geral) — 2023",
      "Disciplinas (Componente Específico) — 2023",
    ]);
    expect(screen.getByText("Gênero e trabalho")).toBeInTheDocument();
  });

  it("mostra o selo de discursiva na caixa, mesmo fechada, só nas disciplinas que têm", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Redes de Computadores I");

    expect(screen.getAllByText("1 discursiva")).toHaveLength(1);
    const aed = screen.getByText("Algoritmos e Estruturas de Dados I").closest("details");
    expect(aed).toHaveTextContent("1 discursiva");
    expect(document.querySelector(".discursivas-resumo")).toBeNull();
  });

  it("separa os assuntos das questões discursivas e das objetivas", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Redes de Computadores I");

    const aed = screen.getByText("Algoritmos e Estruturas de Dados I").closest("details");
    const grupos = [...aed.querySelectorAll(".grupo-questoes, li")].map((e) => e.textContent);
    expect(grupos).toEqual(["Discursiva", "Busca binária", "Objetiva", "Pilhas e filas"]);

    // sem discursiva, a lista continua sem títulos
    const redes = screen.getByText("Redes de Computadores I").closest("details");
    expect(redes.querySelector(".grupo-questoes")).toBeNull();
  });

  it("cada tema tem o botão 'Ver questão', que mostra a imagem e o gabarito", async () => {
    const usuario = userEvent.setup();
    await renderizar();
    await usuario.click(cardDoCurso("Computação"));
    await usuario.click(screen.getByRole("button", { name: "2023" }));
    await screen.findByText("Redes de Computadores I");

    const redes = screen.getByText("Redes de Computadores I").closest("details");
    const botoes = within(redes).getAllByRole("button", { name: "Ver questão" });
    expect(botoes).toHaveLength(2);

    await usuario.click(botoes[0]);
    const janela = screen.getByRole("dialog", { name: /Questão 11/ });
    expect(within(janela).getByRole("img")).toHaveAttribute(
      "src",
      `${API_URL}/enade/imagens/2023/ec-11.webp`,
    );
    expect(within(janela).getByText("Gabarito: C")).toBeInTheDocument();

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    // sem "questoes" na API (outras disciplinas) não aparece botão
    const compiladores = screen.getByText("Compiladores I").closest("details");
    expect(within(compiladores).queryByRole("button", { name: "Ver questão" })).toBeNull();
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

  describe("subtópicos do curso", () => {
    it("ao escolher um curso aparecem os quatro subtópicos, com os assuntos como padrão", async () => {
      const usuario = userEvent.setup();
      await renderizar();
      await usuario.click(cardDoCurso("Computação"));

      const assuntos = screen.getByRole("button", { name: "Assuntos por disciplina" });
      const questoes = screen.getByRole("button", { name: "Acertos por questão" });
      expect(assuntos).toHaveAttribute("aria-pressed", "true");
      expect(questoes).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Evolução por disciplina" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mais acertos e erros" })).toBeInTheDocument();

      expect(screen.getByText("Edições com assuntos disponíveis:")).toBeInTheDocument();
    });

    it("'Acertos por questão' só mostra a tabela depois de clicar no ano, e esconde os assuntos", async () => {
      const usuario = userEvent.setup();
      const fetchFalso = await renderizar();
      await usuario.click(cardDoCurso("Computação"));
      await usuario.click(screen.getByRole("button", { name: "Acertos por questão" }));

      // só os botões de ano: a tabela espera o clique
      expect(screen.getByText("Edições com a tabela disponível:")).toBeInTheDocument();
      expect(screen.queryByText("Protocolo OSPF e algoritmo de Dijkstra")).not.toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "2023" }));
      expect(await screen.findByText("Protocolo OSPF e algoritmo de Dijkstra")).toBeInTheDocument();
      expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/questoes?ano=2023`);
      expect(screen.queryByText("Edições com assuntos disponíveis:")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Acertos por questão" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("'Evolução por disciplina' e 'Mais acertos e erros' são subpáginas separadas, cada uma com a sua parte", async () => {
      const usuario = userEvent.setup();
      const fetchFalso = await renderizar();
      await usuario.click(cardDoCurso("Computação"));

      await usuario.click(screen.getByRole("button", { name: "Evolução por disciplina" }));
      expect(
        await screen.findByText("Desempenho de cada disciplina ao longo das edições"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Disciplinas e temas com mais acertos e mais erros"),
      ).not.toBeInTheDocument();
      expect(fetchFalso).toHaveBeenCalledWith(`${API_URL}/enade/ec/desempenho-areas`);
      expect(screen.queryByText("Edições com assuntos disponíveis:")).not.toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "Mais acertos e erros" }));
      expect(
        await screen.findByText("Disciplinas e temas com mais acertos e mais erros"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Desempenho de cada disciplina ao longo das edições"),
      ).not.toBeInTheDocument();
    });

    it("o desempenho por disciplina é buscado já ao escolher o curso e só uma vez, então trocar de subtópico não pisca", async () => {
      const usuario = userEvent.setup();
      const fetchFalso = await renderizar();
      const pedidosDoDesempenho = () =>
        fetchFalso.mock.calls.filter(([url]) => String(url).includes("/desempenho-areas")).length;

      await usuario.click(cardDoCurso("Computação"));
      expect(pedidosDoDesempenho()).toBe(1); // antes de abrir qualquer subtópico

      await usuario.click(screen.getByRole("button", { name: "Evolução por disciplina" }));
      await screen.findByText("Desempenho de cada disciplina ao longo das edições");
      await usuario.click(screen.getByRole("button", { name: "Mais acertos e erros" }));
      // a tela já nasce completa, sem passar por um estado vazio
      expect(
        screen.getByText("Disciplinas e temas com mais acertos e mais erros"),
      ).toBeInTheDocument();
      await usuario.click(screen.getByRole("button", { name: "Evolução por disciplina" }));
      expect(
        screen.getByText("Desempenho de cada disciplina ao longo das edições"),
      ).toBeInTheDocument();

      expect(pedidosDoDesempenho()).toBe(1);
    });

    it("dá para voltar para 'Assuntos por disciplina'", async () => {
      const usuario = userEvent.setup();
      await renderizar();
      await usuario.click(cardDoCurso("Computação"));
      await usuario.click(screen.getByRole("button", { name: "Acertos por questão" }));
      await usuario.click(screen.getByRole("button", { name: "Assuntos por disciplina" }));

      expect(screen.getByText("Edições com assuntos disponíveis:")).toBeInTheDocument();
      expect(screen.queryByText("Protocolo OSPF e algoritmo de Dijkstra")).not.toBeInTheDocument();
    });

    it("curso sem tabela avisa que ainda não está disponível", async () => {
      const usuario = userEvent.setup();
      await renderizar();
      await usuario.click(cardDoCurso("Sistemas"));
      await usuario.click(screen.getByRole("button", { name: "Acertos por questão" }));

      expect(screen.getByText(/ainda não está disponível para este curso/)).toBeInTheDocument();
    });

    it("a escolha do subtópico continua ao trocar de curso", async () => {
      const usuario = userEvent.setup();
      await renderizar();
      await usuario.click(cardDoCurso("Computação"));
      await usuario.click(screen.getByRole("button", { name: "Acertos por questão" }));
      await usuario.click(cardDoCurso("Sistemas"));

      expect(screen.getByRole("button", { name: "Acertos por questão" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  describe("posição do painel de detalhes", () => {
    it("no computador fica abaixo de todos os cards", async () => {
      const usuario = userEvent.setup();
      await renderizar({ celular: false });
      await usuario.click(cardDoCurso("Computação"));

      expect(document.querySelector(".detalhes-curso")).not.toBeInTheDocument();
      const grade = document.querySelector(".card-grid");
      // logo abaixo da grade vêm os dois subtópicos, e depois o conteúdo do curso
      expect(grade.nextElementSibling).toHaveClass("subtopicos");
      expect(grade.parentElement).toHaveTextContent("Edições com assuntos disponíveis:");
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
