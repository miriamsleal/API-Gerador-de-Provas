import * as authService from "../services/authService.js";

/** Cadastra um professor e devolve usuário e token. */
export async function register(req, res, next) {
  try {
    const data = await authService.register(req.body);
    res
      .status(201)
      .json({ success: true, message: "Usuário registrado com sucesso", data });
  } catch (error) {
    next(error);
  }
}

/** Autentica com e-mail e senha e devolve usuário e token. */
export async function login(req, res, next) {
  try {
    const data = await authService.login(req.body.email, req.body.senha);
    res
      .status(200)
      .json({ success: true, message: "Login realizado com sucesso", data });
  } catch (error) {
    next(error);
  }
}

/** Devolve o usuário identificado pelo token (req.user vem de authenticate). */
export async function me(req, res, next) {
  try {
    const user = await authService.getAuthenticatedUser(req.user.id);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}
