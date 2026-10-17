import { useEffect, useState } from 'react';
import { paymentApi } from '@/api/endpoints';

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const RECEIPT_ACCEPT = 'image/png,image/jpeg,image/webp';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image'));
    img.src = src;
  });
}

/**
 * Downscale an image in the browser and return a base64 data URL, so a 3–5 MB
 * phone screenshot becomes a few hundred KB before it is ever uploaded.
 * PNG stays PNG (crisp text); everything else is re-encoded as JPEG.
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Please choose a PNG, JPG or WebP image');
  }

  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return original;

  if (file.type === 'image/png') {
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  }

  // JPEG has no alpha — paint white first so transparent pixels don't go black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Resolves a payment's stored screenshot to a displayable URL. A freshly picked
 * file is already a data URL; an existing one is fetched as a blob (the axios
 * instance attaches the auth token, which a plain <img src> could not).
 * Returns `undefined` while loading or when there is no receipt.
 */
export function useReceiptPreview(
  paymentId: string | undefined,
  receipt: string | undefined | null
): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!receipt) {
      setUrl(undefined);
      return;
    }

    // Just-picked file — show it directly.
    if (receipt.startsWith('data:')) {
      setUrl(receipt);
      return;
    }

    if (!paymentId) {
      setUrl(undefined);
      return;
    }

    let objectUrl: string | undefined;
    let cancelled = false;

    paymentApi
      .getReceipt(paymentId)
      .then(res => {
        const blobUrl = URL.createObjectURL(res.data as Blob);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        setUrl(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(undefined);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [paymentId, receipt]);

  return url;
}
