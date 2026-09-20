// src/app.js
     import express from "express";
     import prisma from "./config/database.js";
     import userRoutes from "./routes/userRoutes.js";

     const app = express();

     // Middleware para parsing JSON
     app.use(express.json());

     /**
      * Verifica se a API e o banco de dados estão disponíveis.
      * @param {Object} req - Requisição Express recebida na rota de saúde.
      * @param {Object} res - Resposta Express que informa o estado dos serviços.
      * @returns {Promise<void>} Envia `200` quando o banco responde ou `503` quando há falha.
      */
     app.get("/health", async (req, res) => {
       let databaseStatus = "OK";
       let databaseMessage = "Conexão com banco de dados funcionando";

       try {
         // Tenta fazer uma query simples no banco
         await prisma.$queryRaw`SELECT 1`;
       } catch (error) {
         databaseStatus = "ERROR";
         databaseMessage = "Falha na conexão com banco de dados";
         console.error("Erro na verificação do banco:", error);
       }

       // Define o status HTTP baseado na saúde do banco
       const httpStatus = databaseStatus === "OK" ? 200 : 503;

       res.status(httpStatus).json({
         status: databaseStatus === "OK" ? "OK" : "DEGRADED",
         message: "API do Gerador de Provas",
         timestamp: new Date().toISOString(),
         version: "1.0.0",
         services: {
           api: "OK",
           database: {
             status: databaseStatus,
             message: databaseMessage,
           },
         },
       });
     });

     // Rotas da API
     app.use("/users", userRoutes); // <--

     /**
      * Trata requisições que não corresponderam a nenhuma rota registrada.
      * @param {Object} req - Requisição Express com o método e a URL solicitada.
      * @param {Object} res - Resposta Express usada para devolver o erro `404`.
      * @returns {void} Envia uma resposta JSON informando a rota não encontrada.
      */
     app.use((req, res) => {
       res.status(404).json({
         success: false,
         message: `Rota ${req.method} ${req.originalUrl} não encontrada`,
       });
     });

     // Export default para ES Modules
     export default app;