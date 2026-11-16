type SnapshotPayload = Record<string, unknown>;
export type DatabaseSnapshotState<T extends SnapshotPayload> = {
  payload: T | null;
  revision: number;
  changed: boolean;
};

export class UnauthorizedError extends Error {}

let syncTimer: number | undefined;
let serverRevision = -1;
let pendingPayload: SnapshotPayload | null = null;
let syncInFlight = false;

/** Call after another API call bumped the revision (e.g. account create/delete). */
export function setServerRevision(revision: number) {
  if (Number.isFinite(revision)) serverRevision = revision;
}

export function resetDatabaseSync() {
  window.clearTimeout(syncTimer);
  pendingPayload = null;
  serverRevision = -1;
}

export async function loadDatabaseSnapshot<T extends SnapshotPayload>(): Promise<DatabaseSnapshotState<T>> {
  const response = await fetch('/api/snapshot', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 401) throw new UnauthorizedError('Sesi berakhir. Silakan login kembali.');
  if (!response.ok) throw new Error('Database snapshot tidak tersedia.');

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
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, baseRevision: serverRevision }),
    });
    const result = await response.json().catch(() => ({})) as { revision?: number; error?: string };
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('uppm:unauthorized'));
      throw new UnauthorizedError(result.error || 'Sesi berakhir.');
    }
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
