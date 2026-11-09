import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Preparatorio from "./pages/Preparatorio";
import DadosAnteriores from "./pages/DadosAnteriores";

// As rotas ficam separadas do roteador para os testes poderem usar um roteador de memória
export function Rotas() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/preparatorio" element={<Preparatorio />} />
        <Route path="/dados" element={<DadosAnteriores />} />
        {/* endereços antigos (links já compartilhados) levam para a aba certa */}
        <Route path="/avaliaufop" element={<Navigate to="/preparatorio" replace />} />
        <Route
          path="/desempenho"
          element={<Navigate to="/preparatorio?aba=desempenho" replace />}
        />
        <Route path="/edicoes" element={<Navigate to="/dados" replace />} />
        <Route path="/resultados" element={<Navigate to="/dados?aba=resultados" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Rotas />
    </BrowserRouter>
  );
}

export default App;
