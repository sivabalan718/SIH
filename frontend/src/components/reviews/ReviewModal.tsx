import React, { useState } from 'react';
import { Star, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { submitReview } from '../../services/reviewService.js';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderItemId: string;
  orderId: string;
  productName: string;
  primaryImageUrl?: string | null;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderItemId,
  orderId,
  productName,
  primaryImageUrl,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await submitReview({
        order_item_id: orderItemId,
        rating,
        review_text: reviewText.trim() || undefined,
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  const getRatingLabel = (num: number) => {
    switch (num) {
      case 5:
        return '5 ★ — Excellent Craftsmanship';
      case 4:
        return '4 ★ — Very Good Quality';
      case 3:
        return '3 ★ — Average Product';
      case 2:
        return '2 ★ — Needs Improvement';
      case 1:
        return '1 ★ — Poor Experience';
      default:
        return 'Select a rating';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          padding: '24px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B',
          }}
          aria-label="Close review modal"
        >
          <X size={18} />
        </button>

        {submittedSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <CheckCircle size={48} style={{ color: '#10B981', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              ✓ Review submitted successfully
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '6px' }}>
              Your verified feedback helps the artisan refine their craft and guides future buyers.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✓ VERIFIED PURCHASE REVIEW
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0' }}>
                Rate & Review Product
              </h2>
            </div>

            {/* Product Item Info Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              {primaryImageUrl ? (
                <img
                  src={primaryImageUrl}
                  alt={productName}
                  style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px' }}
                />
              ) : (
                <div style={{ width: '44px', height: '44px', backgroundColor: '#FEF3C7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309', fontWeight: 800, fontSize: '0.8rem' }}>
                  M63
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {productName}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                  Order #{orderId.substring(0, 12)}
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div style={{ padding: '10px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#DC2626', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Interactive Star Rating Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                How would you rate this product? <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transform: displayRating >= star ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <Star
                      size={32}
                      fill={star <= displayRating ? '#F59E0B' : 'none'}
                      color={star <= displayRating ? '#F59E0B' : '#CBD5E1'}
                    />
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#D97706', display: 'block', marginTop: '6px' }}>
                {getRatingLabel(displayRating)}
              </span>
            </div>

            {/* Optional Review Text Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tell us about your experience <span style={{ fontWeight: 400, color: '#64748B' }}>(Optional)</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share feedback on craftsmanship, material finish, packaging, or delivery..."
                rows={4}
                maxLength={1000}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', textAlign: 'right', marginTop: '2px', fontWeight: 600 }}>
                {reviewText.length} / 1000
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} icon={submitting ? <Loader2 className="animate-spin" size={16} /> : undefined}>
                Submit Review
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
