import cors from "cors";

/**
 * Converte a lista de CORS_ORIGINS, separada por vírgulas, em origens exatas.
 * @param {string} [value=""] - Valor da variável de ambiente.
 * @returns {string[]} Origens no formato protocolo://domínio:porta.
 */
export function parseOrigins(value = "") {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS);

const corsConfig = cors({
  // Comparação exata: "http://localhost:5173.evil.com" não passa por includes().
  origin(origin, callback) {
    callback(null, allowedOrigins.includes(origin));
  },
  // Authorization precisa ser liberado para o navegador enviar o token.
  allowedHeaders: ["Content-Type", "Authorization"],
  // Headers de depreciação da V1 passam a ser legíveis pelo JavaScript do frontend.
  exposedHeaders: ["Deprecation", "Sunset", "Link"],
  // O navegador reaproveita o preflight por 10 minutos.
  maxAge: 600,
});

export default corsConfig;
