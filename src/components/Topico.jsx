// Tópico da página Resultados: o título tem uma setinha que expande ou esconde o conteúdo.
// Começa fechado e só abre quando o leitor clica.
function Topico({ titulo, aberto = false, children }) {
  return (
    <details className="topico" open={aberto}>
      <summary>{titulo}</summary>
      <div className="topico-corpo">{children}</div>
    </details>
  );
}

export default Topico;
