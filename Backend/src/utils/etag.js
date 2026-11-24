import crypto from 'node:crypto';

export const generateETag = (data) => {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
};

const stripWeakPrefix = (tag) => (tag.startsWith('W/') ? tag.slice(2) : tag);

/**
 * Evaluates an HTTP If-None-Match header against a strong ETag.
 * Supports '*', comma-separated lists, and weak comparison (W/ prefix).
 */
export const matchesIfNoneMatch = (headerValue, etag) => {
  if (!headerValue || typeof headerValue !== 'string') return false;
  const trimmed = headerValue.trim();
  if (trimmed === '*') return true;

  const target = stripWeakPrefix(etag);
  return trimmed
    .split(',')
    .map((part) => stripWeakPrefix(part.trim()))
    .some((candidate) => candidate === target);
};
