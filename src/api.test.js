import { vi } from "vitest";

// importa o módulo de novo a cada teste, para ele ler a variável de ambiente do momento
async function carregar(url) {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", url);
  return (await import("./api")).API_URL;
}

afterEach(() => vi.unstubAllEnvs());

describe("API_URL", () => {
  it("sem configuração usa o backend local", async () => {
    expect(await carregar("")).toBe("http://localhost:3000/api");
  });

  it("VITE_API_URL troca o endereço da API", async () => {
    expect(await carregar("https://api.exemplo.edu.br/api")).toBe("https://api.exemplo.edu.br/api");
  });

  it("aceita um endereço relativo (site e API no mesmo domínio, atrás de um proxy)", async () => {
    expect(await carregar("/api")).toBe("/api");
    expect(await carregar("/api/")).toBe("/api");
  });

  it("tira a barra do final, para não gerar endereços com //", async () => {
    expect(await carregar("https://api.exemplo.edu.br/api/")).toBe(
      "https://api.exemplo.edu.br/api",
    );
    expect(await carregar("https://api.exemplo.edu.br/api///")).toBe(
      "https://api.exemplo.edu.br/api",
    );
  });
});
