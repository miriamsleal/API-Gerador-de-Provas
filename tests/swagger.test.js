import { afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import prisma from "../src/config/database.js";

// Cada item descreve o que a documentação final precisa conter, nas duas branches.
const practiceOperations = [
  { path: "/health", method: "get", tag: "Health", statuses: [200, 503] },
  { path: "/v2/users", method: "get", tag: "Usuários V2", statuses: [200] },
  {
    path: "/v2/users/{id}",
    method: "get",
    tag: "Usuários V2",
    statuses: [200, 400, 404],
    idParam: true,
  },
  {
    path: "/v2/users",
    method: "post",
    tag: "Usuários V2",
    statuses: [201, 400, 409, 413, 502],
    json: ["email", "primeiroNome", "sobrenome"],
    multipart: true,
  },
  {
    path: "/v2/users/{id}",
    method: "patch",
    tag: "Usuários V2",
    statuses: [200, 400, 404, 409, 413, 502],
    idParam: true,
    json: [],
    multipart: true,
  },
  {
    path: "/v2/users/{id}",
    method: "delete",
    tag: "Usuários V2",
    statuses: [200, 400, 404, 409],
    idParam: true,
  },
];

const activityOperations = [
  { path: "/v1/users", method: "get", tag: "Usuários V1", statuses: [200] },
  {
    path: "/v1/users/{id}",
    method: "get",
    tag: "Usuários V1",
    statuses: [200, 400, 404],
    idParam: true,
  },
  {
    path: "/v1/users",
    method: "post",
    tag: "Usuários V1",
    statuses: [201, 400, 409],
    json: ["email", "nome"],
  },
  {
    path: "/v1/users/{id}",
    method: "patch",
    tag: "Usuários V1",
    statuses: [200, 400, 404, 409],
    idParam: true,
    json: [],
  },
  {
    path: "/v1/users/{id}",
    method: "delete",
    tag: "Usuários V1",
    statuses: [200, 400, 404, 409],
    idParam: true,
  },
];

let spec;
const ownedIds = [];

beforeAll(async () => {
  const response = await request(app).get("/api-docs.json");
  spec = response.body;
});
afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ownedIds.splice(0) } } });
});

/**
 * Segue referências internas ("#/components/...") até o objeto documentado.
 * @param {object|undefined} node - Objeto que pode conter $ref.
 * @returns {object|undefined} Objeto apontado, ou undefined se o destino não existir.
 */
function resolve(node) {
  let current = node;
  while (current?.$ref) {
    current = current.$ref
      .slice(2)
      .split("/")
      .reduce((value, key) => value?.[key], spec);
  }
  return current;
}

/**
 * Lista todos os valores $ref encontrados em qualquer nível do documento.
 * @param {unknown} node - Parte do documento a percorrer.
 * @param {string[]} [refs=[]] - Acumulador das referências encontradas.
 * @returns {string[]} Referências encontradas.
 */
function collectRefs(node, refs = []) {
  if (Array.isArray(node)) node.forEach((item) => collectRefs(item, refs));
  else if (node && typeof node === "object") {
    if (typeof node.$ref === "string") refs.push(node.$ref);
    Object.values(node).forEach((value) => collectRefs(value, refs));
  }
  return refs;
}

/**
 * Confere uma operação documentada contra o contrato esperado.
 * @param {object} item - Caminho, método, tag, status e corpos esperados.
 */
function checkOperation(item) {
  const operation = spec.paths?.[item.path]?.[item.method];
  expect(
    operation,
    `${item.method.toUpperCase()} ${item.path} documentado`,
  ).toBeDefined();
  expect(operation.summary).toEqual(expect.any(String));
  expect(operation.tags).toContain(item.tag);

  for (const status of item.statuses) {
    const response = resolve(operation.responses?.[status]);
    expect(response, `resposta ${status} documentada`).toBeDefined();
    expect(response.description).toEqual(expect.any(String));
    // Erros da API usam o envelope único produzido pelo errorHandler.
    if (status >= 400 && item.path !== "/health") {
      const schema = resolve(response.content?.["application/json"]?.schema);
      expect(schema, `resposta ${status} usa ErrorResponse`).toBe(
        spec.components.schemas.ErrorResponse,
      );
    }
  }

  if (item.idParam) {
    const id = (operation.parameters ?? [])
      .map(resolve)
      .find((parameter) => parameter?.in === "path" && parameter.name === "id");
    expect(id, "parâmetro de caminho id").toBeDefined();
    expect(id.required).toBe(true);
    expect(id.schema).toMatchObject({ type: "integer", minimum: 1 });
  }

  if (item.json) {
    expect(operation.requestBody?.required).toBe(true);
    const schema = resolve(
      operation.requestBody.content?.["application/json"]?.schema,
    );
    expect(schema, "corpo JSON documentado").toBeDefined();
    expect(schema.additionalProperties).toBe(false);
    expect([...(schema.required ?? [])].sort()).toEqual(item.json);
    if (item.json.length === 0) expect(schema.minProperties).toBe(1);
  }

  if (item.multipart) {
    const schema = resolve(
      operation.requestBody?.content?.["multipart/form-data"]?.schema,
    );
    expect(schema, "corpo multipart documentado").toBeDefined();
    expect(resolve(schema.properties?.foto)?.format).toBe("binary");
  }
}

/**
 * Compara a resposta real de um GET por ID com o schema documentado para o 200.
 * @param {string} path - Caminho documentado, como /v2/users/{id}.
 * @param {import("supertest").Response} found - Resposta obtida da API.
 */
function checkReadResponse(path, found) {
  const operation = spec.paths?.[path]?.get;
  expect(operation, `GET ${path} documentado`).toBeDefined();
  const envelope = resolve(
    resolve(operation.responses?.[200])?.content?.["application/json"]?.schema,
  );
  expect(envelope, "schema da resposta 200").toBeDefined();
  // A resposta real não pode trazer campos que a documentação não descreve.
  for (const key of Object.keys(found.body)) {
    expect(envelope.properties).toHaveProperty(key);
  }
  const user = resolve(envelope.properties.data);
  const actualKeys = Object.keys(found.body.data).sort();
  expect(Object.keys(user.properties).sort()).toEqual(actualKeys);
  expect([...(user.required ?? [])].sort()).toEqual(actualKeys);
}

describe("Prática — documentação OpenAPI publicada", () => {
  it("publica a especificação OpenAPI 3.0.3 em /api-docs.json", async () => {
    const response = await request(app).get("/api-docs.json");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.info.title).toBe("API do Gerador de Provas");
    expect(response.body.servers[0].url).toBe("/");
  });

  it("serve a interface Swagger UI em /api-docs/", async () => {
    const response = await request(app).get("/api-docs/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.text).toContain("swagger-ui");
    expect(response.text).toContain("API Gerador de Provas - Documentação");
  });

  it("aponta todas as referências internas para componentes existentes", () => {
    const refs = collectRefs(spec);

    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith("#/"), ref).toBe(true);
      expect(resolve({ $ref: ref }), ref).toBeDefined();
    }
  });

  it("usa somente tags declaradas e descreve um sucesso em cada operação", () => {
    const declared = spec.tags.map((tag) => tag.name);

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const label = `${method.toUpperCase()} ${path}`;
        expect(operation.tags?.length, label).toBeGreaterThan(0);
        operation.tags.forEach((tag) => expect(declared, label).toContain(tag));
        const statuses = Object.keys(operation.responses ?? {});
        expect(
          statuses.some((status) => status.startsWith("2")),
          label,
        ).toBe(true);
      }
    }
  });

  it.each(practiceOperations)("documenta $method $path", (item) =>
    checkOperation(item),
  );

  it("descreve exatamente os campos devolvidos por GET /v2/users/{id}", async () => {
    const created = await request(app)
      .post("/v2/users")
      .send({
        primeiroNome: "Grace",
        sobrenome: "Hopper",
        email: `${randomUUID()}@example.com`,
      });
    expect(created.status).toBe(201);
    ownedIds.push(created.body.data.id);

    const found = await request(app).get(`/v2/users/${created.body.data.id}`);

    expect(found.status).toBe(200);
    checkReadResponse("/v2/users/{id}", found);
  });
});

describe("Atividade — documentação dos usuários V1", () => {
  it.each(activityOperations)("documenta $method $path", (item) =>
    checkOperation(item),
  );

  it("descreve exatamente os campos devolvidos por GET /v1/users/{id}", async () => {
    const created = await request(app)
      .post("/v1/users")
      .send({ nome: "Grace Hopper", email: `${randomUUID()}@example.com` });
    expect(created.status).toBe(201);
    ownedIds.push(created.body.data.id);

    const found = await request(app).get(`/v1/users/${created.body.data.id}`);

    expect(found.status).toBe(200);
    checkReadResponse("/v1/users/{id}", found);
  });
});
