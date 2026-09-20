import * as userService from "../services/userService.js";

const allowedPatchFields = ["nome", "email", "papel", "foto"];
const validRoles = ["PROFESSOR", "ADMIN"];

/**
 * Converte um valor de rota em um ID inteiro positivo, sem aceitar valores parciais.
 * @param {unknown} value - Valor recebido em `req.params.id`.
 * @returns {number|null} ID válido ou `null` quando o valor é inválido.
 */
function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/**
 * Verifica se o corpo de um PATCH contém pelo menos um campo que pode ser atualizado.
 * @param {Object} body - Corpo recebido na requisição.
 * @returns {boolean} `true` quando há ao menos um campo permitido.
 */
function hasAllowedPatchField(body) {
  return allowedPatchFields.some((field) => Object.hasOwn(body, field));
}

/**
 * Identifica valores inválidos nos campos que o usuário pode enviar.
 * @param {{ nome?: unknown, email?: unknown, papel?: unknown, foto?: unknown }} body - Dados a validar.
 * @returns {boolean} `true` quando algum campo presente possui formato inválido.
 */
function hasInvalidUserFields({ nome, email, papel, foto }) {
  return (
    (nome !== undefined && (typeof nome !== "string" || !nome.trim())) ||
    (email !== undefined && (typeof email !== "string" || !email.trim())) ||
    (papel !== undefined && !validRoles.includes(papel)) ||
    (foto !== undefined && foto !== null && typeof foto !== "string")
  );
}

/**
 * Valida a criação de um usuário, delega a persistência ao service e monta a resposta HTTP.
 * @param {Object} req - Requisição Express com os dados do usuário.
 * @param {Object} res - Resposta Express usada para enviar o status e o JSON.
 * @returns {Promise<Object>} Resposta HTTP de criação, validação ou erro.
 */
export const create = async (req, res) => {
  try {
    const { nome, email, papel, foto } = req.body;

    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      hasInvalidUserFields({ nome, email, papel, foto })
    ) {
      return res.status(400).json({
        success: false,
        message: "Nome e email são obrigatórios; papel e foto devem ser válidos",
      });
    }

    const result = await userService.createUser({ nome, email, papel, foto });

    if (!result.ok && result.reason === "EMAIL_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "Email já cadastrado no sistema",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao criar usuário",
    });
  }
};

/**
 * Lista os usuários retornados pelo service e informa o total encontrado.
 * @param {Object} _req - Requisição Express, não utilizada nesta operação.
 * @param {Object} res - Resposta Express usada para enviar a listagem.
 * @returns {Promise<Object>} Resposta HTTP com a lista ou um erro interno.
 */
export const getAll = async (_req, res) => {
  try {
    const usuarios = await userService.getAllUsers();

    return res.status(200).json({
      success: true,
      data: usuarios,
      total: usuarios.length,
    });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar usuários",
    });
  }
};

/**
 * Valida o ID da rota e devolve um usuário específico quando ele existe.
 * @param {Object} req - Requisição Express que contém `params.id`.
 * @param {Object} res - Resposta Express usada para enviar o resultado.
 * @returns {Promise<Object>} Resposta HTTP com o usuário, erro de validação ou ausência.
 */
export const getById = async (req, res) => {
  try {
    const userId = toPositiveInt(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const usuario = await userService.getUserById(userId);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: `Usuário com ID ${userId} não encontrado`,
      });
    }

    return res.status(200).json({
      success: true,
      data: usuario,
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar usuário",
    });
  }
};

/**
 * Valida um PATCH parcial e solicita ao service a atualização do usuário.
 * @param {Object} req - Requisição Express com o ID e os campos a atualizar.
 * @param {Object} res - Resposta Express usada para enviar o resultado.
 * @returns {Promise<Object>} Resposta HTTP de atualização, validação, conflito ou ausência.
 */
export const update = async (req, res) => {
  try {
    const userId = toPositiveInt(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    if (!hasAllowedPatchField(req.body) || hasInvalidUserFields(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Envie ao menos um campo válido: nome, email, papel ou foto",
      });
    }

    const result = await userService.updateUser(userId, req.body);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Usuário com ID ${userId} não encontrado`,
      });
    }

    if (!result.ok && result.reason === "EMAIL_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "Email já cadastrado no sistema",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Usuário atualizado com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar usuário",
    });
  }
};

/**
 * Remove um usuário quando o ID é válido e não existem vínculos que impeçam a exclusão.
 * @param {Object} req - Requisição Express que contém `params.id`.
 * @param {Object} res - Resposta Express usada para enviar o resultado.
 * @returns {Promise<Object>} Resposta HTTP de remoção, conflito, validação ou ausência.
 */
export const remove = async (req, res) => {
  try {
    const userId = toPositiveInt(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const result = await userService.deleteUser(userId);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Usuário com ID ${userId} não encontrado`,
      });
    }

    if (!result.ok && result.reason === "USER_IN_USE") {
      return res.status(409).json({
        success: false,
        message: "Usuário possui matérias ou questões vinculadas",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Usuário removido com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao remover usuário:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao remover usuário",
    });
  }
};