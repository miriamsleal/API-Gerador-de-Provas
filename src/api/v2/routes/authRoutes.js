import express from "express";
import * as authController from "../controllers/authController.js";
import authenticate from "../../../middlewares/auth.js";
import validate from "../../../middlewares/validate.js";
import { loginSchema, registerSchema } from "../schemas/authSchema.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       additionalProperties: false
 *       required: [primeiroNome, sobrenome, email, senha]
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
 *         senha:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: De 8 caracteres a 72 bytes.
 *           example: senha-segura-123
 *     LoginRequest:
 *       type: object
 *       additionalProperties: false
 *       required: [email, senha]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: ada@example.com
 *         senha:
 *           type: string
 *           format: password
 *           example: senha-segura-123
 *     AuthResponse:
 *       type: object
 *       required: [success, message, data]
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Login realizado com sucesso
 *         data:
 *           type: object
 *           required: [user, token]
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/UserV2'
 *             token:
 *               type: string
 *               description: JWT para o header Authorization (Bearer)
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiUFJPRkVTU09SIn0.assinatura
 *     MeResponse:
 *       type: object
 *       required: [success, data]
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           required: [user]
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/UserV2'
 */

/**
 * @swagger
 * /v2/auth/register:
 *   post:
 *     summary: Cadastra um professor e devolve um token
 *     description: Rota pública. O papel é sempre professor; tipoUsuario e papel são rejeitados.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuário registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post("/register", validate(registerSchema), authController.register);

/**
 * @swagger
 * /v2/auth/login:
 *   post:
 *     summary: Autentica com e-mail e senha
 *     description: Rota pública. Credenciais erradas recebem a mesma resposta 401, exista ou não o e-mail.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login realizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/login", validate(loginSchema), authController.login);

/**
 * @swagger
 * /v2/auth/me:
 *   get:
 *     summary: Devolve o usuário dono do token
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me", authenticate, authController.me);

export default router;
