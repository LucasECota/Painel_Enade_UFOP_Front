// Endereço da API (o backend). Fica definido só aqui: as páginas usam API_URL.
//
// Em desenvolvimento, sem configurar nada, usa o backend local. Para apontar para outro
// endereço (por exemplo, na hora de publicar), defina VITE_API_URL antes do build:
//   VITE_API_URL=https://api.exemplo.edu.br/api npm run build
const PADRAO = "http://localhost:3000/api";

// a barra no final é removida para evitar endereços com "//"
export const API_URL = (import.meta.env.VITE_API_URL || PADRAO).replace(/\/+$/, "");
