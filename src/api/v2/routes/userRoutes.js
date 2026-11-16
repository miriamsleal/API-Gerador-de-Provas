// ADICIONADO: rotas relativas V2 com schemas próprios e middleware compartilhado.
import express from "express";
import uploadPhoto from "../../../config/multer.js";
import * as userController from "../controllers/userController.js";
import validate from "../../../middlewares/validate.js";
import {
  createUserV2Schema,
  idParamSchema,
  updateUserV2Schema,
} from "../schemas/userSchema.js";

const router = express.Router();

// ADICIONADO: componentes V2 (usuário, envelopes, corpos e erros de upload).
/**
 * @swagger
 * components:
 *   schemas:
 *     UserV2:
 *       type: object
 *       required: [id, primeiroNome, sobrenome, email, tipoUsuario, telefone, foto, createdAt, updatedAt]
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         primeiroNome:
 *           type: string
 *           example: Ada
 *         sobrenome:
 *           type: string
 *           nullable: true
 *           description: Nulo apenas em usuário legado da V1 cadastrado com uma única palavra.
 *           example: Lovelace
 *         email:
 *           type: string
 *           format: email
 *           example: ada@example.com
 *         tipoUsuario:
 *           type: string
 *           enum: [professor, admin]
 *           example: professor
 *         telefone:
 *           type: string
 *           nullable: true
 *           example: "11987654321"
 *         foto:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: https://ucarecdn.com/0d2e1f5a-0000-4000-8000-000000000000/
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserV2Response:
 *       type: object
 *       required: [success, data]
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           description: Presente em criação, atualização e remoção.
 *           example: Usuário criado com sucesso
 *         data:
 *           $ref: '#/components/schemas/UserV2'
 *     UserV2ListResponse:
 *       type: object
 *       required: [success, data, total]
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserV2'
 *         total:
 *           type: integer
 *           example: 1
 *     CreateUserV2:
 *       type: object
 *       additionalProperties: false
 *       required: [primeiroNome, sobrenome, email]
 *       properties:
 *         primeiroNome:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: Ada
 *         sobrenome:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Lovelace
 *         email:
 *           type: string
 *           format: email
 *           example: ada@example.com
 *         tipoUsuario:
 *           type: string
 *           enum: [professor, admin]
 *           default: professor
 *         telefone:
 *           type: string
 *           pattern: '^\d{10,11}$'
 *           nullable: true
 *           example: "11987654321"
 *         foto:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL já hospedada. Para enviar um arquivo, use multipart/form-data.
 *     CreateUserV2Multipart:
 *       type: object
 *       required: [primeiroNome, sobrenome, email]
 *       properties:
 *         primeiroNome:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         sobrenome:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         tipoUsuario:
 *           type: string
 *           enum: [professor, admin]
 *         telefone:
 *           type: string
 *           pattern: '^\d{10,11}$'
 *         foto:
 *           type: string
 *           format: binary
 *           description: JPEG, PNG, GIF ou WebP de até 5 MiB. Tem prioridade sobre uma URL enviada como texto.
 *     UpdateUserV2:
 *       type: object
 *       additionalProperties: false
 *       minProperties: 1
 *       properties:
 *         primeiroNome:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         sobrenome:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         tipoUsuario:
 *           type: string
 *           enum: [professor, admin]
 *         telefone:
 *           type: string
 *           pattern: '^\d{10,11}$'
 *           nullable: true
 *         foto:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Omitida preserva a foto; null remove a referência.
 *     UpdateUserV2Multipart:
 *       type: object
 *       description: Envie pelo menos um campo de texto ou o arquivo foto.
 *       properties:
 *         primeiroNome:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         sobrenome:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         tipoUsuario:
 *           type: string
 *           enum: [professor, admin]
 *         telefone:
 *           type: string
 *           pattern: '^\d{10,11}$'
 *         foto:
 *           type: string
 *           format: binary
 *           description: JPEG, PNG, GIF ou WebP de até 5 MiB.
 *   responses:
 *     PayloadTooLarge:
 *       description: Foto acima de 5 MiB ou JSON acima de 100 KB (PAYLOAD_TOO_LARGE)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     UploadServiceUnavailable:
 *       description: O provedor de upload falhou (UPLOAD_SERVICE_UNAVAILABLE)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     UploadNotConfigured:
 *       description: Servidor sem UPLOADCARE_PUBLIC_KEY (UPLOAD_NOT_CONFIGURED)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * ADICIONADO: arquivo sozinho é uma atualização; campos continuam estritos.
 * @param {import("express").Request} req - Texto e foto interpretados pelo Multer.
 * @param {import("express").Response} res - Resposta Express.
 * @param {import("express").NextFunction} next - Próximo middleware.
 */
function validateUpdateWithPhoto(req, res, next) {
  if (req.file && Object.keys(req.body).length === 0) return next();
  return validate(updateUserV2Schema)(req, res, next);
}

// ADICIONADO: POST aceita JSON ou multipart; documenta todos os status observáveis.
/**
 * @swagger
 * /v2/users:
 *   post:
 *     summary: Cria um usuário (V2)
 *     description: Aceita JSON sem arquivo ou multipart/form-data com o arquivo opcional foto. O nome completo e o papel da V1 são gravados automaticamente.
 *     tags: [Usuários V2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserV2'
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserV2Multipart'
 *     responses:
 *       201:
 *         description: Usuário criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV2Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       413:
 *         $ref: '#/components/responses/PayloadTooLarge'
 *       502:
 *         $ref: '#/components/responses/UploadServiceUnavailable'
 *       503:
 *         $ref: '#/components/responses/UploadNotConfigured'
 */
router.post(
  "/",
  uploadPhoto,
  validate(createUserV2Schema),
  userController.create,
);

// ADICIONADO: listagem com envelope success/data/total.
/**
 * @swagger
 * /v2/users:
 *   get:
 *     summary: Lista usuários (V2)
 *     description: Inclui usuários criados pela V1, adaptados à representação V2 sem alterar o banco.
 *     tags: [Usuários V2]
 *     responses:
 *       200:
 *         description: Lista do mais recente para o mais antigo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV2ListResponse'
 */
router.get("/", userController.getAll);

// ADICIONADO: busca por ID reutiliza o parâmetro UserId e as respostas de erro.
/**
 * @swagger
 * /v2/users/{id}:
 *   get:
 *     summary: Busca um usuário por ID (V2)
 *     tags: [Usuários V2]
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV2Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", validate(idParamSchema, "params"), userController.getById);

// ADICIONADO: PATCH parcial com os mesmos dois formatos de corpo do POST.
/**
 * @swagger
 * /v2/users/{id}:
 *   patch:
 *     summary: Atualiza parcialmente um usuário (V2)
 *     description: Campos omitidos são preservados. Em multipart, o arquivo foto sozinho já é uma atualização válida.
 *     tags: [Usuários V2]
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserV2'
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserV2Multipart'
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV2Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       413:
 *         $ref: '#/components/responses/PayloadTooLarge'
 *       502:
 *         $ref: '#/components/responses/UploadServiceUnavailable'
 *       503:
 *         $ref: '#/components/responses/UploadNotConfigured'
 */
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  // MODIFICADO: parser antes da validação do texto, depois do ID válido.
  uploadPhoto,
  validateUpdateWithPhoto,
  userController.update,
);

// ADICIONADO: DELETE com conflito para usuários vinculados.
/**
 * @swagger
 * /v2/users/{id}:
 *   delete:
 *     summary: Remove um usuário sem vínculos (V2)
 *     description: Usuários com matérias ou questões vinculadas não podem ser removidos.
 *     tags: [Usuários V2]
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: Usuário removido; a resposta traz os dados excluídos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV2Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.delete("/:id", validate(idParamSchema, "params"), userController.remove);

export default router;
