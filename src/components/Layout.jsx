import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import logoUfop from "../assets/logo-ufop.png";
import logoIcea from "../assets/logo-icea.png";
import simboloIcea from "../assets/simbolo-icea.png";

const links = [
  { to: "/", label: "Início" },
  { to: "/avaliaufop", label: "AvaliaUFOP" },
  { to: "/desempenho", label: "Desempenho" },
  { to: "/edicoes", label: "Edições" },
  { to: "/resultados", label: "Resultados" },
];

function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo principal
      </a>

      <div className="topbar">
        <div className="wrap">
          <a href="https://www.ufop.br" target="_blank" rel="noreferrer">
            UFOP.BR
          </a>
          <a href="https://icea.ufop.br" target="_blank" rel="noreferrer">
            ICEA
          </a>
        </div>
      </div>

      <header className="site-header">
        <div className="wrap header-inner">
          <a href="https://www.ufop.br" target="_blank" rel="noreferrer" aria-label="UFOP">
            <img className="logo-ufop" src={logoUfop} alt="Universidade Federal de Ouro Preto" />
          </a>
          <img
            className="logo-icea"
            src={logoIcea}
            alt="ICEA – Instituto de Ciências Exatas e Aplicadas"
          />
          <Link
            to="/"
            className="header-title"
            aria-label="Painel Enade – ir para a página inicial"
          >
            <strong>Painel Enade</strong>
            <span>ICEA · UFOP — João Monlevade</span>
          </Link>
        </div>
      </header>

      <nav className="main-nav" aria-label="Menu principal">
        <div className="wrap">
          <button
            className="nav-toggle"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
          >
            ☰ Menu
          </button>
          <ul className={menuAberto ? "nav-list aberto" : "nav-list"}>
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.to === "/"} onClick={() => setMenuAberto(false)}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main id="conteudo" className="container">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div className="footer-brand">
            <img src={simboloIcea} alt="ICEA" className="footer-logo" />
          </div>
          <div>
            <h4>Instituto de Ciências Exatas e Aplicadas</h4>
            <p>Universidade Federal de Ouro Preto</p>
            <address>
              R. Trinta e Seis, 115 – Loanda
              <br />
              João Monlevade – MG, 35931-008
            </address>
          </div>
          <div>
            <h4>Links</h4>
            <ul>
              <li>
                <a href="https://www.ufop.br" target="_blank" rel="noreferrer">
                  UFOP
                </a>
              </li>
              <li>
                <a href="https://icea.ufop.br" target="_blank" rel="noreferrer">
                  ICEA
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} Universidade Federal de Ouro Preto — ICEA
        </div>
      </footer>
    </>
  );
}

export default Layout;
