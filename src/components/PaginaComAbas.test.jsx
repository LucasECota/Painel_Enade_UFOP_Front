import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import PaginaComAbas from "./PaginaComAbas";

function Endereco() {
  const { search } = useLocation();
  return <p data-testid="endereco">{search}</p>;
}

function renderizar(rota = "/") {
  let montagens = 0;
  function Conteudo({ nome }) {
    // conta quantas vezes cada conteúdo é criado (montado): trocar de aba não pode recriá-lo
    useEffect(() => {
      montagens++;
    }, []);
    return <p>conteúdo {nome}</p>;
  }
  render(
    <MemoryRouter initialEntries={[rota]}>
      <PaginaComAbas
        titulo="Minha página"
        abas={[
          { chave: "a", titulo: "Aba A", conteudo: <Conteudo nome="A" /> },
          { chave: "b", titulo: "Aba B", conteudo: <Conteudo nome="B" /> },
        ]}
      />
      <Endereco />
    </MemoryRouter>,
  );
  return () => montagens;
}

describe("PaginaComAbas", () => {
  it("mostra o título da página como h1 e uma aba para cada parte", () => {
    renderizar();

    expect(screen.getByRole("heading", { level: 1, name: "Minha página" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Aba A", "Aba B"]);
  });

  it("começa na primeira aba, com o conteúdo das outras escondido", () => {
    renderizar();

    expect(screen.getByRole("tab", { name: "Aba A" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Aba B" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("conteúdo A")).toBeVisible();
    expect(screen.getByText("conteúdo B")).not.toBeVisible();
  });

  it("clicar em outra aba mostra o conteúdo dela e guarda a escolha no endereço", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole("tab", { name: "Aba B" }));

    expect(screen.getByText("conteúdo B")).toBeVisible();
    expect(screen.getByText("conteúdo A")).not.toBeVisible();
    expect(screen.getByTestId("endereco")).toHaveTextContent("?aba=b");
  });

  it("voltar para a primeira aba limpa o endereço", async () => {
    const usuario = userEvent.setup();
    renderizar("/?aba=b");

    await usuario.click(screen.getByRole("tab", { name: "Aba A" }));

    expect(screen.getByTestId("endereco")).toHaveTextContent("");
    expect(screen.getByText("conteúdo A")).toBeVisible();
  });

  it("abre direto na aba pedida no endereço e ignora aba que não existe", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/?aba=b"]}>
        <PaginaComAbas
          titulo="P"
          abas={[
            { chave: "a", titulo: "Aba A", conteudo: <p>A</p> },
            { chave: "b", titulo: "Aba B", conteudo: <p>B</p> },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("tab", { name: "Aba B" })).toHaveAttribute("aria-selected", "true");
    unmount();

    render(
      <MemoryRouter initialEntries={["/?aba=xyz"]}>
        <PaginaComAbas titulo="P" abas={[{ chave: "a", titulo: "Aba A", conteudo: <p>A</p> }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("tab", { name: "Aba A" })).toHaveAttribute("aria-selected", "true");
  });

  it("trocar de aba não recria o conteúdo (nada é buscado de novo, nada pisca)", async () => {
    const usuario = userEvent.setup();
    const montagens = renderizar();
    expect(montagens()).toBe(2); // as duas abas são criadas uma vez

    await usuario.click(screen.getByRole("tab", { name: "Aba B" }));
    await usuario.click(screen.getByRole("tab", { name: "Aba A" }));
    await usuario.click(screen.getByRole("tab", { name: "Aba B" }));

    expect(montagens()).toBe(2); // continua 2: ninguém foi desmontado e montado de novo
  });

  it("mostra a introdução entre o título e as abas, quando existe", () => {
    render(
      <MemoryRouter>
        <PaginaComAbas
          titulo="P"
          introducao="Frase de apoio."
          abas={[{ chave: "a", titulo: "Aba A", conteudo: <p>A</p> }]}
        />
      </MemoryRouter>,
    );
    const titulo = screen.getByRole("heading", { level: 1 });
    const frase = screen.getByText("Frase de apoio.");
    const abas = screen.getByRole("tablist");

    expect(titulo.compareDocumentPosition(frase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(frase.compareDocumentPosition(abas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sem introdução, não cria parágrafo vazio", () => {
    renderizar();

    expect(document.querySelector(".introducao")).toBeNull();
  });

  it("cada aba controla o seu painel (acessibilidade)", () => {
    renderizar();
    const aba = screen.getByRole("tab", { name: "Aba A" });

    expect(aba).toHaveAttribute("aria-controls", "painel-a");
    expect(document.getElementById("painel-a")).toHaveAttribute("role", "tabpanel");
  });
});
