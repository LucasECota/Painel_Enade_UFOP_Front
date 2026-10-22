import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Topico from "./Topico";

describe("Topico", () => {
  it("começa aberto por padrão e mostra o conteúdo", () => {
    render(<Topico titulo="Meu tópico">conteúdo</Topico>);

    expect(screen.getByText("Meu tópico").closest("details")).toHaveAttribute("open");
    expect(screen.getByText("conteúdo")).toBeVisible();
  });

  it("pode começar fechado", () => {
    render(
      <Topico titulo="Fechado" aberto={false}>
        conteúdo
      </Topico>,
    );

    expect(screen.getByText("Fechado").closest("details")).not.toHaveAttribute("open");
  });

  it("abre e fecha ao clicar no título", async () => {
    const usuario = userEvent.setup();
    render(
      <Topico titulo="Alternar" aberto={false}>
        conteúdo
      </Topico>,
    );
    const detalhes = screen.getByText("Alternar").closest("details");

    await usuario.click(screen.getByText("Alternar"));
    expect(detalhes).toHaveAttribute("open");

    await usuario.click(screen.getByText("Alternar"));
    expect(detalhes).not.toHaveAttribute("open");
  });
});
