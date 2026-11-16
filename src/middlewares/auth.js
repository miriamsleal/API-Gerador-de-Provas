import { verifyToken } from "../config/jwt.js";
import { UnauthorizedError } from "../errors/AppError.js";

/**
 * Exige um token JWT válido no header Authorization: Bearer <token>.
 * Em caso de sucesso, disponibiliza req.user = { id, role } aos próximos middlewares.
 * @param {import("express").Request} req - Requisição com o header Authorization.
 * @param {import("express").Response} res - Resposta Express.
 * @param {import("express").NextFunction} next - Próximo middleware.
 * @returns {void}
 */
export default function authenticate(req, res, next) {
  // RFC 6750: informa ao cliente qual esquema de autenticação a rota espera.
  const reject = (message) => {
    res.set("WWW-Authenticate", 'Bearer realm="api-gerador-provas"');
    next(new UnauthorizedError(message));
  };

  const header = req.get("Authorization");
  if (!header) return reject("Token de autenticação não fornecido");

  const [scheme, token, ...extra] = header.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token || extra.length > 0) {
    return reject("Formato de token inválido. Use: Bearer <token>");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    return reject(
      error.name === "TokenExpiredError"
        ? "Token expirado. Faça login novamente"
        : "Token inválido",
    );
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0 || !payload.role) {
    return reject("Token inválido");
  }

  req.user = { id, role: payload.role };
  return next();
}
