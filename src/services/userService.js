import prisma from "../config/database.js";

const publicUserSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  foto: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Normaliza um e-mail para que comparações e persistência usem o mesmo formato.
 * @param {string} email - E-mail informado na requisição.
 * @returns {string} E-mail sem espaços nas extremidades e em letras minúsculas.
 */
const normalizeEmail = (email) => email.trim().toLowerCase();

/**
 * Busca todos os usuários no formato público, do mais recente para o mais antigo.
 * @returns {Promise<Object[]>} Lista de usuários sem campos internos.
 */
export const getAllUsers = async () => {
  return prisma.user.findMany({
    select: publicUserSelect,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Busca um usuário pelo identificador único.
 * @param {number} userId - ID do usuário.
 * @returns {Promise<Object|null>} Usuário encontrado ou `null` quando ele não existe.
 */
export const getUserById = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });
};

/**
 * Cria um usuário depois de normalizar o e-mail e verificar a sua unicidade.
 * @param {{ nome: string, email: string, papel?: string, foto?: string|null }} userData - Dados recebidos pelo controller.
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} Resultado da criação ou o motivo do conflito.
 */
export const createUser = async (userData) => {
  const email = normalizeEmail(userData.email);
  const emailOwner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (emailOwner) {
    return { ok: false, reason: "EMAIL_CONFLICT" };
  }

  try {
    const usuario = await prisma.user.create({
      data: {
        nome: userData.nome.trim(),
        email,
        papel: userData.papel ?? "PROFESSOR",
        foto: userData.foto?.trim() || null,
      },
      select: publicUserSelect,
    });

    return { ok: true, data: usuario };
  } catch (error) {
    if (error.code === "P2002") {
      return { ok: false, reason: "EMAIL_CONFLICT" };
    }

    throw error;
  }
};

/**
 * Atualiza somente os campos enviados para um usuário existente.
 * @param {number} userId - ID do usuário a atualizar.
 * @param {{ nome?: string, email?: string, papel?: string, foto?: string|null }} userData - Campos permitidos no PATCH.
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} Resultado da atualização, inexistência ou conflito de e-mail.
 */
export const updateUser = async (userId, userData) => {
  const usuarioExistente = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!usuarioExistente) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const data = {};

  if (Object.hasOwn(userData, "nome")) {
    data.nome = userData.nome.trim();
  }

  if (Object.hasOwn(userData, "email")) {
    const email = normalizeEmail(userData.email);
    const emailOwner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (emailOwner && emailOwner.id !== userId) {
      return { ok: false, reason: "EMAIL_CONFLICT" };
    }

    data.email = email;
  }

  if (Object.hasOwn(userData, "papel")) {
    data.papel = userData.papel;
  }

  if (Object.hasOwn(userData, "foto")) {
    data.foto = userData.foto?.trim() || null;
  }

  try {
    const usuario = await prisma.user.update({
      where: { id: userId },
      data,
      select: publicUserSelect,
    });

    return { ok: true, data: usuario };
  } catch (error) {
    if (error.code === "P2002") {
      return { ok: false, reason: "EMAIL_CONFLICT" };
    }

    throw error;
  }
};

/**
 * Remove um usuário que não possua matérias nem questões vinculadas.
 * @param {number} userId - ID do usuário a remover.
 * @returns {Promise<{ ok: boolean, data?: Object, reason?: string }>} Usuário removido ou o motivo que impede a remoção.
 */
export const deleteUser = async (userId) => {
  const usuarioExistente = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      _count: {
        select: { subjects: true, questions: true },
      },
    },
  });

  if (!usuarioExistente) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (
    usuarioExistente._count.subjects > 0 ||
    usuarioExistente._count.questions > 0
  ) {
    return { ok: false, reason: "USER_IN_USE" };
  }

  try {
    const usuario = await prisma.user.delete({
      where: { id: userId },
      select: publicUserSelect,
    });

    return { ok: true, data: usuario };
  } catch (error) {
    if (error.code === "P2003" || error.code === "P2014") {
      return { ok: false, reason: "USER_IN_USE" };
    }

    throw error;
  }
};