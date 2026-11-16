// MODIFICADO: agrega User, matérias e questões no prefixo V2.
import express from "express";
import userRoutes from "./userRoutes.js";
// MODIFICADO: importa somente os dois módulos V2 da atividade.
import subjectRoutes from "./subjectRoutes.js";
import questionRoutes from "./questionRoutes.js";
// ADICIONADO (aula 11): cadastro, login e usuário autenticado.
import authRoutes from "./authRoutes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", version: "v2" });
});
// ADICIONADO (aula 11): /v2/auth é pública; /me exige token na própria rota.
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
// MODIFICADO: publica contratos estáveis sem alterar seus arquivos V1.
router.use("/subjects", subjectRoutes);
router.use("/questions", questionRoutes);

export default router;
