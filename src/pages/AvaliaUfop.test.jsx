import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AvaliaUfop from "./AvaliaUfop";
import { cursos, modulos, info } from "../data/avaliaufop";

const renderizar = () =>
  render(
    <MemoryRouter>
      <AvaliaUfop />
    </MemoryRouter>,
  );

describe("AvaliaUFOP", () => {
  it("cada card de curso abre o Moodle numa nova aba", () => {
    renderizar();

    for (const curso of cursos) {
      const link = screen.getByRole("link", { name: new RegExp(curso.nome) });
      expect(link).toHaveAttribute("href", curso.url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    }
  });

  it("os links do Moodle estão corretos para cada curso", () => {
    const porCurso = Object.fromEntries(cursos.map((c) => [c.sigla, c.url]));

    expect(porCurso.ec).toMatch(/id=328$/); // Computação
    expect(porCurso.ep).toMatch(/id=329$/); // Produção
    expect(porCurso.si).toMatch(/id=322$/); // Sistemas
  });

  it("explica que a inscrição é feita no Moodle", () => {
    renderizar();

    expect(screen.getByText(/você será levado ao Moodle/)).toBeInTheDocument();
  });

  it("mostra os quatro módulos numerados com a quantidade de atividades", () => {
    renderizar();
    const lista = screen.getByText("É assim que o curso está organizado dentro do Moodle:").parentElement.querySelector(".steps");
    const itens = within(lista).getAllByRole("listitem");

    expect(itens).toHaveLength(modulos.length);
    expect(itens[0]).toHaveTextContent("Enade: Fique por dentro");
    expect(itens[0]).toHaveTextContent("2 atividade(s)");
    expect(itens[3]).toHaveTextContent("Certificado");
  });

  it("Objetivos, Metodologia e Aprovação ficam recolhidos e abrem ao clicar", () => {
    renderizar();

    for (const titulo of ["Objetivos", "Metodologia", "Aprovação e certificado"]) {
      expect(screen.getByText(titulo).closest("details")).not.toHaveAttribute("open");
    }
  });

  it("mostra o prazo, a carga horária e o aproveitamento mínimo", () => {
    renderizar();

    expect(screen.getByText(new RegExp(info.cargaHoraria))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(info.prazo))).toBeInTheDocument();
    expect(screen.getByText(`${info.aproveitamentoMinimo}%`)).toBeInTheDocument();
  });
});
