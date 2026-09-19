import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  fetchArtisanAnalytics,
  TimePeriod,
  CalculatedAnalytics,
  BusinessInsight,
} from '../services/analyticsService.js';
import { AnalyticsLang } from '../components/analytics/analyticsTranslations.js';

/* v2 UI */
import { DeckHeader } from '../components/analytics/v2/DeckHeader.js';
import { DeckSkeleton } from '../components/analytics/v2/DeckSkeleton.js';
import { MomentumPanel } from '../components/analytics/v2/MomentumPanel.js';
import { KpiRail } from '../components/analytics/v2/KpiRail.js';
import { ProductsPanel, CategoryPanel } from '../components/analytics/v2/RankingPanels.js';
import { StockPanel, FulfilmentPanel } from '../components/analytics/v2/OperationsPanels.js';
import { InsightsPanel } from '../components/analytics/v2/InsightsPanel.js';
import { buildView, buildStory } from '../components/analytics/v2/analyticsAdapter.js';
import { t, periodText } from '../components/analytics/v2/copy.js';

/* kept from your project: method explanation + trust content + summary strip */
import { DataTrustMatrix } from '../components/analytics/DataTrustMatrix.js';
import { BusinessSnapshotStrip } from '../components/analytics/BusinessSnapshotStrip.js';
import { CalculationModal } from '../components/analytics/CalculationModal.js';

import '../styles/analytics-dark.css';
import '../styles/analytics-v2.css';

export const AnalyticsPage: React.FC = () => {
  /* ---------------- DATA LAYER: identical to the original page ---------------- */
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [lang, setLang] = useState<AnalyticsLang>('en');
  const [analytics, setAnalytics] = useState<CalculatedAnalytics | null>(null);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadAnalytics();
  }, [period, lang]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchArtisanAnalytics(period, lang);
      setAnalytics(data.analytics);
      setInsights(data.insights);
    } catch (err: any) {
      setError(err.message || 'Unable to load business intelligence metrics.');
    } finally {
      setLoading(false);
    }
  };
  /* ----------------------------------------------------------------------------- */

  // Pure presentation: reshapes what the backend returned, never alters it.
  const view = useMemo(() => (analytics ? buildView(analytics, insights as any[]) : null), [analytics, insights]);
  const story = useMemo(() => (view ? buildStory(view, lang) : ''), [view, lang]);
  const pLabel = periodText(String(period), lang);

  return (
    <div className="ix-root">
      <div className="ix-wrap">
        <DeckHeader
          period={period}
          setPeriod={setPeriod}
          lang={lang}
          setLang={setLang}
          onOpenCalculationModal={() => setIsModalOpen(true)}
          onRefresh={loadAnalytics}
          loading={loading}
          story={loading ? '' : story}
        />

        {loading ? (
          <DeckSkeleton message={t('loading', lang)} />
        ) : error ? (
          <div className="ix-error" role="alert">
            <AlertCircle size={34} />
            <h3>{error}</h3>
            <button className="ix-btn" onClick={loadAnalytics}>
              <RefreshCw size={15} /> {t('retry', lang)}
            </button>
          </div>
        ) : view ? (
          <div className="ix-grid">
            <MomentumPanel className="ix-c-mom" view={view} periodLabel={pLabel} lang={lang} />
            <KpiRail className="ix-c-rail" view={view} lang={lang} />

            <ProductsPanel className="ix-c-prod" view={view} lang={lang} />
            <CategoryPanel className="ix-c-cat" view={view} lang={lang} />

            <StockPanel className="ix-c-stock" view={view} lang={lang} />
            <FulfilmentPanel className="ix-c-ful" view={view} lang={lang} />

            <InsightsPanel className="ix-c-ins" insights={view.insights} lang={lang} />

            {analytics && (
              <div className="ix-c-legacy">
                <BusinessSnapshotStrip analytics={analytics} lang={lang} />
                <DataTrustMatrix lang={lang} />
              </div>
            )}
          </div>
        ) : null}
      </div>

      <CalculationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};