import * as subjectService from "../services/subjectService.js";

/**
 * Cria uma matéria a partir de dados já validados pelo middleware.
 * @param {import("express").Request} req - Requisição HTTP.
 * @param {import("express").Response} res - Resposta HTTP.
 * @param {import("express").NextFunction} next - Encaminhador de erros.
 * @returns {Promise<void>} Resposta de criação ou encaminhamento de erro.
 */
export async function create(req, res, next) {
  try {
    const data = await subjectService.createSubject(req.body);
    res.status(201).json({
      success: true,
      message: "Matéria criada com sucesso",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lista todas as matérias públicas.
 * @param {import("express").Request} _req - Requisição HTTP não utilizada.
 * @param {import("express").Response} res - Resposta HTTP.
 * @param {import("express").NextFunction} next - Encaminhador de erros.
 * @returns {Promise<void>} Resposta de listagem ou encaminhamento de erro.
 */
export async function getAll(_req, res, next) {
  try {
    const data = await subjectService.getAllSubjects();
    res.status(200).json({ success: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
}

/**
 * Busca uma matéria pelo ID já convertido pelo schema.
 * @param {import("express").Request} req - Requisição HTTP.
 * @param {import("express").Response} res - Resposta HTTP.
 * @param {import("express").NextFunction} next - Encaminhador de erros.
 * @returns {Promise<void>} Resposta de busca ou encaminhamento de erro.
 */
export async function getById(req, res, next) {
  try {
    const data = await subjectService.getSubjectById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * Atualiza parcialmente uma matéria com dados validados.
 * @param {import("express").Request} req - Requisição HTTP.
 * @param {import("express").Response} res - Resposta HTTP.
 * @param {import("express").NextFunction} next - Encaminhador de erros.
 * @returns {Promise<void>} Resposta de atualização ou encaminhamento de erro.
 */
export async function update(req, res, next) {
  try {
    const data = await subjectService.updateSubject(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Matéria atualizada com sucesso",
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove uma matéria sem questões vinculadas.
 * @param {import("express").Request} req - Requisição HTTP.
 * @param {import("express").Response} res - Resposta HTTP.
 * @param {import("express").NextFunction} next - Encaminhador de erros.
 * @returns {Promise<void>} Resposta de remoção ou encaminhamento de erro.
 */
export async function remove(req, res, next) {
  try {
    const data = await subjectService.deleteSubject(req.params.id);
    res.status(200).json({
      success: true,
      message: "Matéria removida com sucesso",
      data,
    });
  } catch (error) {
    next(error);
  }
}