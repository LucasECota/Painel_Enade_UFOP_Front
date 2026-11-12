import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import BotaoPdf from "./BotaoPdf";

describe("BotaoPdf", () => {
  it("chama a função de gerar o PDF ao clicar e volta ao normal", async () => {
    const usuario = userEvent.setup();
    const gerar = vi.fn().mockResolvedValue("arquivo.pdf");
    render(<BotaoPdf aoGerar={gerar} />);

    await usuario.click(screen.getByRole("button", { name: "Baixar PDF desta página" }));

    expect(gerar).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Baixar PDF desta página" })).toBeEnabled();
  });

  it("mostra 'Gerando PDF…' e desabilita o botão enquanto o PDF é feito", async () => {
    const usuario = userEvent.setup();
    let terminar;
    const gerar = vi.fn(() => new Promise((resolve) => (terminar = resolve)));
    render(<BotaoPdf aoGerar={gerar} />);

    await usuario.click(screen.getByRole("button", { name: "Baixar PDF desta página" }));
    const gerando = screen.getByRole("button", { name: "Gerando PDF…" });
    expect(gerando).toBeDisabled();

    terminar();
    expect(await screen.findByRole("button", { name: "Baixar PDF desta página" })).toBeEnabled();
  });

  it("avisa quando não consegue gerar, e deixa tentar de novo", async () => {
    const usuario = userEvent.setup();
    const gerar = vi.fn().mockRejectedValue(new Error("falhou"));
    render(<BotaoPdf aoGerar={gerar} />);

    await usuario.click(screen.getByRole("button", { name: "Baixar PDF desta página" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível gerar o PDF");
    expect(screen.getByRole("button", { name: "Baixar PDF desta página" })).toBeEnabled();
  });
});
