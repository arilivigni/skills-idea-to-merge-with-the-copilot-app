/**
 * Pure helpers for Mona's Bookmark Manager App.
 *
 * Nothing in this module touches the DOM or browser storage, so it is safe to
 * import from the client boundary in `Bookmarks.astro` and from unit tests that
 * run in plain Node. The component owns all `localStorage` access.
 */

export type Bookmark = {
  url: string;
  slug: string;
};

export const STORAGE_KEY = 'mona-bookmarks';
export const COUNTER_KEY = 'mona-bookmarks-counter';
export const SLUG_PREFIX = 'mona-';
export const SEPARATOR = ' :: ';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

export function toBase62(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  let remaining = Math.floor(value);
  let out = '';
  while (remaining > 0) {
    out = BASE62[remaining % 62] + out;
    remaining = Math.floor(remaining / 62);
  }
  return out;
}

/**
 * Accepts what a person actually types — with or without a scheme — and returns
 * a canonical absolute URL, or `null` when the input can't be a web link.
 */
export function normalizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname;
  if (!host) return null;
  if (!host.includes('.') && host !== 'localhost') return null;

  return parsed.href;
}

export function isBookmark(value: unknown): value is Bookmark {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { url, slug } = value as Record<string, unknown>;
  return typeof url === 'string' && url.trim() !== '' && typeof slug === 'string' && slug.trim() !== '';
}

export function slugFromCounter(counter: number): string {
  return `${SLUG_PREFIX}${toBase62(counter)}`;
}

/** Picks the next unused slug, skipping any already taken by `existing`. */
export function createSlug(existing: readonly Bookmark[], startCounter?: unknown): { slug: string; counter: number } {
  const taken = new Set(existing.map((bookmark) => bookmark.slug));
  const parsed = typeof startCounter === 'number' && Number.isFinite(startCounter) ? Math.floor(startCounter) : NaN;
  let counter = Number.isNaN(parsed) || parsed < 0 ? existing.length : parsed;

  let slug: string;
  do {
    counter += 1;
    slug = slugFromCounter(counter);
  } while (taken.has(slug));

  return { slug, counter };
}

/**
 * Reads whatever was in storage and always returns a usable array.
 *
 * Storage is untrusted: it may be empty, corrupted, a legacy list of bare URL
 * strings, or not an array at all. Malformed entries are dropped rather than
 * thrown, so a bad value can never break the page.
 */
export function parseBookmarks(raw: unknown): Bookmark[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];

  const bookmarks: Bookmark[] = [];
  const taken = new Set<string>();

  for (const entry of data) {
    let candidate: Bookmark | null = null;

    if (isBookmark(entry)) {
      const url = normalizeUrl(entry.url);
      if (url) candidate = { url, slug: entry.slug.trim() };
    } else if (typeof entry === 'string') {
      // Legacy shape: a plain list of URLs saved before slugs existed.
      const url = normalizeUrl(entry);
      if (url) candidate = { url, slug: createSlug(bookmarks).slug };
    }

    if (!candidate || taken.has(candidate.slug)) continue;
    taken.add(candidate.slug);
    bookmarks.push(candidate);
  }

  return bookmarks;
}

export function parseCounter(raw: unknown, fallback = 0): number {
  const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** The exact visible line for a saved bookmark: `<url> :: <slug>`. */
export function formatBookmark(bookmark: Bookmark): string {
  return `${bookmark.url}${SEPARATOR}${bookmark.slug}`;
}

export function serializeBookmarks(bookmarks: readonly Bookmark[]): string {
  return JSON.stringify(bookmarks.map(({ url, slug }) => ({ url, slug })));
}
