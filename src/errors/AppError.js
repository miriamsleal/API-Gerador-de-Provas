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

// ADICIONADO (aula 11): 401 indica que a identidade não foi comprovada (sem token ou token inválido).
/** Erro para requisições sem autenticação válida. */
export class UnauthorizedError extends AppError {
  /** @param {string} [message="Autenticação necessária"] - Motivo seguro da recusa. */
  constructor(message = "Autenticação necessária") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// ADICIONADO (aula 11): 403 indica identidade comprovada, mas sem permissão para a ação.
/** Erro para usuários autenticados que não têm permissão. */
export class ForbiddenError extends AppError {
  /** @param {string} [message="Acesso negado"] - Motivo seguro da recusa. */
  constructor(message = "Acesso negado") {
    super(message, 403, "FORBIDDEN");
  }
}
