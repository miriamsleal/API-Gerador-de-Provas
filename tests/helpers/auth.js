import prisma from "../../src/config/database.js";
import { generateToken } from "../../src/config/jwt.js";
import { hashPassword } from "../../src/config/password.js";

const createdIds = [];

/**
 * Cria diretamente no banco um usuário com senha e devolve um token válido.
 * Não depende das rotas avaliadas, então serve de preparação para qualquer teste.
 * @param {{papel?: "PROFESSOR"|"ADMIN", senha?: string}} [options] - Papel e senha.
 * @returns {Promise<{user: {id: number, email: string, papel: string}, senha: string, token: string, auth: {Authorization: string}}>}
 */
export async function createAuthUser({
  papel = "PROFESSOR",
  senha = "senha-de-teste-123",
} = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      nome: `Auth ${papel}`,
      primeiroNome: "Auth",
      sobrenome: papel === "ADMIN" ? "Admin" : "Professor",
      email: `auth-${papel.toLowerCase()}-${suffix}@example.com`,
      papel,
      tipoUsuario: papel === "ADMIN" ? "admin" : "professor",
      senha: await hashPassword(senha),
    },
    select: { id: true, email: true, papel: true },
  });
  createdIds.push(user.id);
  const token = generateToken(user);
  return { user, senha, token, auth: { Authorization: `Bearer ${token}` } };
}

/** Remove somente os usuários criados por createAuthUser. */
export async function removeAuthUsers() {
  await prisma.user.deleteMany({ where: { id: { in: createdIds.splice(0) } } });
}
