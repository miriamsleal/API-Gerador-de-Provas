import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const JWT_OPTIONS = {
  issuer: "api-gerador-provas",
  audience: "api-gerador-provas-client",
};

// Falha na inicialização: sem segredo válido, nenhum token pode ser emitido com segurança.
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("Defina JWT_SECRET com pelo menos 32 caracteres no .env");
}

/**
 * Emite um token JWT assinado para o usuário.
 * @param {{id: number, papel: "PROFESSOR"|"ADMIN"}} user - Usuário autenticado.
 * @returns {string} Token no formato header.payload.signature.
 */
export function generateToken(user) {
  return jwt.sign({ role: user.papel }, JWT_SECRET, {
    ...JWT_OPTIONS,
    // A RFC 7519 define sub como texto; o ID numérico é convertido.
    subject: String(user.id),
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

/**
 * Verifica assinatura, algoritmo, emissor, público e expiração do token.
 * @param {string} token - Token recebido no header Authorization.
 * @returns {import("jsonwebtoken").JwtPayload} Payload confiável.
 * @throws {import("jsonwebtoken").JsonWebTokenError} Se o token for inválido ou expirado.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    ...JWT_OPTIONS,
    algorithms: ["HS256"],
  });
}
