import prisma from "../config/database.js";

const publicAutorSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
};

const publicDisciplinaSelect = {
  id: true,
  nome: true,
  ativa: true,
};

const publicQuestionSelect = {
  id: true,
  enunciado: true,
  dificuldade: true,
  respostaCorreta: true,
  ativa: true,
  disciplinaId: true,
  autorId: true,
  createdAt: true,
  updatedAt: true,
  disciplina: { select: publicDisciplinaSelect },
  autor: { select: publicAutorSelect },
};

/**
 * Confirma a existência da matéria e do autor informados.
 * @param {{ disciplinaId?: number, autorId?: number }} relations 
 * @returns {Promise<string|null>} 
 */
const checkRelations = async ({ disciplinaId, autorId }) => {
  if (disciplinaId !== undefined) {
    const disciplina = await prisma.subject.findUnique({
      where: { id: disciplinaId },
      select: { id: true },
    });

    if (!disciplina) {
      return "SUBJECT_NOT_FOUND";
    }
  }

  if (autorId !== undefined) {
    const autor = await prisma.user.findUnique({
      where: { id: autorId },
      select: { id: true },
    });

    if (!autor) {
      return "AUTHOR_NOT_FOUND";
    }
  }

  return null;
};

/**
 * Lista as questões com a matéria e o autor.
 * @returns {Promise<Object[]>} 
 */
export const getAllQuestions = async () => {
  return prisma.question.findMany({
    select: publicQuestionSelect,
    orderBy: { id: "asc" },
  });
};

/**
 * Busca uma questão pelo identificador.
 * @param {number} questionId 
 * @returns {Promise<Object|null>} 
 */
export const getQuestionById = async (questionId) => {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: publicQuestionSelect,
  });
};

/**
 * Cria uma questão depois de confirmar a matéria e o autor.
 * @param {Object} questionData 
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} 
 */
export const createQuestion = async (questionData) => {
  const reason = await checkRelations({
    disciplinaId: questionData.disciplinaId,
    autorId: questionData.autorId,
  });

  if (reason) {
    return { ok: false, reason };
  }

  const questao = await prisma.question.create({
    data: {
      enunciado: questionData.enunciado.trim(),
      dificuldade: questionData.dificuldade,
      respostaCorreta: questionData.respostaCorreta?.trim() || null,
      ativa: questionData.ativa ?? true,
      disciplinaId: questionData.disciplinaId,
      autorId: questionData.autorId,
    },
    select: publicQuestionSelect,
  });

  return { ok: true, data: questao };
};

/**
 * Atualiza somente os campos enviados de uma questão existente.
 * @param {number} questionId 
 * @param {Object} questionData 
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} 
 */
export const updateQuestion = async (questionId, questionData) => {
  const questaoExistente = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!questaoExistente) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const reason = await checkRelations({
    disciplinaId: Object.hasOwn(questionData, "disciplinaId")
      ? questionData.disciplinaId
      : undefined,
    autorId: Object.hasOwn(questionData, "autorId")
      ? questionData.autorId
      : undefined,
  });

  if (reason) {
    return { ok: false, reason };
  }

  const data = {};

  if (Object.hasOwn(questionData, "enunciado")) {
    data.enunciado = questionData.enunciado.trim();
  }

  if (Object.hasOwn(questionData, "dificuldade")) {
    data.dificuldade = questionData.dificuldade;
  }

  if (Object.hasOwn(questionData, "respostaCorreta")) {
    data.respostaCorreta = questionData.respostaCorreta?.trim() || null;
  }

  if (Object.hasOwn(questionData, "ativa")) {
    data.ativa = questionData.ativa;
  }

  if (Object.hasOwn(questionData, "disciplinaId")) {
    data.disciplinaId = questionData.disciplinaId;
  }

  if (Object.hasOwn(questionData, "autorId")) {
    data.autorId = questionData.autorId;
  }

  const questao = await prisma.question.update({
    where: { id: questionId },
    data,
    select: publicQuestionSelect,
  });

  return { ok: true, data: questao };
};

/**
 * Remove uma questão existente.
 * @param {number} questionId 
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} 
 */
export const deleteQuestion = async (questionId) => {
  const questaoExistente = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!questaoExistente) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const questao = await prisma.question.delete({
    where: { id: questionId },
    select: publicQuestionSelect,
  });

  return { ok: true, data: questao };
};