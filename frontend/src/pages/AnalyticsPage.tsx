import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  fetchArtisanAnalytics,
  TimePeriod,
  CalculatedAnalytics,
  BusinessInsight,
} from '../services/analyticsService.js';
import { AnalyticsHeader } from '../components/analytics/AnalyticsHeader.js';
import { KPIStrip } from '../components/analytics/KPIStrip.js';
import { RevenueTrendChart } from '../components/analytics/RevenueTrendChart.js';
import { OrderActivityChart } from '../components/analytics/OrderActivityChart.js';
import { TopProductsTable } from '../components/analytics/TopProductsTable.js';
import { CategoryPerformanceDonut } from '../components/analytics/CategoryPerformanceDonut.js';
import { InventoryIntelligenceCard } from '../components/analytics/InventoryIntelligenceCard.js';
import { OrderStatusOverviewCard } from '../components/analytics/OrderStatusOverviewCard.js';
import { BusinessAdvisorSection } from '../components/analytics/BusinessAdvisorSection.js';
import { DataTrustMatrix } from '../components/analytics/DataTrustMatrix.js';
import { BusinessSnapshotStrip } from '../components/analytics/BusinessSnapshotStrip.js';
import { CalculationModal } from '../components/analytics/CalculationModal.js';
import { AnalyticsLang } from '../components/analytics/analyticsTranslations.js';
import '../styles/analytics-dark.css';

export const AnalyticsPage: React.FC = () => {
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

  return (
    <div className="m63-bi-workspace">
      <div className="m63-bi-container">
        {/* HEADER */}
        <AnalyticsHeader
          period={period}
          setPeriod={setPeriod}
          lang={lang}
          setLang={setLang}
          onOpenCalculationModal={() => setIsModalOpen(true)}
        />

        {loading ? (
          /* Polished Loading State */
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--m63-bi-orange)' }}>
              <Loader2 size={22} className="animate-spin" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--m63-bi-text-subtle)' }}>
                {lang === 'ta' ? 'M63 வணிக நுண்ணறிவு மையம் ஏற்றப்படுகிறது...' : lang === 'hi' ? 'M63 व्यापार विश्लेषण केंद्र लोड हो रहा है...' : 'Loading M63 Business Intelligence Command Centre...'}
              </span>
            </div>
          </div>
        ) : error ? (
          /* Error Retry State */
          <div className="m63-bi-card" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--m63-bi-red)' }}>
            <AlertCircle size={32} style={{ color: 'var(--m63-bi-red)', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--m63-bi-text-main)', margin: 0 }}>{error}</h3>
            <button
              onClick={loadAnalytics}
              style={{
                marginTop: '14px',
                padding: '8px 16px',
                backgroundColor: 'var(--m63-bi-orange)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        ) : analytics ? (
          <>
            {/* ROW 1: FOUR COMPACT KPI TILES */}
            <KPIStrip analytics={analytics} lang={lang} />

            {/* ROW 2: REVENUE + ORDER TREND (2 COLUMNS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <RevenueTrendChart trendData={analytics.revenue_trend} totalRevenue={analytics.kpis.total_revenue} period={period} lang={lang} />
              <OrderActivityChart trendData={analytics.revenue_trend} totalOrders={analytics.kpis.total_orders} period={period} lang={lang} />
            </div>

            {/* ROW 3: TOP PRODUCTS + CATEGORY CONTRIBUTION (2 COLUMNS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2 / span 2' }}>
                <TopProductsTable products={analytics.product_performance} lang={lang} />
              </div>
              <div>
                <CategoryPerformanceDonut
                  categories={analytics.category_performance}
                  totalRevenue={analytics.kpis.total_revenue}
                  lang={lang}
                />
              </div>
            </div>

            {/* ROW 4: INVENTORY HEALTH + FULFILMENT STATUS (2 COLUMNS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <InventoryIntelligenceCard inventory={analytics.inventory_health} lang={lang} />
              <OrderStatusOverviewCard fulfilment={analytics.fulfilment} lang={lang} />
            </div>

            {/* ROW 5: M63 AI BUSINESS INSIGHTS (HERO AI WORKSPACE) */}
            <BusinessAdvisorSection insights={insights} lang={lang} />

            {/* ROW 6: DATA TRUST & AUDIT MATRIX */}
            <DataTrustMatrix lang={lang} />

            {/* FOOTER STRIP: EXECUTIVE SNAPSHOT */}
            <BusinessSnapshotStrip analytics={analytics} lang={lang} />
          </>
        ) : null}
      </div>

      {/* EXPLAINABILITY MODAL */}
      <CalculationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
