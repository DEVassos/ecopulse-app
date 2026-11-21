import { Link } from 'react-router';

/** Um passo por tela: o texto antes do link, o link para a tela e o texto depois dele. */
const STEPS: Array<{ title: string; before: string; to: string; link: string; after: string }> = [
  { title: 'Veja o panorama', before: 'O ', to: '/', link: 'Dashboard', after: ' mostra a energia e o CO₂e das últimas 24 h, comparados com as 24 h anteriores, o estado de cada serviço e quem pesa mais. Ele se atualiza sozinho: o cabeçalho diz quando foi a última atualização e de quanto em quanto tempo ela acontece.' },
  { title: 'Abra um serviço ou uma região', before: 'Na tabela do ', to: '/', link: 'Dashboard', after: ', clique num serviço para ver a última leitura e o histórico de coletas. No mapa ou na lista Regiões por CO₂e, escolha uma região para ver quanto a mesma energia emitiria numa rede mais limpa.' },
  { title: 'Investigue no tempo', before: 'Em ', to: '/emissoes', link: 'Emissões', after: ', escolha um serviço e um período para ver a curva do CO₂e e da energia. Dali saem o CSV das coletas e o relatório para imprimir ou salvar em PDF.' },
  { title: 'Compare serviços', before: 'Na ', to: '/comparacao', link: 'Comparação', after: ', marque de 2 a 10 serviços e um período de até 31 dias para vê-los lado a lado: energia, CO₂e e de onde vem a potência de cada um.' },
  { title: 'Ajuste e convide', before: 'Na ', to: '/configuracao', link: 'Configuração', after: ', veja de quanto em quanto tempo as telas se atualizam. O administrador também muda esse intervalo e convida pessoas (aba Administração).' },
];

/** Aba "Como usar" da Ajuda (#398): passos curtos, do Dashboard às análises, cada um com o link da tela. */
export default function HelpUsage() {
  return (
    <div className="grid max-w-3xl gap-4">
      <p className="m-0">
        O EcoPulse estima quanta energia e quanto CO₂e cada serviço monitorado gera, para mostrar onde agir para emitir
        menos. O caminho mais curto:
      </p>
      <ol className="m-0 grid list-none gap-4 p-0">
        {STEPS.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
            <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border border-border bg-surface-3 font-display text-sm font-semibold">
              {index + 1}
            </span>
            <p className="m-0 text-sm leading-relaxed">
              <strong className="block font-display text-base">{step.title}</strong>
              {step.before}
              <Link to={step.to}>{step.link}</Link>
              {step.after}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
