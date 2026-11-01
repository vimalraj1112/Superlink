import fs from 'fs';
import path from 'path';

/**
 * Image uploads.
 *
 * Files are written under `<cwd>/uploads/...` (the backend is always run from
 * the backend directory — see `dotenv.config()` in config/env.ts). The DB only
 * ever stores the generated file name; the bytes never go into a column.
 *
 * Payment receipts live in `uploads/payments`; photos attached to sites, ISPs
 * and credentials live in `uploads/images`.
 */
const PAYMENT_DIR = path.resolve(process.cwd(), 'uploads', 'payments');
const IMAGE_DIR = path.resolve(process.cwd(), 'uploads', 'images');

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

/** True for an image that is hosted elsewhere rather than stored by us. */
export function isExternalImageUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function decodeImage(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error('Invalid image data');

  const ext = MIME_EXT[match[1].toLowerCase()];
  if (!ext) throw new Error('Unsupported image type');

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw new Error('Empty image data');
  if (buffer.length > MAX_BYTES) throw new Error('Image is too large (maximum 5 MB)');

  return { buffer, ext };
}

/**
 * Decode a `data:image/…;base64,…` string and write it to disk.
 * Returns the generated file name to store in the DB — never a client-supplied one.
 */
function saveImage(dir: string, dataUrl: string, prefix: string, fallbackPrefix: string): string {
  const { buffer, ext } = decodeImage(dataUrl);

  fs.mkdirSync(dir, { recursive: true });
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || fallbackPrefix;
  const fileName = `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return fileName;
}

/** Absolute path of a stored file. Basename-ing guards against path traversal. */
function filePathIn(dir: string, fileName: string): string {
  return path.join(dir, path.basename(fileName));
}

export function imageContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

/** Best-effort removal of a stored file; never throws. */
function deleteFileIn(dir: string, fileName?: string | null): void {
  if (!fileName) return;
  const full = filePathIn(dir, fileName);
  if (path.dirname(full) !== dir) return;
  fs.promises.unlink(full).catch(() => {
    /* already gone — nothing to do */
  });
}

// ---------------------------------------------------------------------------
// Payment receipts
// ---------------------------------------------------------------------------

export function savePaymentReceipt(dataUrl: string, prefix = 'pay'): string {
  return saveImage(PAYMENT_DIR, dataUrl, prefix, 'pay');
}

export function paymentReceiptPath(fileName: string): string {
  return filePathIn(PAYMENT_DIR, fileName);
}

export function receiptContentType(fileName: string): string {
  return imageContentType(fileName);
}

export function deletePaymentReceipt(fileName?: string | null): void {
  deleteFileIn(PAYMENT_DIR, fileName);
}

// ---------------------------------------------------------------------------
// Site / ISP / credential photos
// ---------------------------------------------------------------------------

export function saveEntityImage(dataUrl: string, prefix = 'img'): string {
  return saveImage(IMAGE_DIR, dataUrl, prefix, 'img');
}

export function entityImagePath(fileName: string): string {
  return filePathIn(IMAGE_DIR, fileName);
}

export function deleteEntityImage(fileName?: string | null): void {
  // Never try to unlink an external URL (e.g. an ISP logo hosted elsewhere).
  if (isExternalImageUrl(fileName)) return;
  deleteFileIn(IMAGE_DIR, fileName);
}
