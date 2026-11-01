export type Health = { status: 'ok'; db: 'ok' };

export async function getHealth(verify: () => Promise<void>): Promise<Health> {
  await verify();
  return { status: 'ok', db: 'ok' };
}
