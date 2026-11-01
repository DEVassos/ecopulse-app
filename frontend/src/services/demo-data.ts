// Dados ilustrativos do protótipo (APIs do cliente em 01/10/2026).
// Usados só enquanto VITE_API_URL não estiver definida — a tela avisa que é uma demonstração.

import type { CollectionsResponse, ServiceCollection } from './collections.types';
import type { MonitoredService, ServicesResponse } from './services.types';

/** Intervalo entre coletas do worker (POLLING_INTERVAL_MS do .env.example). */
const DEMO_COLLECTION_INTERVAL_MS = 30_000;

/** Horário de uma leitura feita há alguns segundos, para a demonstração parecer viva. */
function secondsAgo(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

export function demoServices(): ServicesResponse {
  const services: MonitoredService[] = [
    { id: 'fraud-detector', name: 'Fraud Detector', country: 'Estados Unidos', region: 'us-east', city: 'Virgínia', cpuPercent: 68, energyKwh: 0.0713, emissionsG: 26.9, status: 'ativo', lastReadingAt: secondsAgo(4) },
    { id: 'recommendation-ai', name: 'Recommendation AI', country: 'Irlanda', region: 'eu-west', city: 'Dublin', cpuPercent: 74, energyKwh: 0.0868, emissionsG: 25.6, status: 'ativo', lastReadingAt: secondsAgo(6) },
    { id: 'audit-stream', name: 'Audit Stream', country: 'Japão', region: 'jp-east', city: 'Tóquio', cpuPercent: 41, energyKwh: 0.0533, emissionsG: 24.8, status: 'ativo', lastReadingAt: secondsAgo(5) },
    { id: 'checkout-worker', name: 'Checkout Worker', country: 'Estados Unidos', region: 'us-east', city: 'Virgínia', cpuPercent: 45, energyKwh: 0.0467, emissionsG: 17.7, status: 'ativo', lastReadingAt: secondsAgo(3) },
    { id: 'reporting-batch', name: 'Reporting Batch', country: 'Canadá', region: 'ca-central', city: 'Montreal', cpuPercent: 52, energyKwh: 0.0726, emissionsG: 2.9, status: 'ativo', lastReadingAt: secondsAgo(8) },
    { id: 'email-dispatcher', name: 'Email Dispatcher', country: 'Brasil', region: 'br-sudeste', city: 'São Paulo', cpuPercent: null, energyKwh: null, emissionsG: null, status: 'indisponivel', lastReadingAt: secondsAgo(1260) },
    { id: 'inventory-sync', name: 'Inventory Sync', country: 'Canadá', region: 'ca-central', city: null, cpuPercent: null, energyKwh: null, emissionsG: null, status: 'sem_metricas', lastReadingAt: null },
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
    const time = now - index * DEMO_COLLECTION_INTERVAL_MS;
    const common = { id: `${serviceId}-${index}`, serviceId, collectedAt: new Date(time).toISOString() };
    if (time > failingSince) {
      return { ...common, status: 'erro', cpuPercent: null, memoryGb: null, diskGb: null, networkGb: null, errorMessage: 'Serviço indisponível (HTTP 500).' };
    }
    const wave = Math.sin(index / 4 + seed) * 9 + Math.sin(index / 1.7) * 3;
    return {
      ...common,
      status: 'ok',
      cpuPercent: round(Math.min(100, Math.max(0, baseCpu + wave)), 1),
      memoryGb: round(0.5 + seed * 0.6 + Math.sin(index / 5) * 0.1, 3),
      diskGb: round(8 + seed * 3 + (limit - index) * 0.01, 3),
      networkGb: round(0.05 * seed + Math.abs(Math.sin(index / 3)) * 0.04, 3),
      errorMessage: null,
    };
  });
  return { collections, period: { from: null, to: null } };
}
