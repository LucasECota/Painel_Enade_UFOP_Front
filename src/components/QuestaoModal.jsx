import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_URL } from "../api";

// "D3" -> "Questão discursiva 3"; "12" -> "Questão 12"
function nomeDaQuestao(id) {
  return /^D/i.test(id) ? `Questão discursiva ${id.slice(1)}` : `Questão ${id}`;
}

// Frase sobre o gabarito (só das objetivas). Questão anulada não tem gabarito. Questão desconsiderada
// (fora do cálculo da nota) mostra o gabarito da prova, com o aviso.
function textoDoGabarito(questao) {
  if (questao.tipo === "discursiva") return null;
  if (questao.situacao === "anulada") return "Questão anulada pela comissão do INEP: sem gabarito.";
  if (questao.situacao === "desconsiderada") {
    return questao.gabarito
      ? `Gabarito: ${questao.gabarito} (questão desconsiderada no cálculo da nota)`
      : "Questão desconsiderada no cálculo da nota: sem gabarito oficial.";
  }
  return questao.gabarito ? `Gabarito: ${questao.gabarito}` : null;
}

// "Questões 12 e 27", "Questões 12, 27 e 30"
function tituloDasQuestoes(lista) {
  const numeros = lista.map((q) => q.id);
  const ultimo = numeros.pop();
  return `Questões ${numeros.join(", ")} e ${ultimo}`;
}

// Botão que abre a imagem da questão (recorte do caderno de prova) com o gabarito.
// Uma questão: `questao`. Várias (por exemplo, todas as de uma disciplina): `questoes`, com
// `titulo` opcional; `compacto` mostra só "Ver" (para colunas estreitas); as imagens aparecem uma abaixo da outra, cada uma com o seu gabarito.
export default function VerQuestao({ questao, questoes, titulo, compacto = false }) {
  const [aberta, setAberta] = useState(false);
  const botao = useRef(null);

  const lista = (questoes ?? [questao]).filter((q) => q?.imagem);
  if (lista.length === 0) return null;

  return (
    <>
      <button
        type="button"
        ref={botao}
        className={compacto ? "ver-questao ver-questao-compacto" : "ver-questao"}
        aria-label={compacto ? "Ver questão" : undefined}
        onClick={() => setAberta(true)}
      >
        {compacto ? "Ver" : lista.length > 1 ? "Ver questões" : "Ver questão"}
      </button>
      {aberta && (
        <JanelaDaQuestao
          lista={lista}
          titulo={titulo}
          aoFechar={() => {
            setAberta(false);
            botao.current?.focus();
          }}
        />
      )}
    </>
  );
}

// Imagem de uma questão, com o aviso de carregando ou de erro
function ImagemDaQuestao({ questao }) {
  const [carregada, setCarregada] = useState(false);
  const [falhou, setFalhou] = useState(false);

  return (
    <>
      {!carregada && !falhou && <p className="questao-aviso">Carregando a questão…</p>}
      {falhou && <p className="questao-aviso">Não foi possível carregar a imagem da questão.</p>}
      <img
        src={`${API_URL}/enade/imagens/${questao.imagem}`}
        alt={`${nomeDaQuestao(questao.id)}: ${questao.tema}`}
        onLoad={() => setCarregada(true)}
        onError={() => setFalhou(true)}
        className={carregada ? "" : "questao-imagem-carregando"}
      />
    </>
  );
}

function JanelaDaQuestao({ lista, titulo, aoFechar }) {
  const fechar = useRef(null);
  const varias = lista.length > 1;

  useEffect(() => {
    fechar.current?.focus();
    const sobra = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (evento) => {
      if (evento.key === "Escape") aoFechar();
      // o foco fica dentro da janela: o único controle é o botão de fechar
      if (evento.key === "Tab") {
        evento.preventDefault();
        fechar.current?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = sobra;
    };
  }, [aoFechar]);

  const gabarito = (q) => textoDoGabarito(q);

  // a janela é desenhada direto no <body>: dentro de uma célula de tabela (que pode ser fixa ao
  // rolar, no celular) ela herdaria o estilo da célula e ficaria atrás dela
  return createPortal(
    <div className="questao-fundo" onClick={aoFechar}>
      <div
        className="questao-janela"
        role="dialog"
        aria-modal="true"
        aria-labelledby="questao-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="questao-topo">
          <div>
            <h3 id="questao-titulo">
              {varias ? (titulo ?? tituloDasQuestoes(lista)) : nomeDaQuestao(lista[0].id)}
            </h3>
            <p>{varias ? (titulo ? tituloDasQuestoes(lista) : "") : lista[0].tema}</p>
          </div>
          <button
            type="button"
            ref={fechar}
            className="questao-fechar"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        {varias ? (
          <div className="questao-corpo">
            {lista.map((q) => (
              <section className="questao-bloco" key={q.id}>
                <h4>
                  {nomeDaQuestao(q.id)}
                  {q.tema && <span> — {q.tema}</span>}
                </h4>
                <ImagemDaQuestao questao={q} />
                {gabarito(q) && (
                  <p className="questao-gabarito questao-gabarito-bloco">{gabarito(q)}</p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <>
            <div className="questao-corpo">
              <ImagemDaQuestao questao={lista[0]} />
            </div>
            {gabarito(lista[0]) && (
              <footer className="questao-gabarito">{gabarito(lista[0])}</footer>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
