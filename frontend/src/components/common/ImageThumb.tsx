import type { ReactNode } from 'react';
import { useStoredImageUrl, type StoredImageFetcher } from '@/lib/imageUpload';

interface ImageThumbProps {
  value?: string | null;
  fetchBlob?: StoredImageFetcher;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}

/** Renders a stored image (file name, data URL or external URL) as an <img>. */
export default function ImageThumb({ value, fetchBlob, alt, className, fallback }: ImageThumbProps) {
  const url = useStoredImageUrl(value, fetchBlob);

  if (!url) return <>{fallback ?? null}</>;

  return <img src={url} alt={alt} className={className} />;
}
