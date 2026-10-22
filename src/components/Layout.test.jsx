import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";

function renderizar(rota = "/") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>página inicial</p>} />
          <Route path="/desempenho" element={<p>página de desempenho</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  it("mostra o menu na ordem combinada", () => {
    renderizar();
    const menu = within(screen.getByRole("navigation", { name: "Menu principal" }));

    expect(menu.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Início",
      "AvaliaUFOP",
      "Desempenho",
      "Edições",
      "Resultados",
    ]);
  });

  it("não tem as páginas removidas (Simulados e Ranking)", () => {
    renderizar();

    expect(screen.queryByRole("link", { name: "Simulados" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ranking" })).not.toBeInTheDocument();
  });

  it("marca a página atual no menu", () => {
    renderizar("/desempenho");

    expect(screen.getByRole("link", { name: "Desempenho" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveClass("active");
  });

  it("o título 'Painel Enade' do cabeçalho leva para a página inicial", () => {
    renderizar("/desempenho");

    expect(screen.getByRole("link", { name: /ir para a página inicial/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("o botão Menu abre e fecha a lista (celular) e fecha ao escolher uma página", async () => {
    const usuario = userEvent.setup();
    renderizar();
    const botao = screen.getByRole("button", { name: /menu/i });

    expect(botao).toHaveAttribute("aria-expanded", "false");
    await usuario.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");

    await usuario.click(screen.getByRole("link", { name: "Desempenho" }));
    expect(botao).toHaveAttribute("aria-expanded", "false");
  });

  it("mostra o endereço do ICEA no rodapé", () => {
    renderizar();

    expect(screen.getByText(/R\. Trinta e Seis, 115/)).toBeInTheDocument();
    expect(screen.getByText(/35931-008/)).toBeInTheDocument();
  });

  it("o rodapé não tem link da CPA", () => {
    renderizar();

    expect(screen.queryByRole("link", { name: /CPA/i })).not.toBeInTheDocument();
  });
});
