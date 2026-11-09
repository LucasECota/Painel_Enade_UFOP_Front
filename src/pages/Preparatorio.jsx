import PaginaComAbas from "../components/PaginaComAbas";
import AvaliaUfop from "./AvaliaUfop";
import Desempenho from "./Desempenho";

// Preparatório Enade 2026: os cursos do AvaliaUFOP e o desempenho dos alunos neles.
function Preparatorio() {
  return (
    <PaginaComAbas
      titulo="Preparatório Enade 2026"
      abas={[
        { chave: "avaliaufop", titulo: "Cursos no Moodle", conteudo: <AvaliaUfop /> },
        { chave: "desempenho", titulo: "Desempenho dos alunos", conteudo: <Desempenho /> },
      ]}
    />
  );
}

export default Preparatorio;
