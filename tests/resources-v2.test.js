// ADICIONADO: critérios finais da atividade; não modificar arquivos da V1.
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const userIds = [];
const subjectIds = [];
const questionIds = [];

/** Prepara dados diretamente no banco; não depende das rotas da atividade. */
async function fixtures() {
  const user = await prisma.user.create({
    data: {
      nome: "Professor de teste",
      email: `aula08-recursos-${Date.now()}-${Math.random()}@example.com`,
      primeiroNome: "Professor",
      sobrenome: "de teste",
      tipoUsuario: "professor",
    },
  });
  userIds.push(user.id);
  const subject = await prisma.subject.create({
    data: { nome: "Programação Web", professorId: user.id },
  });
  subjectIds.push(subject.id);
  const question = await prisma.question.create({
    data: {
      enunciado: "O que é um contrato?",
      dificuldade: 2,
      subjectId: subject.id,
      authorId: user.id,
    },
  });
  questionIds.push(question.id);
  return { user, subject, question };
}

/** Limpa na ordem questão → matéria → usuário, sempre pelos próprios IDs. */
afterEach(async () => {
  await prisma.question.deleteMany({
    where: { id: { in: questionIds.splice(0) } },
  });
  await prisma.subject.deleteMany({
    where: { id: { in: subjectIds.splice(0) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
});

/** Exige erro do recurso e não só o 404 de rota inexistente. */
function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(false);
  expect(response.body.error.code).toBe(code);
}

describe.each(["subjects", "questions"])(
  "Atividade — CRUD V2 de %s",
  (resource) => {
    it("cria um recurso sob /v2", async () => {
      const f = await fixtures();
      const body =
        resource === "subjects"
          ? { nome: "Nova matéria", professorId: f.user.id, ativa: false }
          : {
              enunciado: "Nova questão",
              dificuldade: 3,
              subjectId: f.subject.id,
              authorId: f.user.id,
              ativa: false,
            };
      const response = await request(app).post(`/v2/${resource}`).send(body);
      if (response.status === 201)
        (resource === "subjects" ? subjectIds : questionIds).push(
          response.body.data.id,
        );
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ativa).toBe(false);
      expect(
        response.body.data[resource === "subjects" ? "professor" : "author"].id,
      ).toBe(f.user.id);
    });

    it("lista recursos existentes", async () => {
      const f = await fixtures();
      const id = resource === "subjects" ? f.subject.id : f.question.id;
      await prisma[resource === "subjects" ? "subject" : "question"].update({
        where: { id },
        data: { ativa: false },
      });
      const response = await request(app).get(`/v2/${resource}`);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(response.body.data.length);
      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id, ativa: false })]),
      );
    });

    it("busca por ID e mantém os campos e relações", async () => {
      const f = await fixtures();
      const id = resource === "subjects" ? f.subject.id : f.question.id;
      const response = await request(app).get(`/v2/${resource}/${id}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(id);
      const v1 = await request(app).get(`/v1/${resource}/${id}`);
      expect(response.body.data).toEqual(v1.body.data);
      expect(
        response.body.data[resource === "subjects" ? "professor" : "author"].id,
      ).toBe(f.user.id);
    });

    it("atualiza parcialmente sem apagar os demais campos", async () => {
      const f = await fixtures();
      const id = resource === "subjects" ? f.subject.id : f.question.id;
      const response = await request(app)
        .patch(`/v2/${resource}/${id}`)
        .send({ ativa: false });
      expect(response.status).toBe(200);
      expect(response.body.data.ativa).toBe(false);
      expect(
        response.body.data[resource === "subjects" ? "nome" : "enunciado"],
      ).toBe(resource === "subjects" ? f.subject.nome : f.question.enunciado);
    });

    it("remove recurso livre e conserva V1 funcionando", async () => {
      const f = await fixtures();
      const id = resource === "subjects" ? f.subject.id : f.question.id;
      if (resource === "subjects")
        await prisma.question.delete({ where: { id: f.question.id } });
      const response = await request(app).delete(`/v2/${resource}/${id}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(id);
      const missing = await request(app).get(`/v1/${resource}/${id}`);
      expectError(missing, 404, "NOT_FOUND");
    });

    it.each(["get", "patch", "delete"])(
      "rejeita ID inválido em %s",
      async (method) => {
        const agent = request(app);
        for (const id of ["abc", "0", "-1", "1.5", "2147483648"]) {
          const response = await agent[method](`/v2/${resource}/${id}`).send(
            method === "patch" ? { ativa: false } : undefined,
          );
          expectError(response, 400, "VALIDATION_ERROR");
        }
      },
    );

    it.each(["get", "patch", "delete"])(
      "informa ausência real em %s",
      async (method) => {
        const agent = request(app);
        const f = await fixtures();
        const id = resource === "subjects" ? f.subject.id : f.question.id;
        await prisma.question.delete({ where: { id: f.question.id } });
        if (resource === "subjects")
          await prisma.subject.delete({ where: { id: f.subject.id } });
        const response = await agent[method](`/v2/${resource}/${id}`).send(
          method === "patch" ? { ativa: false } : undefined,
        );
        expectError(response, 404, "NOT_FOUND");
        expect(response.body.error.message).toContain(
          resource === "subjects" ? "Matéria com ID" : "Questão com ID",
        );
      },
    );

    it("rejeita corpo inválido em POST e campos extras em PATCH", async () => {
      const f = await fixtures();
      const id = resource === "subjects" ? f.subject.id : f.question.id;
      expectError(
        await request(app).post(`/v2/${resource}`).send({}),
        400,
        "VALIDATION_ERROR",
      );
      expectError(
        await request(app).patch(`/v2/${resource}/${id}`).send({}),
        400,
        "VALIDATION_ERROR",
      );
      expectError(
        await request(app)
          .patch(`/v2/${resource}/${id}`)
          .send({ inesperado: true }),
        400,
        "VALIDATION_ERROR",
      );
    });

    it.each(
      resource === "subjects"
        ? [
            { nome: "ab" },
            { nome: "x".repeat(101) },
            { professorId: 0 },
            { professorId: true },
            { professorId: [1] },
            { professorId: 2147483648 },
            { ativa: "false" },
            { extra: true },
          ]
        : [
            { enunciado: "ab" },
            { enunciado: "x".repeat(501) },
            { dificuldade: 0 },
            { dificuldade: 4 },
            { dificuldade: 1.5 },
            { dificuldade: true },
            { dificuldade: [1] },
            { subjectId: 0 },
            { subjectId: true },
            { subjectId: [1] },
            { authorId: 0 },
            { authorId: true },
            { authorId: [1] },
            { respostaCorreta: "" },
            { respostaCorreta: "x".repeat(501) },
            { ativa: "false" },
            { extra: true },
          ],
    )("rejeita valores inválidos em POST/PATCH: %j", async (invalid) => {
      const f = await fixtures();
      const id = resource === "subjects" ? f.subject.id : f.question.id;
      const body =
        resource === "subjects"
          ? { nome: "Matéria válida", professorId: f.user.id }
          : {
              enunciado: "Questão válida",
              dificuldade: 2,
              subjectId: f.subject.id,
              authorId: f.user.id,
            };
      expectError(
        await request(app)
          .post(`/v2/${resource}`)
          .send({ ...body, ...invalid }),
        400,
        "VALIDATION_ERROR",
      );
      expectError(
        await request(app).patch(`/v2/${resource}/${id}`).send(invalid),
        400,
        "VALIDATION_ERROR",
      );
    });

    it("mantém defaults e permite alterar relação para outro registro existente", async () => {
      const f = await fixtures();
      const other = await fixtures();
      const body =
        resource === "subjects"
          ? { nome: "Matéria padrão", professorId: f.user.id }
          : {
              enunciado: "Questão padrão",
              dificuldade: 1,
              subjectId: f.subject.id,
              authorId: f.user.id,
            };
      const created = await request(app).post(`/v2/${resource}`).send(body);
      if (created.status === 201)
        (resource === "subjects" ? subjectIds : questionIds).push(
          created.body.data.id,
        );
      expect(created.status).toBe(201);
      expect(created.body.data.ativa).toBe(true);
      if (resource === "questions")
        expect(created.body.data.respostaCorreta).toBeNull();
      const update =
        resource === "subjects"
          ? { professorId: other.user.id }
          : { subjectId: other.subject.id, authorId: other.user.id };
      const changed = await request(app)
        .patch(`/v2/${resource}/${created.body.data.id}`)
        .send(update);
      expect(changed.status).toBe(200);
      expect(
        changed.body.data[resource === "subjects" ? "professor" : "author"].id,
      ).toBe(other.user.id);
      if (resource === "questions")
        expect(changed.body.data.subject.id).toBe(other.subject.id);
    });

    it("confere relações ausentes em POST e PATCH", async () => {
      const f = await fixtures();
      const missing = await prisma.user.create({
        data: {
          nome: "Removido",
          email: `removido-${Date.now()}-${Math.random()}@example.com`,
        },
      });
      await prisma.user.delete({ where: { id: missing.id } });
      const id = resource === "subjects" ? f.subject.id : f.question.id;
      const body =
        resource === "subjects"
          ? { nome: "Sem professor", professorId: missing.id }
          : {
              enunciado: "Sem autor",
              dificuldade: 2,
              subjectId: f.subject.id,
              authorId: missing.id,
            };
      const post = await request(app).post(`/v2/${resource}`).send(body);
      expectError(post, 404, "NOT_FOUND");
      expect(post.body.error.message).toContain(
        resource === "subjects" ? "Professor com ID" : "Autor com ID",
      );
      const update =
        resource === "subjects"
          ? { professorId: missing.id }
          : { authorId: missing.id };
      const response = await request(app)
        .patch(`/v2/${resource}/${id}`)
        .send(update);
      expectError(response, 404, "NOT_FOUND");
      expect(response.body.error.message).toContain(
        resource === "subjects" ? "Professor com ID" : "Autor com ID",
      );
    });
  },
);

describe("Atividade — relações V2", () => {
  it("atualiza resposta correta e aceita null sem apagar campos omitidos", async () => {
    const f = await fixtures();
    const answered = await request(app)
      .patch(`/v2/questions/${f.question.id}`)
      .send({
        respostaCorreta: "Um acordo entre cliente e servidor",
        dificuldade: 3,
      });
    expect(answered.status).toBe(200);
    expect(answered.body.data.respostaCorreta).toBe(
      "Um acordo entre cliente e servidor",
    );
    const cleared = await request(app)
      .patch(`/v2/questions/${f.question.id}`)
      .send({ respostaCorreta: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.respostaCorreta).toBeNull();
    expect(cleared.body.data.dificuldade).toBe(3);
    expect(cleared.body.data.enunciado).toBe(f.question.enunciado);
  });

  it("impede excluir matéria que possui questões", async () => {
    const f = await fixtures();
    expectError(
      await request(app).delete(`/v2/subjects/${f.subject.id}`),
      409,
      "CONFLICT",
    );
  });

  it("valida matéria inexistente no POST/PATCH de questão", async () => {
    const f = await fixtures();
    const absent = await prisma.subject.create({
      data: { nome: "Removida", professorId: f.user.id },
    });
    await prisma.subject.delete({ where: { id: absent.id } });
    const post = await request(app).post("/v2/questions").send({
      enunciado: "Questão válida",
      dificuldade: 1,
      subjectId: absent.id,
      authorId: f.user.id,
    });
    expectError(post, 404, "NOT_FOUND");
    expect(post.body.error.message).toContain("Matéria com ID");
    const patch = await request(app)
      .patch(`/v2/questions/${f.question.id}`)
      .send({ subjectId: absent.id });
    expectError(patch, 404, "NOT_FOUND");
    expect(patch.body.error.message).toContain("Matéria com ID");
  });

  it("não publica CRUD sem versão e mantém o contrato V1", async () => {
    const f = await fixtures();
    for (const path of ["/subjects", "/questions"]) {
      expectError(await request(app).get(path), 404, "NOT_FOUND");
    }
    await request(app).get(`/v1/subjects/${f.subject.id}`).expect(200);
    await request(app).get(`/v1/questions/${f.question.id}`).expect(200);
  });
});
