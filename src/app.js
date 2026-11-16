//src/app.js
import express from "express";
// ADICIONADO (aula 11): headers de segurança HTTP e política de CORS.
import helmet from "helmet";
import corsConfig from "./config/cors.js";
// ADICIONADO: interface Swagger UI e especificação gerada pelo swagger-jsdoc.
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import prisma from "./config/database.js";
import v1Routes from "./api/v1/routes/index.js";
// ADICIONADO: importa V2; os arquivos e o roteador da V1 permanecem intactos.
import v2Routes from "./api/v2/routes/index.js";
import errorHandler, { notFoundHandler } from "./middlewares/errorHandler.js";

const app = express();

// ADICIONADO (aula 11): antes de tudo, para que toda resposta (inclusive erros) receba os headers.
app.use(helmet());
// ADICIONADO (aula 11): responde ao preflight antes das rotas e do parser de JSON.
app.use(corsConfig);
app.use(express.json({ limit: "100kb" }));

// ADICIONADO: o mesmo objeto alimenta o JSON e a interface; nada é duplicado.
app.get("/api-docs.json", (_req, res) => {
  res.status(200).json(swaggerSpec);
});
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "API Gerador de Provas - Documentação",
  }),
);

// ADICIONADO: schema e operação de /health; as respostas 200 e 503 têm o mesmo formato.
/**
 * @swagger
 * components:
 *   schemas:
 *     HealthResponse:
 *       type: object
 *       required: [status, message, version, availableVersions, services]
 *       properties:
 *         status:
 *           type: string
 *           enum: [OK, DEGRADED]
 *           example: OK
 *         message:
 *           type: string
 *           example: API do Gerador de Provas
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Presente somente quando o banco respondeu (200).
 *         version:
 *           type: string
 *           example: "1.0.0"
 *         availableVersions:
 *           type: array
 *           items:
 *             type: string
 *           example: [v1, v2]
 *         services:
 *           type: object
 *           properties:
 *             api:
 *               type: string
 *               example: OK
 *             database:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [OK, ERROR]
 *                   example: OK
 * /health:
 *   get:
 *     summary: Verifica a saúde da API e do banco
 *     description: Executa SELECT 1 no banco. Responde 503 quando a API está no ar, mas o banco não respondeu.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API e banco disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: API em execução com banco indisponível (status DEGRADED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
/** Health check: preserva o contrato de monitoramento 200/503 da Aula 05. */
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: "OK",
      message: "API do Gerador de Provas",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      // MODIFICADO: anuncia V2 também, sem mudar o resultado 200/503.
      availableVersions: ["v1", "v2"],
      services: {
        api: "OK",
        database: { status: "OK" },
      },
    });
  } catch (error) {
    console.error("Erro na verificação do banco:", error);

    return res.status(503).json({
      status: "DEGRADED",
      message: "API do Gerador de Provas",
      version: "1.0.0",
      // MODIFICADO: anuncia V2 também, sem mudar o resultado 200/503.
      availableVersions: ["v1", "v2"],
      services: {
        api: "OK",
        database: { status: "ERROR" },
      },
    });
  }
});

app.use("/v1", v1Routes);
// ADICIONADO: monta somente a V2; não modifica nem deprecia a montagem V1.
app.use("/v2", v2Routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
