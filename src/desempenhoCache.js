import { API_URL } from "./api";

// Dados já buscados, por curso. Trocar entre "Evolução por disciplina" e "Mais acertos e erros" usa os dados
// guardados: sem isso, cada troca apagava a tela, buscava de novo e a página piscava.
export const cache = new Map();

// Busca (uma vez por curso) o desempenho por disciplina. Pode ser chamada antes de a tela abrir, para os dados
// já estarem prontos quando o leitor clicar no subtópico.
export function carregarDesempenho(chave) {
  if (!cache.has(chave)) {
    const promessa = fetch(`${API_URL}/enade/${chave}/desempenho-areas`)
      .then((response) => {
        if (!response.ok) throw new Error("sem dados");
        return response.json();
      })
      .then((resultado) => {
        cache.set(chave, { resultado });
        return resultado;
      })
      .catch((erro) => {
        cache.delete(chave); // não guarda a falha: da próxima vez tenta de novo
        throw erro;
      });
    cache.set(chave, { promessa });
  }
  const guardado = cache.get(chave);
  return guardado.resultado ? Promise.resolve(guardado.resultado) : guardado.promessa;
}

export function limparCacheDoDesempenho() {
  cache.clear();
}
