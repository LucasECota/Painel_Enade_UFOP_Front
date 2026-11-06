import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Topico from "./Topico";

describe("Topico", () => {
  it("começa fechado por padrão", () => {
    render(<Topico titulo="Meu tópico">conteúdo</Topico>);

    expect(screen.getByText("Meu tópico").closest("details")).not.toHaveAttribute("open");
  });

  it("pode começar aberto", () => {
    render(
      <Topico titulo="Aberto" aberto>
        conteúdo
      </Topico>,
    );

    expect(screen.getByText("Aberto").closest("details")).toHaveAttribute("open");
    expect(screen.getByText("conteúdo")).toBeVisible();
  });

  it("abre e fecha ao clicar no título", async () => {
    const usuario = userEvent.setup();
    render(<Topico titulo="Alternar">conteúdo</Topico>);
    const detalhes = screen.getByText("Alternar").closest("details");

    await usuario.click(screen.getByText("Alternar"));
    expect(detalhes).toHaveAttribute("open");

    await usuario.click(screen.getByText("Alternar"));
    expect(detalhes).not.toHaveAttribute("open");
  });
});
