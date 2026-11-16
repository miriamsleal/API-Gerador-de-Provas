import prisma from "../../../config/database.js";
import { generateToken } from "../../../config/jwt.js";
import { hashPassword, verifyPassword } from "../../../config/password.js";
import { ConflictError, UnauthorizedError } from "../../../errors/AppError.js";
import { toPublicUserV2, userV2ReadSelect } from "./userService.js";

/**
 * Cadastra um professor com senha protegida por bcrypt e já devolve um token.
 * @param {{primeiroNome: string, sobrenome: string, email: string, senha: string}} data - Corpo validado.
 * @returns {Promise<{user: object, token: string}>} Usuário público e token JWT.
 */
export async function register(data) {
  const owner = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (owner) throw new ConflictError("E-mail já cadastrado");

  try {
    const user = await prisma.user.create({
      data: {
        primeiroNome: data.primeiroNome,
        sobrenome: data.sobrenome,
        email: data.email,
        senha: await hashPassword(data.senha),
        // O cadastro público sempre cria PROFESSOR; ADMIN é atribuído por um ADMIN.
        tipoUsuario: "professor",
        papel: "PROFESSOR",
        nome: `${data.primeiroNome} ${data.sobrenome}`,
      },
      select: userV2ReadSelect,
    });
    return { user: toPublicUserV2(user), token: generateToken(user) };
  } catch (error) {
    if (error?.code === "P2002")
      throw new ConflictError("E-mail já cadastrado");
    throw error;
  }
}

/**
 * Confere as credenciais e emite um token para o usuário.
 * @param {string} email - E-mail normalizado.
 * @param {string} senha - Senha em texto puro.
 * @returns {Promise<{user: object, token: string}>} Usuário público e token JWT.
 */
export async function login(email, senha) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...userV2ReadSelect, senha: true },
  });

  // A mesma mensagem para e-mail inexistente, conta sem senha e senha errada.
  const valid = user?.senha ? await verifyPassword(senha, user.senha) : false;
  if (!valid) throw new UnauthorizedError("E-mail ou senha inválidos");

  return { user: toPublicUserV2(user), token: generateToken(user) };
}

/**
 * Busca o usuário dono do token.
 * @param {number} userId - ID extraído do claim sub.
 * @returns {Promise<object>} Usuário na representação pública da V2.
 */
export async function getAuthenticatedUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userV2ReadSelect,
  });
  // Token assinado de um usuário removido não identifica mais ninguém.
  if (!user) throw new UnauthorizedError("Usuário do token não existe mais");
  return toPublicUserV2(user);
}
