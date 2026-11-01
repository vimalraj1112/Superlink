import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fileToCompressedDataUrl,
  useStoredImageUrl,
  IMAGE_ACCEPT,
  type StoredImageFetcher,
} from '@/lib/imageUpload';

interface ImageUploadFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Required to preview an already-saved image (stored as a file name). */
  fetchBlob?: StoredImageFetcher;
  helpText?: string;
  error?: string;
  required?: boolean;
}

export default function ImageUploadField({
  label = 'Photo',
  value,
  onChange,
  fetchBlob,
  helpText = 'PNG, JPG or WebP — resized automatically',
  error,
  required,
}: ImageUploadFieldProps) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useStoredImageUrl(value, fetchBlob);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
    } catch (err: any) {
      toast.error(err?.message || 'Could not process the image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {preview ? (
        <div className="flex flex-wrap items-start gap-4">
          <a
            href={preview}
            target="_blank"
            rel="noreferrer"
            title="Open full size"
            className="block rounded-lg border border-gray-200 overflow-hidden bg-slate-50"
          >
            <img src={preview} alt={label} className="h-32 w-auto max-w-xs object-contain" />
          </a>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn btn-secondary text-sm"
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={busy}
              className="btn btn-secondary text-sm text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-slate-50 transition-colors"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing image…
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-gray-500">
              <ImagePlus className="w-6 h-6 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Upload photo</span>
              <span className="text-xs">{helpText}</span>
            </span>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
