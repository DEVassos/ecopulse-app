// Regras de validação dos formulários. Cada função devolve a mensagem de erro, ou '' se o valor está correto.

export function validateEmail(value: string): string {
  const email = value.trim();
  if (email === '') return 'Informe seu e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Digite um e-mail válido, como nome@empresa.com.';
  }
  return '';
}

/** No login só conferimos se a senha foi digitada; quem valida a senha é o backend. */
export function validatePassword(value: string): string {
  return value === '' ? 'Informe sua senha.' : '';
}

/** Mesma regra do backend (POST /auth/register, #196): 8 a 72 caracteres, com letra e número. */
export const PASSWORD_RULE = 'Use de 8 a 72 caracteres, com pelo menos uma letra e um número.';

export function validateName(value: string): string {
  const name = value.trim();
  if (name === '') return 'Informe seu nome.';
  return name.length > 100 ? 'Use no máximo 100 caracteres.' : '';
}

/** Senha nova no cadastro por convite. O limite de 72 é em bytes, como no bcrypt do backend. */
export function validateNewPassword(value: string): string {
  if (value === '') return 'Crie uma senha.';
  const bytes = new TextEncoder().encode(value).length;
  return value.length < 8 || bytes > 72 || !/\p{L}/u.test(value) || !/\d/.test(value) ? PASSWORD_RULE : '';
}

export function validatePasswordConfirmation(password: string, confirmation: string): string {
  if (confirmation === '') return 'Repita a senha.';
  return confirmation === password ? '' : 'As senhas não são iguais.';
}
