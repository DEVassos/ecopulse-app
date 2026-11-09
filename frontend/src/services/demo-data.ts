// Dados ilustrativos do protótipo (APIs do cliente em 01/10/2026).
// Usados só enquanto VITE_API_URL não estiver definida — a tela avisa que é uma demonstração.

import type { CollectionsResponse, ServiceCollection } from './collections.types';
import type { MonitoredService, ServicesResponse } from './services.types';

/** Intervalo entre coletas do worker (POLLING_INTERVAL_MS do .env.example). */
const DEMO_COLLECTION_INTERVAL_SECONDS = 30;
const DEMO_COLLECTION_INTERVAL_MS = DEMO_COLLECTION_INTERVAL_SECONDS * 1_000;

/** Horário de uma leitura feita há alguns segundos, para a demonstração parecer viva. */
function secondsAgo(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

export function demoServices(): ServicesResponse {
  // Sem leitura, os campos da coleta (#297) ficam null; a energia ilustrativa é de uma hora, então a potência é energia × 1000
  const noReading = { cpuPercent: null, energyKwh: null, emissionsG: null, collectionIntervalSeconds: null, memoryGb: null, diskGb: null, networkGb: null, powerWatts: null, carbonIntensityGco2ePerKwh: null };
  const reading = (energyKwh: number, emissionsG: number, resources: [number, number, number]) => ({
    energyKwh, emissionsG, collectionIntervalSeconds: 3600, memoryGb: resources[0], diskGb: resources[1], networkGb: resources[2],
    powerWatts: round(energyKwh * 1000, 1), carbonIntensityGco2ePerKwh: Math.round(emissionsG / energyKwh),
  });
  const services: MonitoredService[] = [
    { id: 'fraud-detector', name: 'Fraud Detector', country: 'Estados Unidos', regionCode: 'us-east', region: 'Virgínia', city: 'Ashburn', cpuPercent: 68, ...reading(0.0713, 26.9, [6.04, 67.11, 0.53]), status: 'ativo', statusReason: null, lastReadingAt: secondsAgo(4) },
    { id: 'recommendation-ai', name: 'Recommendation AI', country: 'Irlanda', regionCode: 'eu-west', region: 'Leinster', city: 'Dublin', cpuPercent: 74, ...reading(0.0868, 25.6, [7.83, 21.83, 1.97]), status: 'ativo', statusReason: null, lastReadingAt: secondsAgo(6) },
    { id: 'audit-stream', name: 'Audit Stream', country: 'Japão', regionCode: 'jp-east', region: 'Kanto', city: 'Tóquio', cpuPercent: 41, ...reading(0.0533, 24.8, [1.33, 8.51, 0.29]), status: 'ativo', statusReason: null, lastReadingAt: secondsAgo(5) },
    { id: 'checkout-worker', name: 'Checkout Worker', country: 'Estados Unidos', regionCode: 'us-east', region: 'Virgínia', city: 'Ashburn', cpuPercent: 45, ...reading(0.0467, 17.7, [3.17, 19.26, 0.45]), status: 'ativo', statusReason: null, lastReadingAt: secondsAgo(3) },
    { id: 'reporting-batch', name: 'Reporting Batch', country: 'Canadá', regionCode: 'ca-central', region: 'Quebec', city: 'Montreal', cpuPercent: 52, ...reading(0.0726, 2.9, [4.5, 120.4, 2.1]), status: 'ativo', statusReason: null, lastReadingAt: secondsAgo(8) },
    { id: 'email-dispatcher', name: 'Email Dispatcher', country: 'Brasil', regionCode: 'br-sudeste', region: 'Sudeste', city: 'São Paulo', ...noReading, status: 'indisponivel', statusReason: 'Serviço indisponível (HTTP 500).', lastReadingAt: secondsAgo(1260) },
    { id: 'inventory-sync', name: 'Inventory Sync', country: 'Canadá', regionCode: null, region: 'Ontario', city: null, ...noReading, status: 'sem_metricas', statusReason: null, lastReadingAt: null },
  ];
  return { services, period: 'última 1 hora' };
}

function round(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

/**
 * Histórico ilustrativo de um serviço: `limit` coletas a cada 30 s até agora, coerente com a lista acima.
 * Serviço sem leitura nenhuma devolve histórico vazio; serviço indisponível tem coletas com erro desde a última leitura.
 */
export function demoCollections(serviceId: string, limit: number): CollectionsResponse {
  const services = demoServices().services;
  const service = services.find((item) => item.id === serviceId);
  if (!service || service.lastReadingAt === null) return { collections: [], period: { from: null, to: null } };

  const seed = services.indexOf(service) + 1;
  const baseCpu = service.cpuPercent ?? 30;
  const failingSince = service.status === 'indisponivel' ? Date.parse(service.lastReadingAt) : Number.POSITIVE_INFINITY;
  const now = Date.now();

  const collections = Array.from({ length: limit }, (_, index): ServiceCollection => {
    const gapOffset = serviceId === 'fraud-detector' && index >= 5 ? 90_000 : 0;
    const time = now - index * DEMO_COLLECTION_INTERVAL_MS - gapOffset;
    const common = { id: `${serviceId}-${index}`, serviceId, collectedAt: new Date(time).toISOString() };
    if (time > failingSince) {
      return { ...common, status: 'erro', collectionIntervalSeconds: null, cpuPercent: null, memoryGb: null, diskGb: null, networkGb: null, errorMessage: 'Serviço indisponível (HTTP 500).' };
    }
    const wave = Math.sin(index / 4 + seed) * 9 + Math.sin(index / 1.7) * 3;
    return {
      ...common,
      status: 'ok',
      collectionIntervalSeconds: DEMO_COLLECTION_INTERVAL_SECONDS,
      cpuPercent: round(Math.min(100, Math.max(0, baseCpu + wave)), 1),
      memoryGb: round(0.5 + seed * 0.6 + Math.sin(index / 5) * 0.1, 3),
      diskGb: round(8 + seed * 3 + (limit - index) * 0.01, 3),
      networkGb: round(0.05 * seed + Math.abs(Math.sin(index / 3)) * 0.04, 3),
      errorMessage: null,
    };
  });
  return { collections, period: { from: null, to: null } };
}
