import { useState, useEffect } from "react";
import Topico from "../components/Topico";
import { API_URL } from "../api";

const formatar = (n) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Selo "acima/abaixo da média do Brasil" ao lado de cada comparação
function Diferenca({ curso, brasil }) {
  const dif = Math.round((curso - brasil) * 10) / 10;
  if (dif === 0) return <span className="selo selo-igual">igual ao Brasil</span>;
  return dif > 0 ? (
    <span className="selo selo-acima">▲ {formatar(dif)} acima do Brasil</span>
  ) : (
    <span className="selo selo-abaixo">▼ {formatar(Math.abs(dif))} abaixo do Brasil</span>
  );
}

// Duas barras (ICEA e Brasil) na mesma escala, de 0 a 100
function Barras({ curso, brasil, sufixo = "" }) {
  const linhas = [
    { nome: "ICEA", valor: curso, classe: "barra-icea" },
    { nome: "Brasil", valor: brasil, classe: "barra-brasil" },
  ];

  return (
    <div className="barras-duplas">
      {linhas.map((l) => (
        <div className="barra-dupla" key={l.nome}>
          <span className="barra-dupla-nome">{l.nome}</span>
          <span className="barra-dupla-trilho">
            <span className={l.classe} style={{ width: `${l.valor}%` }} />
          </span>
          <span className="barra-dupla-valor">
            {sufixo ? Math.round(l.valor) : formatar(l.valor)}
            {sufixo}
          </span>
        </div>
      ))}
    </div>
  );
}

// Cursos cujos relatórios de curso não são oferecidos para baixar nesta página
const CURSOS_SEM_RELATORIO_DE_CURSO = ["ec"];

// Lista de relatórios com o botão de baixar; sem itens, avisa que não há relatório.
function ListaDeRelatorios({ nome, itens }) {
  if (itens.length === 0) return <p className="nota">Nenhum relatório disponível.</p>;

  return (
    <ul className="relatorios" aria-label={nome}>
      {itens.map((r) => (
        <li key={r.chave}>
          <div>
            <strong>{r.titulo}</strong>
            <small>
              {r.descricao} · PDF, {formatar(r.tamanhoMb)} MB
            </small>
          </div>
          <a className="btn btn-link" href={r.href}>
            Baixar PDF
          </a>
        </li>
      ))}
    </ul>
  );
}

function Resultados() {
  const [dados, setDados] = useState(null);
  const [relatorios, setRelatorios] = useState([]);
  const [relatoriosDeCurso, setRelatoriosDeCurso] = useState([]);
  const [erro, setErro] = useState(false);
  const [chave, setChave] = useState("ec");

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/resultados`).then((r) => r.json()),
      fetch(`${API_URL}/relatorios`).then((r) => r.json()),
      // os relatórios de curso são um extra: se falharem, o resto da página continua
      fetch(`${API_URL}/relatorios/curso`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([resultados, lista, listaDeCurso]) => {
        setDados(resultados);
        setRelatorios(lista);
        setRelatoriosDeCurso(listaDeCurso);
      })
      .catch(() => setErro(true));
  }, []);

  const curso = dados?.cursos.find((c) => c.chave === chave);

  const comparacoes = curso
    ? [
        { titulo: "Nota geral na prova", ...curso.comparacao.geral },
        { titulo: "Formação Geral", ...curso.comparacao.formacaoGeral },
        { titulo: "Componente Específico", ...curso.comparacao.especifico },
      ]
    : [];

  const perfis = curso
    ? [
        { titulo: "Renda familiar de até 3 salários mínimos", ...curso.perfil.renda },
        { titulo: "Receberam auxílio permanência", ...curso.perfil.auxilio },
        { titulo: "Receberam bolsa acadêmica", ...curso.perfil.bolsa },
      ]
    : [];

  return (
    <div>
      <h1>Resultados do Enade no ICEA</h1>
      <p>
        Veja como os cursos do ICEA foram nas últimas edições do Enade, comparados com a média do
        Brasil, e baixe os relatórios oficiais do INEP.
      </p>

      {erro && <p className="aviso">Não foi possível carregar os resultados.</p>}

      {dados && (
        <>
          <div>
            {dados.cursos.map((c) => (
              <button
                key={c.chave}
                className={c.chave === chave ? "btn btn-selecionado" : "btn"}
                onClick={() => setChave(c.chave)}
              >
                {c.nome}
              </button>
            ))}
          </div>

          <Topico titulo="Conceito Enade em cada edição">
            <div className="conceitos">
              {curso.edicoes.map((e) => (
                <div className="conceito-col" key={e.ano}>
                  <span className="conceito-valor">{e.conceito}</span>
                  <span className="conceito-trilho">
                    <span
                      className="conceito-barra"
                      style={{ height: `${(e.conceito / 5) * 100}%` }}
                    />
                  </span>
                  <strong>{e.ano}</strong>
                  <small>{e.presentes} alunos</small>
                </div>
              ))}
            </div>
          </Topico>

          <Topico titulo={`Comparação com o Brasil — Enade ${curso.comparacao.ano}`}>
            <p>Média dos concluintes na prova, em uma escala de 0 a 100.</p>
            <div className="comparacoes">
              {comparacoes.map((c) => (
                <div className="comparacao" key={c.titulo}>
                  <div className="comparacao-topo">
                    <h3>{c.titulo}</h3>
                    <Diferenca curso={c.curso} brasil={c.brasil} />
                  </div>
                  <Barras curso={c.curso} brasil={c.brasil} />
                </div>
              ))}
            </div>
          </Topico>

          <Topico titulo={`Perfil dos concluintes — Enade ${curso.perfil.ano}`}>
            <p>
              Entre os {curso.perfil.presentes} concluintes que fizeram a prova, esta é a
              porcentagem em cada situação, comparada com o Brasil.
            </p>
            <div className="card-grid">
              {perfis.map((p) => (
                <div className="card perfil-card" key={p.titulo}>
                  <h3>{p.titulo}</h3>
                  <span className="perfil-valor">{Math.round(p.curso)}%</span>
                  <span className="perfil-brasil">No Brasil: {Math.round(p.brasil)}%</span>
                  <Barras curso={p.curso} brasil={p.brasil} sufixo="%" />
                </div>
              ))}
            </div>
          </Topico>

          <Topico titulo="Relatórios do INEP para baixar">
            <p>
              Relatórios oficiais de cada edição do Enade (UFOP, campus João Monlevade). IES
              significa Instituição de Educação Superior: o relatório da IES reúne os resultados de
              todos os cursos avaliados da UFOP em João Monlevade, e o relatório de curso traz os
              resultados de um curso só, com o percentual de acerto de cada questão.
            </p>

            <h3>Relatórios da IES (todos os cursos)</h3>
            <ListaDeRelatorios
              nome="Relatórios da IES"
              itens={relatorios.map((r) => ({
                chave: r.ano,
                titulo: r.titulo,
                descricao: r.descricao,
                tamanhoMb: r.tamanhoMb,
                href: `${API_URL}/relatorios/${r.ano}/download`,
              }))}
            />

            {!CURSOS_SEM_RELATORIO_DE_CURSO.includes(chave) && (
              <>
                <h3>Relatórios de curso — {curso.nome}</h3>
                <ListaDeRelatorios
                  nome="Relatórios de curso"
                  itens={relatoriosDeCurso
                    .filter((r) => r.curso === chave)
                    .map((r) => ({
                      chave: r.ano,
                      titulo: r.titulo,
                      descricao: r.descricao,
                      tamanhoMb: r.tamanhoMb,
                      href: `${API_URL}/relatorios/curso/${r.curso}/${r.ano}/download`,
                    }))}
                />
              </>
            )}
          </Topico>

          <p className="nota">
            Fonte: INEP — Relatórios de IES (Instituição de Educação Superior) do Enade.
          </p>
        </>
      )}
    </div>
  );
}

export default Resultados;
