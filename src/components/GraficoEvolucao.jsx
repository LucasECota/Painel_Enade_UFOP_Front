import { Fragment, useState } from "react";
import { agruparDisciplinas } from "../gruposDeDisciplinas";

const formatar = (v) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const L = 640; // largura do desenho (o SVG se ajusta à tela)
const A = 300; // altura
const MARGEM = { topo: 28, direita: 16, base: 56, esquerda: 40 };

// Gráfico de barras de uma disciplina: para cada edição, o acerto da UFOP (vinho) ao lado do do Brasil (cinza).
// `linhas`: [[nome, { ano: { ufop, brasil } }]]; `edicoes`: anos em ordem crescente.
// O leitor só escolhe a disciplina.
export default function GraficoEvolucao({ linhas, edicoes, componente }) {
  const [nome, setNome] = useState(linhas[0][0]);
  const grupos = agruparDisciplinas(
    linhas.map(([n]) => n),
    componente,
  );
  const porAno = linhas.find(([n]) => n === nome)?.[1] ?? {};

  const largura = L - MARGEM.esquerda - MARGEM.direita;
  const altura = A - MARGEM.topo - MARGEM.base;
  const grupo = largura / edicoes.length;
  const barra = Math.min(48, grupo / 3);
  const y = (v) => MARGEM.topo + altura - (v / 100) * altura;

  return (
    <div className="grafico-evolucao">
      <label className="grafico-escolha">
        Disciplina
        <select value={nome} onChange={(e) => setNome(e.target.value)}>
          {grupos.map((grupo, i) => (
            <Fragment key={grupo.titulo}>
              {i > 0 && <hr />}
              <optgroup label={grupo.titulo}>
                {grupo.nomes.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            </Fragment>
          ))}
        </select>
      </label>

      <ul className="grafico-legenda" aria-label="Legenda">
        <li>
          <span className="legenda-cor legenda-ufop" aria-hidden="true" /> UFOP
        </li>
        <li>
          <span className="legenda-cor legenda-brasil" aria-hidden="true" /> Brasil
        </li>
      </ul>

      <div className="grafico-rolavel">
        <svg
          className="grafico-svg"
          viewBox={`0 0 ${L} ${A}`}
          role="img"
          aria-label={`Percentual de acerto em ${nome}, da UFOP e do Brasil, em cada edição`}
        >
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={MARGEM.esquerda}
                x2={L - MARGEM.direita}
                y1={y(v)}
                y2={y(v)}
                className="grafico-grade"
              />
              <text x={MARGEM.esquerda - 6} y={y(v) + 4} textAnchor="end" className="grafico-eixo">
                {v}%
              </text>
            </g>
          ))}

          {edicoes.map((ano, i) => {
            const centro = MARGEM.esquerda + grupo * i + grupo / 2;
            const dado = porAno[ano];
            const dif = dado ? Math.round((dado.ufop - dado.brasil) * 10) / 10 : 0;
            return (
              <g key={ano} className="grafico-grupo">
                <text x={centro} y={A - 30} textAnchor="middle" className="grafico-ano">
                  {ano}
                </text>
                {dado ? (
                  <>
                    {[
                      ["ufop", centro - barra - 2, "grafico-barra-ufop"],
                      ["brasil", centro + 2, "grafico-barra-brasil"],
                    ].map(([campo, x, classe]) => (
                      <g key={campo}>
                        <rect
                          x={x}
                          y={y(dado[campo])}
                          width={barra}
                          height={y(0) - y(dado[campo])}
                          className={classe}
                        />
                        <text
                          x={x + barra / 2}
                          y={y(dado[campo]) - 5}
                          textAnchor="middle"
                          className="grafico-valor"
                        >
                          {formatar(dado[campo])}
                        </text>
                      </g>
                    ))}
                    <text
                      x={centro}
                      y={A - 12}
                      textAnchor="middle"
                      className={
                        dif > 0
                          ? "grafico-dif dif-acima"
                          : dif < 0
                            ? "grafico-dif dif-abaixo"
                            : "grafico-dif"
                      }
                    >
                      {dif === 0
                        ? "igual ao Brasil"
                        : `${dif > 0 ? "▲" : "▼"} ${formatar(Math.abs(dif))} p.p.`}
                    </text>
                  </>
                ) : (
                  <text x={centro} y={y(0) - 8} textAnchor="middle" className="grafico-eixo">
                    sem questões
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
