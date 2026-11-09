import PaginaComAbas from "../components/PaginaComAbas";
import Edicoes from "./Edicoes";
import Resultados from "./Resultados";

// Dados Edições Anteriores: o que o Enade cobrou (Edições) e como a UFOP se saiu (Resultados).
function DadosAnteriores() {
  return (
    <PaginaComAbas
      titulo="Dados Edições Anteriores"
      introducao="Segundo o INEP, as notas do Enade não são comparáveis entre edições, porque a prova muda a cada ano. Aqui você encontra os dados de cada uma para fazer a sua própria análise."
      abas={[
        { chave: "edicoes", titulo: "O que o Enade cobrou", conteudo: <Edicoes /> },
        { chave: "resultados", titulo: "Resultados dos cursos", conteudo: <Resultados /> },
      ]}
    />
  );
}

export default DadosAnteriores;
