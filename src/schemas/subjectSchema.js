import { z } from "zod";
import { positiveIdSchema } from "./idSchema.js";

const nomeSchema = z
  .string()
  .trim()
  .min(3, "Nome deve ter pelo menos 3 caracteres")
  .max(100, "Nome deve ter no máximo 100 caracteres");

export const createSubjectSchema = z
  .object({
    nome: nomeSchema,
    professorId: positiveIdSchema,
    ativa: z.boolean({ message: "Ativa deve ser booleana" }).optional(),
  })
  .strict();

export const updateSubjectSchema = z
  .object({
    nome: nomeSchema.optional(),
    professorId: positiveIdSchema.optional(),
    ativa: z.boolean({ message: "Ativa deve ser booleana" }).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envie pelo menos um campo para atualização",
  });

export const idParamSchema = z.object({
  id: positiveIdSchema,
});