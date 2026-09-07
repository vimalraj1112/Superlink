/**
 * Convert backend validation details into a { field: message } map
 * that form error states (Record<string, string>) can render directly.
 *
 * Backend shape (from middleware/validate.ts):
 *   details: [{ field: 'body.customerCode', message: '...', code: '...' }]
 *
 * The `body.`/`query.`/`params.` prefix is stripped so it matches the
 * per-field keys the forms use (e.g. errors.customerCode).
 */
export function mapFieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};

  const mapped: Record<string, string> = {};
  for (const d of details) {
    if (!d || typeof d !== 'object' || !('field' in d)) continue;
    const field = String(d.field).replace(/^(body|query|params)\./, '');
    if (!field) continue;
    mapped[field] = (d as { message?: string }).message || 'Invalid value';
  }
  return mapped;
}