import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

const createdQuestionIds = [];
const createdSubjectIds = [];
const createdUserIds = [];

/**
 * Gera um e-mail único para evitar colisões entre execuções.
 * @param {string} label 
 * @returns {string} 
 */
function uniqueEmail(label) {
  return `aula05-${label}-${Date.now()}-${Math.random()}@example.com`;
}

/**
 * Cria um usuário pela API e registra o ID para limpeza.
 * @param {Object} [overrides={}] 
 * @returns {Promise<Object>} 
 */
async function createUser(overrides = {}) {
  const response = await request(app)
    .post("/users")
    .send({
      nome: "Prof. Teste",
      email: uniqueEmail("rel"),
      ...overrides,
    });

  if (response.status === 201) {
    createdUserIds.push(response.body.data.id);
  }

  return response;
}

/**
 * Cria uma matéria pela API e registra o ID para limpeza.
 * @param {number} professorId 
 * @param {Object} [overrides={}] 
 * @returns {Promise<Object>} 
 */
async function createSubject(professorId, overrides = {}) {
  const response = await request(app)
    .post("/subjects")
    .send({
      nome: "Matéria de teste",
      professorId,
      ...overrides,
    });

  if (response.status === 201) {
    createdSubjectIds.push(response.body.data.id);
  }

  return response;
}

/**
 * Cria uma questão pela API e registra o ID para limpeza.
 * @param {number} disciplinaId 
 * @param {number} autorId 
 * @param {Object} [overrides={}] 
 * @returns {Promise<Object>} 
 */
async function createQuestion(disciplinaId, autorId, overrides = {}) {
  const response = await request(app)
    .post("/questions")
    .send({
      enunciado: "Questão de teste",
      dificuldade: 2,
      respostaCorreta: "Resposta",
      disciplinaId,
      autorId,
      ...overrides,
    });

  if (response.status === 201) {
    createdQuestionIds.push(response.body.data.id);
  }

  return response;
}

afterEach(async () => {
  if (createdQuestionIds.length > 0) {
    await prisma.question.deleteMany({
      where: { id: { in: createdQuestionIds.splice(0) } },
    });
  }

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

describe("Subject API", () => {
  it("cria, lista e busca matérias", async () => {
    const professor = await createUser();
    const created = await createSubject(professor.body.data.id);

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.data.professor.id).toBe(professor.body.data.id);

    const list = await request(app).get("/subjects");

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.total).toBe(list.body.data.length);

    const found = await request(app).get(`/subjects/${created.body.data.id}`);

    expect(found.status).toBe(200);
    expect(found.body.data.id).toBe(created.body.data.id);
  });

  it("rejeita ID inválido e corpo inválido", async () => {
    const professor = await createUser();

    const invalidId = await request(app).get("/subjects/abc");
    const invalidBody = await request(app)
      .post("/subjects")
      .send({ professorId: professor.body.data.id });

    expect(invalidId.status).toBe(400);
    expect(invalidBody.status).toBe(400);
  });

  it("retorna 404 para professor inexistente e matéria inexistente", async () => {
    const semProfessor = await request(app)
      .post("/subjects")
      .send({ nome: "Sem dono", professorId: 999999999 });
    const missing = await request(app).get("/subjects/999999999");

    expect(semProfessor.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it("atualiza somente os campos enviados", async () => {
    const professor = await createUser();
    const created = await createSubject(professor.body.data.id, {
      nome: "Nome original",
    });

    const response = await request(app)
      .patch(`/subjects/${created.body.data.id}`)
      .send({ nome: "Nome atualizado" });

    expect(response.status).toBe(200);
    expect(response.body.data.nome).toBe("Nome atualizado");
    expect(response.body.data.ativa).toBe(created.body.data.ativa);
    expect(response.body.data.professorId).toBe(professor.body.data.id);
  });

  it("rejeita PATCH vazio", async () => {
    const professor = await createUser();
    const created = await createSubject(professor.body.data.id);

    const response = await request(app)
      .patch(`/subjects/${created.body.data.id}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("remove uma matéria sem questões", async () => {
    const professor = await createUser();
    const created = await createSubject(professor.body.data.id);
    const subjectId = created.body.data.id;

    const removed = await request(app).delete(`/subjects/${subjectId}`);
    const found = await request(app).get(`/subjects/${subjectId}`);

    expect(removed.status).toBe(200);
    expect(removed.body.data.id).toBe(subjectId);
    expect(found.status).toBe(404);

    createdSubjectIds.splice(createdSubjectIds.indexOf(subjectId), 1);
  });

  it("impede remover matéria com questão vinculada", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.body.data.id);
    await createQuestion(subject.body.data.id, professor.body.data.id);

    const response = await request(app).delete(
      `/subjects/${subject.body.data.id}`,
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("vinculadas");
  });
});

describe("Question API", () => {
  it("cria, lista e busca questões", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.body.data.id);
    const created = await createQuestion(
      subject.body.data.id,
      professor.body.data.id,
    );

    expect(created.status).toBe(201);
    expect(created.body.data.disciplina.id).toBe(subject.body.data.id);
    expect(created.body.data.autor.id).toBe(professor.body.data.id);

    const list = await request(app).get("/questions");

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(list.body.data.length);

    const found = await request(app).get(`/questions/${created.body.data.id}`);

    expect(found.status).toBe(200);
    expect(found.body.data.id).toBe(created.body.data.id);
  });

  it("rejeita dificuldade fora do intervalo e ID inválido", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.body.data.id);

    const dificuldadeInvalida = await createQuestion(
      subject.body.data.id,
      professor.body.data.id,
      { dificuldade: 9 },
    );
    const idInvalido = await request(app).get("/questions/abc");

    expect(dificuldadeInvalida.status).toBe(400);
    expect(idInvalido.status).toBe(400);
  });

  it("retorna 404 para matéria ou autor inexistente", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.body.data.id);

    const semMateria = await createQuestion(999999999, professor.body.data.id);
    const semAutor = await createQuestion(subject.body.data.id, 999999999);

    expect(semMateria.status).toBe(404);
    expect(semAutor.status).toBe(404);
  });

  it("atualiza somente os campos enviados", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.body.data.id);
    const created = await createQuestion(
      subject.body.data.id,
      professor.body.data.id,
      { enunciado: "Enunciado original", dificuldade: 1 },
    );

    const response = await request(app)
      .patch(`/questions/${created.body.data.id}`)
      .send({ enunciado: "Enunciado atualizado" });

    expect(response.status).toBe(200);
    expect(response.body.data.enunciado).toBe("Enunciado atualizado");
    expect(response.body.data.dificuldade).toBe(1);
    expect(response.body.data.disciplina.id).toBe(subject.body.data.id);
  });

  it("rejeita PATCH vazio e retorna 404 para questão inexistente", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.body.data.id);
    const created = await createQuestion(
      subject.body.data.id,
      professor.body.data.id,
    );

    const vazio = await request(app)
      .patch(`/questions/${created.body.data.id}`)
      .send({});
    const inexistente = await request(app)
      .patch("/questions/999999999")
      .send({ enunciado: "Qualquer coisa" });

    expect(vazio.status).toBe(400);
    expect(inexistente.status).toBe(404);
  });

  it("remove uma questão", async () => {
    const professor = await createUser();
    const subject = await createSubject(professor.body.data.id);
    const created = await createQuestion(
      subject.body.data.id,
      professor.body.data.id,
    );
    const questionId = created.body.data.id;

    const removed = await request(app).delete(`/questions/${questionId}`);
    const found = await request(app).get(`/questions/${questionId}`);

    expect(removed.status).toBe(200);
    expect(found.status).toBe(404);

    createdQuestionIds.splice(createdQuestionIds.indexOf(questionId), 1);
  });
});