import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { simularApi } from "../test/api";
import Desempenho from "./Desempenho";

const atividades = (a, b, c) => [
  { nome: "Teste o seu conhecimento", realizada: true, aproveitamento: a },
  { nome: "Formação Geral (objetivas)", realizada: true, aproveitamento: b },
  { nome: "Componente Específico (objetivas)", realizada: c > 0, aproveitamento: c },
  { nome: "Média geral", realizada: true, aproveitamento: 60 },
];

const cursos = [
  {
    chave: "ec",
    nome: "Engenharia de Computação",
    inscritos: 5,
    concluintes: 1,
    aprovados: 1,
    media: 94,
    atividades: atividades(100, 100, 67),
  },
  {
    chave: "ep",
    nome: "Engenharia de Produção",
    inscritos: 4,
    concluintes: 0,
    aprovados: 0,
    media: 55,
    atividades: atividades(100, 40, 0),
  },
  {
    chave: "si",
    nome: "Sistemas de Informação",
    inscritos: 10,
    concluintes: 0,
    aprovados: 0,
    media: 88,
    atividades: atividades(90, 80, 0),
  },
];

// "Média geral" também é o nome de uma barra: pega só o rótulo do cartão
const kpi = (rotulo) =>
  screen
    .getAllByText(rotulo)
    .find((el) => el.classList.contains("kpi-rotulo"))
    .closest(".kpi");

describe("Desempenho", () => {
  it("mostra inscritos, concluintes e média do primeiro curso", async () => {
    simularApi({ "/desempenho": cursos });
    render(<Desempenho />);

    expect(await screen.findByText("Inscritos")).toBeInTheDocument();
    expect(within(kpi("Inscritos")).getByText("5")).toBeInTheDocument();
    expect(within(kpi("Concluíram")).getByText("1")).toBeInTheDocument();
    expect(within(kpi("Média geral")).getByText("94%")).toBeInTheDocument();
  });

  it("não mostra mais o cartão de aprovados", async () => {
    simularApi({ "/desempenho": cursos });
    render(<Desempenho />);

    await screen.findByText("Inscritos");
    expect(screen.queryByText(/Aprovados/)).not.toBeInTheDocument();
  });

  it("troca os números ao escolher outro curso", async () => {
    const usuario = userEvent.setup();
    simularApi({ "/desempenho": cursos });
    render(<Desempenho />);

    await usuario.click(await screen.findByRole("button", { name: "Sistemas de Informação" }));

    expect(within(kpi("Inscritos")).getByText("10")).toBeInTheDocument();
    expect(within(kpi("Média geral")).getByText("88%")).toBeInTheDocument();
  });

  it("desenha cada barra com a largura do aproveitamento", async () => {
    simularApi({ "/desempenho": cursos });
    const { container } = render(<Desempenho />);

    await screen.findByText("Inscritos");
    const larguras = [...container.querySelectorAll(".barra")].map((b) => b.style.width);
    expect(larguras).toEqual(["100%", "100%", "67%", "60%"]);
  });

  it("barra a partir de 60% é da cor 'ok'; abaixo de 60% é 'baixo'", async () => {
    simularApi({ "/desempenho": cursos });
    const { container } = render(<Desempenho />);
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Engenharia de Produção" }));

    const classes = [...container.querySelectorAll(".barra")].map((b) =>
      b.classList.contains("ok") ? "ok" : "baixo",
    );
    // 100 → ok, 40 → baixo, 0 → baixo, 60 (exatamente no limite) → ok
    expect(classes).toEqual(["ok", "baixo", "baixo", "ok"]);
  });

  it("atividade sem dados aparece com 0% e sem texto extra", async () => {
    simularApi({ "/desempenho": cursos });
    const { container } = render(<Desempenho />);
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Engenharia de Produção" }));

    const linha = screen.getByText("Componente Específico (objetivas)").closest("li");
    expect(within(linha).getByText("0%")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/ainda não foi feito/i);
  });

  it("mostra o rótulo 60% com o 'ou' centralizado nos dígitos (o % fica à parte)", async () => {
    simularApi({ "/desempenho": cursos });
    const { container } = render(<Desempenho />);

    await screen.findByText("Inscritos");
    expect(container.querySelector(".barra-60")).toHaveTextContent("60%");
    expect(container.querySelector(".barra-60-pct")).toHaveTextContent("%");
  });

  it("busca os dados sem usar o cache do navegador", async () => {
    const fetchFalso = simularApi({ "/desempenho": cursos });
    render(<Desempenho />);

    await screen.findByText("Inscritos");
    expect(fetchFalso).toHaveBeenCalledWith(expect.stringContaining("/desempenho"), {
      cache: "no-store",
    });
  });

  it("busca de novo quando a aba volta a ficar em foco", async () => {
    const fetchFalso = simularApi({ "/desempenho": cursos });
    render(<Desempenho />);
    await screen.findByText("Inscritos");

    window.dispatchEvent(new Event("focus"));

    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("avisa quando a API não responde", async () => {
    simularApi({}); // nenhuma rota: toda chamada falha
    render(<Desempenho />);

    expect(
      await screen.findByText(/Não foi possível carregar os dados de desempenho/),
    ).toBeInTheDocument();
  });

  it("a frase de apresentação fala em desempenho dos alunos", async () => {
    simularApi({ "/desempenho": cursos });
    render(<Desempenho />);

    expect(
      screen.getByText(/Acompanhe o desempenho dos alunos no curso preparatório do moodle/),
    ).toBeInTheDocument();
  });

  describe("Simulado Enade", () => {
    const comSimulado = [
      { ...cursos[0], simulado: { realizado: true, alunos: 6, media: 44, questoes: 20 } },
      { ...cursos[1], simulado: { realizado: true, alunos: 1, media: 80, questoes: 20 } },
      { ...cursos[2], simulado: { realizado: false, alunos: 0, media: 0, questoes: null } },
    ];
    const secao = () => within(screen.getByRole("region", { name: "Simulado Enade" }));

    it("aparece separado, com quantos alunos fizeram e a média, e muda com o curso", async () => {
      const usuario = userEvent.setup();
      simularApi({ "/desempenho": comSimulado });
      render(<Desempenho />);
      await screen.findByText("Inscritos");

      expect(secao().getByText("Alunos fizeram o simulado").closest(".kpi")).toHaveTextContent("6");
      expect(secao().getByText("Média no simulado").closest(".kpi")).toHaveTextContent("44%");
      expect(secao().getByText(/simulado de 20 questões/)).toBeInTheDocument();
      // a média geral dos cartões de cima continua sendo a das atividades, não a do simulado
      expect(within(kpi("Média geral")).getByText("94%")).toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "Engenharia de Produção" }));
      expect(secao().getByText("Aluno fez o simulado").closest(".kpi")).toHaveTextContent("1");
      expect(secao().getByText("Média no simulado").closest(".kpi")).toHaveTextContent("80%");
    });

    describe("comparação questão a questão", () => {
      const questao = (posicao, numero, simulado, ufop, brasil, extra = {}) => ({
        posicao,
        numero,
        componente: "especifico",
        disciplina: `Disciplina ${numero}`,
        tema: `Tema ${numero}`,
        situacao: "valida",
        gabarito: "C",
        imagem: `2023/ep-${numero}.webp`,
        simulado,
        ufop,
        brasil,
        ...extra,
      });
      const comComparacao = [
        {
          ...cursos[0],
          simulado: {
            realizado: true,
            alunos: 5,
            media: 61,
            questoes: 3,
            comparacao: {
              edicao: 2023,
              questoes: [
                questao(1, 23, 80, 35.9, 27),
                questao(2, 15, 40, 64.1, 51.6),
                questao(3, 33, 60, null, null, { situacao: "desconsiderada", gabarito: "E" }),
              ],
            },
          },
        },
      ];
      async function abrir() {
        const usuario = userEvent.setup();
        simularApi({ "/desempenho": comComparacao });
        render(<Desempenho />);
        await screen.findByRole("heading", { name: /comparado ao Enade 2023/ });
        return usuario;
      }
      const linhaDa = (numero) => screen.getByText(`Tema ${numero}`).closest("tr");

      it("mostra o acerto do simulado ao lado da UFOP e do Brasil no Enade, com cor contra o Brasil", async () => {
        await abrir();
        expect(linhaDa(23)).toHaveTextContent("80,035,927,0");
        expect(within(linhaDa(23)).getByText("80,0")).toHaveClass("curso-acima");
        expect(within(linhaDa(15)).getByText("40,0")).toHaveClass("curso-abaixo");
      });

      it("questão desconsiderada não tem resultado oficial e fica fora da média", async () => {
        await abrir();
        expect(linhaDa(33)).toHaveTextContent("60,0Desconsiderada pelo INEP");

        const rodape = screen.getByText(/Média das 2 questões com resultado oficial/).closest("tr");
        // (80+40)/2, (35,9+64,1)/2, (27+51,6)/2
        expect(rodape).toHaveTextContent("60,050,039,3");
      });

      const ordemNaTela = () =>
        [...document.querySelectorAll(".tabela-simulado tbody .numero")].map((e) =>
          Number(e.textContent),
        );
      const botao = (nome) =>
        within(screen.getByRole("table")).getByRole("button", { name: new RegExp(`^${nome}`) });

      it("começa na ordem do simulado e dá para ordenar por todas as colunas", async () => {
        const usuario = await abrir();
        expect(ordemNaTela()).toEqual([23, 15, 33]);

        await usuario.click(botao("Questão"));
        expect(ordemNaTela()).toEqual([15, 23, 33]);
        expect(botao("Questão").closest("th")).toHaveAttribute("aria-sort", "ascending");
        await usuario.click(botao("Questão"));
        expect(ordemNaTela()).toEqual([33, 23, 15]);

        await usuario.click(botao("Disciplina")); // "Disciplina 15", "Disciplina 23", "Disciplina 33"
        expect(ordemNaTela()).toEqual([15, 23, 33]);
        await usuario.click(botao("Tema"));
        await usuario.click(botao("Tema"));
        expect(ordemNaTela()).toEqual([33, 23, 15]);

        await usuario.click(botao("Simulado")); // 40, 60, 80
        expect(ordemNaTela()).toEqual([15, 33, 23]);
      });

      it("ao ordenar pela UFOP ou pelo Brasil, a questão sem resultado oficial fica sempre no fim", async () => {
        const usuario = await abrir();

        await usuario.click(botao("UFOP")); // 35,9 e 64,1
        expect(ordemNaTela()).toEqual([23, 15, 33]);
        await usuario.click(botao("UFOP"));
        expect(ordemNaTela()).toEqual([15, 23, 33]);

        await usuario.click(botao("Brasil")); // 27,0 e 51,6
        expect(ordemNaTela()).toEqual([23, 15, 33]);
        await usuario.click(botao("Brasil"));
        expect(ordemNaTela()).toEqual([15, 23, 33]);
      });

      it("'Voltar à ordem do simulado' aparece só depois de ordenar e desfaz a ordenação", async () => {
        const usuario = await abrir();
        const voltar = () => screen.queryByRole("button", { name: "Voltar à ordem do simulado" });
        expect(voltar()).toBeNull();

        await usuario.click(botao("Simulado"));
        await usuario.click(voltar());

        expect(ordemNaTela()).toEqual([23, 15, 33]);
        expect(voltar()).toBeNull();
      });

      it("com questões de duas edições, a tabela é igual às outras: uma média só, e o título cita os dois anos", async () => {
        const duasEdicoes = structuredClone(comComparacao);
        const { comparacao } = duasEdicoes[0].simulado;
        const referencia = { curso: "ec", nome: "Engenharia de Computação" };
        comparacao.edicao = 2021;
        comparacao.questoes = [
          questao(1, 1, 100, 71.1, 66.8, { edicao: 2023, referencia }),
          questao(2, 10, 50, 40, 42.6, { edicao: 2021, referencia: null }),
        ];
        simularApi({ "/desempenho": duasEdicoes });
        render(<Desempenho />);
        await screen.findByRole("heading", { name: /comparado ao Enade 2021 e 2023/ });

        expect(linhaDa(1)).toHaveTextContent("100,071,166,8");
        expect(linhaDa(10)).toHaveTextContent("50,040,042,6");
        // (100+50)/2, (71,1+40)/2, (66,8+42,6)/2
        const rodape = screen.getByText("Média das 2 questões com resultado oficial").closest("tr");
        expect(rodape).toHaveTextContent("75,055,654,7");
        expect(document.querySelectorAll(".tabela-simulado tfoot tr")).toHaveLength(1);
        expect(screen.getByText(/Relatórios de Curso do Enade 2021 e 2023/)).toBeInTheDocument();
      });

      it("cada questão tem o botão para ver a imagem e o gabarito", async () => {
        const usuario = await abrir();
        await usuario.click(within(linhaDa(23)).getByRole("button", { name: "Ver questão" }));

        expect(screen.getByRole("dialog", { name: "Questão 23" })).toBeInTheDocument();
        expect(screen.getByRole("img")).toHaveAttribute(
          "src",
          expect.stringContaining("/enade/imagens/2023/ep-23.webp"),
        );
        expect(screen.getByText("Gabarito: C")).toBeInTheDocument();
      });

      it("sem comparação (curso sem as questões informadas), não há tabela", async () => {
        simularApi({ "/desempenho": comSimulado });
        render(<Desempenho />);
        await screen.findByText("Inscritos");
        expect(screen.queryByRole("table")).toBeNull();
      });
    });

    it("avisa quando o curso ainda não fez o simulado", async () => {
      const usuario = userEvent.setup();
      simularApi({ "/desempenho": comSimulado });
      render(<Desempenho />);
      await screen.findByText("Inscritos");

      await usuario.click(screen.getByRole("button", { name: "Sistemas de Informação" }));
      expect(secao().getByText("O simulado ainda não foi feito neste curso.")).toBeInTheDocument();
      expect(secao().queryByText("Média no simulado")).toBeNull();
    });

    it("se a API não informar o simulado (versão antiga), a seção não aparece", async () => {
      simularApi({ "/desempenho": cursos });
      render(<Desempenho />);
      await screen.findByText("Inscritos");

      expect(screen.queryByRole("region", { name: "Simulado Enade" })).toBeNull();
    });
  });
});
