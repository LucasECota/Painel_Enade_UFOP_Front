import { useState, useEffect } from "react";
import { API_URL } from "../api";
import Topico from "./Topico";
import ListaDeRelatorios from "./ListaDeRelatorios";
import VerQuestao from "./QuestaoModal";

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

// Ordena as questões por número, disciplina, tema (ordem alfabética) ou pelo acerto da UFOP.
// Questões sem disciplina/tema (ou anuladas e desconsideradas, quando se ordena pelo acerto)
// ficam sempre no fim.
function ordenar(questoes, { coluna, sentido }) {
  const fator = sentido === "asc" ? 1 : -1;
  return [...questoes].sort((x, y) => {
    if (coluna === "numero") return (x.numero - y.numero) * fator;
    if (coluna === "disciplina" || coluna === "tema") {
      const xt = x[coluna];
      const yt = y[coluna];
      if (!xt && !yt) return x.numero - y.numero;
      if (!xt) return 1;
      if (!yt) return -1;
      return xt.localeCompare(yt, "pt-BR") * fator || x.numero - y.numero;
    }
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

// Estado de ordenação de uma tabela: clicar na coluna ordena de forma crescente; clicar de novo inverte.
// Cada tabela tem o seu, então ordenar uma não muda as outras.
function useOrdem() {
  const [ordem, setOrdem] = useState({ coluna: "numero", sentido: "asc" });
  const ordenarPor = (coluna) =>
    setOrdem((atual) =>
      atual.coluna === coluna
        ? { coluna, sentido: atual.sentido === "asc" ? "desc" : "asc" }
        : { coluna, sentido: "asc" },
    );
  return [ordem, ordenarPor];
}

// Na tabela completa todos os grupos aparecem como colunas; aqui se escolhe com qual deles o número
// da UFOP é comparado (a cor verde ou vinho). Cada tabela tem a sua escolha.
function EscolhaDaCor({ comparar, aoComparar }) {
  return (
    <label className="comparar-cores">
      Cor do número da UFOP, comparando com:{" "}
      <SeletorDeComparacao comparar={comparar} aoComparar={aoComparar} />
    </label>
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

// Caixa fechada com os relatórios de curso do INEP para baixar (uma linha por edição com tabela).
// Os tamanhos vêm da API; se ela não responder, a lista aparece igual, só sem o tamanho.
function RelatoriosParaBaixar({ chave, anos }) {
  const [daApi, setDaApi] = useState([]);

  useEffect(() => {
    let cancelado = false;
    fetch(`${API_URL}/relatorios/curso`)
      .then((r) => r.json())
      .then((lista) => {
        if (!cancelado && Array.isArray(lista)) setDaApi(lista.filter((r) => r.curso === chave));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [chave]);

  const itens = anos.map((ano) => {
    const r = daApi.find((x) => x.ano === ano);
    return {
      chave: ano,
      titulo: r?.titulo ?? `Enade ${ano} — Relatório de curso`,
      descricao: r?.descricao ?? "UFOP, campus João Monlevade",
      tamanhoMb: r?.tamanhoMb,
      href: `${API_URL}/relatorios/curso/${chave}/${ano}/download`,
    };
  });

  return (
    <Topico titulo="Relatórios do INEP para baixar">
      <ListaDeRelatorios nome="Relatórios de curso" itens={itens} />
    </Topico>
  );
}

// Tabela dentro da mesma caixinha das outras páginas (título e setinha à direita): já começa aberta
function SecaoRecolhivel({ titulo, children }) {
  return (
    <Topico titulo={titulo} aberto comoTitulo>
      {children}
    </Topico>
  );
}

// Ordena as discursivas pelo número, componente, disciplina, tema (alfabética) ou pela nota média da UFOP.
// Sem dado (disciplina, tema ou nota) fica sempre no fim.
function ordenarDiscursivas(linhas, { coluna, sentido }) {
  const fator = sentido === "asc" ? 1 : -1;
  const numero = (q) => Number(String(q.numero).replace(/\D/g, ""));
  return [...linhas].sort((x, y) => {
    if (coluna === "numero") return (numero(x) - numero(y)) * fator;
    if (coluna === "ufop") {
      const xv = x.notas?.curso?.media ?? null;
      const yv = y.notas?.curso?.media ?? null;
      if (xv === null && yv === null) return numero(x) - numero(y);
      if (xv === null) return 1;
      if (yv === null) return -1;
      return (xv - yv) * fator || numero(x) - numero(y);
    }
    const xt = x[coluna];
    const yt = y[coluna];
    if (!xt && !yt) return numero(x) - numero(y);
    if (!xt) return 1;
    if (!yt) return -1;
    return xt.localeCompare(yt, "pt-BR") * fator || numero(x) - numero(y);
  });
}

// Tabela só com as questões discursivas (Formação Geral e Componente Específico juntas): a nota média
// (0 a 100) dos concluintes da UFOP e do grupo escolhido para comparação, com o botão para ver a questão.
// Tem os mesmos filtros das outras tabelas: ordenar pelas colunas e escolher o grupo da comparação.
// As discursivas não têm gabarito: a nota é uma média das notas dadas pelos corretores.
function TabelaDasDiscursivas({ componentes, completa }) {
  const [ordem, ordenarPor] = useOrdem();
  const [comparar, aoComparar] = useState("brasil");
  const todas = componentes.flatMap((c) =>
    (c.discursivas ?? []).map((q) => ({ ...q, componente: c.titulo })),
  );
  if (todas.length === 0) return null;
  const linhas = ordenarDiscursivas(todas, ordem);
  const grupos = completa ? COLUNAS_ACERTO : [COLUNAS_ACERTO[0], grupo(comparar)];

  const sentidoAria = (coluna) =>
    ordem.coluna === coluna ? (ordem.sentido === "asc" ? "ascending" : "descending") : "none";
  const colunaOrdenavel = (coluna, rotulo, dica) => (
    <th rowSpan={2} aria-sort={sentidoAria(coluna)} title={`${dica} Clique para ordenar.`}>
      <BotaoOrdenar
        coluna={coluna}
        rotulo={rotulo}
        dica={`Ordenar pela coluna ${rotulo}`}
        ordem={ordem}
        aoOrdenar={ordenarPor}
      />
    </th>
  );

  return (
    <SecaoRecolhivel titulo="Questões discursivas">
      {completa && <EscolhaDaCor comparar={comparar} aoComparar={aoComparar} />}
      <p className="dica-rolagem">Deslize a tabela para o lado para ver todas as colunas.</p>
      <div className="tabela-rolavel">
        <table className="tabela-questoes tabela-discursivas">
          <thead>
            <tr>
              {colunaOrdenavel("numero", "Questão", "Questão discursiva da prova.")}
              {colunaOrdenavel("componente", "Componente", "Componente da prova.")}
              {colunaOrdenavel(
                "disciplina",
                "Disciplina",
                "Disciplina associada à questão (associação feita pelo projeto, a partir das provas).",
              )}
              {colunaOrdenavel(
                "tema",
                "Tema",
                "Tema da questão (associação feita pelo projeto, a partir das provas).",
              )}
              <th
                colSpan={grupos.length}
                title="Média das notas dos concluintes na questão, de 0 a 100 (a questão discursiva é corrigida por avaliadores)."
              >
                Nota média (0 a 100)
              </th>
            </tr>
            <tr>
              {grupos.map((g) => {
                if (g.chave === "curso") {
                  return (
                    <th key={g.chave} aria-sort={sentidoAria("ufop")}>
                      <BotaoOrdenar
                        coluna="ufop"
                        rotulo="UFOP"
                        dica={`${g.dica} Clique para ordenar.`}
                        ordem={ordem}
                        aoOrdenar={ordenarPor}
                      />
                    </th>
                  );
                }
                // na tabela resumida, o grupo da comparação é escolhido aqui, como nas outras tabelas
                if (!completa) {
                  return (
                    <th key={g.chave} title={g.dica}>
                      <SeletorDeComparacao comparar={comparar} aoComparar={aoComparar} />
                    </th>
                  );
                }
                return (
                  <th key={g.chave} title={g.dica}>
                    {g.titulo}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {linhas.map((q) => (
              <tr key={`${q.componente}-${q.numero}`}>
                <td className="num questao-numero">
                  <div className="numero-e-botao">
                    <span className="numero">{q.numero}</span>
                    <VerQuestao
                      compacto
                      questao={{
                        id: q.numero,
                        tipo: "discursiva",
                        tema: q.tema,
                        imagem: q.imagem,
                      }}
                    />
                  </div>
                </td>
                <td>{q.componente}</td>
                <td>{q.disciplina || "—"}</td>
                <td>{q.tema || "—"}</td>
                {grupos.map((g) => {
                  const media = q.notas?.[g.chave]?.media;
                  const referencia = q.notas?.[comparar]?.media;
                  const classe =
                    g.chave === "curso" &&
                    typeof media === "number" &&
                    typeof referencia === "number"
                      ? media > referencia
                        ? "num curso-acima"
                        : media < referencia
                          ? "num curso-abaixo"
                          : "num"
                      : "num";
                  return (
                    <td key={g.chave} className={classe}>
                      {typeof media === "number" ? formatar(media) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SecaoRecolhivel>
  );
}

function TabelaDoComponente({ componente, completa }) {
  const [ordem, aoOrdenar] = useOrdem();
  const [comparar, aoComparar] = useState("brasil"); // com quem a UFOP é comparada nesta tabela
  // tabela resumida: a UFOP e o grupo escolhido; completa: todos os grupos
  const colunasAcerto = completa ? COLUNAS_ACERTO : [COLUNAS_ACERTO[0], grupo(comparar)];
  const sentidoAria = (coluna) =>
    ordem.coluna === coluna ? (ordem.sentido === "asc" ? "ascending" : "descending") : "none";

  return (
    <SecaoRecolhivel titulo={componente.titulo}>
      {completa && <EscolhaDaCor comparar={comparar} aoComparar={aoComparar} />}
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
                aria-sort={sentidoAria("disciplina")}
                title="Disciplina associada à questão (associação feita pelo projeto, a partir das provas). Clique para ordenar."
              >
                <BotaoOrdenar
                  coluna="disciplina"
                  rotulo="Disciplina"
                  dica="Ordenar a tabela pela disciplina, em ordem alfabética"
                  ordem={ordem}
                  aoOrdenar={aoOrdenar}
                />
              </th>
              <th
                rowSpan={2}
                aria-sort={sentidoAria("tema")}
                title="Tema da questão (associação feita pelo projeto, a partir das provas). Clique para ordenar."
              >
                <BotaoOrdenar
                  coluna="tema"
                  rotulo="Tema"
                  dica="Ordenar a tabela pelo tema, em ordem alfabética"
                  ordem={ordem}
                  aoOrdenar={aoOrdenar}
                />
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
                  <td className="num questao-numero">
                    <div className="numero-e-botao">
                      <span className="numero">{q.numero}</span>
                      <VerQuestao
                        compacto
                        questao={{
                          id: String(q.numero),
                          tipo: "objetiva",
                          tema: q.tema,
                          // desconsiderada: o relatório não traz o gabarito, mas a prova tem
                          gabarito: q.gabarito ?? q.gabaritoDaProva ?? null,
                          situacao: q.situacao,
                          imagem: q.imagem,
                        }}
                      />
                    </div>
                  </td>
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
    </SecaoRecolhivel>
  );
}

// Tabela de acertos por questão de um curso, com a disciplina e o tema de cada uma.
// "anos" são as edições que têm a tabela (do mais recente para o mais antigo).
function TabelaQuestoes({ chave, anos }) {
  const [ano, setAno] = useState(null); // nada aparece até o leitor clicar num ano
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [completa, setCompleta] = useState(false);

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
          </div>

          {dados.componentes.map((componente) => (
            <TabelaDoComponente key={componente.tipo} componente={componente} completa={completa} />
          ))}

          <TabelaDasDiscursivas componentes={dados.componentes} completa={completa} />

          <p className="nota">
            <strong>% de acertos:</strong> parcela dos concluintes que acertou a questão. A coluna
            UFOP é a dos concluintes deste curso na UFOP; as demais, dos concluintes do mesmo curso
            nos outros grupos. <strong>Desconsiderada:</strong> o INEP deixou a questão fora do
            cálculo da nota (critério estatístico). <strong>Anulada:</strong> anulada pela comissão.
            <strong> Nota média (discursivas):</strong> média das notas, de 0 a 100, dos concluintes
            na questão discursiva. Cada tabela tem a sua ordenação e o seu grupo de comparação.
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

      <RelatoriosParaBaixar chave={chave} anos={anos} />
    </div>
  );
}

export default TabelaQuestoes;
