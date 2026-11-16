import assert from 'node:assert/strict';
import test from 'node:test';
import { filterSnapshotForUser, mergeSnapshotForUser } from './access.mjs';
import {
  createSessionToken, hashPassword, initSessionSecret, passwordVersion, readSessionToken, verifyPassword,
} from './auth.mjs';

const admin = { id: 'admin-1', role: 'admin' };
const dosenA = { id: 'user-a', role: 'dosen', dosenId: 'd-a' };

const database = () => ({
  lecturerProfiles: [{ id: 'd-a', nama: 'A' }, { id: 'd-b', nama: 'B' }],
  accounts: [
    { id: 'admin-1', username: 'admin', role: 'admin', password: 'scrypt$x' },
    { id: 'user-a', username: 'a', role: 'dosen', password: 'scrypt$y' },
    { id: 'user-b', username: 'b', role: 'dosen', password: 'scrypt$z' },
  ],
  projects: [{ id: 'p1', ownerId: 'user-a', judul: 'A1' }, { id: 'p2', ownerId: 'user-b', judul: 'B1' }],
  publications: [],
  surat: [],
  suratTugas: [
    { id: 's1', ownerId: 'user-a', nomorSurat: '050/UPPM/ST/05/2026', tanggalMulai: '2026-05-02', status: 'Disetujui', finalDocument: { id: 'doc-1' }, qrPayload: 'qr' },
    { id: 's2', ownerId: 'user-b', nomorSurat: '051/UPPM/ST/05/2026', tanggalMulai: '2026-05-03', status: 'Menunggu', namaKegiatan: 'Rahasia B' },
  ],
  sintaVerifications: [],
  claimSubmissions: [{ id: 'c2', ownerId: 'user-b', status: 'Menunggu', judul: 'Klaim B' }],
  monthlyUpdates: [],
  notifications: [
    { id: 'n1', dosenId: 'd-a', isRead: false },
    { id: 'n2', dosenId: 'd-b', isRead: false },
  ],
});

test('snapshot never exposes passwords, even to admin', () => {
  for (const user of [admin, dosenA]) {
    const filtered = filterSnapshotForUser(user, database());
    assert.ok(filtered.accounts.every(account => !('password' in account)));
  }
});

test('dosen sees only own records, own account, own notifications', () => {
  const filtered = filterSnapshotForUser(dosenA, database());
  assert.deepEqual(filtered.projects.map(item => item.id), ['p1']);
  assert.deepEqual(filtered.claimSubmissions, []);
  assert.deepEqual(filtered.accounts.map(item => item.id), ['user-a']);
  assert.deepEqual(filtered.notifications.map(item => item.id), ['n1']);
  const stub = filtered.suratTugas.find(item => item.id === 's2');
  assert.deepEqual(Object.keys(stub).sort(), ['id', 'nomorSurat', 'ownerId', 'tanggalMulai']);
  assert.equal(stub.namaKegiatan, undefined);
});

test('dosen cannot modify or delete other users records', () => {
  const incoming = {
    projects: [{ id: 'p1', ownerId: 'user-a', judul: 'A1 edit' }, { id: 'p2', ownerId: 'user-a', judul: 'stolen' }],
    claimSubmissions: [],
    suratTugas: [],
  };
  const merged = mergeSnapshotForUser(dosenA, incoming, database());
  assert.equal(merged.projects.find(item => item.id === 'p2').judul, 'B1');
  assert.equal(merged.projects.find(item => item.id === 'p2').ownerId, 'user-b');
  assert.equal(merged.projects.find(item => item.id === 'p1').judul, 'A1 edit');
  assert.deepEqual(merged.claimSubmissions.map(item => item.id), ['c2']);
  assert.deepEqual(merged.suratTugas.map(item => item.id), ['s2']); // own s1 deleted by owner, s2 kept
});

test('dosen cannot approve or forge final documents', () => {
  const incoming = {
    suratTugas: [
      { id: 's1', ownerId: 'user-a', status: 'Ditolak', finalDocument: { id: 'forged' }, namaKegiatan: 'edit' },
      { id: 's3', ownerId: 'user-b', status: 'Disetujui', finalDocument: { id: 'forged-new' }, qrPayload: 'x' },
    ],
  };
  const merged = mergeSnapshotForUser(dosenA, incoming, database());
  const existing = merged.suratTugas.find(item => item.id === 's1');
  assert.equal(existing.status, 'Disetujui');
  assert.equal(existing.finalDocument.id, 'doc-1');
  assert.equal(existing.namaKegiatan, 'edit');
  const created = merged.suratTugas.find(item => item.id === 's3');
  assert.equal(created.ownerId, 'user-a');
  assert.equal(created.status, 'Menunggu');
  assert.equal(created.finalDocument, undefined);
  assert.equal(created.qrPayload, '');
});

test('dosen can only mark own notifications read and cannot change lecturer profiles', () => {
  const incoming = {
    notifications: [{ id: 'n1', isRead: true }, { id: 'n2', isRead: true }],
    lecturerProfiles: [],
  };
  const merged = mergeSnapshotForUser(dosenA, incoming, database());
  assert.equal(merged.notifications.find(item => item.id === 'n1').isRead, true);
  assert.equal(merged.notifications.find(item => item.id === 'n2').isRead, false);
  assert.equal(merged.lecturerProfiles.length, 2);
});

test('admin writes everything except accounts', () => {
  const merged = mergeSnapshotForUser(admin, { accounts: [{ id: 'evil', password: 'x' }], projects: [] }, database());
  assert.equal('accounts' in merged, false);
  assert.deepEqual(merged.projects, []);
});

test('password hashing and session tokens', () => {
  const hash = hashPassword('rahasia-123');
  assert.ok(verifyPassword('rahasia-123', hash));
  assert.ok(!verifyPassword('salah', hash));
  assert.ok(!verifyPassword('rahasia-123', 'rahasia-123'), 'plaintext stored value must never verify');

  initSessionSecret();
  const token = createSessionToken({ id: 'user-a', role: 'dosen', password: hash });
  const session = readSessionToken(token);
  assert.equal(session.sub, 'user-a');
  assert.equal(session.pv, passwordVersion(hash));
  assert.equal(readSessionToken(`${token.split('.')[0]}.tampered`), null);
  const [body, signature] = token.split('.');
  const forgedBody = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url')), role: 'admin' })).toString('base64url');
  assert.equal(readSessionToken(`${forgedBody}.${signature}`), null);
});
