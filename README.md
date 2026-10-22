# Painel Enade — ICEA/UFOP (front-end)

Site em React + Vite com os cursos de preparação do AvaliaUFOP, as edições e os resultados do Enade
e o desempenho dos alunos. Consome a API do `Painel_Enade_UFOP_Back`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o site em modo de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm test` | Roda os testes automatizados uma vez |
| `npm run test:watch` | Roda os testes e repete a cada alteração |
| `npm run lint` | Verifica o código com o Oxlint |

## Configuração

O endereço da API fica em um lugar só, `src/api.js`. Por padrão aponta para o backend local
(`http://localhost:3000/api`). Para publicar, defina `VITE_API_URL` antes do build (veja o
`.env.example`):

```bash
VITE_API_URL=https://api.exemplo.edu.br/api npm run build
```

No backend, lembre de liberar o endereço do site em `CORS_ORIGINS`.

## Testes

Usam [Vitest](https://vitest.dev) + Testing Library, ao lado do código (`*.test.jsx`). A API é
simulada em `src/test/api.js`, então os testes não precisam do backend no ar.

Cobrem o menu, os tópicos expansíveis e as páginas Início, AvaliaUFOP, Edições, Desempenho e
Resultados (dados exibidos, troca de curso, filtros, links e erros da API).

O que os testes **não** cobrem é o visual (posição da linha dos 60%, cores, espaçamentos): jsdom não
calcula layout. Isso continua sendo conferido abrindo a página no navegador.
