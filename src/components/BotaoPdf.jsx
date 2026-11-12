import { useState } from "react";

// Botão "Baixar PDF": chama `aoGerar` (que monta e baixa o PDF), mostra "Gerando PDF…" enquanto
// trabalha e avisa se algo der errado.
export default function BotaoPdf({ aoGerar, rotulo = "Baixar PDF desta página", dica }) {
  const [estado, setEstado] = useState("parado"); // parado | gerando | erro

  async function clicar() {
    setEstado("gerando");
    try {
      await aoGerar();
      setEstado("parado");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div className="acoes-pdf">
      <button
        type="button"
        className="btn btn-claro"
        onClick={clicar}
        disabled={estado === "gerando"}
        title={dica}
      >
        {estado === "gerando" ? "Gerando PDF…" : rotulo}
      </button>
      {estado === "erro" && (
        <span className="aviso" role="alert">
          Não foi possível gerar o PDF. Tente novamente.
        </span>
      )}
    </div>
  );
}
