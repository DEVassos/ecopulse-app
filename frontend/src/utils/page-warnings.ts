/**
 * Avisos de falha do dashboard (#271, #234): um por página, nunca dois iguais empilhados. Com dado na tela, a falha vira
 * a faixa compacta do #217 junto do último valor; sem dado, o aviso grande. O resumo entra na mesma regra da lista: com
 * energia e CO₂e antigos na tela, a faixa avisa e o painel diz desde quando os números valem.
 */
interface Failures {
  /** Mensagem da falha da lista de serviços; vazia quando a última busca deu certo. */
  services: string;
  /** A lista tem serviços na tela: a falha não apaga o que já estava lá. */
  hasServices: boolean;
  /** Horário da última lista bem-sucedida (ISO 8601). */
  servicesAt: string | null;
  /** Mensagem da falha do resumo do período; vazia quando a última busca deu certo. */
  summary: string;
  /** Fim do período do resumo na tela (ISO 8601); null antes da primeira resposta. */
  summaryAt: string | null;
  ranking: string;
}

interface Warnings {
  /** Mensagem da faixa compacta (#217); vazia quando não há falha a mostrar como faixa. */
  banner: string;
  /** Horário dos dados que a faixa cita (ISO 8601); null sem faixa. */
  bannerAt: string | null;
  /** Mensagem do aviso grande (`ErrorState`); vazia quando a faixa já diz o que houve. */
  page: string;
}

export function pageWarnings({ services, hasServices, servicesAt, summary, summaryAt, ranking }: Failures): Warnings {
  // A lista vem antes: uma faixa só, com o primeiro erro, como no aviso grande
  if (services !== '') {
    return hasServices
      ? { banner: services, bannerAt: servicesAt, page: '' }
      : { banner: '', bannerAt: null, page: services };
  }
  // Resumo na tela: os números continuam, então quem avisa é a faixa, e o painel deles diz desde quando estão parados
  if (summary !== '' && summaryAt !== null) {
    return { banner: summary, bannerAt: summaryAt, page: '' };
  }
  return { banner: '', bannerAt: null, page: summary || ranking };
}
