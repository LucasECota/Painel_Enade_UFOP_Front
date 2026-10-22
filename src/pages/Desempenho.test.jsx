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

    expect(screen.getByText(/Acompanhe o desempenho dos alunos no AvaliaUFOP/)).toBeInTheDocument();
  });
});
