import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";

const renderizar = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

describe("Início", () => {
  it("apresenta o painel com a frase combinada", () => {
    const { container } = renderizar();

    expect(container).toHaveTextContent(
      "Este painel reúne dados das edições anteriores do Enade, os cursos de preparação para o Enade 2026 e o desempenho dos alunos do Instituto de Ciências Exatas e Aplicadas da UFOP.",
    );
  });

  it("o título é Painel Enade – AvaliaUFOP", () => {
    renderizar();

    expect(
      screen.getByRole("heading", { level: 1, name: "Painel Enade – AvaliaUFOP" }),
    ).toBeInTheDocument();
  });

  it("mostra os autores", () => {
    renderizar();

    expect(screen.getByText("Lucas Emanuel Cota Carneiro", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Josemar Alves Caetano", { exact: false })).toBeInTheDocument();
  });

  it("o acesso rápido segue a ordem do menu: Preparatório Enade 2026 e Dados Edições Anteriores", () => {
    renderizar();
    const destinos = screen.getAllByRole("link").map((l) => l.getAttribute("href"));

    expect(destinos).toEqual(["/preparatorio", "/dados"]);
  });

  it("organiza os cartões em duas colunas", () => {
    const { container } = renderizar();

    expect(container.querySelector(".card-grid")).toHaveClass("card-grid-2");
  });
});
