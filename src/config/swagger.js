import swaggerJsdoc from "swagger-jsdoc";

/**
 * Parte fixa do documento OpenAPI: metadados, servidor, grupos e componentes
 * compartilhados pelas rotas V1, V2 e /health.
 */
const definition = {
  openapi: "3.0.3",
  info: {
    title: "API do Gerador de Provas",
    version: "1.0.0",
    // MODIFICADO (aula 11): a descrição passa a citar as rotas de autenticação.
    description:
      "Documentação interativa das rotas de saúde, de autenticação e de usuários das versões V1 e V2.",
  },
  // "/" faz o Try it out usar o mesmo endereço e porta que serviram a página.
  servers: [
    { url: "/", description: "Mesmo servidor que publica esta documentação" },
  ],
  tags: [
    {
      name: "Health",
      description: "Disponibilidade da API e da conexão com o banco",
    },
    // ADICIONADO (aula 11): grupo das rotas de cadastro, login e usuário autenticado.
    {
      name: "Autenticação",
      description: "Cadastro, login e usuário dono do token JWT",
    },
    {
      name: "Usuários V1",
      description: "Contrato original: nome completo e papel em maiúsculas",
    },
    {
      name: "Usuários V2",
      description: "Contrato atual: nome separado, telefone e upload de foto",
    },
  ],
  components: {
    // ADICIONADO (aula 11): habilita o botão Authorize; operações o referenciam em security.
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token obtido em POST /v2/auth/login ou /v2/auth/register",
      },
    },
    parameters: {
      UserId: {
        in: "path",
        name: "id",
        required: true,
        description: "ID numérico do usuário",
        schema: { type: "integer", minimum: 1, maximum: 2147483647 },
        example: 1,
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "timestamp", "path"],
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: {
                type: "string",
                example: "Dados de entrada inválidos",
              },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string", example: "email" },
                    message: { type: "string", example: "Email inválido" },
                  },
                },
              },
              hint: { type: "string" },
            },
          },
          timestamp: { type: "string", format: "date-time" },
          path: { type: "string", example: "/v2/users" },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "ID, corpo ou multipart inválido (VALIDATION_ERROR)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Usuário não encontrado (NOT_FOUND)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      // ADICIONADO (aula 11): respostas comuns das rotas protegidas.
      Unauthorized: {
        description:
          "Token ausente, malformado, inválido ou expirado (UNAUTHORIZED)",
        headers: {
          "WWW-Authenticate": {
            description:
              "Presente nas rotas protegidas: indica o esquema Bearer",
            schema: { type: "string" },
          },
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description:
          "Usuário autenticado sem permissão para a ação (FORBIDDEN)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Conflict: {
        description: "E-mail já cadastrado ou usuário com vínculos (CONFLICT)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};

/**
 * Especificação OpenAPI montada a partir da definição e dos comentários @swagger.
 * Os caminhos são relativos à raiz do projeto, de onde npm e Vitest executam.
 */
const swaggerSpec = swaggerJsdoc({
  definition,
  apis: [
    "./src/app.js",
    "./src/api/v1/routes/*.js",
    "./src/api/v2/routes/*.js",
  ],
  // YAML inválido interrompe a inicialização em vez de sumir do documento.
  failOnErrors: true,
});

export default swaggerSpec;
