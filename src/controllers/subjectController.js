import * as subjectService from "../services/subjectService.js";

const allowedPatchFields = ["nome", "ativa", "professorId"];

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
 * Identifica valores inválidos nos campos de uma matéria.
 * @param {{ nome?: unknown, ativa?: unknown, professorId?: unknown }} body 
 * @returns {boolean} 
 */
function hasInvalidSubjectFields({ nome, ativa, professorId }) {
  return (
    (nome !== undefined && (typeof nome !== "string" || !nome.trim())) ||
    (ativa !== undefined && typeof ativa !== "boolean") ||
    (professorId !== undefined && toPositiveInt(professorId) === null)
  );
}

/**
 * Valida e cria uma matéria vinculada a um professor.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const create = async (req, res) => {
  try {
    const { nome, ativa, professorId } = req.body;

    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      professorId === undefined ||
      hasInvalidSubjectFields({ nome, ativa, professorId })
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nome e professorId são obrigatórios; ativa deve ser booleana quando enviada",
      });
    }

    const result = await subjectService.createSubject({
      nome,
      ativa,
      professorId: toPositiveInt(professorId),
    });

    if (!result.ok && result.reason === "PROFESSOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Professor com ID ${professorId} não encontrado`,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Matéria criada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao criar matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao criar matéria",
    });
  }
};

/**
 * Lista as matérias com o professor responsável.
 * @param {Object} _req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const getAll = async (_req, res) => {
  try {
    const materias = await subjectService.getAllSubjects();

    return res.status(200).json({
      success: true,
      data: materias,
      total: materias.length,
    });
  } catch (error) {
    console.error("Erro ao listar matérias:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar matérias",
    });
  }
};

/**
 * Busca uma matéria específica pelo ID.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const getById = async (req, res) => {
  try {
    const subjectId = toPositiveInt(req.params.id);

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const materia = await subjectService.getSubjectById(subjectId);

    if (!materia) {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectId} não encontrada`,
      });
    }

    return res.status(200).json({ success: true, data: materia });
  } catch (error) {
    console.error("Erro ao buscar matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar matéria",
    });
  }
};

/**
 * Atualiza parcialmente uma matéria existente.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const update = async (req, res) => {
  try {
    const subjectId = toPositiveInt(req.params.id);

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    if (!hasAllowedPatchField(req.body) || hasInvalidSubjectFields(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Envie ao menos um campo válido: nome, ativa ou professorId",
      });
    }

    const payload = { ...req.body };

    if (Object.hasOwn(payload, "professorId")) {
      payload.professorId = toPositiveInt(payload.professorId);
    }

    const result = await subjectService.updateSubject(subjectId, payload);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectId} não encontrada`,
      });
    }

    if (!result.ok && result.reason === "PROFESSOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Professor informado não encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Matéria atualizada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao atualizar matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar matéria",
    });
  }
};

/**
 * Remove uma matéria sem questões vinculadas.
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Promise<Object>} 
 */
export const remove = async (req, res) => {
  try {
    const subjectId = toPositiveInt(req.params.id);

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "ID inválido. Deve ser um número inteiro positivo",
      });
    }

    const result = await subjectService.deleteSubject(subjectId);

    if (!result.ok && result.reason === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Matéria com ID ${subjectId} não encontrada`,
      });
    }

    if (!result.ok && result.reason === "SUBJECT_IN_USE") {
      return res.status(409).json({
        success: false,
        message: "Matéria possui questões vinculadas",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Matéria removida com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("Erro ao remover matéria:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao remover matéria",
    });
  }
};