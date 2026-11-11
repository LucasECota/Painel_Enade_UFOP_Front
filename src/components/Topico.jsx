// Tópico da página Resultados: o título tem uma setinha que expande ou esconde o conteúdo.
// Começa fechado e só abre quando o leitor clica.
// Com `comoTitulo`, o texto do título é anunciado como um título de seção (nível 3) para leitores de tela.
function Topico({ titulo, aberto = false, comoTitulo = false, children }) {
  return (
    <details className="topico" open={aberto}>
      <summary>
        {comoTitulo ? (
          <span role="heading" aria-level={3}>
            {titulo}
          </span>
        ) : (
          titulo
        )}
      </summary>
      <div className="topico-corpo">{children}</div>
    </details>
  );
}

export default Topico;
