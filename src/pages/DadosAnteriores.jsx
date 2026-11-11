import PaginaComAbas from "../components/PaginaComAbas";
import Edicoes from "./Edicoes";
import Resultados from "./Resultados";

// Dados Edições Anteriores: análise das provas (Edições) e resultados dos cursos (Resultados).
function DadosAnteriores() {
  return (
    <PaginaComAbas
      titulo="Dados Edições Anteriores"
      abas={[
        { chave: "edicoes", titulo: "Análise das provas", conteudo: <Edicoes /> },
        { chave: "resultados", titulo: "Resultados dos cursos", conteudo: <Resultados /> },
      ]}
    />
  );
}

export default DadosAnteriores;
