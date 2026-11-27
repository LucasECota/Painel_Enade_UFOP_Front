import { useState, useEffect } from "react";
import { API_URL } from "../api";
import VerQuestao from "../components/QuestaoModal";
import BotaoOrdenar from "../components/BotaoOrdenar";
import useOrdem from "../useOrdem";

const formatar = (v) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const media = (lista) => lista.reduce((soma, v) => soma + v, 0) / lista.length;
// verde: acima do Brasil; vinho: abaixo
const classeContraOBrasil = (valor, brasil) =>
  valor > brasil ? "num curso-acima" : valor < brasil ? "num curso-abaixo" : "num";

// Ordena as linhas da tabela do simulado. "posicao" é a ordem do simulado; sem dado (disciplina, tema
// ou resultado oficial) fica sempre no fim.
function ordenarQuestoes(questoes, { coluna, sentido }) {
  const fator = sentido === "asc" ? 1 : -1;
  return [...questoes].sort((x, y) => {
    const a = x[coluna];
    const b = y[coluna];
    const semA = a === null || a === undefined;
    const semB = b === null || b === undefined;
    if (semA || semB) return semA && semB ? x.posicao - y.posicao : semA ? 1 : -1;
    const comparacao = typeof a === "string" ? a.localeCompare(b, "pt-BR") : a - b;
    return comparacao * fator || x.posicao - y.posicao;
  });
}

// Médias das três colunas, só com as questões que têm percentual para comparar
function mediasDe(lista) {
  const comResultado = lista.filter((q) => q.ufop !== null && q.brasil !== null);
  if (comResultado.length === 0) return null;
  return {
    quantas: comResultado.length,
    simulado: media(comResultado.map((q) => q.simulado)),
    ufop: media(comResultado.map((q) => q.ufop)),
    brasil: media(comResultado.map((q) => q.brasil)),
  };
}

// Linha de média no rodapé da tabela
function LinhaDaMedia({ rotulo, medias }) {
  return (
    <tr>
      <th scope="row" colSpan={3}>
        <span className="rotulo-media">{rotulo}</span>
      </th>
      <td className={classeContraOBrasil(medias.simulado, medias.brasil)}>
        {formatar(medias.simulado)}
      </td>
      <td className="num">{formatar(medias.ufop)}</td>
      <td className="num">{formatar(medias.brasil)}</td>
    </tr>
  );
}

// Questão por questão: o acerto dos alunos no simulado ao lado do acerto oficial da UFOP e do Brasil na
// mesma questão do Enade de onde ela veio
function TabelaDoSimulado({ comparacao }) {
  const { edicao, questoes } = comparacao;
  const [ordem, ordenarPor, voltarAOrdem] = useOrdem("posicao");
  const sentidoAria = (coluna) =>
    ordem.coluna === coluna ? (ordem.sentido === "asc" ? "ascending" : "descending") : "none";
  // cabeçalho com o botão de ordenar
  const cabecalho = (coluna, rotulo, dica, extra = {}) => (
    <th aria-sort={sentidoAria(coluna)} title={`${dica} Clique para ordenar.`} {...extra}>
      <BotaoOrdenar
        coluna={coluna}
        rotulo={rotulo}
        dica={`Ordenar pela coluna ${rotulo}`}
        ordem={ordem}
        aoOrdenar={ordenarPor}
      />
    </th>
  );
  // a média só usa as questões que têm percentual oficial (as desconsideradas não têm)
  const medias = mediasDe(questoes);
  // edições de onde vieram as questões (o simulado pode juntar mais de uma), para o título e a fonte
  const edicoes = [...new Set(questoes.map((q) => q.edicao ?? edicao))].sort((x, y) => x - y);
  const nomeDasEdicoes = edicoes.join(" e ");

  return (
    <>
      <h3 className="tabela-titulo">Questão por questão, comparado ao Enade {nomeDasEdicoes}</h3>
      {ordem.coluna !== "posicao" && (
        <button type="button" className="btn btn-claro voltar-ordem" onClick={voltarAOrdem}>
          Voltar à ordem do simulado
        </button>
      )}
      <p className="dica-rolagem">Deslize a tabela para o lado para ver todas as colunas.</p>
      <div className="tabela-rolavel">
        <table className="tabela-questoes tabela-simulado">
          <thead>
            <tr>
              {cabecalho("numero", "Questão", `Número da questão na prova do Enade.`, {
                rowSpan: 2,
              })}
              {cabecalho("disciplina", "Disciplina", "Disciplina associada à questão.", {
                rowSpan: 2,
              })}
              {cabecalho("tema", "Tema", "Tema da questão.", { rowSpan: 2 })}
              <th colSpan={3} title="Percentual de acertos na questão.">
                % de acertos
              </th>
            </tr>
            <tr>
              {cabecalho(
                "simulado",
                "Simulado",
                "Acerto médio dos alunos que fizeram este simulado.",
              )}
              {cabecalho(
                "ufop",
                "UFOP",
                `Acerto dos concluintes na UFOP na prova do Enade (INEP).`,
              )}
              {cabecalho(
                "brasil",
                "Brasil",
                `Acerto dos concluintes em todo o Brasil na prova do Enade (INEP).`,
              )}
            </tr>
          </thead>
          <tbody>
            {ordenarQuestoes(questoes, ordem).map((q) => (
              <tr key={q.posicao}>
                <td className="num questao-numero">
                  <div className="numero-e-botao">
                    <span className="numero">{q.numero}</span>
                    <VerQuestao
                      compacto
                      questao={{
                        id: String(q.numero),
                        tipo: "objetiva",
                        tema: q.tema,
                        gabarito: q.gabarito,
                        situacao: q.situacao,
                        imagem: q.imagem,
                      }}
                    />
                  </div>
                </td>
                <td>{q.disciplina || "—"}</td>
                <td>{q.tema || "—"}</td>
                <td
                  className={q.brasil === null ? "num" : classeContraOBrasil(q.simulado, q.brasil)}
                >
                  {formatar(q.simulado)}
                </td>
                {q.ufop === null || q.brasil === null ? (
                  <td className="num sem-oficial" colSpan={2}>
                    {q.situacao === "anulada" ? "Anulada pelo INEP" : "Desconsiderada pelo INEP"}
                  </td>
                ) : (
                  <>
                    <td className="num">{formatar(q.ufop)}</td>
                    <td className="num">{formatar(q.brasil)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          {medias && (
            <tfoot>
              <LinhaDaMedia
                medias={medias}
                rotulo={
                  medias.quantas === 1
                    ? "1 questão com resultado oficial"
                    : `Média das ${medias.quantas} questões com resultado oficial`
                }
              />
            </tfoot>
          )}
        </table>
      </div>
      <p className="nota">
        UFOP e Brasil são os resultados oficiais do Enade; em verde, o acerto no simulado acima do
        Brasil; em vinho, abaixo. A comparação é só uma referência: o grupo do simulado é pequeno e
        as condições são diferentes das da prova oficial. Fonte dos dados oficiais: INEP, Relatórios
        de Curso do Enade {nomeDasEdicoes}.
      </p>
    </>
  );
}

// Resultado do Simulado Enade, separado das atividades do curso: quantos alunos fizeram e a média deles
function SimuladoEnade({ simulado }) {
  const { realizado, alunos, media: mediaDoSimulado, questoes, comparacao } = simulado;

  return (
    <section className="simulado-enade" aria-label="Simulado Enade">
      <h2>Simulado Enade</h2>
      <p>
        Resultado do simulado{questoes ? ` de ${questoes} questões` : ""}, mostrado à parte das
        atividades do curso: ele não entra na média geral acima.
      </p>
      {realizado ? (
        <div className="card-grid kpis">
          <div className="card kpi">
            <span className="kpi-valor">{alunos}</span>
            <span className="kpi-rotulo">
              {alunos === 1 ? "Aluno fez o simulado" : "Alunos fizeram o simulado"}
            </span>
          </div>
          <div className="card kpi">
            <span className="kpi-valor">{mediaDoSimulado}%</span>
            <span className="kpi-rotulo">Média no simulado</span>
          </div>
        </div>
      ) : (
        <p className="sem-dados">O simulado ainda não foi feito neste curso.</p>
      )}
      {comparacao && <TabelaDoSimulado comparacao={comparacao} />}
    </section>
  );
}

function Desempenho() {
  const [cursos, setCursos] = useState([]);
  const [sigla, setSigla] = useState("ec");
  const [erro, setErro] = useState(false);

  useEffect(() => {
    function carregar() {
      fetch(`${API_URL}/desempenho`, { cache: "no-store" })
        .then((response) => response.json())
        .then((dados) => {
          setCursos(dados);
          setErro(false);
        })
        .catch(() => setErro(true));
    }

    carregar();
    // Busca de novo quando a aba volta a ficar visível, pra pegar dados atualizados
    window.addEventListener("focus", carregar);
    return () => window.removeEventListener("focus", carregar);
  }, []);

  const d = cursos.find((c) => c.chave === sigla);

  const kpis = d
    ? [
        { rotulo: "Inscritos", valor: d.inscritos },
        { rotulo: "Concluíram", valor: d.concluintes },
        { rotulo: "Média geral", valor: `${d.media}%` },
      ]
    : [];

  return (
    <div>
      <h2>Desempenho geral dos alunos</h2>
      <p>
        Acompanhe o desempenho dos alunos no curso preparatório do moodle, com o número de inscritos
        e concluintes e o aproveitamento médio em cada atividade.
      </p>

      <div>
        {cursos.map((c) => (
          <button
            key={c.chave}
            className={c.chave === sigla ? "btn btn-selecionado" : "btn"}
            onClick={() => setSigla(c.chave)}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {erro && <p className="aviso">Não foi possível carregar os dados de desempenho.</p>}

      {d && (
        <>
          <div className="card-grid kpis">
            {kpis.map((k) => (
              <div key={k.rotulo} className="card kpi">
                <span className="kpi-valor">{k.valor}</span>
                <span className="kpi-rotulo">{k.rotulo}</span>
              </div>
            ))}
          </div>

          <h2>Aproveitamento médio por atividade</h2>
          <ul className="barras">
            {d.atividades.map((a) => (
              <li key={a.nome}>
                <span className="barra-nome">{a.nome}</span>
                <span className="barra-trilho">
                  <span
                    className={a.aproveitamento >= 60 ? "barra ok" : "barra baixo"}
                    style={{ width: `${a.aproveitamento}%` }}
                  />
                  <span className="barra-linha" />
                </span>
                <span className="barra-valor">{a.aproveitamento}%</span>
              </li>
            ))}
            <li className="barra-legenda" aria-hidden="true">
              <span />
              <span className="barra-trilho-legenda">
                <span className="barra-60">
                  60<span className="barra-60-pct">%</span>
                </span>
              </span>
              <span />
            </li>
          </ul>

          {d.simulado && <SimuladoEnade simulado={d.simulado} />}
        </>
      )}
    </div>
  );
}

export default Desempenho;
