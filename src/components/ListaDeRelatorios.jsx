const formatar = (n) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Lista de relatórios com o botão de baixar; sem itens, avisa que não há relatório.
// Cada item: { chave, titulo, descricao, tamanhoMb (opcional), href }
export default function ListaDeRelatorios({ nome, itens }) {
  if (itens.length === 0) return <p className="nota">Nenhum relatório disponível.</p>;

  return (
    <ul className="relatorios" aria-label={nome}>
      {itens.map((r) => (
        <li key={r.chave}>
          <div>
            <strong>{r.titulo}</strong>
            <small>
              {r.descricao}
              {typeof r.tamanhoMb === "number" && ` · PDF, ${formatar(r.tamanhoMb)} MB`}
            </small>
          </div>
          <a className="btn btn-link" href={r.href}>
            Baixar PDF
          </a>
        </li>
      ))}
    </ul>
  );
}
