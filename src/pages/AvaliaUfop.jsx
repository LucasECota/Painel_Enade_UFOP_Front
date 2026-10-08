import { info, objetivos, metodologia, modulos, cursos } from "../data/avaliaufop";

function AvaliaUfop() {
  return (
    <div>
      <section className="hero">
        <h1>
          {info.titulo} — {info.edicao}
        </h1>
        <p>
          Curso de preparação para o Enade desenvolvido pelo Instituto de Ciências Exatas e
          Aplicadas (ICEA/UFOP), Campus João Monlevade, no âmbito do projeto Pró-Ativa. Simulados
          com questões objetivas e discursivas, de formação geral e da área específica, seguindo os
          padrões do exame.
        </p>
        <ul className="chips">
          <li>⏱ {info.cargaHoraria}</li>
          <li>📅 {info.prazo}</li>
          <li>🎓 Certificado</li>
        </ul>
      </section>

      <h2>Escolha o seu curso</h2>
      <p>
        Para se inscrever, clique no curso desejado: você será levado ao Moodle (UFOP Aberta), onde
        a inscrição é feita.
      </p>
      <div className="card-grid">
        {cursos.map((c) => (
          <a
            key={c.sigla}
            href={c.url}
            target="_blank"
            rel="noreferrer"
            className="card card-link card-moodle"
          >
            <h3>{c.nome}</h3>
            <p>Preparação Enade 2026</p>
            <span className="card-cta">Acessar no Moodle ↗</span>
          </a>
        ))}
      </div>

      <h2>Como funciona</h2>
      <p>É assim que o curso está organizado dentro do Moodle:</p>
      <ol className="steps">
        {modulos.map((m) => (
          <li key={m.numero}>
            <strong>{m.titulo}</strong>
            <span>{m.atividades.length} atividade(s)</span>
          </li>
        ))}
      </ol>

      <h2>Mais informações</h2>
      <div className="acordeao">
        <details>
          <summary>Objetivos</summary>
          <div className="acordeao-corpo">
            <p>Ao final do curso, você será capaz de:</p>
            <ul>
              {objetivos.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </details>

        <details>
          <summary>Metodologia</summary>
          <div className="acordeao-corpo">
            <ul>
              {metodologia.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </details>

        <details>
          <summary>Aprovação e certificado</summary>
          <div className="acordeao-corpo">
            <p>
              Para receber o certificado é preciso cumprir todas as atividades e requisitos e
              alcançar pelo menos <strong>{info.aproveitamentoMinimo}%</strong> de aproveitamento
              nos simulados e atividades.
            </p>
          </div>
        </details>
      </div>

      <p className="nota">
        Autoria: {info.autor} · Orientação: prof. {info.orientador}. Material baseado na estrutura
        do CEAD e da COAR/PROGRAD (UFOP). Este curso não conta com recursos de acessibilidade como
        legendas, transcrições, materiais adaptados ou intérprete de Libras.
      </p>
    </div>
  );
}

export default AvaliaUfop;
