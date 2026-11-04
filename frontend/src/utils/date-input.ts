// Datas digitadas em DD/MM/AAAA (#267), sem depender do idioma do navegador: o <input type="date"> nativo mostra
// MM/DD/AAAA num navegador em inglês, mesmo com a página em pt-BR. Internamente o valor continua AAAA-MM-DD.

/** Mantém só os dígitos e põe as barras: "04112026" → "04/11/2026"; "0411" → "04/11". */
export function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "04/11/2026" → "2026-11-04"; texto incompleto ou data que não existe (31/02) → "". */
export function displayToIso(text: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return '';
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const exists = date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
  return exists ? `${year}-${month}-${day}` : '';
}

/** "2026-11-04" → "04/11/2026"; valor vazio ou fora do formato → "". */
export function isoToDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
