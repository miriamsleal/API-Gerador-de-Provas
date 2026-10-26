// MODIFICADO: verifica fallback V2 com V1 intacta; não exige SQL de preenchimento.
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const userIds = [];
const subjectIds = [];

/** Gera e-mail único para cada fixture da V2. */
function email() {
  return `aula08-${Date.now()}-${Math.random()}@example.com`;
}

/** Cria pela V2 e registra somente IDs pertencentes à suíte. */
async function createV2(overrides = {}) {
  const response = await request(app)
    .post("/v2/users")
    .send({
      primeiroNome: "Ada",
      sobrenome: "Lovelace",
      email: email(),
      ...overrides,
    });
  if (response.status === 201) userIds.push(response.body.data.id);
  return response;
}

/** Cria pela V1, que é pré-requisito validado da prática. */
async function createV1(overrides = {}) {
  const response = await request(app)
    .post("/v1/users")
    .send({
      nome: "Linus Torvalds",
      email: email(),
      ...overrides,
    });
  expect(response.status).toBe(201);
  userIds.push(response.body.data.id);
  return response.body.data;
}

/** Confere status e envelope operacional, evitando falsos positivos de rota. */
function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(false);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.message).toEqual(expect.any(String));
}

/** Limpa só as próprias fixtures e respeita a ordem das relações. */
afterEach(async () => {
  await prisma.subject.deleteMany({
    where: { id: { in: subjectIds.splice(0) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
});

describe("Prática — User V2 e coexistência", () => {
  it("publica health V2 e anuncia as duas versões", async () => {
    const root = await request(app).get("/health");
    expect(root.status).toBe(200);
    expect(root.body.availableVersions).toEqual(["v1", "v2"]);
    const version = await request(app).get("/v2/health");
    expect(version.status).toBe(200);
    expect(version.body).toEqual({ status: "OK", version: "v2" });
    expect((await request(app).get("/v1/health")).headers).not.toHaveProperty(
      "deprecation",
    );
  });

  it("cria e normaliza V2 sem expor nome/papel V1", async () => {
    const address = email();
    const created = await createV2({
      primeiroNome: "  Grace ",
      sobrenome: " Hopper ",
      email: address.toUpperCase(),
      tipoUsuario: "admin",
      telefone: "11999999999",
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      primeiroNome: "Grace",
      sobrenome: "Hopper",
      email: address,
      tipoUsuario: "admin",
      telefone: "11999999999",
    });
    expect(created.body.data).not.toHaveProperty("nome");
    expect(created.body.data).not.toHaveProperty("papel");
    const v1 = await request(app).get(`/v1/users/${created.body.data.id}`);
    expect(v1.body.data).toMatchObject({
      nome: "Grace Hopper",
      papel: "ADMIN",
    });
    expect(v1.body.data).not.toHaveProperty("telefone");
  });

  it("preserva defaults professor e campos opcionais null", async () => {
    const created = await createV2();
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      tipoUsuario: "professor",
      telefone: null,
      foto: null,
    });
    expect(created.body.data.id).toEqual(expect.any(Number));
    expect(Number.isNaN(Date.parse(created.body.data.createdAt))).toBe(false);
  });

  it("adapta usuário V1 na lista e na busca sem preencher suas colunas", async () => {
    const v1 = await createV1({ papel: "ADMIN" });
    // MODIFICADO: a V1 não grava campos V2; GET deve adaptar sem persistir.
    const before = await prisma.user.findUnique({ where: { id: v1.id } });
    expect(before).toMatchObject({
      primeiroNome: null,
      sobrenome: null,
      tipoUsuario: null,
    });
    const list = await request(app).get("/v2/users");
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(list.body.data.length);
    expect(list.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: v1.id,
          primeiroNome: "Linus",
          sobrenome: "Torvalds",
          tipoUsuario: "admin",
        }),
      ]),
    );
    const found = await request(app).get(`/v2/users/${v1.id}`);
    expect(found.status).toBe(200);
    expect(found.body.data).toMatchObject({
      id: v1.id,
      primeiroNome: "Linus",
      sobrenome: "Torvalds",
      tipoUsuario: "admin",
    });
    expect(found.body.data).not.toHaveProperty("nome");
    expect(found.body.data).not.toHaveProperty("papel");
    const after = await prisma.user.findUnique({ where: { id: v1.id } });
    expect(after).toEqual(before);
  });

  it("sincroniza V1 após PATCH V2 e preserva campos omitidos", async () => {
    const created = await createV2({
      telefone: "11999999999",
      foto: "https://example.com/foto.png",
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const updated = await request(app)
      .patch(`/v2/users/${id}`)
      .send({ primeiroNome: "Augusta", tipoUsuario: "admin" });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      primeiroNome: "Augusta",
      sobrenome: "Lovelace",
      tipoUsuario: "admin",
      telefone: "11999999999",
      foto: "https://example.com/foto.png",
    });
    const v1 = await request(app).get(`/v1/users/${id}`);
    expect(v1.body.data).toMatchObject({
      nome: "Augusta Lovelace",
      papel: "ADMIN",
    });
    const removedOptional = await request(app)
      .patch(`/v2/users/${id}`)
      .send({ telefone: null, foto: null });
    expect(removedOptional.body.data.telefone).toBeNull();
    expect(removedOptional.body.data.foto).toBeNull();
  });

  it("documenta o limite de alterar pela V1 um usuário criado na V2", async () => {
    // OBSERVAÇÃO: não implementamos sincronização V1 → V2 nesta aula.
    const created = await createV2({
      primeiroNome: "Ana",
      sobrenome: "Silva",
      tipoUsuario: "professor",
      telefone: "11999999999",
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    await request(app)
      .patch(`/v1/users/${id}`)
      .send({ nome: "Ana Costa", papel: "ADMIN" })
      .expect(200);
    const v1 = await request(app).get(`/v1/users/${id}`);
    expect(v1.status).toBe(200);
    expect(v1.body.data).toMatchObject({ nome: "Ana Costa", papel: "ADMIN" });
    const v2 = await request(app).get(`/v2/users/${id}`);
    expect(v2.status).toBe(200);
    // Campos V2 preenchidos prevalecem; o fallback não detecta divergência.
    expect(v2.body.data).toMatchObject({
      primeiroNome: "Ana",
      sobrenome: "Silva",
      tipoUsuario: "professor",
      telefone: "11999999999",
    });
  });

  it("adapta nome legado com espaços sem modificar o valor persistido", async () => {
    // ADICIONADO: simula dados anteriores à V2, sem passar pelo POST novo.
    const user = await prisma.user.create({
      data: {
        nome: "  Ana   Maria Silva  ",
        email: email(),
        papel: "ADMIN",
      },
    });
    userIds.push(user.id);
    const response = await request(app).get(`/v2/users/${user.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      primeiroNome: "Ana",
      sobrenome: "Maria Silva",
      tipoUsuario: "admin",
      telefone: null,
    });
    const persisted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(persisted).toEqual(user);
  });

  it("adapta a resposta de PATCH só de e-mail sem preencher nomes legados", async () => {
    const user = await createV1({ papel: "ADMIN" });
    const address = email();
    const response = await request(app)
      .patch(`/v2/users/${user.id}`)
      .send({ email: address });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      primeiroNome: "Linus",
      sobrenome: "Torvalds",
      tipoUsuario: "admin",
      email: address,
    });
    const persisted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(persisted).toMatchObject({
      nome: "Linus Torvalds",
      papel: "ADMIN",
      primeiroNome: null,
      sobrenome: null,
      tipoUsuario: null,
    });
  });

  it("adapta o retorno de DELETE de um usuário legado livre", async () => {
    const user = await createV1({ nome: "Madonna", papel: "ADMIN" });
    const response = await request(app).delete(`/v2/users/${user.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: user.id,
      primeiroNome: "Madonna",
      sobrenome: null,
      tipoUsuario: "admin",
    });
    expect(response.body.data).not.toHaveProperty("nome");
    expect(response.body.data).not.toHaveProperty("papel");
    await request(app).get(`/v1/users/${user.id}`).expect(404);
  });

  it("trata nome V1 de uma palavra sem duplicar sobrenome nem espaço final", async () => {
    const v1 = await createV1({ nome: "Madonna" });
    const found = await request(app).get(`/v2/users/${v1.id}`);
    expect(found.body.data.sobrenome).toBeNull();
    const updated = await request(app)
      .patch(`/v2/users/${v1.id}`)
      .send({ primeiroNome: "Cher" });
    expect(updated.status).toBe(200);
    const persisted = await prisma.user.findUnique({ where: { id: v1.id } });
    expect(persisted.nome).toBe("Cher");
    expect(persisted.sobrenome).toBeNull();
  });

  it.each([
    { primeiroNome: "A" },
    { primeiroNome: "x".repeat(51) },
    { sobrenome: "A" },
    { sobrenome: "x".repeat(101) },
    { telefone: "123" },
    { telefone: 11999999999 },
    { tipoUsuario: "ADMIN" },
    { tipoUsuario: "aluno" },
    { email: "invalido" },
    { foto: "invalida" },
    { nome: "Nome antigo" },
    { papel: "PROFESSOR" },
    { campoExtra: true },
  ])("rejeita campo inválido em POST e PATCH V2: %j", async (invalid) => {
    const fixture = await createV1();
    expectError(await createV2(invalid), 400, "VALIDATION_ERROR");
    const patch = await request(app)
      .patch(`/v2/users/${fixture.id}`)
      .send(invalid);
    expectError(patch, 400, "VALIDATION_ERROR");
  });

  it("rejeita POST incompleto e PATCH vazio", async () => {
    expectError(
      await request(app).post("/v2/users").send({}),
      400,
      "VALIDATION_ERROR",
    );
    const fixture = await createV1();
    expectError(
      await request(app).patch(`/v2/users/${fixture.id}`).send({}),
      400,
      "VALIDATION_ERROR",
    );
  });

  it.each(["get", "patch", "delete"])(
    "valida ID e ausência real em %s V2",
    async (method) => {
      const agent = request(app);
      const fixture = await createV1();
      await prisma.user.delete({ where: { id: fixture.id } });
      for (const id of ["abc", "0", "-1", "1.5", "2147483648"]) {
        const invalid = await agent[method](`/v2/users/${id}`).send(
          method === "patch" ? { primeiroNome: "Novo" } : undefined,
        );
        expectError(invalid, 400, "VALIDATION_ERROR");
      }
      const missing = await agent[method](`/v2/users/${fixture.id}`).send(
        method === "patch" ? { primeiroNome: "Novo" } : undefined,
      );
      expectError(missing, 404, "NOT_FOUND");
      expect(missing.body.error.message).toContain("Usuário com ID");
    },
  );

  it("mantém e-mail único em POST/PATCH nas duas versões", async () => {
    const first = await createV1();
    expectError(
      await createV2({ email: first.email.toUpperCase() }),
      409,
      "CONFLICT",
    );
    const second = await createV2();
    expect(second.status).toBe(201);
    expectError(
      await request(app)
        .patch(`/v2/users/${second.body.data.id}`)
        .send({ email: first.email }),
      409,
      "CONFLICT",
    );
  });

  it("impede DELETE com vínculos e remove usuário livre nas duas versões", async () => {
    const fixture = await createV1();
    const subject = await prisma.subject.create({
      data: { nome: "Matéria vinculada", professorId: fixture.id },
    });
    subjectIds.push(subject.id);
    expectError(
      await request(app).delete(`/v2/users/${fixture.id}`),
      409,
      "CONFLICT",
    );
    const free = await createV2();
    expect(free.status).toBe(201);
    await request(app).delete(`/v2/users/${free.body.data.id}`).expect(200);
    expectError(
      await request(app).get(`/v1/users/${free.body.data.id}`),
      404,
      "NOT_FOUND",
    );
  });
});
