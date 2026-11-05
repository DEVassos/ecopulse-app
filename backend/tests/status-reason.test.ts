import { describe, expect, it, vi } from 'vitest';
import { ServiceRepository } from '../src/modules/services/services.repository';
import { getServices } from '../src/modules/services/services.service';

async function reason(status: string, message: string | null) {
  const repository = new ServiceRepository({ query: vi.fn().mockResolvedValue({ rows: [{ id: '1', name: 'Serviço', status,
    country: null, region: null, city: null, last_reading_at: null, cpu_percent: null, energy_kwh: null,
    co2e_grams: null, error_message: message }] }) });
  return (await getServices(repository)).services[0];
}
describe('statusReason público', () => {
  it.each(['ativo', 'sem_metricas', 'removido'])('omite diagnóstico antigo quando estado é %s', async status => {
    expect((await reason(status, 'Serviço indisponível (HTTP 500).')).statusReason).toBeNull();
  });
  it.each([null, '', '   '])('sem mensagem não inventa motivo (%j)', async message => {
    expect((await reason('indisponivel', message)).statusReason).toBeNull();
  });
  it.each([
    ['Serviço indisponível (HTTP 500).', 'Serviço indisponível (HTTP 500).'],
    ['Timeout', 'Timeout'],
    ['Descoberta indisponível; erro interno com token=privado', 'Descoberta indisponível; não foi possível consultar as métricas dos serviços.'],
    ['A API de métricas não respondeu em 10 s (/metrics/privado).', 'A API de métricas não respondeu no prazo esperado.'],
    ['Não foi possível conectar à API de métricas (/metrics/privado).', 'Não foi possível conectar à API de métricas.'],
    ['A API de métricas respondeu HTTP 503 em /metrics/privado.', 'A API de métricas respondeu HTTP 503.'],
    ['Falha externa ao coletar métricas.', 'Falha externa ao coletar métricas.'],
    ['postgresql://user:senha@host/db SELECT * FROM users\n at stack', 'Não foi possível obter as métricas deste serviço.'],
  ])('normaliza diagnóstico sem expor detalhes (%s)', async (message, expected) => {
    expect((await reason('indisponivel', message)).statusReason).toBe(expected);
  });
});
