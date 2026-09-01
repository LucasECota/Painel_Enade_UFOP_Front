import { useState, useEffect } from "react";

function App() {
  const [cursos, setCursos] = useState([]);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [dadosDoCurso, setDadosDoCurso] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/enade/cursos")
      .then((response) => response.json())
      .then((dados) => setCursos(dados));
  }, []);

  useEffect(() => {
    if (!cursoSelecionado) return;

    fetch(`http://localhost:3000/api/enade/${cursoSelecionado}`)
      .then((response) => response.json())
      .then((dados) => setDadosDoCurso(dados));
  }, [cursoSelecionado]);

  return (
    <div className="App">
      <h1>Painel Enade</h1>

      <div>
        {cursos.map((curso) => (
          <button key={curso.chave} onClick={() => setCursoSelecionado(curso.chave)}>
            {curso.nome}
          </button>
        ))}
      </div>

      <p>Selecionado: {cursoSelecionado}</p>

      <div>
        <p>Total de questões: {dadosDoCurso?.totalQuestoes}</p>
        <p>Formação Geral: {dadosDoCurso?.fg.total}</p>
        <p>Componente Específico: {dadosDoCurso?.ce.total}</p>
      </div>

      <h2>Disciplinas (Componente Específico)</h2>
      <ul>
        {dadosDoCurso?.ce.disciplinas
          .slice() // faz uma cópia antes de ordenar
          .sort((a, b) => b.qtd - a.qtd) // ordena da maior quantidade pra menor
          .map((disciplina) => (
            <li key={disciplina.nome}>
              {disciplina.nome} — {disciplina.qtd} questões
            </li>
          ))}
      </ul>
    </div>
  );
}

export default App;
