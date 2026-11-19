import { describe, expect, it } from 'vitest';
import type { ServiceCollection } from '../services/collections.types';
import { brasiliaInstant, collectionsCsv, collectionsFileName, CSV_COLUMNS, csvNumber, csvText, fileSlug } from './csv';

/** Os dois exemplos de docs/api.md § GET /api/collections. */
const OK: ServiceCollection = {
  id: '2', serviceId: '1', collectedAt: '2026-10-14T20:00:00.000Z', status: 'ok', collectionIntervalSeconds: 27,
  cpuPercent: 42.5, memoryGb: 1.2, diskGb: 10, networkGb: 0.3, errorMessage: null, calculationStatus: 'disponivel',
  energyKwh: 0.000480452625, co2eGrams: 0.040838473125, carbonIntensityGco2ePerKwh: 85,
};
const ERRO: ServiceCollection = {
  id: '1', serviceId: '1', collectedAt: '2026-10-14T19:45:00.000Z', status: 'erro', collectionIntervalSeconds: null,
  cpuPercent: null, memoryGb: null, diskGb: null, networkGb: null, errorMessage: 'Timeout', calculationStatus: 'nao_calculado',
  energyKwh: null, co2eGrams: null, carbonIntensityGco2ePerKwh: null,
};

describe('CSV das coletas (#24)', () => {
  it('cabeçalho com as colunas do contrato da #54 e uma linha por coleta, com BOM e CRLF', () => {
    const csv = collectionsCsv([ERRO, OK]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(CSV_COLUMNS.join(';'));
    expect(lines[1]).toBe('2026-10-14T16:45:00-03:00;erro;;;;;;;;;nao_calculado;Timeout');
    expect(lines[2]).toBe('2026-10-14T17:00:00-03:00;ok;42,5;1,2;10;0,3;27;0,000480452625;0,040838473125;85;disponivel;');
    expect(lines[3]).toBe('');
  });

  it('ausente fica vazio, nunca 0; zero calculado continua 0', () => {
    expect(csvNumber(null)).toBe('');
    expect(csvNumber(undefined)).toBe('');
    expect(csvNumber(0)).toBe('0');
  });

  it('números com todas as casas, sem notação científica e sem separador de milhar', () => {
    expect(csvNumber(0.00000048)).toBe('0,00000048');
    expect(csvNumber(12345.678)).toBe('12345,678');
    expect(String(0.00000048)).toBe('4.8e-7');
  });

  it('a soma das células refaz o total com a precisão da API', () => {
    const values = [0.000480452625, 0.000512, 0.0001];
    const back = values.map(csvNumber).map((cell) => Number(cell.replace(',', '.')));
    expect(back).toEqual(values);
  });

  it('texto com separador, aspas ou quebra de linha vai entre aspas; fórmula ganha apóstrofo', () => {
    expect(csvText('Timeout')).toBe('Timeout');
    expect(csvText('HTTP 500; tente de novo')).toBe('"HTTP 500; tente de novo"');
    expect(csvText('disse "não"')).toBe('"disse ""não"""');
    expect(csvText('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
    expect(csvText('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvText('-1')).toBe("'-1");
  });

  it('horário de Brasília com o fuso escrito, inclusive na virada do dia', () => {
    expect(brasiliaInstant('2026-11-19T11:30:12.345Z')).toBe('2026-11-19T08:30:12-03:00');
    expect(brasiliaInstant('2026-11-19T01:00:00.000Z')).toBe('2026-11-18T22:00:00-03:00');
  });

  it('nome do arquivo com o serviço sem acentos e as datas do filtro', () => {
    expect(fileSlug('Fraud Detector')).toBe('fraud-detector');
    expect(fileSlug('Previsão  de Ações!')).toBe('previsao-de-acoes');
    expect(fileSlug('***')).toBe('servico');
    expect(collectionsFileName('Fraud Detector', '2026-11-18', '2026-11-19')).toBe('ecopulse-coletas-fraud-detector-2026-11-18-a-2026-11-19.csv');
  });
});
