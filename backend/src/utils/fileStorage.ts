import fs from 'fs';
import path from 'path';

/**
 * Payment receipt/screenshot uploads.
 *
 * Files are written under `<cwd>/uploads/payments` (the backend is always run
 * from the backend directory — see `dotenv.config()` in config/env.ts). The DB
 * only ever stores the generated file name; the bytes never go into a column.
 */
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'payments');

/** Decoded byte ceiling (~6.9 MB once base64-encoded, inside the 10 MB body limit). */
const MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isDataUrlImage(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(value);
}

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Decode a `data:image/…;base64,…` string and write it to disk.
 * Returns the generated file name to store in the DB — never a client-supplied one.
 */
export function savePaymentReceipt(dataUrl: string, prefix = 'pay'): string {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error('Invalid image data');

  const ext = MIME_EXT[match[1].toLowerCase()];
  if (!ext) throw new Error('Unsupported image type');

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw new Error('Empty image data');
  if (buffer.length > MAX_BYTES) throw new Error('Image is too large (maximum 5 MB)');

  ensureUploadDir();
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'pay';
  const fileName = `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
  return fileName;
}

/** Absolute path of a stored receipt. Basename-ing guards against path traversal. */
export function paymentReceiptPath(fileName: string): string {
  return path.join(UPLOAD_DIR, path.basename(fileName));
}

export function receiptContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

/** Best-effort removal of a stored receipt; never throws. */
export function deletePaymentReceipt(fileName?: string | null): void {
  if (!fileName) return;
  const full = paymentReceiptPath(fileName);
  if (path.dirname(full) !== UPLOAD_DIR) return;
  fs.promises.unlink(full).catch(() => {
    /* already gone — nothing to do */
  });
}
