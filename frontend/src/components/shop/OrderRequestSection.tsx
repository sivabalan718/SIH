import React, { useEffect, useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { OrderRecord } from '../../services/orderService.js';
import { createOrderRequest, fetchMyRequests, fetchRequestOptions, OrderRequest, RequestType } from '../../services/engagementService.js';
import { formatINR } from '../../utils/shopStore.js';
import { PhotoPicker } from './PhotoPicker.js';

const STATUS_TEXT: Record<OrderRequest['status'], { label: string; tone: string }> = {
  REQUESTED: { label: 'Waiting for the artisan', tone: 'tone-warn' },
  APPROVED: { label: 'Approved by the artisan', tone: 'tone-info' },
  REJECTED: { label: 'Declined', tone: 'tone-bad' },
  COMPLETED: { label: 'Completed', tone: 'tone-ok' },
};

/** Return / replacement requests for a delivered order (customer side). */
export const OrderRequestSection: React.FC<{ order: OrderRecord }> = ({ order }) => {
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [options, setOptions] = useState<{ reasons: string[]; window_days: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RequestType>('REPLACEMENT');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRequests().then((all) => setRequests(all.filter((r) => r.order_id === order.id))).catch(() => setRequests([]));
    fetchRequestOptions().then(setOptions).catch(() => setOptions(null));
  }, [order.id]);

  if (order.status !== 'DELIVERED' || !options) return null;
  const openRequest = requests.find((r) => r.status === 'REQUESTED' || r.status === 'APPROVED');
  const deliveredAt = new Date(order.delivered_at || order.updated_at).getTime();
  const closesAt = deliveredAt + options.window_days * 86400000;
  const withinWindow = Date.now() < closesAt;

  const submit = async () => {
    setError(null);
    if (!reason) return setError('Choose a reason.');
    if (reason === 'Other' && details.trim().length < 10) return setError('Please describe the problem.');
    setSubmitting(true);
    try {
      const created = await createOrderRequest(order.id, { type, reason, details: details.trim() || undefined, photo_urls: photos });
      setRequests((prev) => [created, ...prev]);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Could not submit the request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="co-section no-print">
      <h2 className="pdp__h">Returns & replacements</h2>

      {requests.map((r) => (
        <div key={r.id} className="notice notice--info" style={{ margin: '0 0 10px', display: 'block' }}>
          <strong>
            {r.type === 'REFUND' ? 'Refund' : 'Replacement'} request · <span className={STATUS_TEXT[r.status].tone}>{STATUS_TEXT[r.status].label}</span>
          </strong>
          <div style={{ fontSize: '0.84rem', marginTop: 4 }}>Reason: {r.reason}</div>
          {r.artisan_note && <div style={{ fontSize: '0.84rem', marginTop: 4 }}>Artisan: “{r.artisan_note}”</div>}
          {r.status === 'COMPLETED' && r.refund_amount != null && (
            <div style={{ fontSize: '0.84rem', marginTop: 4 }}>
              Refunded {formatINR(r.refund_amount)}
              {r.refund_id ? ' to your original payment method (usually 5–7 working days).' : ' directly by the artisan.'}
            </div>
          )}
        </div>
      ))}

      {!openRequest && withinWindow && !open && (
        <button className="list-row" onClick={() => setOpen(true)}>
          <span>
            <RotateCcw size={17} style={{ verticalAlign: '-3px', marginRight: 8 }} />
            Return or replace this order
            <span className="pcard__meta" style={{ display: 'block' }}>
              Available until {new Date(closesAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
            </span>
          </span>
          <ChevronRight size={18} />
        </button>
      )}
      {!openRequest && !withinWindow && requests.length === 0 && (
        <p className="pcard__meta" style={{ whiteSpace: 'normal' }}>
          The {options.window_days}-day return window closed on {new Date(closesAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      )}

      {open && (
        <div>
          <div className="co-sub">What would you like?</div>
          {(['REPLACEMENT', 'REFUND'] as RequestType[]).map((t) => (
            <button key={t} role="radio" aria-checked={type === t} className="opt" onClick={() => setType(t)}>
              <span className="opt__radio" />
              <span className="opt__body">
                <strong>{t === 'REPLACEMENT' ? 'Replacement' : 'Refund'}</strong>
                <small>{t === 'REPLACEMENT' ? 'The artisan sends you a new piece.' : `Money back${order.payment_method === 'ONLINE' ? ' to your original payment method' : ' from the artisan'}.`}</small>
              </span>
            </button>
          ))}
          <label className="field">
            Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ fontSize: 16, padding: '11px 12px', borderRadius: 10, border: '1px solid #d6d3d1', background: '#fff' }}>
              <option value="">Choose a reason</option>
              {options.reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Details {reason === 'Other' ? '' : '(optional)'}
            <textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell the artisan what happened" />
          </label>
          <div className="field">
            Photos (optional, up to 3)
            <PhotoPicker value={photos} onChange={setPhotos} onBusy={setUploading} />
          </div>
          {error && <p className="tone-bad" style={{ fontSize: '0.85rem', marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <button className="shop-btn shop-btn--ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="shop-btn shop-btn--dark" onClick={submit} disabled={submitting || uploading}>
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
