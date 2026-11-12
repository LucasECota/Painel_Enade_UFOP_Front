// Peças comuns dos PDFs do painel: página A4 com margens, cabeçalho e rodapé em todas as páginas,
// títulos, parágrafos, tabelas (jspdf-autotable) e gráficos de barras desenhados com linhas e
// retângulos (vetoriais, ficam nítidos em qualquer zoom).
// Tudo em milímetros. As bibliotecas são carregadas só quando o leitor pede um PDF.

export const MARGEM = 15; // margem esquerda, direita e inferior (mm)
const TOPO = 24; // onde o conteúdo começa (abaixo do cabeçalho)
const RODAPE = 16; // espaço reservado para o rodapé
export const VINHO = [150, 32, 56];
export const CINZA = [156, 163, 175];
export const CINZA_ESCURO = [55, 65, 81];
export const VERDE = [27, 107, 58];
const BORDA = [209, 213, 219];
// linha fina e clara que separa os gráficos
export const SEPARADOR = [229, 231, 235];

// A fonte padrão do PDF (Helvetica) cobre o português; estes poucos símbolos ela não tem.
const TROCAS = { "∨": "ou", "∧": "e", "→": "->", ρ: "rho", "▲": "+", "▼": "-" };
export function limpar(texto) {
  return String(texto ?? "").replace(/[∨∧→ρ▲▼]/g, (c) => TROCAS[c]);
}

export const numero = (v) =>
  v === null || v === undefined
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// diferença da UFOP para o Brasil: "+1,8" ou "-3,1" (pontos percentuais)
export function diferenca(ufop, brasil) {
  const d = Math.round((ufop - brasil) * 10) / 10;
  if (d === 0) return "0,0";
  return `${d > 0 ? "+" : "-"}${numero(Math.abs(d))}`;
}

export const corDaDiferenca = (ufop, brasil) =>
  ufop > brasil ? VERDE : ufop < brasil ? VINHO : CINZA_ESCURO;

// nome de arquivo sem acentos nem espaços: "engenharia-de-computacao"
export function slug(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Cria o documento. `orientacao`: "portrait" ou "landscape".
export async function criarRelatorio({ curso, secao, fonte, orientacao = "portrait" }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: orientacao, unit: "mm", format: "a4" });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const largura = L - 2 * MARGEM;
  const limiteBaixo = A - RODAPE;
  let y = TOPO;

  const cor = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const fonteDoTexto = (estilo = "normal", tamanho = 9) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamanho);
  };

  const r = {
    doc,
    largura,
    get y() {
      return y;
    },
    set y(v) {
      y = v;
    },
    cor,
    // vai para a página seguinte se não couber `altura` mm
    garantir(altura) {
      if (y + altura > limiteBaixo) {
        doc.addPage();
        y = TOPO;
      }
    },
    espaco(mm) {
      y += mm;
    },
    // título da seção (faixa fina com linha vinho embaixo)
    titulo(texto, nivel = 1) {
      const tamanho = nivel === 1 ? 14 : nivel === 2 ? 11.5 : 10;
      r.garantir(tamanho * 0.9 + 8);
      fonteDoTexto("bold", tamanho);
      cor(nivel === 3 ? CINZA_ESCURO : [31, 41, 55]);
      const linhas = doc.splitTextToSize(limpar(texto), largura);
      doc.text(linhas, MARGEM, y + tamanho * 0.3);
      y += linhas.length * tamanho * 0.45 + 1.5;
      if (nivel === 1) {
        doc.setDrawColor(...VINHO);
        doc.setLineWidth(0.5);
        doc.line(MARGEM, y, MARGEM + largura, y);
        y += 3.5;
      } else y += 1;
    },
    paragrafo(texto, { tamanho = 9, estilo = "normal", cor: c = CINZA_ESCURO, folga = 2 } = {}) {
      fonteDoTexto(estilo, tamanho);
      cor(c);
      const linhas = doc.splitTextToSize(limpar(texto), largura);
      const alturaLinha = tamanho * 0.42;
      for (const linha of linhas) {
        r.garantir(alturaLinha + 1);
        doc.text(linha, MARGEM, y + alturaLinha * 0.8);
        y += alturaLinha;
      }
      y += folga;
    },
    // Tabela. `colunas`: [{ cabecalho, largura?, alinhar?, cor?(valor, linha) }]; `linhas`: matriz de textos.
    // `larguraTotal`/`esquerda` permitem duas tabelas lado a lado.
    tabela({
      colunas,
      linhas,
      esquerda = MARGEM,
      larguraTotal = largura,
      tamanho = 8,
      corDaCelula,
    }) {
      const estilosDasColunas = {};
      colunas.forEach((c, i) => {
        estilosDasColunas[i] = {
          halign: c.alinhar || "left",
          ...(c.largura ? { cellWidth: c.largura } : {}),
        };
      });
      autoTable(doc, {
        startY: y,
        margin: { left: esquerda, right: L - esquerda - larguraTotal, top: TOPO, bottom: RODAPE },
        tableWidth: larguraTotal,
        head: [colunas.map((c) => limpar(c.cabecalho))],
        body: linhas.map((l) => l.map((v) => limpar(v))),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: tamanho,
          cellPadding: { top: 1.4, bottom: 1.4, left: 1.6, right: 1.6 },
          lineColor: BORDA,
          lineWidth: 0.2,
          textColor: CINZA_ESCURO,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [102, 106, 112],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: { fillColor: [245, 245, 246] },
        columnStyles: estilosDasColunas,
        didParseCell(dados) {
          if (dados.section !== "body" || !corDaCelula) return;
          const c = corDaCelula(dados.column.index, dados.row.index, linhas[dados.row.index]);
          if (c) {
            dados.cell.styles.textColor = c;
            dados.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = doc.lastAutoTable.finalY + 4;
      return y;
    },
    // Gráfico de barras agrupadas. `grupos`: [{ rotulo, rotuloBaixo?, valores: [numero|null, ...] }];
    // `series`: [{ nome, cor }]. Escala de 0 a `maximo`.
    graficoDeBarras({ x, largura: w, altura: h, titulo, grupos, series, maximo = 100, casas = 1 }) {
      const topo = y;
      let baseTitulo = 0;
      if (titulo) {
        fonteDoTexto("bold", 8);
        cor(CINZA_ESCURO);
        const linhas = doc.splitTextToSize(limpar(titulo), w);
        doc.text(linhas.slice(0, 2), x, topo + 3);
        baseTitulo = Math.min(linhas.length, 2) * 3.4 + 1;
      }
      const yTopo = topo + baseTitulo + 4; // espaço para o número em cima da barra mais alta
      const yBase = topo + h - 9; // espaço embaixo para o rótulo e a diferença
      const area = yBase - yTopo;
      const eixoX = x + 7;
      const larguraUtil = w - 7;

      // linhas de referência 0, 50 e 100
      doc.setLineWidth(0.15);
      fonteDoTexto("normal", 5.5);
      for (const v of [0, maximo / 2, maximo]) {
        const yy = yBase - (v / maximo) * area;
        doc.setDrawColor(...BORDA);
        doc.line(eixoX, yy, x + w, yy);
        cor(CINZA);
        doc.text(v.toLocaleString("pt-BR"), eixoX - 1, yy + 0.8, { align: "right" });
      }

      const passo = larguraUtil / grupos.length;
      const larguraBarra = Math.min(7, (passo - 2) / series.length);
      grupos.forEach((g, i) => {
        const centro = eixoX + passo * i + passo / 2;
        const inicio = centro - (larguraBarra * series.length) / 2;
        if (g.valores.every((v) => v === null || v === undefined)) {
          fonteDoTexto("italic", 6);
          cor(CINZA);
          doc.text("sem questões", centro, yBase - 2, { align: "center" });
        }
        g.valores.forEach((v, k) => {
          if (v === null || v === undefined) return;
          const altura = Math.max(0.2, (Math.min(v, maximo) / maximo) * area);
          doc.setFillColor(...series[k].cor);
          doc.rect(inicio + k * larguraBarra, yBase - altura, larguraBarra, altura, "F");
          fonteDoTexto("bold", 6);
          cor(CINZA_ESCURO);
          doc.text(
            v.toLocaleString("pt-BR", {
              minimumFractionDigits: casas,
              maximumFractionDigits: casas,
            }),
            inicio + k * larguraBarra + larguraBarra / 2,
            yBase - altura - 0.9,
            { align: "center" },
          );
        });
        fonteDoTexto("bold", 7);
        cor(CINZA_ESCURO);
        doc.text(limpar(g.rotulo), centro, yBase + 3.6, { align: "center" });
        if (g.rotuloBaixo) {
          fonteDoTexto("normal", 6);
          cor(g.corRotuloBaixo || CINZA);
          doc.text(limpar(g.rotuloBaixo), centro, yBase + 6.8, { align: "center" });
        }
      });
      doc.setDrawColor(...BORDA);
      doc.line(eixoX, yBase, x + w, yBase);
    },
    // legenda das séries: quadradinho colorido + nome, numa linha
    legenda(series) {
      r.garantir(6);
      let x = MARGEM;
      fonteDoTexto("normal", 8);
      for (const s of series) {
        doc.setFillColor(...s.cor);
        doc.rect(x, y - 0.5, 3, 3, "F");
        cor(CINZA_ESCURO);
        doc.text(limpar(s.nome), x + 4.5, y + 2);
        x += 4.5 + doc.getTextWidth(limpar(s.nome)) + 7;
      }
      y += 6;
    },
    // cabeçalho, rodapé e numeração de todas as páginas (chamado uma vez, no fim)
    finalizar() {
      const total = doc.getNumberOfPages();
      const geradoEm = new Date().toLocaleDateString("pt-BR");
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        const largPagina = doc.internal.pageSize.getWidth();
        // cabeçalho
        doc.setFillColor(...VINHO);
        doc.rect(0, 0, largPagina, 3, "F");
        fonteDoTexto("bold", 8.5);
        cor(VINHO);
        doc.text("Painel Enade — ICEA/UFOP", MARGEM, 10);
        fonteDoTexto("normal", 8);
        cor(CINZA_ESCURO);
        doc.text(limpar(`${curso} · ${secao}`), largPagina - MARGEM, 10, { align: "right" });
        doc.setDrawColor(...BORDA);
        doc.setLineWidth(0.2);
        doc.line(MARGEM, 13, largPagina - MARGEM, 13);
        // rodapé
        doc.line(MARGEM, A - 12, largPagina - MARGEM, A - 12);
        fonteDoTexto("normal", 7);
        cor(CINZA);
        const linhasFonte = doc.splitTextToSize(limpar(fonte), largPagina - 2 * MARGEM - 40);
        doc.text(linhasFonte.slice(0, 2), MARGEM, A - 8.5);
        doc.text(
          `Gerado em ${geradoEm}  ·  Página ${p} de ${total}`,
          largPagina - MARGEM,
          A - 8.5,
          {
            align: "right",
          },
        );
      }
    },
  };
  return r;
}
