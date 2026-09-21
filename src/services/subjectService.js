import prisma from "../config/database.js";
import { ConflictError, NotFoundError } from "../errors/AppError.js";

const publicProfessorSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
};

const publicSubjectSelect = {
  id: true,
  nome: true,
  ativa: true,
  professorId: true,
  createdAt: true,
  updatedAt: true,
  professor: { select: publicProfessorSelect },
};

/**
 * Confirma que o professor informado existe antes de vincular uma matéria.
 * @param {number} professorId - ID já validado pelo middleware.
 * @returns {Promise<void>} Resolve quando o professor existe.
 * @throws {NotFoundError} Quando o professor não existe.
 */
async function ensureProfessorExists(professorId) {
  const professor = await prisma.user.findUnique({
    where: { id: professorId },
    select: { id: true },
  });

  if (!professor) {
    throw new NotFoundError(`Professor com ID ${professorId} não encontrado`);
  }
}

/**
 * Busca todas as matérias no formato público.
 * @returns {Promise<object[]>} Lista de matérias com o professor responsável.
 */
export function getAllSubjects() {
  return prisma.subject.findMany({
    select: publicSubjectSelect,
    orderBy: { id: "asc" },
  });
}

/**
 * Busca uma matéria por identificador.
 * @param {number} subjectId - ID já validado pelo middleware.
 * @returns {Promise<object>} Matéria pública encontrada.
 * @throws {NotFoundError} Quando a matéria não existe.
 */
export async function getSubjectById(subjectId) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: publicSubjectSelect,
  });

  if (!subject) {
    throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  }

  return subject;
}

/**
 * Cria uma matéria vinculada a um professor existente.
 * @param {{nome: string, professorId: number, ativa?: boolean}} data - Dados já parseados pelo Zod.
 * @returns {Promise<object>} Matéria pública criada.
 * @throws {NotFoundError} Quando o professor informado não existe.
 */
export async function createSubject(data) {
  await ensureProfessorExists(data.professorId);

  try {
    return await prisma.subject.create({
      data: {
        nome: data.nome,
        professorId: data.professorId,
        ativa: data.ativa ?? true,
      },
      select: publicSubjectSelect,
    });
  } catch (error) {
    if (error?.code === "P2003") {
      throw new NotFoundError(
        `Professor com ID ${data.professorId} não encontrado`,
      );
    }

    throw error;
  }
}

/**
 * Atualiza somente os campos enviados de uma matéria existente.
 * @param {number} subjectId - ID já validado pelo middleware.
 * @param {{nome?: string, professorId?: number, ativa?: boolean}} data - Campos permitidos no PATCH.
 * @returns {Promise<object>} Matéria pública atualizada.
 * @throws {NotFoundError} Quando a matéria ou o novo professor não existem.
 */
export async function updateSubject(subjectId, data) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });

  if (!subject) {
    throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  }

  if (data.professorId !== undefined) {
    await ensureProfessorExists(data.professorId);
  }

  try {
    return await prisma.subject.update({
      where: { id: subjectId },
      data,
      select: publicSubjectSelect,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
    }

    if (error?.code === "P2003") {
      throw new NotFoundError(
        `Professor com ID ${data.professorId} não encontrado`,
      );
    }

    throw error;
  }
}

/**
 * Remove uma matéria que não possua questões vinculadas.
 * @param {number} subjectId - ID já validado pelo middleware.
 * @returns {Promise<object>} Matéria pública removida.
 * @throws {NotFoundError} Quando a matéria não existe.
 * @throws {ConflictError} Quando existem questões vinculadas.
 */
export async function deleteSubject(subjectId) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      _count: { select: { questions: true } },
    },
  });

  if (!subject) {
    throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  }

  if (subject._count.questions > 0) {
    throw new ConflictError("Matéria possui questões vinculadas");
  }

  try {
    return await prisma.subject.delete({
      where: { id: subjectId },
      select: publicSubjectSelect,
    });
  } catch (error) {
    if (error?.code === "P2003" || error?.code === "P2014") {
      throw new ConflictError("Matéria possui questões vinculadas");
    }

    if (error?.code === "P2025") {
      throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
    }

    throw error;
  }
}