import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import prisma from "../src/config/database.js";
import { createAuthUser, removeAuthUsers } from "./helpers/auth.js";

const FRONTEND = "http://localhost:5173";
const userIds = [];
const subjectIds = [];
const questionIds = [];

let admin;
let professor;
let otherProfessor;

beforeAll(async () => {
  admin = await createAuthUser({ papel: "ADMIN" });
  professor = await createAuthUser({ papel: "PROFESSOR" });
  otherProfessor = await createAuthUser({ papel: "PROFESSOR" });
});

/** Remove somente os registros criados por este arquivo, respeitando as relações. */
afterEach(async () => {
  await prisma.question.deleteMany({
    where: { id: { in: questionIds.splice(0) } },
  });
  await prisma.subject.deleteMany({
    where: { id: { in: subjectIds.splice(0) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
});
afterAll(removeAuthUsers);

/** Gera um e-mail exclusivo para cada cenário. */
function email() {
  return `aula11-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

/** Confere o envelope de erro padronizado da API. */
function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(false);
  expect(response.body.error.code).toBe(code);
}

/** Confere uma recusa de autenticação: 401 e o esquema Bearer anunciado. */
function expectUnauthorized(response) {
  expectError(response, 401, "UNAUTHORIZED");
  expect(response.headers["www-authenticate"]).toMatch(/^Bearer/);
}

/** Cria pelo banco um usuário V2 comum, sem depender das rotas avaliadas. */
async function createPlainUser() {
  const user = await prisma.user.create({
    data: {
      nome: "Grace Hopper",
      primeiroNome: "Grace",
      sobrenome: "Hopper",
      email: email(),
      tipoUsuario: "professor",
    },
  });
  userIds.push(user.id);
  return user;
}

/** Registra pela API um professor e guarda o ID para limpeza. */
async function register(overrides = {}) {
  const response = await request(app)
    .post("/v2/auth/register")
    .send({
      primeiroNome: "Ada",
      sobrenome: "Lovelace",
      email: email(),
      senha: "senha-forte-123",
      ...overrides,
    });
  if (response.status === 201) userIds.push(response.body.data.user.id);
  return response;
}

/** Assina um token com o segredo de teste e opções escolhidas pelo cenário. */
function signTestToken(payload, options = {}) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    issuer: "api-gerador-provas",
    audience: "api-gerador-provas-client",
    ...options,
  });
}

describe("Prática — headers de segurança (Helmet)", () => {
  it("aplica os headers do Helmet e remove X-Powered-By", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toContain(
      "default-src 'self'",
    );
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-xss-protection"]).toBe("0");
    expect(response.headers).not.toHaveProperty("x-powered-by");
  });

  it("também protege respostas de erro e mantém o Swagger UI", async () => {
    const missing = await request(app).get("/rota-inexistente");
    expect(missing.status).toBe(404);
    expect(missing.headers["x-content-type-options"]).toBe("nosniff");
    const docs = await request(app).get("/api-docs/");
    expect(docs.status).toBe(200);
    expect(docs.headers["content-security-policy"]).toContain(
      "script-src 'self'",
    );
  });
});

describe("Prática — CORS", () => {
  it("libera somente a origem configurada", async () => {
    const allowed = await request(app).get("/health").set("Origin", FRONTEND);
    expect(allowed.headers["access-control-allow-origin"]).toBe(FRONTEND);
    expect(allowed.headers["access-control-expose-headers"]).toContain(
      "Deprecation",
    );
    expect(allowed.headers.vary).toContain("Origin");

    const blocked = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173.evil.example");
    // CORS não bloqueia no servidor: a resposta existe, mas sem permissão para o navegador.
    expect(blocked.status).toBe(200);
    expect(blocked.headers).not.toHaveProperty("access-control-allow-origin");
  });

  it("responde ao preflight liberando o header Authorization", async () => {
    const response = await request(app)
      .options("/v2/users")
      .set("Origin", FRONTEND)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(FRONTEND);
    expect(response.headers["access-control-allow-headers"]).toContain(
      "Authorization",
    );
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(response.headers["access-control-max-age"]).toBe("600");
  });
});

describe("Prática — cadastro e login (bcrypt + JWT)", () => {
  it("registra um professor, guarda somente o hash e devolve um token", async () => {
    const response = await register({ email: "  ADA.Register@Example.com " });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    const { user, token } = response.body.data;
    expect(user.email).toBe("ada.register@example.com");
    expect(user.tipoUsuario).toBe("professor");
    expect(user).not.toHaveProperty("senha");
    expect(token.split(".")).toHaveLength(3);

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored.senha).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    expect(stored.senha).not.toContain("senha-forte-123");
    expect(stored.papel).toBe("PROFESSOR");
  });

  it("gera hashes diferentes para a mesma senha (salt)", async () => {
    const first = await register({ senha: "mesma-senha-123" });
    const second = await register({ senha: "mesma-senha-123" });
    const hashes = await prisma.user.findMany({
      where: {
        id: { in: [first.body.data.user.id, second.body.data.user.id] },
      },
      select: { senha: true },
    });
    expect(hashes[0].senha).not.toBe(hashes[1].senha);
  });

  it.each([
    ["papel escolhido pelo cliente", { papel: "ADMIN" }],
    ["tipoUsuario escolhido pelo cliente", { tipoUsuario: "admin" }],
    ["senha curta", { senha: "curta12" }],
    ["senha acima de 72 bytes", { senha: "ç".repeat(37) }],
    ["e-mail inválido", { email: "invalido" }],
    ["sem senha", { senha: undefined }],
  ])("rejeita cadastro com %s", async (_title, overrides) => {
    expectError(await register(overrides), 400, "VALIDATION_ERROR");
  });

  it("rejeita cadastro com e-mail já usado", async () => {
    const first = await register();
    expectError(
      await register({ email: first.body.data.user.email.toUpperCase() }),
      409,
      "CONFLICT",
    );
  });

  it("faz login e emite um token com sub, role, emissor, público e expiração", async () => {
    const created = await register({ senha: "senha-login-123" });
    const response = await request(app).post("/v2/auth/login").send({
      email: created.body.data.user.email,
      senha: "senha-login-123",
    });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login realizado com sucesso");
    const payload = jwt.decode(response.body.data.token, { complete: true });
    expect(payload.header.alg).toBe("HS256");
    expect(payload.payload).toMatchObject({
      sub: String(created.body.data.user.id),
      role: "PROFESSOR",
      iss: "api-gerador-provas",
      aud: "api-gerador-provas-client",
    });
    expect(payload.payload.exp - payload.payload.iat).toBe(15 * 60);
    expect(payload.payload).not.toHaveProperty("senha");
  });

  it("responde igual para senha errada, e-mail inexistente e conta sem senha", async () => {
    const created = await register();
    const legacy = await createPlainUser();
    const attempts = [
      { email: created.body.data.user.email, senha: "senha-errada-123" },
      { email: email(), senha: "senha-forte-123" },
      { email: legacy.email, senha: "senha-forte-123" },
    ];
    for (const body of attempts) {
      const response = await request(app).post("/v2/auth/login").send(body);
      expectError(response, 401, "UNAUTHORIZED");
      expect(response.body.error.message).toBe("E-mail ou senha inválidos");
    }
  });

  it("valida o corpo do login", async () => {
    expectError(
      await request(app).post("/v2/auth/login").send({ email: "x" }),
      400,
      "VALIDATION_ERROR",
    );
  });
});

describe("Prática — middleware de autenticação (GET /v2/auth/me)", () => {
  it("devolve o usuário dono do token", async () => {
    const response = await request(app).get("/v2/auth/me").set(professor.auth);
    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(professor.user.id);
    expect(response.body.data.user).not.toHaveProperty("senha");
  });

  it("aceita o esquema Bearer sem diferenciar maiúsculas", async () => {
    const response = await request(app)
      .get("/v2/auth/me")
      .set("Authorization", `bearer ${professor.token}`);
    expect(response.status).toBe(200);
  });

  it.each([
    ["sem header", null],
    ["header vazio", ""],
    ["sem o esquema Bearer", "TOKEN"],
    ["apenas Bearer", "Bearer"],
    ["com espaços extras", "Bearer  token"],
    ["com outro esquema", "Basic dXNlcjpwYXNz"],
    ["token malformado", "Bearer nao.e.um.jwt"],
  ])("recusa %s", async (_title, header) => {
    const call = request(app).get("/v2/auth/me");
    if (header !== null) call.set("Authorization", header);
    expectUnauthorized(await call);
  });

  it("recusa token adulterado, expirado, de outro emissor ou sem assinatura", async () => {
    const [header, payload, signature] = professor.token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, "base64url").toString()),
        role: "ADMIN",
      }),
    ).toString("base64url");
    const tokens = [
      `${header}.${forgedPayload}.${signature}`,
      signTestToken(
        { role: "PROFESSOR" },
        { subject: String(professor.user.id), expiresIn: -10 },
      ),
      signTestToken(
        { role: "PROFESSOR" },
        { subject: String(professor.user.id), issuer: "outra-api" },
      ),
      jwt.sign(
        { role: "ADMIN", sub: String(admin.user.id) },
        "outro-segredo-com-mais-de-32-caracteres!!",
      ),
      `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${payload}.`,
    ];
    for (const token of tokens) {
      expectUnauthorized(
        await request(app)
          .get("/v2/auth/me")
          .set("Authorization", `Bearer ${token}`),
      );
    }
  });

  it("explica que o token expirou", async () => {
    const expired = signTestToken(
      { role: "PROFESSOR" },
      { subject: String(professor.user.id), expiresIn: -10 },
    );
    const response = await request(app)
      .get("/v2/auth/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(response.body.error.message).toContain("expirado");
  });

  it("recusa token válido de usuário removido", async () => {
    const created = await register();
    const { token } = created.body.data;
    await prisma.user.delete({ where: { id: created.body.data.user.id } });
    const response = await request(app)
      .get("/v2/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expectError(response, 401, "UNAUTHORIZED");
  });
});

describe("Prática — autorização RBAC em /v2/users", () => {
  it("mantém a leitura pública", async () => {
    const user = await createPlainUser();
    expect((await request(app).get("/v2/users")).status).toBe(200);
    expect((await request(app).get(`/v2/users/${user.id}`)).status).toBe(200);
  });

  it("exige token nas escritas antes de validar o corpo", async () => {
    const user = await createPlainUser();
    expectUnauthorized(await request(app).post("/v2/users").send({}));
    expectUnauthorized(
      await request(app).patch(`/v2/users/${user.id}`).send({}),
    );
    expectUnauthorized(await request(app).delete(`/v2/users/${user.id}`));
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBe(
      null,
    );
  });

  it("permite somente ADMIN criar usuários, com senha inicial opcional", async () => {
    const body = {
      primeiroNome: "Katherine",
      sobrenome: "Johnson",
      email: email(),
      senha: "senha-inicial-123",
    };
    expectError(
      await request(app).post("/v2/users").set(professor.auth).send(body),
      403,
      "FORBIDDEN",
    );
    const created = await request(app)
      .post("/v2/users")
      .set(admin.auth)
      .send(body);
    expect(created.status).toBe(201);
    userIds.push(created.body.data.id);
    expect(created.body.data).not.toHaveProperty("senha");

    const login = await request(app)
      .post("/v2/auth/login")
      .send({ email: body.email, senha: body.senha });
    expect(login.status).toBe(200);
  });

  it("permite ao PROFESSOR alterar somente o próprio cadastro", async () => {
    const own = await request(app)
      .patch(`/v2/users/${professor.user.id}`)
      .set(professor.auth)
      .send({ telefone: "11999999999" });
    expect(own.status).toBe(200);
    expect(own.body.data.telefone).toBe("11999999999");

    expectError(
      await request(app)
        .patch(`/v2/users/${otherProfessor.user.id}`)
        .set(professor.auth)
        .send({ telefone: "11888888888" }),
      403,
      "FORBIDDEN",
    );
  });

  it("impede que o PROFESSOR promova o próprio papel", async () => {
    const response = await request(app)
      .patch(`/v2/users/${professor.user.id}`)
      .set(professor.auth)
      .send({ tipoUsuario: "admin" });
    expectError(response, 403, "FORBIDDEN");
    const stored = await prisma.user.findUnique({
      where: { id: professor.user.id },
    });
    expect(stored.papel).toBe("PROFESSOR");
  });

  it("permite ao ADMIN alterar qualquer usuário, inclusive o papel", async () => {
    const user = await createPlainUser();
    const response = await request(app)
      .patch(`/v2/users/${user.id}`)
      .set(admin.auth)
      .send({ tipoUsuario: "admin" });
    expect(response.status).toBe(200);
    expect(response.body.data.tipoUsuario).toBe("admin");
  });

  it("reserva DELETE ao ADMIN", async () => {
    const user = await createPlainUser();
    expectError(
      await request(app)
        .delete(`/v2/users/${professor.user.id}`)
        .set(professor.auth),
      403,
      "FORBIDDEN",
    );
    const removed = await request(app)
      .delete(`/v2/users/${user.id}`)
      .set(admin.auth);
    expect(removed.status).toBe(200);
  });
});

describe("Prática — documentação da segurança no Swagger", () => {
  it("declara bearerAuth e documenta as rotas de autenticação", async () => {
    const { body: spec } = await request(app).get("/api-docs.json");
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
    expect(spec.paths["/v2/auth/register"].post.responses).toHaveProperty(
      "201",
    );
    expect(spec.paths["/v2/auth/login"].post.responses).toHaveProperty("401");
    expect(spec.paths["/v2/auth/me"].get.security).toEqual([
      { bearerAuth: [] },
    ]);
  });

  it("marca somente as escritas de /v2/users como protegidas", async () => {
    const { body: spec } = await request(app).get("/api-docs.json");
    for (const [path, method] of [
      ["/v2/users", "post"],
      ["/v2/users/{id}", "patch"],
      ["/v2/users/{id}", "delete"],
    ]) {
      const operation = spec.paths[path][method];
      expect(operation.security).toEqual([{ bearerAuth: [] }]);
      expect(operation.responses["401"].$ref).toBe(
        "#/components/responses/Unauthorized",
      );
      expect(operation.responses["403"].$ref).toBe(
        "#/components/responses/Forbidden",
      );
    }
    expect(spec.paths["/v2/users"].get.security).toBeUndefined();
    expect(spec.paths["/v2/users/{id}"].get.security).toBeUndefined();
  });
});

/** Cria pelo banco uma matéria do professor informado. */
async function createSubject(professorId) {
  const subject = await prisma.subject.create({
    data: { nome: "Matéria da aula 11", professorId },
  });
  subjectIds.push(subject.id);
  return subject;
}

/** Cria pelo banco uma questão ligada à matéria e ao autor informados. */
async function createQuestion(subjectId, authorId) {
  const question = await prisma.question.create({
    data: { enunciado: "Quanto é 2 + 2?", dificuldade: 1, subjectId, authorId },
  });
  questionIds.push(question.id);
  return question;
}

const resources = {
  subjects: {
    fixture: () => createSubject(professor.user.id),
    body: () => ({ nome: "Banco de Dados", professorId: professor.user.id }),
    patch: { nome: "Banco de Dados II" },
    track: subjectIds,
    model: "subject",
  },
  questions: {
    fixture: async () =>
      createQuestion(
        (await createSubject(professor.user.id)).id,
        professor.user.id,
      ),
    body: async () => ({
      enunciado: "O que é JWT?",
      dificuldade: 2,
      subjectId: (await createSubject(professor.user.id)).id,
      authorId: professor.user.id,
    }),
    patch: { dificuldade: 3 },
    track: questionIds,
    model: "question",
  },
};

describe("Atividade — proteção de matérias e questões V2", () => {
  describe.each(Object.keys(resources))("/v2/%s", (resource) => {
    const config = resources[resource];

    it(`exige token nas escritas de /v2/${resource} e mantém a leitura pública`, async () => {
      const item = await config.fixture();
      expect((await request(app).get(`/v2/${resource}`)).status).toBe(200);
      expect(
        (await request(app).get(`/v2/${resource}/${item.id}`)).status,
      ).toBe(200);
      const posted = await request(app)
        .post(`/v2/${resource}`)
        .send(await config.body());
      // Registra para limpeza até um recurso criado indevidamente sem token.
      if (posted.status === 201) config.track.push(posted.body.data.id);
      expectUnauthorized(posted);
      expectUnauthorized(
        await request(app)
          .patch(`/v2/${resource}/${item.id}`)
          .send(config.patch),
      );
      expectUnauthorized(
        await request(app).delete(`/v2/${resource}/${item.id}`),
      );
      expectUnauthorized(
        await request(app)
          .delete(`/v2/${resource}/${item.id}`)
          .set("Authorization", "Bearer token.invalido.aqui"),
      );
      const stored = await prisma[config.model].findUnique({
        where: { id: item.id },
      });
      expect(stored).not.toBe(null);
    });

    it(`permite PROFESSOR e ADMIN criarem e alterarem /v2/${resource}`, async () => {
      for (const actor of [professor, admin]) {
        const created = await request(app)
          .post(`/v2/${resource}`)
          .set(actor.auth)
          .send(await config.body());
        if (created.status === 201) config.track.push(created.body.data.id);
        expect(created.status).toBe(201);
        const changed = await request(app)
          .patch(`/v2/${resource}/${created.body.data.id}`)
          .set(actor.auth)
          .send(config.patch);
        expect(changed.status).toBe(200);
      }
    });

    it(`reserva DELETE de /v2/${resource} ao ADMIN`, async () => {
      const item = await config.fixture();
      expectError(
        await request(app)
          .delete(`/v2/${resource}/${item.id}`)
          .set(professor.auth),
        403,
        "FORBIDDEN",
      );
      expect(
        await prisma[config.model].findUnique({ where: { id: item.id } }),
      ).not.toBe(null);
      const removed = await request(app)
        .delete(`/v2/${resource}/${item.id}`)
        .set(admin.auth);
      expect(removed.status).toBe(200);
    });
  });
});
