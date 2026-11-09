import { useEffect, useRef, useState } from "react";
import { API_URL } from "../api";

// "D3" -> "Questão discursiva 3"; "12" -> "Questão 12"
function nomeDaQuestao(id) {
  return /^D/i.test(id) ? `Questão discursiva ${id.slice(1)}` : `Questão ${id}`;
}

// Frase sobre o gabarito (só das objetivas). Questões anuladas ou desconsideradas não têm gabarito oficial.
function textoDoGabarito(questao) {
  if (questao.tipo === "discursiva") return null;
  if (questao.situacao === "anulada") return "Questão anulada pela comissão do INEP: sem gabarito.";
  if (questao.situacao === "desconsiderada")
    return "Questão desconsiderada no cálculo da nota: sem gabarito oficial.";
  return questao.gabarito ? `Gabarito: ${questao.gabarito}` : null;
}

// Botão "Ver questão" que abre a imagem da questão (recorte do caderno de prova) com o gabarito
export default function VerQuestao({ questao }) {
  const [aberta, setAberta] = useState(false);
  const botao = useRef(null);

  if (!questao?.imagem) return null;

  return (
    <>
      <button type="button" ref={botao} className="ver-questao" onClick={() => setAberta(true)}>
        Ver questão
      </button>
      {aberta && (
        <JanelaDaQuestao
          questao={questao}
          aoFechar={() => {
            setAberta(false);
            botao.current?.focus();
          }}
        />
      )}
    </>
  );
}

function JanelaDaQuestao({ questao, aoFechar }) {
  const fechar = useRef(null);
  const gabarito = textoDoGabarito(questao);
  const [carregada, setCarregada] = useState(false);
  const [falhou, setFalhou] = useState(false);

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

  return (
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
            <h3 id="questao-titulo">{nomeDaQuestao(questao.id)}</h3>
            <p>{questao.tema}</p>
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
        <div className="questao-corpo">
          {!carregada && !falhou && <p className="questao-aviso">Carregando a questão…</p>}
          {falhou && (
            <p className="questao-aviso">Não foi possível carregar a imagem da questão.</p>
          )}
          <img
            src={`${API_URL}/enade/imagens/${questao.imagem}`}
            alt={`${nomeDaQuestao(questao.id)}: ${questao.tema}`}
            onLoad={() => setCarregada(true)}
            onError={() => setFalhou(true)}
            className={carregada ? "" : "questao-imagem-carregando"}
          />
        </div>
        {gabarito && <footer className="questao-gabarito">{gabarito}</footer>}
      </div>
    </div>
  );
}
