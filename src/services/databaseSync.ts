type SnapshotPayload = Record<string, unknown>;
export type DatabaseSnapshotState<T extends SnapshotPayload> = {
  payload: T | null;
  revision: number;
  changed: boolean;
};

let syncTimer: number | undefined;
let serverRevision = -1;
let pendingPayload: SnapshotPayload | null = null;
let syncInFlight = false;

export async function loadDatabaseSnapshot<T extends SnapshotPayload>(): Promise<DatabaseSnapshotState<T>> {
  const response = await fetch('/api/snapshot', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Database snapshot tidak tersedia.');
  }

  const result = await response.json() as { ok?: boolean; payload?: T | null; revision?: number };
  const revision = Number(result.revision || 0);
  const changed = revision !== serverRevision;
  serverRevision = revision;
  return { payload: result.payload || null, revision, changed };
}

export function queueDatabaseSync(payload: SnapshotPayload) {
  pendingPayload = payload;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(flushDatabaseSync, 500);
}

async function flushDatabaseSync() {
  if (syncInFlight || !pendingPayload) return;
  const payload = pendingPayload;
  pendingPayload = null;
  syncInFlight = true;
  try {
    const response = await fetch('/api/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, baseRevision: serverRevision }),
    });
    const result = await response.json().catch(() => ({})) as { revision?: number; error?: string };
    if (!response.ok) throw new Error(result.error || 'Sinkronisasi MySQL gagal.');
    serverRevision = Number(result.revision || serverRevision);
  } catch (error) {
    console.error('Sinkronisasi MySQL gagal.', error);
    window.dispatchEvent(new CustomEvent('uppm:database-sync-error', { detail: error }));
  } finally {
    syncInFlight = false;
    if (pendingPayload) window.setTimeout(flushDatabaseSync, 0);
  }
}
