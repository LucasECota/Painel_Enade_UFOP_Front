import { useState, useEffect } from "react";
import { API_URL } from "../api";
import Topico from "./Topico";

const formatar = (v) =>
  v === null || v === undefined
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ALTERNATIVAS = ["A", "B", "C", "D", "E", "SI"];

// colunas de "Percentual de acertos": as duas primeiras e a última aparecem sempre,
// o resto só quando o leitor pede "todas as colunas"
const COLUNAS_ACERTO = [
  { chave: "curso", titulo: "Curso", dica: "Concluintes do curso", sempre: true },
  { chave: "uf", titulo: "UF", dica: "Concluintes da mesma UF" },
  { chave: "regiao", titulo: "Região", dica: "Concluintes da mesma região" },
  { chave: "catAdm", titulo: "Cat. adm.", dica: "Mesma categoria administrativa" },
  { chave: "orgAcad", titulo: "Org. acad.", dica: "Mesma organização acadêmica" },
  { chave: "brasil", titulo: "Brasil", dica: "Concluintes do Brasil", sempre: true },
];

// Curso acima ou abaixo da média do Brasil: só uma cor discreta no número
function classeDoCurso(acertos) {
  if (acertos.curso > acertos.brasil) return "num curso-acima";
  if (acertos.curso < acertos.brasil) return "num curso-abaixo";
  return "num";
}

function TabelaDoComponente({ componente, completa }) {
  const colunasAcerto = COLUNAS_ACERTO.filter((c) => completa || c.sempre);

  return (
    <Topico titulo={componente.titulo}>
      <p className="dica-rolagem">Deslize a tabela para o lado para ver todas as colunas.</p>
      <div className="tabela-rolavel">
        <table className="tabela-questoes">
          <thead>
            <tr>
              <th rowSpan={2}>Questão</th>
              <th rowSpan={2}>Disciplina</th>
              <th rowSpan={2}>Tema</th>
              <th colSpan={colunasAcerto.length}>% de acertos</th>
              <th rowSpan={2}>Gabarito</th>
              {completa && <th colSpan={ALTERNATIVAS.length}>Respostas do curso (%)</th>}
            </tr>
            <tr>
              {colunasAcerto.map((c) => (
                <th key={c.chave} title={c.dica}>
                  {c.titulo}
                </th>
              ))}
              {completa &&
                ALTERNATIVAS.map((a) => (
                  <th
                    key={a}
                    title={a === "SI" ? "Sem resposta ou mais de uma resposta" : undefined}
                  >
                    {a}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {componente.questoes.map((q) => {
              const valida = q.situacao === "valida";
              return (
                <tr key={q.numero} className={valida ? undefined : "questao-fora"}>
                  <td className="num questao-numero">{q.numero}</td>
                  <td>{q.disciplina || "—"}</td>
                  <td>{q.tema || "—"}</td>
                  {colunasAcerto.map((c) => (
                    <td
                      key={c.chave}
                      className={c.chave === "curso" && valida ? classeDoCurso(q.acertos) : "num"}
                    >
                      {valida ? formatar(q.acertos[c.chave]) : "—"}
                    </td>
                  ))}
                  <td className="num gabarito">
                    {valida ? q.gabarito : q.situacao === "anulada" ? "Anulada" : "Desconsiderada"}
                  </td>
                  {completa &&
                    ALTERNATIVAS.map((a) => (
                      <td key={a} className={valida && a === q.gabarito ? "num certa" : "num"}>
                        {valida ? formatar(q.respostas[a]) : "—"}
                      </td>
                    ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Topico>
  );
}

// Tabela de acertos por questão de um curso, com a disciplina e o tema de cada uma.
// "anos" são as edições que têm a tabela (do mais recente para o mais antigo).
function TabelaQuestoes({ chave, anos }) {
  const [ano, setAno] = useState(anos[0] ?? null);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [completa, setCompleta] = useState(false);

  useEffect(() => {
    if (!ano) return;
    let cancelado = false;

    fetch(`${API_URL}/enade/${chave}/questoes?ano=${ano}`)
      .then((response) => {
        if (!response.ok) throw new Error("sem tabela");
        return response.json();
      })
      .then((resultado) => {
        if (cancelado) return;
        setDados(resultado);
        setErro(false);
      })
      .catch(() => {
        if (cancelado) return;
        setDados(null);
        setErro(true);
      });

    return () => {
      cancelado = true;
    };
  }, [chave, ano]);

  if (anos.length === 0) {
    return (
      <p className="sem-dados">
        A tabela de acertos por questão ainda não está disponível para este curso.
      </p>
    );
  }

  return (
    <div>
      <p>
        Veja quantos concluintes acertaram cada questão do Enade, comparando o curso com o Brasil, e
        a disciplina e o tema de cada uma.
      </p>

      {anos.length > 1 && (
        <div>
          <p>Edições com a tabela disponível:</p>
          {anos.map((a) => (
            <button
              key={a}
              className={a === ano ? "btn btn-selecionado" : "btn"}
              onClick={() => setAno(a)}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="aviso">Não foi possível carregar a tabela de questões.</p>}

      {dados && (
        <>
          <h2>Acertos por questão — Enade {dados.ano}</h2>
          <button className="btn btn-claro" onClick={() => setCompleta((v) => !v)}>
            {completa ? "Ver menos colunas" : "Ver todas as colunas"}
          </button>

          {dados.componentes.map((componente) => (
            <TabelaDoComponente key={componente.tipo} componente={componente} completa={completa} />
          ))}

          <p className="nota">
            <strong>% de acertos:</strong> parcela dos concluintes que acertou a questão.{" "}
            <strong>Desconsiderada:</strong> o INEP deixou a questão fora do cálculo da nota
            (critério estatístico). <strong>Anulada:</strong> anulada pela comissão.
            {completa && (
              <>
                {" "}
                <strong>SI:</strong> sem resposta ou com mais de uma.
              </>
            )}
          </p>
          <p className="nota">Fonte: {dados.fonte}.</p>
        </>
      )}
    </div>
  );
}

export default TabelaQuestoes;
