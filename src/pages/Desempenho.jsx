import { useState, useEffect } from "react";

function Desempenho() {
  const [cursos, setCursos] = useState([]);
  const [sigla, setSigla] = useState("ec");
  const [erro, setErro] = useState(false);

  useEffect(() => {
    function carregar() {
      fetch("http://localhost:3000/api/desempenho", { cache: "no-store" })
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
      <h1>Desempenho geral dos alunos</h1>
      <p>
        Acompanhe o desempenho dos alunos no AvaliaUFOP, com o número de inscritos e concluintes e o
        aproveitamento médio em cada atividade.
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
        </>
      )}
    </div>
  );
}

export default Desempenho;
