import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Preparatorio from "./Preparatorio";

// As abas de verdade buscam dados na API: aqui só interessa o que a página própria mostra
vi.mock("./AvaliaUfop", () => ({ default: () => <p>conteúdo AvaliaUFOP</p> }));
vi.mock("./Desempenho", () => ({ default: () => <p>conteúdo Desempenho</p> }));

describe("Preparatório Enade 2026", () => {
  it("tem as abas Cursos no Moodle e Desempenho dos alunos, nessa ordem", () => {
    render(
      <MemoryRouter>
        <Preparatorio />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Preparatório Enade 2026" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Cursos no Moodle",
      "Desempenho dos alunos",
    ]);
  });

  it("abre na aba Cursos no Moodle, com o conteúdo do AvaliaUFOP", () => {
    render(
      <MemoryRouter>
        <Preparatorio />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "Cursos no Moodle" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("conteúdo AvaliaUFOP")).toBeVisible();
  });
});
