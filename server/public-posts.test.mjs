import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePost, SEED_POSTS } from './public-posts.mjs';

test('normalizePost rejects unknown kinds and short titles', () => {
  assert.equal(normalizePost({ kind: 'iklan', judul: 'Judul valid' }, { id: 'a' }).ok, false);
  assert.equal(normalizePost({ kind: 'pengumuman', judul: 'ab' }, { id: 'a' }).ok, false);
});

test('normalizePost drops unsafe links and bad dates', () => {
  const { ok, post } = normalizePost({
    kind: 'pendanaan', judul: 'Hibah uji', tautan: 'javascript:alert(1)', gambar: '/assets/a.png',
    sumber: 'https://example.org/x', tenggat: '2027-13-40', publishedAt: '2026-11-23',
  }, { id: 'b' });
  assert.equal(ok, true);
  assert.equal(post.tautan, '');
  assert.equal(post.gambar, '/assets/a.png');
  assert.equal(post.sumber, 'https://example.org/x');
  assert.equal(post.tenggat, '');
  assert.equal(post.publishedAt, '2026-11-23');
  assert.equal(post.isPublished, true);
});

test('every seed post is valid', () => {
  for (const seed of SEED_POSTS) assert.equal(normalizePost(seed, { id: seed.id }).ok, true, seed.id);
});
