import { EQUIVALENT_FACTORS, EQUIVALENTS_DISCLAIMER, describeEquivalents } from '../utils/equivalents';
import { formatNumber as n } from '../utils/format';
import { OFFICIAL_EXAMPLE as input, POWER_COEFFICIENTS, WATT_SECONDS_PER_KWH, averagePowerW, exampleCalculation, formatCoefficient } from '../utils/model';
import { estimateMigration } from '../utils/regions';

/** O documento inteiro, com a precisão e os exemplos conferidos (mesma base do link do painel da região). */
const CALCULOS_DOC_URL = 'https://github.com/DEVassos/ecopulse-app/blob/develop/docs/calculos.md';

interface Card {
  title: string;
  formula: string;
  /** A conta com os números do exemplo, já formatada em pt-BR. */
  example: string;
  note: string;
}

const result = exampleCalculation();
const { cpuWattsPerPercent: cpu, memoryWattsPerGb: ram, diskWattsPerGb: disk, networkWattsPerGb: net } = POWER_COEFFICIENTS;
const SECONDS = n(WATT_SECONDS_PER_KWH, 0);

/** As três contas em sequência, com o exemplo oficial de docs/calculos.md calculado pelo mesmo modelo (`utils/model.ts`). */
const CHAIN: Card[] = [
  {
    title: '1. Potência (W)',
    formula: `P = CPU% × ${formatCoefficient(cpu)} + RAM × ${formatCoefficient(ram)} + disco × ${formatCoefficient(disk)} + rede × ${formatCoefficient(net)}`,
    example: `${n(result.parts.cpuW, 2)} + ${n(result.parts.memoryW, 2)} + ${n(result.parts.diskW, 2)} + ${n(result.parts.networkW, 2)} = ${n(result.powerW, 2)} W`,
    note: 'RAM, disco e rede em GB, como o agregador informa; cada parcela com seis casas.',
  },
  {
    title: '2. Energia (kWh)',
    formula: `E = P × segundos ÷ ${SECONDS}`,
    example: `${n(result.powerW, 2)} × ${n(input.intervalSeconds, 0)} ÷ ${SECONDS} = ${n(result.energyKwh, 9)} kWh`,
    note: 'Segundos é o intervalo da coleta informado pelo agregador, não o intervalo de atualização da tela.',
  },
  {
    title: '3. CO₂e (g)',
    formula: 'C = E × intensidade da região',
    example: `${n(result.energyKwh, 9)} × ${n(input.intensityGco2ePerKwh, 0)} = ${n(result.co2eGrams, 6)} g`,
    note: 'Intensidade em g CO₂e/kWh, da Carbon API (cache de 1 h); a usada fica gravada na coleta.',
  },
];

// Exemplos de docs/calculos.md: Ashburn (us-east, 378 g/kWh) com 0,050 kWh e 18,90 g levado a Toronto (40 g/kWh);
// 0,48 kWh em 24 h; 258 g nas equivalências
const migration = estimateMigration(0.05, 18.9, 40);
const average = averagePowerW(0.48, 86_400);
const { carKm, smartphoneCharge } = EQUIVALENT_FACTORS;

const DERIVED: Card[] = [
  {
    title: 'Simulação de região',
    formula: 'CO₂e simulado = energia do período × intensidade do destino',
    example: migration
      ? `${n(0.05, 3)} × 40 = ${n(migration.grams, 2)} g; redução de ${n(migration.savedGrams, 2)} g (${n(migration.savedPercent ?? 0, 2)}%)`
      : '',
    note: 'Ashburn (378 g/kWh) com 0,050 kWh e 18,90 g no período, levado a Toronto (40 g/kWh). A energia fica igual; só troca a intensidade. Não considera latência, custo, disponibilidade nem a energia para mover os dados.',
  },
  {
    title: 'Potência média',
    formula: `P média = energia × ${SECONDS} ÷ segundos monitorados`,
    example: average === null ? '' : `${n(0.48, 2)} × ${SECONDS} ÷ ${n(86_400, 0)} = ${n(average, 0)} W`,
    note: 'A potência para manter o serviço no ar (0,48 kWh em 24 h). Na Comparação, a potência por recurso aplica os mesmos coeficientes às médias do período, ponderadas pelo intervalo das coletas.',
  },
  {
    title: 'Equivalências',
    formula: `km de carro = CO₂e ÷ ${n(carKm.gramsPerUnit, 1)} g · cargas de celular = CO₂e ÷ ${n(smartphoneCharge.gramsPerUnit, 1)} g`,
    example: `${n(258, 0)} g ${describeEquivalents(258) ?? ''}`,
    note: `${EQUIVALENTS_DISCLAIMER} Fatores da EPA, consultados em 13/11/2026.`,
  },
];

function Cards({ cards }: { cards: Card[] }) {
  return cards.map((card) => (
    <li key={card.title} className="grid min-w-0 content-start gap-2 rounded-lg border border-border bg-surface-2 p-4 text-sm leading-relaxed">
      <h3 className="m-0 font-display text-base font-semibold">{card.title}</h3>
      <code className="block rounded-md border border-border bg-bg px-2 py-1.5 text-[13px]">{card.formula}</code>
      <p className="m-0 font-data font-semibold">{card.example}</p>
      <p className="m-0 text-muted">{card.note}</p>
    </li>
  ));
}

/** Aba "Fórmulas" da Ajuda (#404): potência → energia → CO₂e com o exemplo oficial, e as contas derivadas. */
export default function HelpFormulas() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="ajuda-contas" className="grid gap-3">
        <h2 id="ajuda-contas" className="m-0 font-display text-lg font-semibold">Das métricas ao CO₂e</h2>
        <p className="m-0 max-w-3xl text-sm">
          Três contas em sequência, com o exemplo oficial de <code>docs/calculos.md</code>: CPU {n(input.cpuPercent, 0)}%, RAM{' '}
          {n(input.memoryGb, 0)} GB, disco {n(input.diskGb, 0)} GB, rede {n(input.networkGb, 0)} GB, coleta de {n(input.intervalSeconds, 0)} s
          e região a {n(input.intensityGco2ePerKwh, 0)} g CO₂e/kWh.
        </p>
        <ol className="m-0 grid list-none gap-3 p-0 lg:grid-cols-3">
          <Cards cards={CHAIN} />
        </ol>
      </section>
      <section aria-labelledby="ajuda-derivadas" className="grid gap-3">
        <h2 id="ajuda-derivadas" className="m-0 font-display text-lg font-semibold">Contas que partem dessas</h2>
        <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-3">
          <Cards cards={DERIVED} />
        </ul>
      </section>
      <p className="m-0 text-sm">
        Fórmulas completas, precisão e exemplos conferidos à mão em{' '}
        <a href={CALCULOS_DOC_URL} target="_blank" rel="noreferrer">
          docs/calculos.md, no GitHub
        </a>
        .
      </p>
    </div>
  );
}
