import { useState } from "react";

// Estado de ordenação de uma tabela: clicar na coluna ordena de forma crescente; clicar de novo inverte.
// Cada tabela tem o seu, então ordenar uma não muda as outras. `voltar` desfaz a ordenação.
export default function useOrdem(colunaInicial = "numero") {
  const inicial = { coluna: colunaInicial, sentido: "asc" };
  const [ordem, setOrdem] = useState(inicial);
  const ordenarPor = (coluna) =>
    setOrdem((atual) =>
      atual.coluna === coluna
        ? { coluna, sentido: atual.sentido === "asc" ? "desc" : "asc" }
        : { coluna, sentido: "asc" },
    );
  const voltar = () => setOrdem(inicial);
  return [ordem, ordenarPor, voltar];
}
