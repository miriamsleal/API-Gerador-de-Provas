import * as questionService from "../services/questionService.js";

const allowedPatchFields = [
  "enunciado",
  "dificuldade",
  "respostaCorreta",
  "ativa",
  "disciplinaId",
  "autorId",
];

/**
 * Converte um valor em um ID inteiro positivo.
 * @param {unknown} value 
 * @returns {number|null} 
 */
function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/**
 * Verifica se o corpo do PATCH contém ao menos um campo atualizável.
 * @param {Object} body 
 * @returns {boolean} 
 */
function hasAllowedPatchField(body) {
  return allowedPatchFields.some((field) => Object.hasOwn(body, field));
}

/**
 * Identifica valores inválidos nos campos de uma questão.
 * @param {Object} body 
 * @returns {boolean} 
 */
function hasInvalidQuestionFields({
  enunciado,
  dificuldade,
  respostaCorreta,
  ativa,
  disciplinaId,
  autorId,
}) {
  const dificuldadeInvalida =
    dificuldade !== undefined && ![1, 2, 3].includes(Number(dificuldade));

  return (
    (enunciado !== undefined &&
      (typeof enunciado !== "string" || !enunciado.trim())) ||
    dificuldadeInvalida ||
    (respostaCorreta !== undefined &&
      respostaCorreta !== null &&
      typeof respostaCorreta !== "string") ||
    (ativa !== undefined && typeof ativa !== "boolean") ||
    (disciplinaId !== undefined && toPositiveInt(disciplinaId) === null) ||
    (autorId !== undefined && toPositiveInt(autorId) === null)
  );
}

/**
 * Normaliza os IDs e a dificuldade presentes no corpo da requisição.
 * @param {Object} body 
 * @returns {Object} 
 */
function normalizeBody(body) {
  const payload = { ...body };

  if (Object.hasOwn(payload, "dificuldade")) {
    payload.dificuldade = Number(payload.dificuldade);
  }

  if (Object.hasOwn(payload, "disciplinaId")) {
    payload.disciplinaId = toPositiveInt(payload.disciplinaId);
  }

  if (Object.hasOwn(payload, "autorId")) {
    payload.autorId = toPositiveInt(payload.autorId);
  }

  return payload;
}

/**
 * Valida e cria uma questão vinculada a uma matéria e a um autor.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const create = async (req, res) => {
  try {
    const { enunciado, dificuldade, disciplinaId, autorId } = req.body;

    if (
      typeof enunciado !== "string" ||
      !enunciado.trim() ||
      dificuldade === undefined ||
      disciplinaId === undefined ||
      autorId === undefined ||
      hasInvalidQuestionFields(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enunciado, dificuldade (1 a 3), disciplinaId e autorId são obrigatórios",
      });
    }

    const result = await questionService.createQuestion(normalizeBody(req.body));

    if (!result.ok && result.reason === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Matéria informada não encontrada",
      });
    }

    if (!result.ok && result.reason === "AUTHOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Autor informado não encontrado",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Questão criada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao criar questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao criar questão",
    });
  }
};

/**
 * Lista as questões com a matéria e o autor.
 * @param {Object} _req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const getAll = async (_req, res) => {
  try {
    const questoes = await questionService.getAllQuestions();

    return res.status(200).json({
      success: true,
      data: questoes,
      total: questoes.length,
    });
  } catch (error) {
    console.error("Erro ao listar questões:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar questões",
    });
  }
};

/**
 * Busca uma questão específica pelo ID.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const getById = async (req, res) => {
  try {
    const questionId = toPositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const questao = await questionService.getQuestionById(questionId);

    if (!questao) {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    return res.status(200).json({ success: true, data: questao });
  } catch (error) {
    console.error("Erro ao buscar questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar questão",
    });
  }
};

/**
 * Atualiza parcialmente uma questão existente.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const update = async (req, res) => {
  try {
    const questionId = toPositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    if (!hasAllowedPatchField(req.body) || hasInvalidQuestionFields(req.body)) {
      return res.status(400).json({
        success: false,
        message:
          "Envie ao menos um campo válido: enunciado, dificuldade, respostaCorreta, ativa, disciplinaId ou autorId",
      });
    }

    const result = await questionService.updateQuestion(
      questionId,
      normalizeBody(req.body),
    );

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    if (!result.ok && result.reason === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Matéria informada não encontrada",
      });
    }

    if (!result.ok && result.reason === "AUTHOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Autor informado não encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Questão atualizada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao atualizar questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar questão",
    });
  }
};

/**
 * Remove uma questão existente.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const remove = async (req, res) => {
  try {
    const questionId = toPositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const result = await questionService.deleteQuestion(questionId);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Questão com ID ${questionId} não encontrada`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Questão removida com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao remover questão:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao remover questão",
    });
  }
};