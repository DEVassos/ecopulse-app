import type { ReactNode } from 'react';
import type { ServiceStatus } from '../services/services.types';
import { formatNumber } from '../utils/format';
import { exampleCalculation } from '../utils/model';
import { CLEAN_GRID_MAX_GCO2E_PER_KWH } from '../utils/regions';
import { formatQuantity } from '../utils/units';
import CleanGridBadge from './CleanGridBadge';
import EstimateTag from './EstimateTag';
import MissingValue from './MissingValue';
import StatusBadge from './StatusBadge';

/** Os quatro estados, com o selo da tabela do Dashboard: o que quer dizer e o que acontece com os números. */
const STATES: Array<[ServiceStatus, string, string]> = [
  ['ativo', 'A última coleta trouxe métricas.', 'Cada coleta vira potência, energia e CO₂e, quando a intensidade da região está disponível.'],
  ['indisponivel', 'A última coleta falhou; o motivo aparece ao lado do selo.', 'A coleta com falha conta como coleta, mas não tem energia nem CO₂e: os totais do período somam só as calculadas.'],
  ['sem_metricas', 'O agregador não tem métricas deste serviço.', 'Não há o que calcular: a coleta conta como falha, sem energia nem CO₂e.'],
  ['removido', 'Saiu da lista do agregador.', 'Não há coletas novas e ele sai da contagem de serviços; o histórico continua nos períodos em que foi coletado.'],
];

/** O exemplo oficial na escala da tela: 848 mWh e 72,1 mg. */
const example = exampleCalculation();

/** Como ler cada marca da tela, com a marca real ao lado do texto. */
const READING: Array<[string, ReactNode]> = [
  ['Estimativa', <>Energia e CO₂e vêm de um modelo (aba Fórmulas), não de um medidor; a etiqueta <EstimateTag /> marca as telas com esses números.</>],
  ['Sem cálculo não é zero', <>O traço <MissingValue label="sem cálculo" title="Sem cálculo" /> quer dizer que faltou a métrica ou a intensidade da região: o valor é desconhecido, e o total do período fica menor do que seria, nunca com um zero inventado.</>],
  ['Período [início, fim)', 'Todo número agregado vale de um início, que entra, até um fim, que não entra: a coleta feita exatamente no fim fica para o período seguinte, e dois períodos seguidos somam o período inteiro sem contar nada duas vezes.'],
  ['Rede limpa', <>O selo <CleanGridBadge grid={{ carbonIntensityGco2ePerKwh: 85, renewableSharePercent: 83 }} describe={false} /> marca a região cuja intensidade de agora, na Carbon API, é de até {CLEAN_GRID_MAX_GCO2E_PER_KWH} g CO₂e/kWh.</>],
  ['Última atualização e intervalo', 'O Dashboard, no topo da página, ao lado de Imprimir / PDF, e a página Emissões dizem quando a tela buscou os dados e de quanto em quanto tempo busca de novo (em Emissões, no modo Tempo real). Se uma busca falha, os números anteriores continuam na tela e o selo passa a dizer "Desatualizado desde…".'],
  ['Unidade que troca sozinha', `A tela escolhe a unidade pelo maior valor do conjunto (mWh, Wh, kWh; mg, g, kg), e uma coluna ou um eixo fica toda na mesma unidade, escrita no cabeçalho. A energia do exemplo oficial, ${formatNumber(example.energyKwh, 6)} kWh, aparece como ${formatQuantity('energy', example.energyKwh)}; o CO₂e, ${formatNumber(example.co2eGrams, 3)} g, como ${formatQuantity('co2e', example.co2eGrams)}. Passe o mouse ou o foco num número compacto para ver o valor exato.`],
];

/** Aba "Guia de leitura" da Ajuda (#404): estados com o selo real e como ler os números da tela. */
export default function HelpReading() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="ajuda-estados" className="grid gap-3">
        <h2 id="ajuda-estados" className="m-0 font-display text-lg font-semibold">Estados de um serviço</h2>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {STATES.map(([status, meaning, numbers]) => (
            <li key={status} className="grid content-start justify-items-start gap-2 rounded-lg border border-border p-4 text-sm leading-relaxed">
              <StatusBadge status={status} />
              <span>{meaning}</span>
              <span className="text-muted">{numbers}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="ajuda-valores" className="grid gap-3">
        <h2 id="ajuda-valores" className="m-0 font-display text-lg font-semibold">Como ler os valores</h2>
        <dl className="m-0 grid max-w-3xl gap-3">
          {READING.map(([term, text]) => (
            <div key={term} className="text-sm leading-relaxed">
              <dt className="font-semibold">{term}</dt>
              <dd className="m-0 text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
