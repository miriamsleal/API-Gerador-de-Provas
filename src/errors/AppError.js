/**
 * Representa um erro operacional que pode ser comunicado com segurança pela API.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Mensagem segura para quem consome a API.
   * @param {number} [statusCode=500] - Status HTTP associado ao erro.
   * @param {string} [code="INTERNAL_ERROR"] - Código estável para clientes.
   * @param {Array<{field?: string, message?: string}>} [details=[]] - Detalhes opcionais por campo.
   */
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = [],
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

/** Erro para dados de entrada inválidos. */
export class ValidationError extends AppError {
  /**
   * @param {string} [message="Dados de entrada inválidos"] - Resumo da falha.
   * @param {Array<{field: string, message: string}>} [details=[]] - Erros por campo.
   */
  constructor(message = "Dados de entrada inválidos", details = []) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/** Erro para recursos que não existem. */
export class NotFoundError extends AppError {
  /** @param {string} [message="Recurso não encontrado"] - Mensagem do recurso ausente. */
  constructor(message = "Recurso não encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

/** Erro para estados incompatíveis com a operação solicitada. */
export class ConflictError extends AppError {
  /** @param {string} [message="Conflito de dados"] - Mensagem do conflito. */
  constructor(message = "Conflito de dados") {
    super(message, 409, "CONFLICT");
  }
}
