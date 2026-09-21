import prisma from "../config/database.js";
import { NotFoundError } from "../errors/AppError.js";

const publicAuthorSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
};

const publicSubjectSelect = {
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
  subjectId: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  subject: { select: publicSubjectSelect },
  author: { select: publicAuthorSelect },
};

/**
 * Confirma que a matéria informada existe.
 * @param {number} subjectId - ID já validado pelo middleware.
 * @returns {Promise<void>} Resolve quando a matéria existe.
 * @throws {NotFoundError} Quando a matéria não existe.
 */
async function ensureSubjectExists(subjectId) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });

  if (!subject) {
    throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  }
}

/**
 * Confirma que o autor informado existe.
 * @param {number} authorId - ID já validado pelo middleware.
 * @returns {Promise<void>} Resolve quando o autor existe.
 * @throws {NotFoundError} Quando o autor não existe.
 */
async function ensureAuthorExists(authorId) {
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { id: true },
  });

  if (!author) {
    throw new NotFoundError(`Autor com ID ${authorId} não encontrado`);
  }
}

/**
 * Busca todas as questões no formato público.
 * @returns {Promise<object[]>} Lista de questões com matéria e autor.
 */
export function getAllQuestions() {
  return prisma.question.findMany({
    select: publicQuestionSelect,
    orderBy: { id: "asc" },
  });
}

/**
 * Busca uma questão por identificador.
 * @param {number} questionId - ID já validado pelo middleware.
 * @returns {Promise<object>} Questão pública encontrada.
 * @throws {NotFoundError} Quando a questão não existe.
 */
export async function getQuestionById(questionId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: publicQuestionSelect,
  });

  if (!question) {
    throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
  }

  return question;
}

/**
 * Cria uma questão vinculada a uma matéria e a um autor existentes.
 * @param {{enunciado: string, dificuldade: number, respostaCorreta?: string|null, subjectId: number, authorId: number, ativa?: boolean}} data - Dados já parseados pelo Zod.
 * @returns {Promise<object>} Questão pública criada.
 * @throws {NotFoundError} Quando a matéria ou o autor não existem.
 */
export async function createQuestion(data) {
  await ensureSubjectExists(data.subjectId);
  await ensureAuthorExists(data.authorId);

  try {
    return await prisma.question.create({
      data: {
        enunciado: data.enunciado,
        dificuldade: data.dificuldade,
        respostaCorreta: data.respostaCorreta ?? null,
        subjectId: data.subjectId,
        authorId: data.authorId,
        ativa: data.ativa ?? true,
      },
      select: publicQuestionSelect,
    });
  } catch (error) {
    if (error?.code === "P2003") {
      throw new NotFoundError("Matéria ou autor informado não encontrado");
    }

    throw error;
  }
}

/**
 * Atualiza somente os campos enviados de uma questão existente.
 * @param {number} questionId - ID já validado pelo middleware.
 * @param {{enunciado?: string, dificuldade?: number, respostaCorreta?: string|null, subjectId?: number, authorId?: number, ativa?: boolean}} data - Campos permitidos no PATCH.
 * @returns {Promise<object>} Questão pública atualizada.
 * @throws {NotFoundError} Quando a questão, a matéria ou o autor não existem.
 */
export async function updateQuestion(questionId, data) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!question) {
    throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
  }

  if (data.subjectId !== undefined) {
    await ensureSubjectExists(data.subjectId);
  }

  if (data.authorId !== undefined) {
    await ensureAuthorExists(data.authorId);
  }

  try {
    return await prisma.question.update({
      where: { id: questionId },
      data,
      select: publicQuestionSelect,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
    }

    if (error?.code === "P2003") {
      throw new NotFoundError("Matéria ou autor informado não encontrado");
    }

    throw error;
  }
}

/**
 * Remove uma questão existente.
 * @param {number} questionId - ID já validado pelo middleware.
 * @returns {Promise<object>} Questão pública removida.
 * @throws {NotFoundError} Quando a questão não existe.
 */
export async function deleteQuestion(questionId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!question) {
    throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
  }

  try {
    return await prisma.question.delete({
      where: { id: questionId },
      select: publicQuestionSelect,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
    }

    throw error;
  }
}