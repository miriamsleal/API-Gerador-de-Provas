import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const createdUserIds = [];
const createdSubjectIds = [];

/**
 * Gera um e-mail único para evitar colisões entre execuções dos testes.
 * @param {string} label - Identificador que facilita reconhecer o teste de origem.
 * @returns {string} E-mail único para uso temporário no banco de testes.
 */
function uniqueEmail(label) {
  return `aula05-${label}-${Date.now()}-${Math.random()}@example.com`;
}

/**
 * Cria um usuário pela API e registra o ID para a limpeza após o teste.
 * @param {Object} [overrides={}] - Campos que substituem os valores padrão da requisição.
 * @returns {Promise<Object>} Resposta recebida do endpoint `POST /users`.
 */
async function createUser(overrides = {}) {
  const response = await request(app)
    .post("/users")
    .send({
      nome: "Prof. Teste",
      email: uniqueEmail("user"),
      ...overrides,
    });

  if (response.status === 201) {
    createdUserIds.push(response.body.data.id);
  }

  return response;
}

// Remove primeiro as matérias criadas e depois os usuários, respeitando as relações do banco.
afterEach(async () => {
  if (createdSubjectIds.length > 0) {
    await prisma.subject.deleteMany({
      where: { id: { in: createdSubjectIds.splice(0) } },
    });
  }

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

describe("User API", () => {
  it("lista usuários", async () => {
    const response = await request(app).get("/users");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBe(response.body.data.length);
  });

  it("cria e normaliza um usuário sem expor campos internos", async () => {
    const email = uniqueEmail("create").toUpperCase();
    const response = await createUser({ email });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe(email.toLowerCase());
    expect(response.body.data).not.toHaveProperty("_count");
  });

  it("retorna 409 para e-mail duplicado", async () => {
    const email = uniqueEmail("duplicate");
    await createUser({ email });

    const response = await createUser({ email: email.toUpperCase() });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it("busca usuário e valida o ID", async () => {
    const created = await createUser();
    const userId = created.body.data.id;

    const found = await request(app).get(`/users/${userId}`);
    const invalid = await request(app).get("/users/abc");
    const missing = await request(app).get("/users/999999999");

    expect(found.status).toBe(200);
    expect(found.body.data.id).toBe(userId);
    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
  });

  it("atualiza somente os campos enviados", async () => {
    const created = await createUser({ nome: "Nome original" });
    const userId = created.body.data.id;
    const originalEmail = created.body.data.email;

    const response = await request(app)
      .patch(`/users/${userId}`)
      .send({ nome: "Nome atualizado" });

    expect(response.status).toBe(200);
    expect(response.body.data.nome).toBe("Nome atualizado");
    expect(response.body.data.email).toBe(originalEmail);
  });

  it("rejeita PATCH vazio e conflito de e-mail", async () => {
    const first = await createUser();
    const second = await createUser();

    const empty = await request(app).patch(`/users/${second.body.data.id}`).send({});
    const conflict = await request(app)
      .patch(`/users/${second.body.data.id}`)
      .send({ email: first.body.data.email.toUpperCase() });

    expect(empty.status).toBe(400);
    expect(conflict.status).toBe(409);
  });

  it("remove um usuário sem vínculos", async () => {
    const created = await createUser();
    const userId = created.body.data.id;

    const removed = await request(app).delete(`/users/${userId}`);
    const found = await request(app).get(`/users/${userId}`);

    expect(removed.status).toBe(200);
    expect(removed.body.data.id).toBe(userId);
    expect(found.status).toBe(404);
  });

  it("impede remover um usuário com matéria vinculada", async () => {
    const created = await createUser();
    const userId = created.body.data.id;
    const subject = await prisma.subject.create({
      data: { nome: "Matéria de teste", professorId: userId },
    });
    createdSubjectIds.push(subject.id);

    const response = await request(app).delete(`/users/${userId}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("vinculadas");
  });
});