// Ponto de entrada dos PDFs. As bibliotecas de PDF (jsPDF e autoTable) só são baixadas quando o leitor
// pede um PDF: o resto do site não carrega esse peso.
import { API_URL } from "../api";
import { carregarDesempenho } from "../desempenhoCache";

async function buscar(caminho) {
  const resposta = await fetch(`${API_URL}${caminho}`);
  if (!resposta.ok) throw new Error(`não foi possível buscar ${caminho}`);
  return resposta.json();
}

// Gera e baixa o PDF de uma página de "Dados Edições Anteriores", para um curso.
//   "assuntos" | "questoes" | "evolucao" | "rankings": curso = { chave, nome, anosComAssuntos?, anosComQuestoes? }
//   "resultados": curso = o curso de GET /resultados, e `fonte` o texto da fonte
export async function baixarPdf(pagina, curso, { fonte } = {}) {
  const paginas = await import("./paginas");
  let resultado;

  if (pagina === "assuntos") {
    const edicoes = await Promise.all(
      (curso.anosComAssuntos ?? []).map(async (ano) => ({
        ano,
        dados: await buscar(`/enade/${curso.chave}?ano=${ano}`),
      })),
    );
    resultado = await paginas.pdfAssuntos({ curso: curso.nome, edicoes });
  } else if (pagina === "questoes") {
    const edicoes = await Promise.all(
      (curso.anosComQuestoes ?? []).map(async (ano) => ({
        ano,
        tabela: await buscar(`/enade/${curso.chave}/questoes?ano=${ano}`),
      })),
    );
    resultado = await paginas.pdfAcertos({ curso: curso.nome, edicoes });
  } else if (pagina === "evolucao" || pagina === "rankings") {
    const desempenho = await carregarDesempenho(curso.chave);
    resultado =
      pagina === "evolucao"
        ? await paginas.pdfEvolucao({ curso: curso.nome, desempenho })
        : await paginas.pdfRankings({ curso: curso.nome, desempenho });
  } else if (pagina === "resultados") {
    resultado = await paginas.pdfResultados({ curso, fonte });
  } else {
    throw new Error(`página desconhecida: ${pagina}`);
  }

  resultado.doc.save(resultado.arquivo);
  return resultado.arquivo;
}
