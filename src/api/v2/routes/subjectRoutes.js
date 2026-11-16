// Rotas V2 de matérias: leitura pública e escritas protegidas
import express from "express";
import * as subjectController from "../../v1/controllers/subjectController.js";
import validate from "../../../middlewares/validate.js";
import authenticate from "../../../middlewares/auth.js";
import authorize, { isAdmin } from "../../../middlewares/authorize.js";
import {
  createSubjectSchema,
  idParamSchema,
  updateSubjectSchema,
} from "../../v1/schemas/subjectSchema.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("PROFESSOR", "ADMIN"),
  validate(createSubjectSchema),
  subjectController.create,
);
router.get("/", subjectController.getAll);
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  subjectController.getById,
);
router.patch(
  "/:id",
  authenticate,
  authorize("PROFESSOR", "ADMIN"),
  validate(idParamSchema, "params"),
  validate(updateSubjectSchema),
  subjectController.update,
);
router.delete(
  "/:id",
  authenticate,
  isAdmin,
  validate(idParamSchema, "params"),
  subjectController.remove,
);

export default router;
