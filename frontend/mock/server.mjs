// Backend FALSO, só para desenvolvimento e revisão do frontend enquanto a API real não existe.
// Implementa o contrato provisório que o frontend espera (frontend/README.md § Backend falso).
// Não vai para produção nem para o compose: quem implementa as rotas de verdade é o backend (BE-02, US01).
//
// Uso: npm run mock  →  http://localhost:3000  (com VITE_API_URL=http://localhost:3000 no .env da raiz)

import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 3000);

/**
 * Cenário de GET /services, para ver os estados da tela:
 *   (padrão) lista normal · MOCK_SERVICES=vazio lista vazia · MOCK_SERVICES=erro responde 500
 *   MOCK_SERVICES=sem-id: Checkout Worker sem `id` · MOCK_SERVICES=cpu-texto: CPU do Fraud Detector em texto
 *   (os dois últimos respondem 200 fora do contrato, e a tela deve tratá-los como falha: #161)
 */
const SERVICES_SCENARIO = process.env.MOCK_SERVICES ?? 'normal';

const SERVICES = [
  { id: 'fraud-detector', name: 'Fraud Detector', country: 'Estados Unidos', region: 'us-east', city: 'Virgínia', cpu: 68, kwh: 0.0713, gramsPerKwh: 377, status: 'ativo' },
  { id: 'recommendation-ai', name: 'Recommendation AI', country: 'Irlanda', region: 'eu-west', city: 'Dublin', cpu: 74, kwh: 0.0868, gramsPerKwh: 295, status: 'ativo' },
  { id: 'audit-stream', name: 'Audit Stream', country: 'Japão', region: 'jp-east', city: 'Tóquio', cpu: 41, kwh: 0.0533, gramsPerKwh: 465, status: 'ativo' },
  { id: 'checkout-worker', name: 'Checkout Worker', country: 'Estados Unidos', region: 'us-east', city: 'Virgínia', cpu: 45, kwh: 0.0467, gramsPerKwh: 377, status: 'ativo' },
  { id: 'reporting-batch', name: 'Reporting Batch', country: 'Canadá', region: 'ca-central', city: 'Montreal', cpu: 52, kwh: 0.0726, gramsPerKwh: 40, status: 'ativo' },
  { id: 'email-dispatcher', name: 'Email Dispatcher', country: 'Brasil', region: 'br-sudeste', city: 'São Paulo', status: 'indisponivel' },
  { id: 'inventory-sync', name: 'Inventory Sync', country: 'Canadá', region: 'ca-central', city: null, status: 'sem_metricas' },
];

/** Leitura "ao vivo": a CPU varia um pouco a cada chamada, para a atualização mostrar mudança na tela. */
function readService(service) {
  const base = { id: service.id, name: service.name, country: service.country, region: service.region, city: service.city, status: service.status };
  if (service.status !== 'ativo') {
    return { ...base, cpuPercent: null, energyKwh: null, emissionsG: null, lastReadingAt: null };
  }
  const factor = 1 + (Math.random() - 0.5) * 0.1;
  const energyKwh = Number((service.kwh * factor).toFixed(4));
  return {
    ...base,
    cpuPercent: Math.round(service.cpu * factor),
    energyKwh,
    emissionsG: Number((energyKwh * service.gramsPerKwh).toFixed(1)),
    lastReadingAt: new Date().toISOString(),
  };
}

/** Ruído determinístico em [0, 1): a mesma coleta tem sempre os mesmos números, em qualquer página ou série. */
function noise(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Coleta do serviço no instante `t` (múltiplo de 30 s), com os campos de cálculo da #188. */
function collectionAt(service, t, index) {
  const slot = t / 30_000;
  const common = { id: `${service.id}-${slot}`, serviceId: service.id, collectedAt: new Date(t).toISOString() };
  const empty = { cpuPercent: null, memoryGb: null, diskGb: null, networkGb: null, calculationStatus: 'nao_calculado', energyKwh: null, co2eGrams: null, carbonIntensityGco2ePerKwh: null };
  if (service.status === 'indisponivel' && index < 10) {
    return { ...common, ...empty, status: 'erro', errorMessage: 'Serviço indisponível (HTTP 500).' };
  }
  const cpu = Math.min(100, (service.cpu ?? 30) * (0.85 + 0.3 * noise(slot)));
  // Potência simplificada (ADR 0006): CPU + memória, em W, durante os 30 s da coleta
  const energyKwh = ((cpu + 0.4) * 30) / 3_600_000;
  const gramsPerKwh = service.gramsPerKwh ?? 85;
  return {
    ...common,
    status: 'ok',
    cpuPercent: Number(cpu.toFixed(1)),
    memoryGb: Number((1 + noise(slot + 1) * 0.2).toFixed(3)),
    diskGb: 12,
    networkGb: Number((0.1 + noise(slot + 2) * 0.05).toFixed(3)),
    errorMessage: null,
    calculationStatus: 'disponivel',
    energyKwh,
    co2eGrams: energyKwh * gramsPerKwh,
    carbonIntensityGco2ePerKwh: gramsPerKwh,
  };
}

/**
 * Histórico de um serviço: até `limit` coletas a cada 30 s entre `from` e `to` (padrão: agora), da mais recente
 * para a mais antiga. Ativo: números estáveis por horário · indisponível: as 10 mais recentes com erro · sem métricas: vazio.
 */
function serviceCollections(service, { from = 0, to = Date.now(), limit }) {
  if (service.status === 'sem_metricas') return [];
  const newest = Math.floor(Math.min(to, Date.now()) / 30_000) * 30_000;
  const now = Math.floor(Date.now() / 30_000) * 30_000;
  const list = [];
  for (let t = newest; t >= from && list.length < limit; t -= 30_000) list.push(collectionAt(service, t, (now - t) / 30_000));
  return list;
}

const BUCKETS = { '15min': 15 * 60_000, '1h': 60 * 60_000, '1d': 24 * 60 * 60_000 };
const MAX_SPAN_MS = 31 * 24 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** Coletas de um serviço no período [from, to): o mesmo recorte de /collections/series, do resumo e da comparação. */
function collectionsBetween(service, from, to) {
  return serviceCollections(service, { from, to: to - 1, limit: Infinity });
}

/** Soma do campo, ou null quando nenhum item tem valor: null é "não calculado", nunca zero. */
function sumOrNull(items, field) {
  const values = items.map((item) => item[field]).filter((value) => value !== null);
  return values.length === 0 ? null : values.reduce((total, value) => total + value, 0);
}

/** Média do campo entre os itens que têm valor, ou null quando nenhum tem. */
function averageOrNull(items, field) {
  const total = sumOrNull(items, field);
  return total === null ? null : total / items.filter((item) => item[field] !== null).length;
}

/**
 * Resumo e comparação leem o mesmo banco que GET /services, então seguem o cenário dela (#239):
 * MOCK_SERVICES=vazio → nenhum serviço · MOCK_SERVICES=erro → HTTP 500, como o backend com o banco fora do ar.
 */
function listedServices() {
  return SERVICES_SCENARIO === 'vazio' ? [] : SERVICES;
}

function simulatedFailure(res) {
  return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Falha simulada no backend falso.' } });
}

/** Data com hora em ISO 8601 (só a data é recusada, como na API); null quando inválida. */
function parseInstant(value) {
  if (value === null || !value.includes('T')) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function validationError(res, message) {
  return send(res, 400, { error: { code: 'VALIDATION_ERROR', message } });
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const routes = {
  // US01 / US04 — serviços monitorados (rota pública do dashboard)
  'GET /services': async (_req, res) => {
    if (SERVICES_SCENARIO === 'erro') return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Falha simulada no backend falso.' } });
    const services = SERVICES_SCENARIO === 'vazio' ? [] : SERVICES.map(readService);
    const checkout = services.find((service) => service.id === 'checkout-worker');
    if (SERVICES_SCENARIO === 'sem-id' && checkout) delete checkout.id;
    if (SERVICES_SCENARIO === 'cpu-texto' && services[0]) services[0].cpuPercent = String(services[0].cpuPercent);
    return send(res, 200, { services, period: 'última 1 hora' });
  },

  // Detalhes do serviço — histórico de coletas (mesmos erros de docs/api.md § GET /api/collections)
  'GET /collections': async (req, res) => {
    const query = new URL(req.url ?? '/', `http://localhost:${PORT}`).searchParams;
    const limit = query.get('limit') ?? '50';
    if (!/^[1-9]\d*$/.test(limit) || Number(limit) > 500) return validationError(res, 'limit deve ser inteiro entre 1 e 500.');
    const from = query.has('from') ? parseInstant(query.get('from')) : 0;
    const to = query.has('to') ? parseInstant(query.get('to')) : Date.now();
    if (from === null || to === null || from > to) return validationError(res, 'Informe from e to com data e hora (ISO 8601), com from antes de to.');
    const service = SERVICES.find((item) => item.id === query.get('service_id'));
    if (!service) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Serviço não encontrado.' } });
    const period = { from: query.get('from'), to: query.get('to') };
    return send(res, 200, { collections: serviceCollections(service, { from, to, limit: Number(limit) }), period });
  },

  // Página Emissões — série somada por intervalo (contrato da #189)
  'GET /collections/series': async (req, res) => {
    const query = new URL(req.url ?? '/', `http://localhost:${PORT}`).searchParams;
    const from = parseInstant(query.get('from'));
    const to = parseInstant(query.get('to'));
    const bucketMs = BUCKETS[query.get('bucket')];
    if (from === null || to === null || from >= to || to - from > MAX_SPAN_MS || !bucketMs) {
      return validationError(res, 'Informe from e to (ISO 8601, até 31 dias) e bucket 15min, 1h ou 1d.');
    }
    const service = SERVICES.find((item) => item.id === query.get('service_id'));
    if (!service) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Serviço não encontrado.' } });

    const groups = new Map();
    // Intensidade do período: média das coletas calculadas, como o AVG … FILTER (calculation_status = 'disponivel') da #189
    let intensitySum = 0;
    let intensityCount = 0;
    const totals = { collections: 0, failed: 0, notCalculated: 0, energyKwh: null, co2eGrams: null, co2eMaxGrams: null, carbonIntensityGco2ePerKwh: null };
    const add = (target, item) => {
      target.collections += 1;
      if (item.status !== 'ok') target.failed += 1;
      else if (item.co2eGrams === null) target.notCalculated += 1;
      if (item.co2eGrams === null) return;
      target.energyKwh = (target.energyKwh ?? 0) + item.energyKwh;
      target.co2eGrams = (target.co2eGrams ?? 0) + item.co2eGrams;
      target.co2eMaxGrams = Math.max(target.co2eMaxGrams ?? 0, item.co2eGrams);
      if ('co2eMinGrams' in target) target.co2eMinGrams = Math.min(target.co2eMinGrams ?? Infinity, item.co2eGrams);
    };
    // Período fechado em from e aberto em to; intervalos alinhados a from (como date_bin)
    for (const item of serviceCollections(service, { from, to: to - 1, limit: Infinity })) {
      const start = from + Math.floor((Date.parse(item.collectedAt) - from) / bucketMs) * bucketMs;
      if (!groups.has(start)) {
        groups.set(start, { start: new Date(start).toISOString(), collections: 0, failed: 0, notCalculated: 0, energyKwh: null, co2eGrams: null, co2eMinGrams: null, co2eMaxGrams: null });
      }
      add(groups.get(start), item);
      add(totals, item);
      if (item.calculationStatus === 'disponivel') {
        intensitySum += item.carbonIntensityGco2ePerKwh;
        intensityCount += 1;
      }
    }
    totals.carbonIntensityGco2ePerKwh = intensityCount > 0 ? intensitySum / intensityCount : null;
    const buckets = [...groups.values()].sort((a, b) => a.start.localeCompare(b.start));
    return send(res, 200, { serviceId: service.id, from: new Date(from).toISOString(), to: new Date(to).toISOString(), bucket: query.get('bucket'), buckets, totals });
  },

  // Painel de indicadores do dashboard (RF08, #175): contrato de docs/api.md § GET /api/services/summary
  'GET /services/summary': async (req, res) => {
    if (SERVICES_SCENARIO === 'erro') return simulatedFailure(res);
    const query = new URL(req.url ?? '/', `http://localhost:${PORT}`).searchParams;
    if (query.has('from') !== query.has('to')) return validationError(res, 'Informe from e to juntos, ou nenhum dos dois.');
    // Sem período: as últimas 24 h até agora
    const to = query.has('to') ? parseInstant(query.get('to')) : Date.now();
    const from = query.has('from') ? parseInstant(query.get('from')) : to - DAY_MS;
    if (from === null || to === null || from >= to || to - from > MAX_SPAN_MS) {
      return validationError(res, 'Informe from e to com data e hora (ISO 8601), from antes de to e até 31 dias.');
    }
    const services = listedServices();
    const collections = services.flatMap((service) => collectionsBetween(service, from, to));
    const count = (status) => services.filter((service) => service.status === status).length;
    return send(res, 200, {
      period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
      // Só as coletas calculadas têm energia e CO₂e; as outras vêm null e ficam fora da soma
      energyKwh: sumOrNull(collections, 'energyKwh'),
      co2eGrams: sumOrNull(collections, 'co2eGrams'),
      services: { active: count('ativo'), unavailable: count('indisponivel'), withoutMetrics: count('sem_metricas'), removed: count('removido') },
    });
  },

  // Página Comparação (RF15, #193): contrato de docs/api.md § GET /api/services/compare, com os ids do mock
  'GET /services/compare': async (req, res) => {
    if (SERVICES_SCENARIO === 'erro') return simulatedFailure(res);
    const query = new URL(req.url ?? '/', `http://localhost:${PORT}`).searchParams;
    const ids = (query.get('ids') ?? '').split(',').filter((id) => id !== '');
    const from = parseInstant(query.get('from'));
    const to = parseInstant(query.get('to'));
    if (ids.length < 2 || ids.length > 10 || new Set(ids).size !== ids.length || from === null || to === null || from >= to || to - from > MAX_SPAN_MS) {
      return validationError(res, 'Informe de 2 a 10 ids distintos e from e to com data e hora (ISO 8601), até 31 dias.');
    }
    const services = ids.map((id) => listedServices().find((service) => service.id === id));
    if (services.includes(undefined)) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Um ou mais serviços não foram encontrados.' } });
    return send(res, 200, {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      // Na ordem dos ids pedidos; serviço sem coletas no período vem com 0 e métricas null
      services: services.map((service) => {
        const items = collectionsBetween(service, from, to);
        return {
          id: service.id,
          name: service.name,
          region: service.region,
          collections: items.length,
          failed: items.filter((item) => item.status !== 'ok').length,
          notCalculated: items.filter((item) => item.status === 'ok' && item.co2eGrams === null).length,
          avgCpuPercent: averageOrNull(items, 'cpuPercent'),
          avgMemoryGb: averageOrNull(items, 'memoryGb'),
          avgDiskGb: averageOrNull(items, 'diskGb'),
          avgNetworkGb: averageOrNull(items, 'networkGb'),
          energyKwh: sumOrNull(items, 'energyKwh'),
          co2eGrams: sumOrNull(items, 'co2eGrams'),
        };
      }),
    });
  },
};

createServer(async (req, res) => {
  // CORS: o Vite roda em outra porta (5173)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return send(res, 204);

  // Aceita as rotas com ou sem o prefixo /api (o .env.example usa VITE_API_URL=http://localhost:3000/api)
  const path = new URL(req.url ?? '/', `http://localhost:${PORT}`).pathname.replace(/^\/api(?=\/)/, '');
  const route = routes[`${req.method} ${path}`];
  console.log(`${new Date().toLocaleTimeString('pt-BR')}  ${req.method} ${path}`);

  if (!route) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Rota não existe no backend falso.' } });
  return route(req, res);
}).listen(PORT, () => {
  console.log(`Backend falso em http://localhost:${PORT}`);
  console.log(`GET /services: cenário "${SERVICES_SCENARIO}" (MOCK_SERVICES=normal|vazio|erro|sem-id|cpu-texto)`);
});
