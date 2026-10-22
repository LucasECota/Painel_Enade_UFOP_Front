import { Link } from "react-router-dom";
import { info } from "../data/avaliaufop";

const atalhos = [
  {
    to: "/avaliaufop",
    titulo: "AvaliaUFOP — Preparação Enade 2026",
    texto:
      "Cursos de preparação para Eng. de Computação, Eng. de Produção e Sistemas de Informação.",
  },
  {
    to: "/desempenho",
    titulo: "Desempenho geral",
    texto: "Acompanhe inscritos, concluintes e aproveitamento dos alunos em cada curso.",
  },
  {
    to: "/edicoes",
    titulo: "Edições do Enade",
    texto: "Consulte as disciplinas e assuntos cobrados em cada edição, por curso.",
  },
  {
    to: "/resultados",
    titulo: "Resultados do Enade",
    texto:
      "Conceito dos cursos do ICEA em cada edição, comparação com o Brasil e relatórios do INEP.",
  },
];

function Home() {
  return (
    <div>
      <section className="hero">
        <h1>Painel Enade</h1>
        <p>
          Este painel reúne dados das edições do Enade, os cursos de preparação do AvaliaUFOP e o
          desempenho dos alunos do Instituto de Ciências Exatas e Aplicadas da UFOP.
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
