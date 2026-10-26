import { ValidationError } from "../errors/AppError.js";

/**
 * Valida dados HTTP e disponibiliza os valores parseados ao controller.
 * @param {import("zod").ZodType} schema - Schema Zod a aplicar.
 * @param {"body"|"params"|"query"} [source="body"] - Fonte dos dados da requisição.
 * @returns {import("express").RequestHandler} Middleware de validação.
 */
export default function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));

      return next(new ValidationError("Dados de entrada inválidos", details));
    }

    // Express 5 expõe req.query como getter: não tente sobrescrevê-lo.
    if (source === "query") {
      _res.locals.query = result.data;
    } else {
      req[source] = result.data;
    }
    return next();
  };
}
