// Bloco do CPC (Conceito Preliminar de Curso) na página Resultados.
// Para remover o CPC do site: apague este arquivo, a linha <BlocoCpc /> em
// src/pages/Resultados.jsx, as regras .cpc-sub e .cpc-saiba-mais no fim de src/index.css e o campo "cpc" (e "fonteCpc") em
// Painel_Enade_UFOP_Back/data/resultados-enade.json.
import Topico from "./Topico";

// onde o leitor entende como o CPC é composto e calculado
const LINK_CAVIN = "https://cavinufop.shinyapps.io/Indicadores_UFOP/";
const LINK_INEP =
  "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/indicadores-de-qualidade-da-educacao-superior/outros-documentos";

const pesos = [
  { valor: "35%", rotulo: "Valor agregado (IDD)" },
  { valor: "30%", rotulo: "Corpo docente" },
  { valor: "20%", rotulo: "Desempenho no Enade" },
  { valor: "15%", rotulo: "Percepção dos estudantes" },
];

function BlocoCpc({ cpc, fonte }) {
  return (
    <Topico titulo="CPC em cada edição">
      <p>
        CPC significa Conceito Preliminar de Curso, uma nota de 0 a 5 para a qualidade do curso.
        Peso de cada item no cálculo:
      </p>
      <div className="card-grid kpis">
        {pesos.map((p) => (
          <div className="card kpi" key={p.rotulo}>
            <span className="kpi-valor">{p.valor}</span>
            <span className="kpi-rotulo">{p.rotulo}</span>
          </div>
        ))}
      </div>
      <p className="cpc-saiba-mais">
        Como o CPC é calculado:{" "}
        <a
          href={LINK_CAVIN}
          target="_blank"
          rel="noopener noreferrer"
          title="No painel: aba “CPC Detalhado”, botão “Como interpretar o CPC e suas Dimensões”"
        >
          painel da CAVIN/UFOP
        </a>{" "}
        ·{" "}
        <a href={LINK_INEP} target="_blank" rel="noopener noreferrer">
          documentos do INEP
        </a>
      </p>

      <p className="cpc-sub">Nota do curso em cada edição:</p>
      <div className="conceitos">
        {cpc.map((e) => (
          <div className="conceito-col" key={e.ano}>
            <span className="conceito-valor">
              {e.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
            <span className="conceito-trilho">
              <span className="conceito-barra" style={{ height: `${(e.valor / 5) * 100}%` }} />
            </span>
            <strong>{e.ano}</strong>
          </div>
        ))}
      </div>
      <p className="nota">Fonte: {fonte}.</p>
    </Topico>
  );
}

export default BlocoCpc;
