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
