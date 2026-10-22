import { Fragment, useState, useEffect } from "react";
import { cursos as cursosAvaliaUfop } from "../data/avaliaufop";
import { API_URL } from "../api";

// true quando a tela é de celular (mesmo limite do CSS: 760px)
function useEhCelular() {
  const consulta = "(max-width: 760px)";
  const [ehCelular, setEhCelular] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    const lista = window.matchMedia(consulta);
    const atualizar = () => setEhCelular(lista.matches);
    lista.addEventListener("change", atualizar);
    return () => lista.removeEventListener("change", atualizar);
  }, []);

  return ehCelular;
}

function Edicoes() {
  const [cursos, setCursos] = useState([]);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [anoSelecionado, setAnoSelecionado] = useState(null);
  const [dadosDoCurso, setDadosDoCurso] = useState(null);
  const ehCelular = useEhCelular();

  useEffect(() => {
    fetch(`${API_URL}/enade/cursos`)
      .then((response) => response.json())
      .then((dados) => setCursos(dados));
  }, []);

  // Só busca os dados quando já tem curso E ano escolhidos
  useEffect(() => {
    if (!cursoSelecionado || !anoSelecionado) return;

    fetch(`${API_URL}/enade/${cursoSelecionado}?ano=${anoSelecionado}`)
      .then((response) => response.json())
      .then((dados) => setDadosDoCurso(dados));
  }, [cursoSelecionado, anoSelecionado]);

  // Troca de curso: já limpa o ano e os dados antigos no mesmo clique,
  // em vez de esperar um efeito separado reagir depois (isso evita buscar
  // um ano que não existe para o novo curso).
  // Clicar de novo no curso que já está aberto fecha as opções.
  function selecionarCurso(chave) {
    setCursoSelecionado(chave === cursoSelecionado ? null : chave);
    setAnoSelecionado(null);
    setDadosDoCurso(null);
  }

  // Só os cursos do AvaliaUFOP, na mesma ordem da página do AvaliaUFOP
  const cursosOrdenados = cursosAvaliaUfop
    .map((a) => cursos.find((c) => c.chave === a.sigla))
    .filter(Boolean);

  // Pega o objeto do curso selecionado, pra ter acesso à lista de "anos"
  const curso = cursos.find((c) => c.chave === cursoSelecionado);

  // As duas edições mais recentes são as que têm assunto cadastrado.
  // "anos" já vem ordenado do mais recente pro mais antigo.
  const duasEdicoesMaisRecentes = curso ? curso.anos.slice(0, 2) : [];

  // Anos disponíveis + disciplinas do curso escolhido.
  // No desktop fica abaixo de todos os cards; no celular, logo abaixo do card do curso.
  const detalhes = (
    <>
      {curso && (
        <div>
          <p>Edições com assuntos disponíveis:</p>
          {duasEdicoesMaisRecentes.map((ano) => (
            <button
              key={ano}
              className={ano === anoSelecionado ? "btn btn-selecionado" : "btn"}
              onClick={() => setAnoSelecionado(ano)}
            >
              {ano}
            </button>
          ))}
        </div>
      )}

      {dadosDoCurso && (
        <div>
          <p>Total de questões: {dadosDoCurso.totalQuestoes}</p>
          <p>Formação Geral: {dadosDoCurso.fg.total}</p>
          <p>Componente Específico: {dadosDoCurso.ce.total}</p>

          <h2>Disciplinas (Componente Específico) — {anoSelecionado}</h2>
          <div className="disciplinas">
            {dadosDoCurso.ce.disciplinas
              .filter((disciplina) => disciplina.assuntos.length > 0)
              .slice()
              .sort((a, b) => b.qtd - a.qtd)
              .map((disciplina) => (
                <details className="disciplina" key={disciplina.nome}>
                  <summary>
                    <span className="disciplina-nome">{disciplina.nome}</span>
                    <span className="disciplina-info">
                      <span className="tag">
                        {disciplina.qtd} {disciplina.qtd === 1 ? "questão" : "questões"}
                      </span>
                    </span>
                  </summary>
                  <ul>
                    {disciplina.assuntos.map((assunto, indice) => (
                      <li key={indice}>{assunto}</li>
                    ))}
                  </ul>
                </details>
              ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div>
      <h1>Edições do Enade</h1>
      <p>
        Escolha um curso e uma edição para ver quantas questões o Enade cobrou em cada disciplina e
        quais assuntos apareceram, ajudando a direcionar os estudos.
      </p>

      <div className="card-grid">
        {cursosOrdenados.map((c) => (
          <Fragment key={c.chave}>
            <button
              className={
                c.chave === cursoSelecionado
                  ? "card card-link card-select ativo"
                  : "card card-link card-select"
              }
              onClick={() => selecionarCurso(c.chave)}
            >
              <h3>{c.nome}</h3>
              <span className="card-more">
                {c.chave === cursoSelecionado ? "Fechar ↑" : "Ver edições ↓"}
              </span>
            </button>
            {ehCelular && c.chave === cursoSelecionado && (
              <div className="detalhes-curso">{detalhes}</div>
            )}
          </Fragment>
        ))}
      </div>

      {!ehCelular && detalhes}
    </div>
  );
}

export default Edicoes;
