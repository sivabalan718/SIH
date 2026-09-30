import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { fetchArtisanRequests, OrderRequest, updateArtisanRequest } from '../../services/engagementService.js';

const STATUS_STYLE: Record<OrderRequest['status'], { bg: string; fg: string; label: string }> = {
  REQUESTED: { bg: '#FEF3C7', fg: '#92400E', label: 'New request' },
  APPROVED: { bg: '#DBEAFE', fg: '#1E40AF', label: 'Approved' },
  REJECTED: { bg: '#FEE2E2', fg: '#991B1B', label: 'Declined' },
  COMPLETED: { bg: '#D1FAE5', fg: '#065F46', label: 'Completed' },
};

/** Customer refund / replacement requests for this artisan, with approve / decline / complete. */
export const ArtisanRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<OrderRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () =>
    fetchArtisanRequests()
      .then((r) => {
        setRequests(r);
        setError(null);
      })
      .catch((e) => setError(e?.message || 'Could not load requests.'));
  useEffect(() => {
    load();
  }, []);

  const act = async (r: OrderRequest, action: 'APPROVE' | 'REJECT' | 'COMPLETE') => {
    if (action === 'COMPLETE' && r.type === 'REFUND' && r.orders?.payment_method === 'ONLINE') {
      if (!window.confirm(`Refund ₹${Number(r.orders.total_amount).toLocaleString('en-IN')} to the customer through Razorpay?`)) return;
    }
    setBusy(r.id);
    try {
      const updated = await updateArtisanRequest(r.id, action, notes[r.id]);
      setRequests((prev) => (prev || []).map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
    } catch (e: any) {
      alert(e?.message || 'Could not update the request.');
    } finally {
      setBusy(null);
    }
  };

  if (error) return null; // feature not enabled yet (migration not run) — keep the orders page clean
  if (!requests || requests.length === 0) return null;
  const open = requests.filter((r) => r.status === 'REQUESTED' || r.status === 'APPROVED').length;

  return (
    <section style={{ background: '#fff', border: '1px solid var(--m63-border)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--m63-slate)', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
        <RotateCcw size={18} /> Customer requests {open > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 12 }}>{open} open</span>}
      </h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {requests.map((r) => {
          const s = STATUS_STYLE[r.status];
          return (
            <div key={r.id} style={{ border: '1px solid var(--m63-border)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--m63-slate)' }}>
                  {r.type === 'REFUND' ? 'Refund' : 'Replacement'} · {r.orders?.m63_order_number}
                </strong>
                <span style={{ background: s.bg, color: s.fg, borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{s.label}</span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--m63-slate-subtle)', margin: '6px 0' }}>
                {r.orders?.shipping_name} · {r.reason}
                {r.details ? ` — “${r.details}”` : ''}
              </p>
              {r.photo_urls?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {r.photo_urls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="Customer photo" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                    </a>
                  ))}
                </div>
              )}
              {r.status === 'COMPLETED' && r.refund_amount != null && (
                <p style={{ fontSize: '0.84rem', color: '#065F46', margin: '4px 0' }}>
                  Refunded ₹{Number(r.refund_amount).toLocaleString('en-IN')}
                  {r.refund_id ? ` via Razorpay (${r.refund_id})` : ' (cash on delivery — refund the customer directly)'}
                </p>
              )}
              {(r.status === 'REQUESTED' || r.status === 'APPROVED') && (
                <>
                  <input
                    value={notes[r.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                    placeholder={r.status === 'REQUESTED' ? 'Message to the customer (required to decline)' : 'Optional message (e.g. courier details)'}
                    maxLength={500}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--m63-border)', fontSize: 16, marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.status === 'REQUESTED' && (
                      <>
                        <button onClick={() => act(r, 'APPROVE')} disabled={busy === r.id} style={btn('#0F766E')}>
                          Approve
                        </button>
                        <button onClick={() => act(r, 'REJECT')} disabled={busy === r.id} style={btn('#B91C1C')}>
                          Decline
                        </button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <button onClick={() => act(r, 'COMPLETE')} disabled={busy === r.id} style={btn('#C85A28')}>
                        {r.type === 'REFUND' ? (r.orders?.payment_method === 'ONLINE' ? 'Issue refund' : 'Mark refunded') : 'Mark replacement sent'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 0, borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', minHeight: 40 });
