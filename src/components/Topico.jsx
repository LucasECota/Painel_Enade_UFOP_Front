// Tópico da página Resultados: o título tem uma setinha que expande ou esconde o conteúdo.
function Topico({ titulo, aberto = true, children }) {
  return (
    <details className="topico" open={aberto}>
      <summary>{titulo}</summary>
      <div className="topico-corpo">{children}</div>
    </details>
  );
}

export default Topico;
