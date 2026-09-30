import React, { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { uploadCustomerPhoto } from '../../services/engagementService.js';

/** Up to `max` customer photos, uploaded immediately; returns stored URLs via onChange. */
export const PhotoPicker: React.FC<{ value: string[]; onChange: (urls: string[]) => void; max?: number; onBusy?: (busy: boolean) => void }> = ({
  value,
  onChange,
  max = 3,
  onBusy,
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    onBusy?.(true);
    const next = [...value];
    try {
      for (const f of Array.from(files).slice(0, max - value.length)) {
        if (f.size > 10 * 1024 * 1024) throw new Error('Each photo must be under 10 MB.');
        next.push(await uploadCustomerPhoto(f));
        onChange([...next]);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not upload the photo.');
    } finally {
      setBusy(false);
      onBusy?.(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {value.map((u) => (
          <span key={u} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: '#f1ece4' }}>
            <img src={u} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(value.filter((x) => x !== u))}
              style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'grid', placeItems: 'center', border: 0, cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          </span>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            style={{ width: 72, height: 72, borderRadius: 10, border: '1.5px dashed #a8a29e', background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#57534e', fontSize: 11, fontWeight: 600 }}
          >
            {busy ? 'Uploading…' : (
              <span style={{ display: 'grid', placeItems: 'center', gap: 2 }}>
                <Camera size={20} />
                Add photo
              </span>
            )}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
      {error && <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
};
