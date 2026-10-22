import { vi } from "vitest";

// Troca o fetch por uma versão falsa: cada rota da API responde com os dados do teste.
// `rotas` é um objeto { "parte do caminho da API": dados }, por exemplo "/desempenho".
// URL sem rota cadastrada vira erro.
export function simularApi(rotas) {
  const fetchFalso = vi.fn((url) => {
    const chave = Object.keys(rotas).find((k) => String(url).includes(k));
    if (!chave) return Promise.reject(new Error(`sem resposta simulada para ${url}`));
    return Promise.resolve({ ok: true, json: () => Promise.resolve(rotas[chave]) });
  });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

// jsdom não tem matchMedia: simula tela de celular (true) ou de computador (false)
export function simularTela({ celular }) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: celular,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}
