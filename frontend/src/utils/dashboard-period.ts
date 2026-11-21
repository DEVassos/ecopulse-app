/** Janela única de 24 h do Dashboard (#375), ancorada na última atualização bem-sucedida da lista. */
export interface DashboardPeriod { from: string; to: string }

const DAY_MS = 24 * 60 * 60 * 1000;

export function dashboardPeriod(updatedAt: string | null): DashboardPeriod | null {
  if (updatedAt === null) return null;
  const end = Date.parse(updatedAt);
  if (!Number.isFinite(end)) return null;
  return { from: new Date(end - DAY_MS).toISOString(), to: new Date(end).toISOString() };
}
