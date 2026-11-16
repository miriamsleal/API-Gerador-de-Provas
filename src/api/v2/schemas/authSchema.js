import { z } from "zod";

// bcrypt considera somente os primeiros 72 bytes da senha; o restante seria ignorado.
const senhaSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .refine((senha) => Buffer.byteLength(senha, "utf8") <= 72, {
    message: "Senha deve ter no máximo 72 bytes",
  });

const emailSchema = z.string().trim().toLowerCase().email("Email inválido");

/** Schema de POST /v2/auth/register: o papel nunca vem do cliente. */
export const registerSchema = z
  .object({
    primeiroNome: z
      .string()
      .trim()
      .min(2, "Primeiro nome deve ter pelo menos 2 caracteres")
      .max(50, "Primeiro nome deve ter no máximo 50 caracteres"),
    sobrenome: z
      .string()
      .trim()
      .min(2, "Sobrenome deve ter pelo menos 2 caracteres")
      .max(100, "Sobrenome deve ter no máximo 100 caracteres"),
    email: emailSchema,
    senha: senhaSchema,
  })
  .strict();

/** Schema de POST /v2/auth/login. */
export const loginSchema = z
  .object({
    email: emailSchema,
    senha: z.string().min(1, "Senha é obrigatória").max(256),
  })
  .strict();

/** Regra de senha reutilizada pelo cadastro administrativo da V2. */
export { senhaSchema };
