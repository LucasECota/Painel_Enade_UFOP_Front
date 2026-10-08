import { useState } from "react";
import { cursos } from "../data/avaliaufop";

// DADOS DE EXEMPLO — substituir por dados reais (export de notas do Moodle / API) depois.
const exemplo = {
  ec: {
    inscritos: 48,
    concluintes: 21,
    media: 68,
    aprovados: 17,
    atividades: [82, 71, 64, 59, 66],
  },
  ep: {
    inscritos: 36,
    concluintes: 15,
    media: 64,
    aprovados: 11,
    atividades: [79, 68, 61, 55, 63],
  },
  si: {
    inscritos: 52,
    concluintes: 24,
    media: 71,
    aprovados: 20,
    atividades: [85, 74, 69, 62, 70],
  },
};

const nomesAtividades = [
  "Teste o seu conhecimento",
  "Formação Geral (objetivas)",
  "Componente Específico (discursivas)",
  "Componente Específico (objetivas)",
  "Média geral",
];

function Desempenho() {
  const [sigla, setSigla] = useState("ec");
  const d = exemplo[sigla];

  const kpis = [
    { rotulo: "Inscritos", valor: d.inscritos },
    { rotulo: "Concluíram", valor: d.concluintes },
    { rotulo: "Aprovados (≥ 60%)", valor: d.aprovados },
    { rotulo: "Média geral", valor: `${d.media}%` },
  ];

  return (
    <div>
      <h1>Desempenho geral dos alunos</h1>
      <p className="aviso">
        Dados de exemplo — a integração com as notas reais do AvaliaUFOP será feita depois.
      </p>

      <div>
        {cursos.map((c) => (
          <button
            key={c.sigla}
            className={c.sigla === sigla ? "btn btn-selecionado" : "btn"}
            onClick={() => setSigla(c.sigla)}
          >
            {c.nome}
          </button>
        ))}
      </div>

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
        {d.atividades.map((v, i) => (
          <li key={nomesAtividades[i]}>
            <span className="barra-nome">{nomesAtividades[i]}</span>
            <span className="barra-trilho">
              <span className={v >= 60 ? "barra ok" : "barra baixo"} style={{ width: `${v}%` }} />
              <span className="barra-linha" />
            </span>
            <span className="barra-valor">{v}%</span>
          </li>
        ))}
      </ul>
      <p className="nota">A linha vertical marca os 60% exigidos para a certificação.</p>
    </div>
  );
}

export default Desempenho;
