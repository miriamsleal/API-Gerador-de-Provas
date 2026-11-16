// Rotas V2 de questões: leitura pública e escritas protegidas
import express from "express";
import * as questionController from "../../v1/controllers/questionController.js";
import validate from "../../../middlewares/validate.js";
import authenticate from "../../../middlewares/auth.js";
import authorize, { isAdmin } from "../../../middlewares/authorize.js";
import {
  createQuestionSchema,
  idParamSchema,
  updateQuestionSchema,
} from "../../v1/schemas/questionSchema.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("PROFESSOR", "ADMIN"),
  validate(createQuestionSchema),
  questionController.create,
);
router.get("/", questionController.getAll);
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  questionController.getById,
);
router.patch(
  "/:id",
  authenticate,
  authorize("PROFESSOR", "ADMIN"),
  validate(idParamSchema, "params"),
  validate(updateQuestionSchema),
  questionController.update,
);
router.delete(
  "/:id",
  authenticate,
  isAdmin,
  validate(idParamSchema, "params"),
  questionController.remove,
);

export default router;
