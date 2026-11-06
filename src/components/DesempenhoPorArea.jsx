import { useState, useEffect } from "react";
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
      Fonte: INEP — Relatórios de Curso do Enade ({nome}, UFOP, João Monlevade). Cada área é a média
      simples do percentual de acerto das suas questões; ficam de fora as questões anuladas ou
      desconsideradas pelo INEP e as sem área associada. As áreas e os temas foram associados às
      questões pelo projeto, a partir das provas. O INEP informa que as notas só são comparáveis
      dentro do mesmo curso e ano, por isso a comparação mais segura é a diferença para o Brasil na
      mesma edição.
    </p>
  );
}

// Pergunta 1: como cada área foi ao longo das edições (uma linha por área, uma coluna por edição)
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
  // as áreas que apareceram em mais edições primeiro (dá para acompanhar a evolução)
  const linhas = [...porArea.entries()].sort(
    ([nomeA, a], [nomeB, b]) =>
      Object.keys(b).length - Object.keys(a).length || nomeA.localeCompare(nomeB, "pt-BR"),
  );

  return (
    <section>
      <h2>Desempenho de cada área ao longo das edições</h2>
      <p>
        Percentual médio de acerto dos concluintes da UFOP nas questões de cada área, edição por
        edição. Abaixo de cada número, a diferença para a média do Brasil na mesma edição.
      </p>

      <SeletorDeComponente componente={componente} aoEscolher={setComponente} />

      {linhas.length === 0 ? (
        <p className="sem-dados">Sem áreas associadas a questões neste componente.</p>
      ) : (
        <>
          <p className="dica-rolagem">Deslize a tabela para o lado para ver todas as edições.</p>
          <div className="tabela-rolavel">
            <table className="tabela-questoes tabela-evolucao">
              <thead>
                <tr>
                  <th>Área</th>
                  {edicoes.map((ano) => (
                    <th key={ano}>{ano}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map(([nome, porAno]) => (
                  <tr key={nome}>
                    <td>{nome}</td>
                    {edicoes.map((ano) => {
                      const area = porAno[ano];
                      if (!area)
                        return (
                          <td key={ano} className="num sem-edicao">
                            —
                          </td>
                        );
                      return (
                        <td key={ano} className={classeDaDiferenca(area.ufop, area.brasil)}>
                          {formatar(area.ufop)}
                          <Diferenca ufop={area.ufop} brasil={area.brasil} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {item.detalhe && <small className="detalhe">{item.detalhe}</small>}
              </td>
              <td className={classeDaDiferenca(item.ufop, item.brasil)}>{formatar(item.ufop)}</td>
              <td className="num">{formatar(item.brasil)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pergunta 2: em cada edição, as áreas e os temas com mais acertos e com mais erros
function MaioresAcertosEErros({ dados }) {
  const [ano, setAno] = useState(null); // nada aparece até o leitor clicar num ano
  const [componente, setComponente] = useState("especifico");
  const edicao = dados.porEdicao.find((e) => e.ano === ano);
  const QUANTOS = 5;

  // mais acertos primeiro; empate: mais questões / ordem da prova
  const porAcerto = (lista) => [...lista].sort((a, b) => b.ufop - a.ufop);
  const maiores = (lista) => porAcerto(lista).slice(0, QUANTOS);
  const menores = (lista) => porAcerto(lista).reverse().slice(0, QUANTOS);

  // cada componente da prova tem as suas listas
  const areas = (edicao?.areas ?? [])
    .filter((a) => a.componente === componente)
    .map((a) => ({
      chave: a.disciplina,
      nome: a.disciplina,
      detalhe: `${a.questoes} ${a.questoes === 1 ? "questão" : "questões"}`,
      ufop: a.ufop,
      brasil: a.brasil,
    }));
  const temas = (edicao?.temas ?? [])
    .filter((t) => t.componente === componente)
    .map((t) => ({
      chave: t.numero,
      nome: t.tema,
      detalhe: `${t.disciplina} · questão ${t.numero}`,
      ufop: t.ufop,
      brasil: t.brasil,
    }));

  return (
    <section>
      <h2>Áreas e temas com mais acertos e mais erros</h2>
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

          <div className="rankings">
            <Ranking
              titulo="Áreas com mais acertos (% de acerto)"
              nomeColuna="Área"
              itens={maiores(areas)}
            />
            <Ranking
              titulo="Áreas com mais erros (% de erro)"
              nomeColuna="Área"
              itens={menores(areas)}
            />
            <Ranking
              titulo="Temas com mais acertos (% de acerto)"
              nomeColuna="Tema"
              itens={maiores(temas)}
            />
            <Ranking
              titulo="Temas com mais erros (% de erro)"
              nomeColuna="Tema"
              itens={menores(temas)}
            />
          </div>

          <NotaDeFonte nome={dados.nome} />
        </>
      )}
    </section>
  );
}

// Desempenho por área de um curso, com base nas tabelas de acertos por questão do INEP.
// `parte` escolhe o que mostrar: "evolucao" (cada área ao longo das edições) ou
// "rankings" (áreas e temas com mais acertos e mais erros em cada edição).
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
      <p className="sem-dados">O desempenho por área ainda não está disponível para este curso.</p>
    );
  }

  return (
    <div>
      {erro && <p className="aviso">Não foi possível carregar o desempenho por área.</p>}

      {dados && dados.edicoes.length === 0 && (
        <p className="sem-dados">
          O desempenho por área ainda não está disponível para este curso.
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
