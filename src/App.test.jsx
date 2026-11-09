import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { vi } from "vitest";
import { Rotas } from "./App";

// As páginas de verdade buscam dados na API: aqui só interessa para onde cada endereço leva
vi.mock("./pages/Preparatorio", () => ({ default: () => <p>página Preparatório</p> }));
vi.mock("./pages/DadosAnteriores", () => ({ default: () => <p>página Dados Anteriores</p> }));

function Endereco() {
  const { pathname, search } = useLocation();
  return <p data-testid="endereco">{pathname + search}</p>;
}

function irPara(rota) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Rotas />
      <Endereco />
    </MemoryRouter>,
  );
}

describe("rotas", () => {
  it("/preparatorio e /dados abrem as páginas novas", () => {
    irPara("/preparatorio");
    expect(screen.getByText("página Preparatório")).toBeInTheDocument();
  });

  it("/dados abre Dados Edições Anteriores", () => {
    irPara("/dados");
    expect(screen.getByText("página Dados Anteriores")).toBeInTheDocument();
  });

  for (const [antigo, novo, pagina] of [
    ["/avaliaufop", "/preparatorio", "página Preparatório"],
    ["/desempenho", "/preparatorio?aba=desempenho", "página Preparatório"],
    ["/edicoes", "/dados", "página Dados Anteriores"],
    ["/resultados", "/dados?aba=resultados", "página Dados Anteriores"],
  ]) {
    it(`o endereço antigo ${antigo} leva para ${novo}`, () => {
      irPara(antigo);

      expect(screen.getByTestId("endereco")).toHaveTextContent(novo);
      expect(screen.getByText(pagina)).toBeInTheDocument();
    });
  }
});
