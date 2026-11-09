import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import DadosAnteriores from "./DadosAnteriores";

// As abas de verdade buscam dados na API: aqui só interessa o que a página própria mostra
vi.mock("./Edicoes", () => ({ default: () => <p>conteúdo Edições</p> }));
vi.mock("./Resultados", () => ({ default: () => <p>conteúdo Resultados</p> }));

describe("Dados Edições Anteriores", () => {
  it("avisa que, segundo o INEP, as notas não são comparáveis entre edições e que o painel traz os dados para o leitor analisar", () => {
    render(
      <MemoryRouter>
        <DadosAnteriores />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Dados Edições Anteriores" }),
    ).toBeInTheDocument();
    const frase = screen.getByText(
      /Segundo o INEP, as notas do Enade não são comparáveis entre edições/,
    );
    expect(frase).toHaveTextContent(
      "Aqui você encontra os dados de cada uma para fazer a sua própria análise",
    );
  });

  it("tem as abas Edições e Resultados", () => {
    render(
      <MemoryRouter>
        <DadosAnteriores />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "O que o Enade cobrou",
      "Resultados dos cursos",
    ]);
  });
});
