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
  it("mostra os autores", () => {
    renderizar();

    expect(screen.getByText("Lucas Emanuel Cota Carneiro", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Josemar Alves Caetano", { exact: false })).toBeInTheDocument();
  });

  it("o acesso rápido segue a ordem do menu: AvaliaUFOP, Desempenho, Edições, Resultados", () => {
    renderizar();
    const destinos = screen.getAllByRole("link").map((l) => l.getAttribute("href"));

    expect(destinos).toEqual(["/avaliaufop", "/desempenho", "/edicoes", "/resultados"]);
  });

  it("organiza os cartões em duas colunas", () => {
    const { container } = renderizar();

    expect(container.querySelector(".card-grid")).toHaveClass("card-grid-2");
  });
});
