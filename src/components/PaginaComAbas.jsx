import { useSearchParams } from "react-router-dom";

// Página com abas (ex.: Preparatório Enade 2026 = AvaliaUFOP + Desempenho).
// A aba escolhida vai para o endereço (?aba=...), então o botão "voltar" e os links funcionam.
// Todas as abas ficam montadas e só a escolhida aparece: trocar de aba não busca de novo os dados
// nem apaga o que o leitor tinha aberto (e a tela não pisca).
function PaginaComAbas({ titulo, introducao, abas }) {
  const [params, setParams] = useSearchParams();
  const ativa = abas.find((a) => a.chave === params.get("aba"))?.chave ?? abas[0].chave;

  function escolher(chave) {
    setParams(chave === abas[0].chave ? {} : { aba: chave });
  }

  return (
    <div>
      <h1>{titulo}</h1>
      {introducao && <p className="introducao">{introducao}</p>}

      <div className="abas" role="tablist" aria-label={titulo}>
        {abas.map((a) => (
          <button
            key={a.chave}
            id={`aba-${a.chave}`}
            role="tab"
            aria-selected={a.chave === ativa}
            aria-controls={`painel-${a.chave}`}
            className={a.chave === ativa ? "aba ativa" : "aba"}
            onClick={() => escolher(a.chave)}
          >
            {a.titulo}
          </button>
        ))}
      </div>

      {abas.map((a) => (
        <div
          key={a.chave}
          id={`painel-${a.chave}`}
          role="tabpanel"
          aria-labelledby={`aba-${a.chave}`}
          hidden={a.chave !== ativa}
        >
          {a.conteudo}
        </div>
      ))}
    </div>
  );
}

export default PaginaComAbas;
