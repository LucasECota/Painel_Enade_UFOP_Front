import { Link } from "react-router-dom";
import { info } from "../data/avaliaufop";

const atalhos = [
  {
    to: "/preparatorio",
    titulo: "Preparatório Enade 2026",
    texto:
      "Cursos de preparação do AvaliaUFOP para Eng. de Computação, Eng. de Produção e Sistemas de Informação, e o desempenho dos alunos.",
  },
  {
    to: "/dados",
    titulo: "Dados Edições Anteriores",
    texto:
      "O que o Enade cobrou por disciplina, como a UFOP foi em cada questão, o Conceito Enade e os relatórios do INEP.",
  },
];

function Home() {
  return (
    <div>
      <section className="hero">
        <h1>Painel Enade – AvaliaUFOP</h1>
        <p>
          Este painel reúne dados das edições anteriores do Enade, os cursos de preparação para o
          Enade 2026 e o desempenho dos alunos do Instituto de Ciências Exatas e Aplicadas da UFOP.
        </p>
        <p className="autoria">
          <strong>Autor:</strong> {info.autor} · <strong>Orientador:</strong> prof.{" "}
          {info.orientador}
        </p>
      </section>

      <h2>Acesso rápido</h2>
      <div className="card-grid card-grid-2">
        {atalhos.map((a) => (
          <Link key={a.to} to={a.to} className="card card-link">
            <h3>{a.titulo}</h3>
            <p>{a.texto}</p>
            <span className="card-more">Acessar →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;
