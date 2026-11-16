import bcrypt from "bcrypt";

// Custo 10 é o mínimo recomendado em produção; os testes usam um valor menor.
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

/**
 * Gera o hash bcrypt da senha, com salt aleatório embutido no resultado.
 * @param {string} senha - Senha em texto puro, já validada.
 * @returns {Promise<string>} Hash no formato $2b$<custo>$<salt><hash>.
 */
export function hashPassword(senha) {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

/**
 * Compara a senha informada com o hash armazenado.
 * @param {string} senha - Senha em texto puro recebida no login.
 * @param {string} hash - Hash bcrypt salvo no banco.
 * @returns {Promise<boolean>} true somente se a senha corresponder ao hash.
 */
export function verifyPassword(senha, hash) {
  return bcrypt.compare(senha, hash);
}
