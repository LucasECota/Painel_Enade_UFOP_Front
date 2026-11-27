// Cabeçalho de tabela que ordena ao clicar (crescente, e de novo para decrescente)
export default function BotaoOrdenar({ coluna, rotulo, dica, ordem, aoOrdenar }) {
  const ativa = ordem.coluna === coluna;
  const indicador = !ativa ? "⇅" : ordem.sentido === "asc" ? "▲" : "▼";
  return (
    <button
      type="button"
      className={ativa ? "ordenar ativa" : "ordenar"}
      title={dica}
      onClick={() => aoOrdenar(coluna)}
    >
      {rotulo} <span aria-hidden="true">{indicador}</span>
    </button>
  );
}
