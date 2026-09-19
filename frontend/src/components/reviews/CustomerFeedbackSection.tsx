import React, { useEffect, useState } from 'react';
import {
  getArtisanFeedback,
  getArtisanFeedbackInsight,
  ArtisanFeedbackResponse,
  ArtisanInsightResponse,
} from '../../services/reviewService.js';
import { Star, ThumbsUp, AlertTriangle, Sparkles, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';

interface CustomerFeedbackSectionProps {
  productId: string;
}

export const CustomerFeedbackSection: React.FC<CustomerFeedbackSectionProps> = ({ productId }) => {
  const [feedbackData, setFeedbackData] = useState<ArtisanFeedbackResponse | null>(null);
  const [insightData, setInsightData] = useState<ArtisanInsightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadFeedback() {
      try {
        setLoading(true);
        setError(null);
        const [fb, ins] = await Promise.all([
          getArtisanFeedback(productId),
          getArtisanFeedbackInsight(productId),
        ]);
        if (isMounted) {
          setFeedbackData(fb);
          setInsightData(ins);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load customer feedback');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (productId) {
      loadFeedback();
    }
    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="bg-[#121638]/60 border border-slate-800 rounded-xl p-6 flex items-center justify-center space-x-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        <span>Loading customer feedback & insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#121638]/60 border border-red-900/40 rounded-xl p-6 text-red-300 flex items-center space-x-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const stats = feedbackData?.stats;
  const insight = insightData?.insight;
  const total = stats?.total_reviews ?? 0;
  const avg = stats?.average_rating ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            Customer Feedback
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real customer ratings, verified purchase reviews, and grounded AI insights.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>VERIFIED PURCHASES ONLY</span>
        </div>
      </div>

      {/* VERIFIED STATS HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Rating Box */}
        <div className="bg-[#0f1330] border border-slate-800 rounded-xl p-5 flex flex-col justify-center items-center text-center">
          <span className="text-4xl font-extrabold text-amber-400">{avg > 0 ? avg.toFixed(1) : 'N/A'}</span>
          <div className="flex items-center space-x-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(avg)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-800 text-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {total === 0
              ? 'No customer feedback yet'
              : `${total} verified review${total === 1 ? '' : 's'}`}
          </span>
          {stats && stats.positive_percentage > 0 && (
            <span className="mt-2 text-xs text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-800/40">
              {stats.positive_percentage}% positive feedback
            </span>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="bg-[#0f1330] border border-slate-800 rounded-xl p-5 md:col-span-2 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            VERIFIED RATING DISTRIBUTION
          </h4>
          {[5, 4, 3, 2, 1].map((starCount) => {
            const count = stats?.rating_distribution?.[starCount as 1 | 2 | 3 | 4 | 5] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={starCount} className="flex items-center space-x-3 text-xs">
                <span className="w-12 text-slate-300 font-medium flex items-center gap-1">
                  {starCount} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* M63 GROUNDED AI INSIGHT (CLEARLY DISTINGUISHED) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-950/30 via-[#131942] to-indigo-950/40 border border-amber-500/30 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                M63 AI INSIGHT
              </h3>
              <p className="text-[11px] text-amber-400/70">Strictly grounded in verified customer feedback</p>
            </div>
          </div>
          {insight && (
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                insight.confidence === 'HIGH'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                  : insight.confidence === 'MEDIUM'
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {insight.confidence} CONFIDENCE
            </span>
          )}
        </div>

        {/* Insight Summary */}
        <p className="text-sm text-slate-200 leading-relaxed font-normal mb-5 italic border-l-2 border-amber-400 pl-4 py-1">
          "{insight?.summary || 'No customer feedback available yet.'}"
        </p>

        {/* Positive & Improvement Bullet Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* What Customers Liked */}
          <div className="bg-[#0b0e26]/70 rounded-lg p-4 border border-emerald-900/30">
            <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
              <ThumbsUp className="w-4 h-4 text-emerald-400" />
              What customers liked
            </h4>
            {insight && insight.positive_themes.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-300">
                {insight.positive_themes.map((theme, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400">•</span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">No specific positive highlights identified yet.</p>
            )}
          </div>

          {/* Areas for Improvement */}
          <div className="bg-[#0b0e26]/70 rounded-lg p-4 border border-amber-900/30">
            <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Areas mentioned for improvement
            </h4>
            {insight && insight.improvement_themes.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-300">
                {insight.improvement_themes.map((theme, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400">•</span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">No specific areas for improvement reported.</p>
            )}
          </div>
        </div>

        {/* Evidence & Limitations Footer */}
        {insight && insight.limitations && insight.limitations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Based on {insight.evidence_count} verified customer review{insight.evidence_count === 1 ? '' : 's'}.</span>
            <span className="text-amber-400/80 italic">{insight.limitations[0]}</span>
          </div>
        )}
      </div>

      {/* RECENT VERIFIED CUSTOMER REVIEWS */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          RECENT VERIFIED REVIEWS ({stats?.recent_reviews?.length ?? 0})
        </h3>
        {!stats?.recent_reviews || stats.recent_reviews.length === 0 ? (
          <div className="bg-[#0f1330] border border-slate-800/80 rounded-xl p-6 text-center text-slate-500 text-sm">
            No customer reviews submitted for this product yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.recent_reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-[#0f1330] border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-800 text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {rev.review_text && (
                    <p className="text-xs text-slate-200 line-clamp-3 mb-3 leading-relaxed">
                      "{rev.review_text}"
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {rev.customer_name || 'Verified Customer'}
                  </span>
                  <span className="text-slate-400 text-[10px]">Verified Purchase</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
