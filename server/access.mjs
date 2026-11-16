// Server-side access rules for the snapshot API.
// Admin: reads and writes everything (except account credentials, managed by /api/accounts).
// Dosen: reads and writes only own records; approval fields stay admin-only.

export const OWNED_COLLECTIONS = [
  'projects',
  'publications',
  'surat',
  'suratTugas',
  'sintaVerifications',
  'claimSubmissions',
  'monthlyUpdates',
];

// Fields only an admin may set. For a new dosen record they get the initial value.
const ADMIN_FIELDS = {
  surat: { status: 'Menunggu' },
  suratTugas: { status: 'Menunggu', finalDocument: undefined, qrPayload: '' },
  sintaVerifications: { status: 'Menunggu Verifikasi', finalDocument: undefined },
  claimSubmissions: { status: 'Menunggu', finalDocument: undefined },
};

// Other people's surat tugas: dosen only needs these to compute the next letter number.
const SURAT_TUGAS_STUB_FIELDS = ['id', 'nomorSurat', 'tanggalMulai', 'ownerId'];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function stripPasswords(accounts) {
  return list(accounts).map(({ password: _password, ...rest }) => rest);
}

export function filterSnapshotForUser(user, payload) {
  const result = { ...payload, accounts: stripPasswords(payload.accounts) };
  if (user.role === 'admin') return result;

  for (const key of OWNED_COLLECTIONS) {
    result[key] = list(payload[key]).filter(item => item.ownerId === user.id);
  }
  const otherSuratTugas = list(payload.suratTugas)
    .filter(item => item.ownerId !== user.id)
    .map(item => Object.fromEntries(SURAT_TUGAS_STUB_FIELDS.map(field => [field, item[field]])));
  result.suratTugas = [...result.suratTugas, ...otherSuratTugas];
  result.accounts = result.accounts.filter(account => account.id === user.id);
  result.notifications = list(payload.notifications).filter(item => user.dosenId && item.dosenId === user.dosenId);
  return result;
}

function applyAdminFields(key, record, existing) {
  const fields = ADMIN_FIELDS[key];
  if (!fields) return record;
  const next = { ...record };
  for (const [field, initial] of Object.entries(fields)) {
    const value = existing ? existing[field] : initial;
    if (value === undefined) delete next[field];
    else next[field] = value;
  }
  return next;
}

function mergeOwnedCollection(key, user, incoming, current) {
  const currentById = new Map(current.map(item => [item.id, item]));
  const incomingMine = new Map();
  const front = [];
  const back = [];
  let seenExisting = false;

  for (const record of incoming) {
    if (!record || typeof record.id !== 'string' || !record.id) continue;
    const existing = currentById.get(record.id);
    if (existing && existing.ownerId !== user.id) continue; // cannot touch other people's records
    const merged = applyAdminFields(key, { ...record, ownerId: user.id }, existing);
    if (existing) {
      seenExisting = true;
      incomingMine.set(record.id, merged);
    } else {
      (seenExisting ? back : front).push(merged);
    }
  }

  const kept = current.flatMap(item => {
    if (item.ownerId !== user.id) return [item];
    return incomingMine.has(item.id) ? [incomingMine.get(item.id)] : []; // missing => deleted by owner
  });
  return [...front, ...kept, ...back];
}

function mergeNotifications(user, incoming, current) {
  const readIds = new Set(list(incoming).filter(item => item?.isRead).map(item => item.id));
  return current.map(item => (
    user.dosenId && item.dosenId === user.dosenId && readIds.has(item.id) ? { ...item, isRead: true } : item
  ));
}

/** Returns the payload to store, given what the user sent and what is in the database now. */
export function mergeSnapshotForUser(user, incoming, current) {
  const safeIncoming = incoming && typeof incoming === 'object' ? incoming : {};
  if (user.role === 'admin') {
    const { accounts: _accounts, ...rest } = safeIncoming;
    return rest;
  }

  const result = {
    lecturerProfiles: list(current.lecturerProfiles),
    notifications: mergeNotifications(user, safeIncoming.notifications, list(current.notifications)),
  };
  for (const key of OWNED_COLLECTIONS) {
    result[key] = mergeOwnedCollection(key, user, list(safeIncoming[key]), list(current[key]));
  }
  return result;
}
