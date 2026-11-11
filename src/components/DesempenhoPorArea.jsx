import { useState, useEffect } from "react";
import GraficoEvolucao from "./GraficoEvolucao";
import VerQuestao from "./QuestaoModal";
import { cache, carregarDesempenho } from "../desempenhoCache";

const formatar = (v) =>
  v === null || v === undefined
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const COMPONENTES = [
  { chave: "formacaoGeral", titulo: "Formação Geral" },
  { chave: "especifico", titulo: "Componente Específico" },
];

// UFOP acima (verde) ou abaixo (vinho) do Brasil, a mesma cor da tabela de questões.
// Vale também nas listas de erros: vinho é a UFOP ter ido pior que o Brasil.
const classeDaDiferenca = (ufop, brasil) =>
  ufop > brasil ? "num curso-acima" : ufop < brasil ? "num curso-abaixo" : "num";

// Seta com a diferença da UFOP para o Brasil: ▲ verde (acima) ou ▼ vinho (abaixo), em pontos percentuais
function Diferenca({ ufop, brasil }) {
  const dif = Math.round((ufop - brasil) * 10) / 10;
  if (dif === 0) return <small className="dif-igual">igual ao Brasil</small>;
  return (
    <small className={dif > 0 ? "dif-acima" : "dif-abaixo"}>
      {dif > 0 ? "▲" : "▼"} {formatar(Math.abs(dif))}
    </small>
  );
}

// Botões para escolher entre Formação Geral e Componente Específico
function SeletorDeComponente({ componente, aoEscolher }) {
  return (
    <div className="subtopicos" role="group" aria-label="Componente da prova">
      {COMPONENTES.map((c) => (
        <button
          key={c.chave}
          className={c.chave === componente ? "subtopico ativo" : "subtopico"}
          aria-pressed={c.chave === componente}
          onClick={() => aoEscolher(c.chave)}
        >
          {c.titulo}
        </button>
      ))}
    </div>
  );
}

// Fonte e ressalvas: aparece junto do conteúdo (nas listas, só depois de escolher a edição)
function NotaDeFonte({ nome }) {
  return (
    <p className="nota">
      Fonte: INEP — Relatórios de Curso do Enade ({nome}, UFOP, João Monlevade). Cada disciplina é a
      média simples do percentual de acerto das suas questões; ficam de fora as questões anuladas ou
      desconsideradas pelo INEP e as sem disciplina associada. As disciplinas e os temas foram
      associados às questões pelo projeto, a partir das provas. O INEP informa que as notas só são
      comparáveis dentro do mesmo curso e ano, por isso a comparação mais segura é a diferença para
      o Brasil na mesma edição.
    </p>
  );
}

// Pergunta 1: como cada disciplina foi ao longo das edições (uma linha por disciplina, uma coluna por edição)
function EvolucaoPorArea({ dados }) {
  const [componente, setComponente] = useState("especifico");
  const edicoes = [...dados.edicoes].sort((a, b) => a - b); // da mais antiga para a mais recente

  const porArea = new Map();
  for (const edicao of dados.porEdicao) {
    for (const area of edicao.areas.filter((a) => a.componente === componente)) {
      if (!porArea.has(area.disciplina)) porArea.set(area.disciplina, {});
      porArea.get(area.disciplina)[edicao.ano] = area;
    }
  }
  // as disciplinas que apareceram em mais edições primeiro (dá para acompanhar a evolução)
  const linhas = [...porArea.entries()].sort(
    ([nomeA, a], [nomeB, b]) =>
      Object.keys(b).length - Object.keys(a).length || nomeA.localeCompare(nomeB, "pt-BR"),
  );

  return (
    <section>
      <h2>Desempenho de cada disciplina ao longo das edições</h2>
      <p>
        Percentual médio de acerto dos concluintes da UFOP nas questões de cada disciplina, edição
        por edição. Escolha uma disciplina para ver como a UFOP foi, edição por edição, em
        comparação com o Brasil.
      </p>

      <SeletorDeComponente componente={componente} aoEscolher={setComponente} />

      {linhas.length === 0 ? (
        <p className="sem-dados">Sem disciplinas associadas a questões neste componente.</p>
      ) : (
        <>
          <GraficoEvolucao
            key={componente}
            linhas={linhas}
            edicoes={edicoes}
            componente={componente}
          />
        </>
      )}
      <NotaDeFonte nome={dados.nome} />
    </section>
  );
}

// Lista curta de ranking: nome e acerto da UFOP e do Brasil (nas listas de erros, os piores primeiro)
function Ranking({ titulo, nomeColuna, itens }) {
  return (
    <div className="ranking">
      <h3>{titulo}</h3>
      <table className="tabela-questoes">
        <thead>
          <tr>
            <th>{nomeColuna}</th>
            <th>Acertos UFOP</th>
            <th>Acertos Brasil</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.chave}>
              <td>
                {item.nome}
                <div className={item.titulo ? "ranking-nome ranking-nome-curto" : "ranking-nome"}>
                  {item.detalhe && <small className="detalhe">{item.detalhe}</small>}
                  <VerQuestao questoes={item.questoes} titulo={item.titulo} />
                </div>
              </td>
              <td className={classeDaDiferenca(item.ufop, item.brasil)}>
                {formatar(item.ufop)}
                <Diferenca ufop={item.ufop} brasil={item.brasil} />
              </td>
              <td className="num">{formatar(item.brasil)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Grupo de botões de escolha única (mesmo visual dos outros seletores do site)
function Escolha({ rotulo, opcoes, valor, aoEscolher }) {
  return (
    <div className="subtopicos" role="group" aria-label={rotulo}>
      {opcoes.map(([chave, titulo]) => (
        <button
          key={chave}
          className={chave === valor ? "subtopico ativo" : "subtopico"}
          aria-pressed={chave === valor}
          onClick={() => aoEscolher(chave)}
        >
          {titulo}
        </button>
      ))}
    </div>
  );
}

const QUANTIDADES = [3, 5, 10];

// questão do ranking no formato do botão "Ver questão" (todas são objetivas e válidas)
const questaoDoRanking = (q) => ({
  id: String(q.numero),
  tipo: "objetiva",
  tema: q.tema,
  gabarito: q.gabarito,
  situacao: "valida",
  imagem: q.imagem,
});

// Pergunta 2: em cada edição, as disciplinas ou os temas com mais acertos e com mais erros.
// O leitor escolhe a edição, o componente, o que ver (disciplinas ou temas) e quantos itens
// mostrar. Mais acertos e mais erros aparecem sempre juntos.
function MaioresAcertosEErros({ dados }) {
  const [ano, setAno] = useState(null); // nada aparece até o leitor clicar num ano
  const [componente, setComponente] = useState("especifico");
  const [ver, setVer] = useState("disciplinas");
  const [quantos, setQuantos] = useState(5);
  const edicao = dados.porEdicao.find((e) => e.ano === ano);

  // mais acertos primeiro
  const porAcerto = (lista) => [...lista].sort((a, b) => b.ufop - a.ufop);

  // cada componente da prova tem as suas listas
  const doComponente = (lista) => (lista ?? []).filter((x) => x.componente === componente);
  const disciplinas = doComponente(edicao?.areas).map((a) => ({
    chave: a.disciplina,
    nome: a.disciplina,
    detalhe: `${a.questoes} ${a.questoes === 1 ? "questão" : "questões"}`,
    ufop: a.ufop,
    brasil: a.brasil,
    // todas as questões da disciplina (imagem e gabarito), em ordem de número
    titulo: a.disciplina,
    questoes: (a.lista ?? []).map((q) => ({ ...questaoDoRanking(q), tema: q.tema })),
  }));
  const temas = doComponente(edicao?.temas).map((t) => ({
    chave: t.numero,
    nome: t.tema,
    detalhe: `${t.disciplina} · questão ${t.numero}`,
    ufop: t.ufop,
    brasil: t.brasil,
    questoes: [questaoDoRanking(t)],
  }));

  const itens = ver === "disciplinas" ? disciplinas : temas;
  // Componente Específico: sempre 3, 5 ou 10. Formação Geral tem poucas disciplinas, então as opções
  // nunca passam do que existe: os 3, 5 e 10 que couberem e, no fim, o próprio total
  const opcoesDeQuantidade =
    componente === "especifico"
      ? QUANTIDADES
      : [...QUANTIDADES.filter((n) => n < itens.length), itens.length];
  // se a escolha anterior não é mais uma opção (ex.: era o total de outra lista), vale a maior opção que cabe nela
  const mostrar = opcoesDeQuantidade.includes(quantos)
    ? quantos
    : Math.max(...opcoesDeQuantidade.filter((n) => n <= quantos), opcoesDeQuantidade[0]);
  const maiores = (lista) => porAcerto(lista).slice(0, mostrar);
  const menores = (lista) => porAcerto(lista).reverse().slice(0, mostrar);
  const nomeColuna = ver === "disciplinas" ? "Disciplina" : "Tema";
  const plural = ver === "disciplinas" ? "Disciplinas" : "Temas";

  return (
    <section>
      <h2>Disciplinas e temas com mais acertos e mais erros</h2>
      <div>
        {dados.edicoes.map((a) => (
          <button
            key={a}
            className={a === ano ? "btn btn-selecionado" : "btn"}
            onClick={() => setAno(a === ano ? null : a)}
          >
            {a}
          </button>
        ))}
      </div>

      {edicao && (
        <>
          <SeletorDeComponente componente={componente} aoEscolher={setComponente} />

          <div className="filtros-ranking">
            <Escolha
              rotulo="Ver"
              opcoes={[
                ["disciplinas", "Disciplinas"],
                ["temas", "Temas"],
              ]}
              valor={ver}
              aoEscolher={setVer}
            />
            {itens.length > 0 && (
              <label className="filtro-select">
                Quantos
                <select value={mostrar} onChange={(e) => setQuantos(Number(e.target.value))}>
                  {opcoesDeQuantidade.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {itens.length === 0 ? (
            <p className="sem-dados">Sem questões para esta escolha.</p>
          ) : (
            <div className="rankings">
              <Ranking
                titulo={`${plural} com mais acertos (% de acerto)`}
                nomeColuna={nomeColuna}
                itens={maiores(itens)}
              />
              <Ranking
                titulo={`${plural} com mais erros (% de erro)`}
                nomeColuna={nomeColuna}
                itens={menores(itens)}
              />
            </div>
          )}

          <NotaDeFonte nome={dados.nome} />
        </>
      )}
    </section>
  );
}

// Desempenho por disciplina de um curso, com base nas tabelas de acertos por questão do INEP.
// `parte` escolhe o que mostrar: "evolucao" (cada disciplina ao longo das edições) ou
// "rankings" (disciplinas e temas com mais acertos e mais erros em cada edição).
function DesempenhoPorArea({ chave, anos, parte }) {
  // se os dados já estão guardados, a tela nasce completa, sem esperar a rede
  const [dados, setDados] = useState(() => cache.get(chave)?.resultado ?? null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (anos.length === 0) return;
    let cancelado = false;

    carregarDesempenho(chave)
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
  }, [chave, anos.length]);

  if (anos.length === 0) {
    return (
      <p className="sem-dados">
        O desempenho por disciplina ainda não está disponível para este curso.
      </p>
    );
  }

  return (
    <div>
      {erro && <p className="aviso">Não foi possível carregar o desempenho por disciplina.</p>}

      {dados && dados.edicoes.length === 0 && (
        <p className="sem-dados">
          O desempenho por disciplina ainda não está disponível para este curso.
        </p>
      )}

      {dados && dados.edicoes.length > 0 && (
        <>
          {parte === "evolucao" ? (
            <EvolucaoPorArea dados={dados} />
          ) : (
            <MaioresAcertosEErros dados={dados} />
          )}
        </>
      )}
    </div>
  );
}

export default DesempenhoPorArea;
