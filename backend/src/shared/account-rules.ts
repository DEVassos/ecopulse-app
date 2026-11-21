import { ValidationError } from './errors';

/**
 * Regras da conta, iguais no cadastro por convite (#196) e no perfil (#400): quem muda a regra muda nos dois.
 */
export const NAME_MAX_LENGTH = 100;
/** bcrypt considera só os primeiros 72 bytes: senha maior seria aceita sem valer por inteiro. */
const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_RULE = 'A senha deve ter de 8 a 72 caracteres, com pelo menos uma letra e um número.';
export const BCRYPT_ROUNDS = 10;

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES
    && /\p{L}/u.test(password) && /\d/.test(password);
}

/** Nome sem os espaços das pontas; vazio ou longo demais vira 400. */
export function validName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.length > NAME_MAX_LENGTH) {
    throw new ValidationError(`O nome deve ter de 1 a ${NAME_MAX_LENGTH} caracteres.`);
  }
  return trimmed;
}
