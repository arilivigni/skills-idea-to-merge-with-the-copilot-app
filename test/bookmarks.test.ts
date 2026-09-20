import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SEPARATOR,
  createSlug,
  formatBookmark,
  normalizeUrl,
  parseBookmarks,
  parseCounter,
  serializeBookmarks,
  slugFromCounter,
  toBase62,
} from '../src/lib/bookmarks.ts';

test('a URL with and without https:// normalises to the same saved value', () => {
  const withScheme = normalizeUrl('https://www.example.com');
  const withoutScheme = normalizeUrl('www.example.com');

  assert.equal(withoutScheme, withScheme);
  assert.equal(withScheme, 'https://www.example.com/');
  assert.equal(normalizeUrl('  github.com/features/copilot  '), 'https://github.com/features/copilot');
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com/');
});

test('unusable input is rejected instead of saved', () => {
  for (const input of ['', '   ', 'not a url', 'javascript:alert(1)', 'hello', null, undefined, 42, {}]) {
    assert.equal(normalizeUrl(input as unknown), null, `expected ${String(input)} to be rejected`);
  }
});

test('loading an empty, corrupted, legacy, or non-array value recovers instead of throwing', () => {
  assert.deepEqual(parseBookmarks(null), []);
  assert.deepEqual(parseBookmarks(''), []);
  assert.deepEqual(parseBookmarks('   '), []);
  assert.deepEqual(parseBookmarks('{not json'), []);
  assert.deepEqual(parseBookmarks('{"url":"https://example.com"}'), []);
  assert.deepEqual(parseBookmarks('"just a string"'), []);
  assert.deepEqual(parseBookmarks('42'), []);
  assert.deepEqual(parseBookmarks(undefined), []);

  // Legacy shape: a bare list of URLs from before slugs existed.
  assert.deepEqual(parseBookmarks('["example.com"]'), [{ url: 'https://example.com/', slug: 'mona-1' }]);

  // Malformed members are dropped, valid ones survive.
  const mixed = parseBookmarks(
    JSON.stringify([
      { url: 'https://example.com/', slug: 'mona-1' },
      { url: '', slug: 'mona-2' },
      { url: 'https://valid.dev/', slug: '' },
      null,
      { nope: true },
      { url: 'https://second.dev/', slug: 'mona-3' },
    ]),
  );
  assert.deepEqual(mixed, [
    { url: 'https://example.com/', slug: 'mona-1' },
    { url: 'https://second.dev/', slug: 'mona-3' },
  ]);
});

test('duplicate slugs are never handed out twice', () => {
  const existing = [
    { url: 'https://example.com/', slug: 'mona-1' },
    { url: 'https://second.dev/', slug: 'mona-2' },
  ];

  const next = createSlug(existing, 1);
  assert.equal(next.slug, 'mona-3');
  assert.equal(next.counter, 3);

  const duplicates = parseBookmarks(
    JSON.stringify([
      { url: 'https://example.com/', slug: 'mona-1' },
      { url: 'https://again.dev/', slug: 'mona-1' },
    ]),
  );
  assert.equal(duplicates.length, 1);
});

test('a saved bookmark formats as "<url> :: <slug>" with the exact separator', () => {
  const line = formatBookmark({ url: 'https://www.example.com/', slug: 'mona-7fk2' });

  assert.equal(SEPARATOR, ' :: ');
  assert.equal(line, 'https://www.example.com/ :: mona-7fk2');
  assert.ok(line.includes(' :: '));
});

test('slugs are base62 with a mona- prefix', () => {
  assert.equal(toBase62(1), '1');
  assert.equal(toBase62(61), 'Z');
  assert.equal(toBase62(62), '10');
  assert.equal(toBase62(-5), '0');
  assert.equal(slugFromCounter(62), 'mona-10');
  assert.match(createSlug([]).slug, /^mona-[0-9a-zA-Z]+$/);
});

test('the stored counter survives missing or junk values', () => {
  assert.equal(parseCounter('7'), 7);
  assert.equal(parseCounter(null), 0);
  assert.equal(parseCounter('nope', 3), 3);
  assert.equal(parseCounter('-2', 4), 4);
});

test('serialize and parse round-trip cleanly', () => {
  const bookmarks = [
    { url: 'https://example.com/', slug: 'mona-1' },
    { url: 'https://second.dev/', slug: 'mona-2' },
  ];

  assert.deepEqual(parseBookmarks(serializeBookmarks(bookmarks)), bookmarks);
});
