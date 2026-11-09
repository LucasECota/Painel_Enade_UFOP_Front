import { useState, useEffect } from "react";
import { API_URL } from "../api";

const formatar = (v) =>
  v === null || v === undefined
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ALTERNATIVAS = ["A", "B", "C", "D", "E", "SI"];

// Colunas de "% de acertos". "dica" é o texto que aparece ao passar o mouse sobre o nome da coluna.
// As colunas "sempre" aparecem na tabela resumida; o resto só quando o leitor pede "todas as colunas".
// O grupo do último item da tabela resumida é escolhido pelo leitor (Brasil, Estado, Região...).
const COLUNAS_ACERTO = [
  {
    chave: "curso",
    titulo: "UFOP",
    opcao: "UFOP",
    dica: "Percentual de concluintes deste curso na UFOP (João Monlevade) que acertaram a questão.",
  },
  {
    chave: "uf",
    titulo: "Estado",
    opcao: "Estado (UF)",
    dica: "Estado (UF): percentual de acertos dos concluintes do mesmo curso nas instituições do mesmo estado da UFOP (Minas Gerais).",
  },
  {
    chave: "regiao",
    titulo: "Região",
    opcao: "Região",
    dica: "Região: percentual de acertos dos concluintes do mesmo curso nas instituições da mesma Grande Região da UFOP (Sudeste).",
  },
  {
    chave: "catAdm",
    titulo: "Cat. adm.",
    opcao: "Categoria administrativa",
    dica: "Categoria administrativa: percentual de acertos dos concluintes do mesmo curso em instituições da mesma categoria da UFOP (pública federal).",
  },
  {
    chave: "orgAcad",
    titulo: "Org. acad.",
    opcao: "Organização acadêmica",
    dica: "Organização acadêmica: percentual de acertos dos concluintes do mesmo curso em instituições do mesmo tipo da UFOP (universidade, em vez de centro universitário ou faculdade).",
  },
  {
    chave: "brasil",
    titulo: "Brasil",
    opcao: "Brasil",
    dica: "Brasil: percentual de acertos dos concluintes do mesmo curso em todo o país.",
  },
];

// Os grupos com que a UFOP pode ser comparada (tudo menos a própria UFOP)
const GRUPOS_DE_COMPARACAO = COLUNAS_ACERTO.filter((c) => c.chave !== "curso");
const grupo = (chave) => COLUNAS_ACERTO.find((c) => c.chave === chave);

const DICA_ALTERNATIVA = (a) =>
  a === "SI"
    ? "SI: concluintes da UFOP que deixaram a questão sem resposta ou marcaram mais de uma alternativa."
    : `Percentual de concluintes da UFOP que marcaram a alternativa ${a}.`;

// UFOP acima ou abaixo do grupo escolhido: só uma cor discreta no número
function classeDoCurso(acertos, comparar) {
  const outro = acertos[comparar];
  if (outro === null || outro === undefined) return "num";
  if (acertos.curso > outro) return "num curso-acima";
  if (acertos.curso < outro) return "num curso-abaixo";
  return "num";
}

// Ordena as questões por número ou pelo acerto da UFOP. Anuladas e desconsideradas (sem percentual)
// ficam sempre no fim quando se ordena pelo acerto.
function ordenar(questoes, { coluna, sentido }) {
  const fator = sentido === "asc" ? 1 : -1;
  return [...questoes].sort((x, y) => {
    if (coluna === "numero") return (x.numero - y.numero) * fator;
    const xv = x.situacao === "valida" ? x.acertos.curso : null;
    const yv = y.situacao === "valida" ? y.acertos.curso : null;
    if (xv === null && yv === null) return x.numero - y.numero;
    if (xv === null) return 1;
    if (yv === null) return -1;
    return (xv - yv) * fator || x.numero - y.numero;
  });
}

// Cabeçalho que ordena ao clicar (crescente, e de novo para decrescente)
function BotaoOrdenar({ coluna, rotulo, dica, ordem, aoOrdenar }) {
  const ativa = ordem.coluna === coluna;
  const indicador = !ativa ? "⇅" : ordem.sentido === "asc" ? "▲" : "▼";
  return (
    <button
      type="button"
      className={ativa ? "ordenar ativa" : "ordenar"}
      title={dica}
      onClick={() => aoOrdenar(coluna)}
    >
      {rotulo} <span aria-hidden="true">{indicador}</span>
    </button>
  );
}

function SeletorDeComparacao({ comparar, aoComparar }) {
  return (
    <select
      className="seletor-comparacao"
      aria-label="Comparar a UFOP com"
      title={grupo(comparar).dica}
      value={comparar}
      onChange={(e) => aoComparar(e.target.value)}
    >
      {GRUPOS_DE_COMPARACAO.map((g) => (
        <option key={g.chave} value={g.chave}>
          {g.opcao}
        </option>
      ))}
    </select>
  );
}

function TabelaDoComponente({ componente, completa, ordem, aoOrdenar, comparar, aoComparar }) {
  // tabela resumida: a UFOP e o grupo escolhido; completa: todos os grupos
  const colunasAcerto = completa ? COLUNAS_ACERTO : [COLUNAS_ACERTO[0], grupo(comparar)];
  const sentidoAria = (coluna) =>
    ordem.coluna === coluna ? (ordem.sentido === "asc" ? "ascending" : "descending") : "none";

  return (
    <>
      <h3 className="tabela-titulo">{componente.titulo}</h3>
      <p className="dica-rolagem">Deslize a tabela para o lado para ver todas as colunas.</p>
      <div className="tabela-rolavel">
        <table className="tabela-questoes">
          <thead>
            <tr>
              <th
                rowSpan={2}
                aria-sort={sentidoAria("numero")}
                title="Número da questão na prova. Clique para ordenar."
              >
                <BotaoOrdenar
                  coluna="numero"
                  rotulo="Questão"
                  dica="Ordenar pelo número da questão"
                  ordem={ordem}
                  aoOrdenar={aoOrdenar}
                />
              </th>
              <th
                rowSpan={2}
                title="Disciplina associada à questão (associação feita pelo projeto, a partir das provas)."
              >
                Disciplina
              </th>
              <th
                rowSpan={2}
                title="Tema da questão (associação feita pelo projeto, a partir das provas)."
              >
                Tema
              </th>
              <th
                colSpan={colunasAcerto.length}
                title="Percentual de concluintes que acertaram a questão."
              >
                % de acertos
              </th>
              <th
                rowSpan={2}
                title="Alternativa correta. Anulada: a comissão anulou a questão. Desconsiderada: o INEP deixou a questão fora do cálculo da nota."
              >
                Gabarito
              </th>
              {completa && (
                <th
                  colSpan={ALTERNATIVAS.length}
                  title="Como os concluintes da UFOP responderam: percentual que marcou cada alternativa."
                >
                  Respostas da UFOP (%)
                </th>
              )}
            </tr>
            <tr>
              {colunasAcerto.map((c) => {
                if (c.chave === "curso") {
                  return (
                    <th key={c.chave} aria-sort={sentidoAria("ufop")}>
                      <BotaoOrdenar
                        coluna="ufop"
                        rotulo="UFOP"
                        dica={`${c.dica} Clique para ordenar.`}
                        ordem={ordem}
                        aoOrdenar={aoOrdenar}
                      />
                    </th>
                  );
                }
                // na tabela resumida, o grupo da comparação é escolhido aqui, no próprio cabeçalho
                if (!completa) {
                  return (
                    <th key={c.chave} title={c.dica}>
                      <SeletorDeComparacao comparar={comparar} aoComparar={aoComparar} />
                    </th>
                  );
                }
                return (
                  <th key={c.chave} title={c.dica}>
                    {c.titulo}
                  </th>
                );
              })}
              {completa &&
                ALTERNATIVAS.map((a) => (
                  <th key={a} title={DICA_ALTERNATIVA(a)}>
                    {a}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {ordenar(componente.questoes, ordem).map((q) => {
              const valida = q.situacao === "valida";
              return (
                <tr key={q.numero} className={valida ? undefined : "questao-fora"}>
                  <td className="num questao-numero">{q.numero}</td>
                  <td>{q.disciplina || "—"}</td>
                  <td>{q.tema || "—"}</td>
                  {colunasAcerto.map((c) => (
                    <td
                      key={c.chave}
                      className={
                        c.chave === "curso" && valida ? classeDoCurso(q.acertos, comparar) : "num"
                      }
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
    </>
  );
}

// Tabela de acertos por questão de um curso, com a disciplina e o tema de cada uma.
// "anos" são as edições que têm a tabela (do mais recente para o mais antigo).
function TabelaQuestoes({ chave, anos }) {
  const [ano, setAno] = useState(null); // nada aparece até o leitor clicar num ano
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [completa, setCompleta] = useState(false);
  const [ordem, setOrdem] = useState({ coluna: "numero", sentido: "asc" });
  const [comparar, setComparar] = useState("brasil"); // com quem a UFOP é comparada (cores e coluna)

  // Clicar na coluna ordena de forma crescente; clicar de novo inverte
  function ordenarPor(coluna) {
    setOrdem((atual) =>
      atual.coluna === coluna
        ? { coluna, sentido: atual.sentido === "asc" ? "desc" : "asc" }
        : { coluna, sentido: "asc" },
    );
  }

  // Clicar num ano mostra a tabela dele; clicar de novo no mesmo ano esconde.
  // Ao trocar de ano, a tabela anterior fica na tela até a nova chegar (apagar antes fazia a
  // página encolher e crescer de novo, e isso aparecia como uma piscada).
  function escolherAno(a) {
    if (a === ano) {
      setAno(null);
      setDados(null);
      setErro(false);
    } else {
      setAno(a);
    }
  }

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
        Veja quantos concluintes acertaram cada questão do Enade, comparando a UFOP com o Brasil, e
        a disciplina e o tema de cada uma.
      </p>

      <div>
        <p>Edições com a tabela disponível:</p>
        {anos.map((a) => (
          <button
            key={a}
            className={a === ano ? "btn btn-selecionado" : "btn"}
            onClick={() => escolherAno(a)}
          >
            {a}
          </button>
        ))}
      </div>

      {erro && <p className="aviso">Não foi possível carregar a tabela de questões.</p>}

      {dados && (
        <div className={dados.ano === ano ? undefined : "carregando"}>
          <h2>Acertos por questão — Enade {dados.ano}</h2>

          <div className="acoes-tabela">
            <button className="btn btn-claro" onClick={() => setCompleta((v) => !v)}>
              {completa ? "Ver menos colunas" : "Ver todas as colunas"}
            </button>
            {completa && (
              // na tabela completa todos os grupos aparecem como colunas; aqui se escolhe com qual deles
              // o número da UFOP é comparado (a cor verde ou vinho)
              <label className="comparar-cores">
                Cor do número da UFOP, comparando com:{" "}
                <SeletorDeComparacao comparar={comparar} aoComparar={setComparar} />
              </label>
            )}
            <a
              className="btn btn-link"
              href={`${API_URL}/relatorios/curso/${chave}/${dados.ano}/download`}
            >
              Baixar relatório do INEP (PDF)
            </a>
          </div>

          {dados.componentes.map((componente) => (
            <TabelaDoComponente
              key={componente.tipo}
              componente={componente}
              completa={completa}
              ordem={ordem}
              aoOrdenar={ordenarPor}
              comparar={comparar}
              aoComparar={setComparar}
            />
          ))}

          <p className="nota">
            <strong>% de acertos:</strong> parcela dos concluintes que acertou a questão. A coluna
            UFOP é a dos concluintes deste curso na UFOP; as demais, dos concluintes do mesmo curso
            nos outros grupos. <strong>Desconsiderada:</strong> o INEP deixou a questão fora do
            cálculo da nota (critério estatístico). <strong>Anulada:</strong> anulada pela comissão.
            {completa && (
              <>
                {" "}
                <strong>SI:</strong> sem resposta ou com mais de uma.
              </>
            )}
          </p>
          <p className="nota">Fonte: {dados.fonte}.</p>
        </div>
      )}
    </div>
  );
}

export default TabelaQuestoes;
