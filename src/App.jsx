import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Edicoes from "./pages/Edicoes";
import AvaliaUfop from "./pages/AvaliaUfop";
import Desempenho from "./pages/Desempenho";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/avaliaufop" element={<AvaliaUfop />} />
          <Route path="/desempenho" element={<Desempenho />} />
          <Route path="/edicoes" element={<Edicoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
