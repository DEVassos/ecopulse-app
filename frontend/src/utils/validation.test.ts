import { describe, expect, it } from 'vitest';
import { PASSWORD_RULE, validateName, validateNewPassword, validatePasswordConfirmation } from './validation';

describe('cadastro por convite (#197): mesmas regras do backend', () => {
  it.each([
    ['senha1234', ''],
    ['Senhaçã9', ''],
    ['abcdefg1', ''],
    ['', 'Crie uma senha.'],
    ['abc1', PASSWORD_RULE],
    ['abcdefgh', PASSWORD_RULE],
    ['12345678', PASSWORD_RULE],
    ['a1'.repeat(37), PASSWORD_RULE],
    // 36 "ç" ocupam 72 bytes; com o número passa de 72, como no bcrypt do backend
    ['ç'.repeat(36) + '1', PASSWORD_RULE],
  ])('senha %j → %j', (password, expected) => {
    expect(validateNewPassword(password)).toBe(expected);
  });

  it('nome: obrigatório e com até 100 caracteres, sem contar espaços nas pontas', () => {
    expect(validateName('   ')).toBe('Informe seu nome.');
    expect(validateName('  Ana  ')).toBe('');
    expect(validateName('a'.repeat(101))).toBe('Use no máximo 100 caracteres.');
  });

  it('confirmação: obrigatória e igual à senha', () => {
    expect(validatePasswordConfirmation('senha1234', '')).toBe('Repita a senha.');
    expect(validatePasswordConfirmation('senha1234', 'senha12345')).toBe('As senhas não são iguais.');
    expect(validatePasswordConfirmation('senha1234', 'senha1234')).toBe('');
  });
});
