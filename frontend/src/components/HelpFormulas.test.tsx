import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HelpFormulas from './HelpFormulas';
import HelpReading from './HelpReading';

describe('Ajuda: fórmulas e guia de leitura (#404)', () => {
  it('mostra as três contas com os resultados de docs/calculos.md (critério 1)', () => {
    const html = renderToStaticMarkup(<HelpFormulas />);
    expect(html).toContain('P = CPU% × 1 + RAM × 0,375 + disco × 0,01 + rede × 0,02');
    expect(html).toContain('50,00 + 0,75 + 0,10 + 0,02 = 50,87 W');
    expect(html).toContain('50,87 × 60 ÷ 3.600.000 = 0,000847833 kWh');
    expect(html).toContain('0,000847833 × 85 = 0,072066 g');
    // As contas derivadas, com os exemplos do mesmo documento
    expect(html).toContain('0,050 × 40 = 2,00 g; redução de 16,90 g (89,42%)');
    expect(html).toContain('0,48 × 3.600.000 ÷ 86.400 = 20 W');
    expect(html).toContain('258 g ≈ 1,1 km de carro a gasolina · ≈ 21 cargas de celular');
  });

  it('mostra os quatro estados com o selo da tabela do Dashboard (critério 2)', () => {
    const html = renderToStaticMarkup(<HelpReading />);
    for (const label of ['Ativo', 'Indisponível', 'Sem métricas', 'Removido']) expect(html).toContain(`</span>${label}</span>`);
    expect(html).toContain('Rede limpa');
    expect(html).toContain('0,000848 kWh, aparece como 848 mWh');
    expect(html).toContain('0,072 g, como 72,1 mg');
  });
});
