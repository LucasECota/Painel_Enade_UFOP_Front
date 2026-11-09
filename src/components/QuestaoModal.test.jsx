import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerQuestao from "./QuestaoModal";

const objetiva = {
  id: "20",
  tipo: "objetiva",
  tema: "Computação em nuvem",
  gabarito: "B",
  situacao: "valida",
  imagem: "2023/ec-20.webp",
};

describe("VerQuestao", () => {
  it("não mostra o botão quando a questão não tem imagem", () => {
    const { container } = render(<VerQuestao questao={{ ...objetiva, imagem: null }} />);
    expect(container).toBeEmptyDOMElement();
    render(<VerQuestao />);
  });

  it("abre a questão com o gabarito, fecha com o X, com Esc e clicando fora, e devolve o foco ao botão", async () => {
    const usuario = userEvent.setup();
    render(<VerQuestao questao={objetiva} />);
    const botao = screen.getByRole("button", { name: "Ver questão" });

    await usuario.click(botao);
    expect(screen.getByRole("dialog", { name: /Questão 20/ })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByText("Gabarito: B")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();

    await usuario.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(botao).toHaveFocus();

    await usuario.click(botao);
    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    await usuario.click(botao);
    await usuario.click(document.querySelector(".questao-fundo"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("na discursiva mostra só a imagem, sem gabarito", async () => {
    const usuario = userEvent.setup();
    render(
      <VerQuestao
        questao={{
          id: "D2",
          tipo: "discursiva",
          tema: "Quicksort",
          gabarito: null,
          situacao: null,
          imagem: "2023/ec-d2.webp",
        }}
      />,
    );
    await usuario.click(screen.getByRole("button", { name: "Ver questão" }));
    expect(screen.getByRole("dialog", { name: /Questão discursiva 2/ })).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText(/Gabarito|gabarito/)).toBeNull();
  });

  it("explica quando a questão foi anulada ou desconsiderada", async () => {
    const usuario = userEvent.setup();
    const { unmount } = render(
      <VerQuestao questao={{ ...objetiva, gabarito: null, situacao: "anulada" }} />,
    );
    await usuario.click(screen.getByRole("button", { name: "Ver questão" }));
    expect(screen.getByText(/anulada pela comissão/)).toBeInTheDocument();
    unmount();

    render(<VerQuestao questao={{ ...objetiva, gabarito: null, situacao: "desconsiderada" }} />);
    await usuario.click(screen.getByRole("button", { name: "Ver questão" }));
    expect(screen.getByText(/desconsiderada no cálculo/)).toBeInTheDocument();
  });

  it("avisa quando a imagem não carrega", async () => {
    const usuario = userEvent.setup();
    render(<VerQuestao questao={objetiva} />);
    await usuario.click(screen.getByRole("button", { name: "Ver questão" }));
    screen.getByAltText(/Questão 20/).dispatchEvent(new Event("error"));
    expect(await screen.findByText(/Não foi possível carregar/)).toBeInTheDocument();
  });
});
