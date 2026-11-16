import express from "express";
import * as userController from "../controllers/userController.js";
import validate from "../../../middlewares/validate.js";
import {
  createUserSchema,
  idParamSchema,
  updateUserSchema,
} from "../schemas/userSchema.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserV1:
 *       type: object
 *       required: [id, nome, email, papel, foto, createdAt, updatedAt]
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nome:
 *           type: string
 *           example: Ada Lovelace
 *         email:
 *           type: string
 *           format: email
 *           example: ada@example.com
 *         papel:
 *           type: string
 *           enum: [PROFESSOR, ADMIN]
 *           example: PROFESSOR
 *         foto:
 *           type: string
 *           format: uri
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserV1Response:
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
 *           $ref: '#/components/schemas/UserV1'
 *     UserV1ListResponse:
 *       type: object
 *       required: [success, data, total]
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserV1'
 *         total:
 *           type: integer
 *           example: 1
 *     CreateUserV1:
 *       type: object
 *       additionalProperties: false
 *       required: [nome, email]
 *       properties:
 *         nome:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: Ada Lovelace
 *         email:
 *           type: string
 *           format: email
 *           example: ada@example.com
 *         papel:
 *           type: string
 *           enum: [PROFESSOR, ADMIN]
 *           default: PROFESSOR
 *         foto:
 *           type: string
 *           format: uri
 *           nullable: true
 *     UpdateUserV1:
 *       type: object
 *       additionalProperties: false
 *       minProperties: 1
 *       properties:
 *         nome:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         papel:
 *           type: string
 *           enum: [PROFESSOR, ADMIN]
 *         foto:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Omitida preserva a foto; null remove a referência.
 */

/**
 * @swagger
 * /v1/users:
 *   post:
 *     summary: Cria um usuário (V1)
 *     description: Somente JSON. O papel padrão é PROFESSOR.
 *     tags: [Usuários V1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserV1'
 *     responses:
 *       201:
 *         description: Usuário criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV1Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */

router.post("/", validate(createUserSchema), userController.create);

/**
 * @swagger
 * /v1/users:
 *   get:
 *     summary: Lista usuários (V1)
 *     description: Do mais recente para o mais antigo.
 *     tags: [Usuários V1]
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV1ListResponse'
 */

router.get("/", userController.getAll);

/**
 * @swagger
 * /v1/users/{id}:
 *   get:
 *     summary: Busca um usuário por ID (V1)
 *     tags: [Usuários V1]
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV1Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.get("/:id", validate(idParamSchema, "params"), userController.getById);

/**
 * @swagger
 * /v1/users/{id}:
 *   patch:
 *     summary: Atualiza parcialmente um usuário (V1)
 *     description: Campos omitidos são preservados. Envie pelo menos um campo.
 *     tags: [Usuários V1]
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserV1'
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV1Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */

router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateUserSchema),
  userController.update,
);

/**
 * @swagger
 * /v1/users/{id}:
 *   delete:
 *     summary: Remove um usuário sem vínculos (V1)
 *     description: Usuários com matérias ou questões vinculadas não podem ser removidos.
 *     tags: [Usuários V1]
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: Usuário removido; a resposta traz os dados excluídos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserV1Response'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */

router.delete("/:id", validate(idParamSchema, "params"), userController.remove);

export default router;
