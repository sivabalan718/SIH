import React, { useState } from 'react';
import { Star, X, CheckCircle, AlertCircle } from 'lucide-react';
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
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

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
        >
          <X size={18} />
        </button>

        {submittedSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <CheckCircle size={48} style={{ color: '#10B981', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Thank you for your feedback!
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '6px' }}>
              Your verified review helps the artisan refine their craft and guides future buyers.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                VERIFIED PURCHASE REVIEW
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
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
                <div style={{ width: '44px', height: '44px', backgroundColor: '#CBD5E1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 700, fontSize: '0.8rem' }}>
                  M63
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {productName}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                  Order: #{orderId.substring(0, 12)}
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

            {/* Star Rating Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Overall Rating <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
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
                <span style={{ marginLeft: '8px', fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', alignSelf: 'center' }}>
                  {displayRating === 5 ? '5 ★ (Excellent)' : displayRating === 4 ? '4 ★ (Very Good)' : displayRating === 3 ? '3 ★ (Average)' : displayRating === 2 ? '2 ★ (Fair)' : '1 ★ (Poor)'}
                </span>
              </div>
            </div>

            {/* Review Text Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                How was your experience with this product? <span style={{ fontWeight: 400, color: '#64748B' }}>(Optional)</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share details about craftsmanship, finish, delivery, or packaging..."
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
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', textAlign: 'right', marginTop: '2px' }}>
                {reviewText.length}/1000 characters
              </span>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Submit Review
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
