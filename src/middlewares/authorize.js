import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";

/**
 * Permite a requisição somente para os papéis informados (RBAC).
 * Deve ser usado depois de authenticate, que preenche req.user.
 * @param {...("PROFESSOR"|"ADMIN")} allowedRoles - Papéis autorizados.
 * @returns {import("express").RequestHandler} Middleware de autorização.
 */
export default function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Acesso negado. Esta ação requer o papel: ${allowedRoles.join(" ou ")}`,
        ),
      );
    }
    return next();
  };
}

/** Atalho para rotas exclusivas de administradores. */
export const isAdmin = authorize("ADMIN");

/**
 * Permite ADMIN ou o próprio usuário cujo ID está no parâmetro de rota.
 * Deve vir depois da validação do parâmetro, que já o converte em número.
 * @param {string} [paramName="id"] - Nome do parâmetro com o ID do recurso.
 * @returns {import("express").RequestHandler} Middleware de autorização.
 */
export function isOwnerOrAdmin(paramName = "id") {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (req.user.role === "ADMIN") return next();
    if (Number(req.params[paramName]) === req.user.id) return next();
    return next(
      new ForbiddenError("Você só pode alterar o seu próprio cadastro"),
    );
  };
}

/**
 * Impede que quem não é ADMIN envie campos que alteram permissões.
 * Deve vir depois do parser e da validação do corpo.
 * @param {string[]} fields - Campos reservados a administradores.
 * @returns {import("express").RequestHandler} Middleware de autorização.
 */
export function restrictFieldsToAdmin(fields) {
  return (req, _res, next) => {
    if (req.user?.role === "ADMIN") return next();
    const blocked = fields.filter((field) => req.body?.[field] !== undefined);
    if (blocked.length > 0) {
      return next(
        new ForbiddenError(`Somente ADMIN pode alterar: ${blocked.join(", ")}`),
      );
    }
    return next();
  };
}
