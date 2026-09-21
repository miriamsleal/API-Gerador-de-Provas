import express from "express";
import * as questionController from "../controllers/questionController.js";
import validate from "../middlewares/validate.js";
import {
  createQuestionSchema,
  idParamSchema,
  updateQuestionSchema,
} from "../schemas/questionSchema.js";

const router = express.Router();

router.post("/", validate(createQuestionSchema), questionController.create);
router.get("/", questionController.getAll);
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  questionController.getById,
);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateQuestionSchema),
  questionController.update,
);
router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  questionController.remove,
);

export default router;