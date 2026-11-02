// ADICIONADO: rotas relativas V2 com schemas próprios e middleware compartilhado.
import express from "express";
import * as userController from "../controllers/userController.js";
import validate from "../../../middlewares/validate.js";
import uploadPhoto from "../../../config/multer.js";
import {
  createUserV2Schema,
  idParamSchema,
  updateUserV2FieldsSchema,
  updateUserV2Schema,
} from "../schemas/userSchema.js";

const router = express.Router();

/**
 * Valida o corpo do PATCH considerando o arquivo opcional.
 * Com foto, o corpo pode vir vazio; sem foto, exige ao menos um campo.
 * @param {import("express").Request} req - Requisição já processada pelo Multer.
 * @param {import("express").Response} res - Resposta Express.
 * @param {import("express").NextFunction} next - Próximo middleware.
 * @returns {void}
 */
function validateUpdateBody(req, res, next) {
  const schema = req.file ? updateUserV2FieldsSchema : updateUserV2Schema;
  return validate(schema)(req, res, next);
}

router.post(
  "/",
  uploadPhoto,
  validate(createUserV2Schema),
  userController.create,
);
router.get("/", userController.getAll);
router.get("/:id", validate(idParamSchema, "params"), userController.getById);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  uploadPhoto,
  validateUpdateBody,
  userController.update,
);
router.delete("/:id", validate(idParamSchema, "params"), userController.remove);

export default router;
