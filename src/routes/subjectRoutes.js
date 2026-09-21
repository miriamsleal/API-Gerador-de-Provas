import express from "express";
import * as subjectController from "../controllers/subjectController.js";
import validate from "../middlewares/validate.js";
import {
  createSubjectSchema,
  idParamSchema,
  updateSubjectSchema,
} from "../schemas/subjectSchema.js";

const router = express.Router();

router.post("/", validate(createSubjectSchema), subjectController.create);
router.get("/", subjectController.getAll);
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  subjectController.getById,
);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateSubjectSchema),
  subjectController.update,
);
router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  subjectController.remove,
);

export default router;