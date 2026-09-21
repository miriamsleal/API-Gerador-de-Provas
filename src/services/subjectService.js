import prisma from "../config/database.js";

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
 * Lista todas as matérias com os dados públicos do professor responsável.
 * @returns {Promise<Object[]>} 
 */
export const getAllSubjects = async () => {
  return prisma.subject.findMany({
    select: publicSubjectSelect,
    orderBy: { id: "asc" },
  });
};

/**
 * Busca uma matéria pelo identificador.
 * @param {number} subjectId 
 * @returns {Promise<Object|null>} 
 */
export const getSubjectById = async (subjectId) => {
  return prisma.subject.findUnique({
    where: { id: subjectId },
    select: publicSubjectSelect,
  });
};

/**
 * Cria uma matéria depois de confirmar que o professor existe.
 * @param {{ nome: string, professorId: number, ativa?: boolean }} subjectData 
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} 
 */
export const createSubject = async (subjectData) => {
  const professor = await prisma.user.findUnique({
    where: { id: subjectData.professorId },
    select: { id: true },
  });

  if (!professor) {
    return { ok: false, reason: "PROFESSOR_NOT_FOUND" };
  }

  const materia = await prisma.subject.create({
    data: {
      nome: subjectData.nome.trim(),
      ativa: subjectData.ativa ?? true,
      professorId: subjectData.professorId,
    },
    select: publicSubjectSelect,
  });

  return { ok: true, data: materia };
};

/**
 * Atualiza somente os campos enviados de uma matéria existente.
 * @param {number} subjectId - ID da matéria.
 * @param {{ nome?: string, ativa?: boolean, professorId?: number }} subjectData 
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} 
 */
export const updateSubject = async (subjectId, subjectData) => {
  const materiaExistente = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });

  if (!materiaExistente) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const data = {};

  if (Object.hasOwn(subjectData, "nome")) {
    data.nome = subjectData.nome.trim();
  }

  if (Object.hasOwn(subjectData, "ativa")) {
    data.ativa = subjectData.ativa;
  }

  if (Object.hasOwn(subjectData, "professorId")) {
    const professor = await prisma.user.findUnique({
      where: { id: subjectData.professorId },
      select: { id: true },
    });

    if (!professor) {
      return { ok: false, reason: "PROFESSOR_NOT_FOUND" };
    }

    data.professorId = subjectData.professorId;
  }

  const materia = await prisma.subject.update({
    where: { id: subjectId },
    data,
    select: publicSubjectSelect,
  });

  return { ok: true, data: materia };
};

/**
 * Remove uma matéria que não possua questões vinculadas.
 * @param {number} subjectId - ID da matéria.
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} 
 */
export const deleteSubject = async (subjectId) => {
  const materiaExistente = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      ...publicSubjectSelect,
      _count: { select: { questions: true } },
    },
  });

  if (!materiaExistente) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (materiaExistente._count.questions > 0) {
    return { ok: false, reason: "SUBJECT_IN_USE" };
  }

  try {
    const materia = await prisma.subject.delete({
      where: { id: subjectId },
      select: publicSubjectSelect,
    });

    return { ok: true, data: materia };
  } catch (error) {
    if (error.code === "P2003" || error.code === "P2014") {
      return { ok: false, reason: "SUBJECT_IN_USE" };
    }

    throw error;
  }
};