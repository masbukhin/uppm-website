type SnapshotPayload = Record<string, unknown>;

let syncTimer: number | undefined;
let serverRevision = 0;
let pendingPayload: SnapshotPayload | null = null;
let syncInFlight = false;

export async function loadDatabaseSnapshot<T extends SnapshotPayload>() {
  const response = await fetch('/api/snapshot', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Database snapshot tidak tersedia.');
  }

  const result = await response.json() as { ok?: boolean; payload?: T | null; revision?: number };
  serverRevision = Number(result.revision || 0);
  return result.payload || null;
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
  } finally {
    syncInFlight = false;
    if (pendingPayload) window.setTimeout(flushDatabaseSync, 0);
  }
}
