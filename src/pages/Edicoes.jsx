import { Fragment, useState, useEffect } from "react";
import { cursos as cursosAvaliaUfop } from "../data/avaliaufop";
import { API_URL } from "../api";
import TabelaQuestoes from "../components/TabelaQuestoes";

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

const SUBTOPICOS = [
  { chave: "assuntos", titulo: "Assuntos por disciplina" },
  { chave: "questoes", titulo: "Acertos por questão" },
];

// Lista os assuntos de uma disciplina. Quando ela tem questão discursiva, separa as discursivas
// das objetivas (a API manda as discursivas primeiro na lista).
function AssuntosDaDisciplina({ disciplina }) {
  const { assuntos, discursivas = 0 } = disciplina;
  const lista = (itens) => (
    <ul>
      {itens.map((assunto, indice) => (
        <li key={indice}>{assunto}</li>
      ))}
    </ul>
  );

  if (discursivas === 0) return lista(assuntos);

  const doDiscursivas = assuntos.slice(0, discursivas);
  const dasObjetivas = assuntos.slice(discursivas);

  return (
    <>
      <h4 className="grupo-questoes">{discursivas === 1 ? "Discursiva" : "Discursivas"}</h4>
      {lista(doDiscursivas)}
      {dasObjetivas.length > 0 && (
        <>
          <h4 className="grupo-questoes">{dasObjetivas.length === 1 ? "Objetiva" : "Objetivas"}</h4>
          {lista(dasObjetivas)}
        </>
      )}
    </>
  );
}

// Disciplinas de um componente da prova, da que tem mais questões para a que tem menos.
// As sem assunto cadastrado ficam de fora.
function ListaDeDisciplinas({ titulo, disciplinas }) {
  const comAssuntos = disciplinas.filter((disciplina) => disciplina.assuntos.length > 0);
  if (comAssuntos.length === 0) return null;

  return (
    // a seção inteira abre e fecha pela seta do título
    <details className="componente" open>
      <summary>
        <h2>{titulo}</h2>
      </summary>
      <div className="disciplinas">
        {comAssuntos
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
                  {disciplina.discursivas > 0 && (
                    <span className="tag tag-discursiva">
                      {disciplina.discursivas}{" "}
                      {disciplina.discursivas === 1 ? "discursiva" : "discursivas"}
                    </span>
                  )}
                </span>
              </summary>
              <AssuntosDaDisciplina disciplina={disciplina} />
            </details>
          ))}
      </div>
    </details>
  );
}

function Edicoes() {
  const [cursos, setCursos] = useState([]);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [anoSelecionado, setAnoSelecionado] = useState(null);
  const [dadosDoCurso, setDadosDoCurso] = useState(null);
  // o que mostrar dentro do curso: os assuntos por disciplina ou a tabela de acertos por questão
  const [visao, setVisao] = useState("assuntos");
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

  // Edições com assunto cadastrado, da mais recente para a mais antiga (a API informa quais são)
  const edicoesComAssuntos = curso ? (curso.anosComAssuntos ?? curso.anos.slice(0, 2)) : [];

  // Painel do curso escolhido, com dois subtópicos: assuntos por disciplina (o que já existia)
  // e acertos por questão. No desktop fica abaixo de todos os cards; no celular, logo abaixo do card.
  const visaoAssuntos = (
    <>
      {curso && (
        <div>
          <p>Edições com assuntos disponíveis:</p>
          {edicoesComAssuntos.map((ano) => (
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

          <ListaDeDisciplinas
            titulo={`Disciplinas (Formação Geral) — ${anoSelecionado}`}
            disciplinas={dadosDoCurso.fg.disciplinas}
          />
          <ListaDeDisciplinas
            titulo={`Disciplinas (Componente Específico) — ${anoSelecionado}`}
            disciplinas={dadosDoCurso.ce.disciplinas}
          />
        </div>
      )}
    </>
  );

  const detalhes = curso && (
    <>
      <div className="subtopicos" role="group" aria-label="O que ver neste curso">
        {SUBTOPICOS.map((t) => (
          <button
            key={t.chave}
            className={t.chave === visao ? "subtopico ativo" : "subtopico"}
            aria-pressed={t.chave === visao}
            onClick={() => setVisao(t.chave)}
          >
            {t.titulo}
          </button>
        ))}
      </div>

      {visao === "assuntos" ? (
        visaoAssuntos
      ) : (
        <TabelaQuestoes key={curso.chave} chave={curso.chave} anos={curso.anosComQuestoes ?? []} />
      )}
    </>
  );

  return (
    <div>
      <h1>Edições do Enade</h1>
      <p>
        Escolha um curso para ver o que o Enade cobrou em cada disciplina e como os concluintes se
        saíram em cada questão, ajudando a direcionar os estudos.
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
