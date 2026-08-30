import { apiRequest } from './api.js';

export type TimePeriod = '7d' | '30d' | '90d' | 'this_year' | 'all_time';

export interface KPIMetrics {
  total_revenue: number;
  total_orders: number;
  units_sold: number;
  average_order_value: number;
  active_products: number;
  available_stock: number;
}

export interface PeriodComparison {
  revenue_change_percent: number | null;
  orders_change_percent: number | null;
  units_change_percent: number | null;
  comparison_label: string;
}

export interface TrendPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformanceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  units_sold: number;
  revenue: number;
  order_count: number;
  sales_share_percent: number;
  sales_velocity_per_day: number;
  estimated_days_of_stock_remaining: number | null;
  tags: Array<'BEST_SELLER' | 'FAST_MOVER' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'BEST_SELLER_LOW_STOCK'>;
}

export interface CategoryPerformanceItem {
  category: string;
  revenue: number;
  units_sold: number;
  order_count: number;
  product_count: number;
  revenue_share_percent: number;
}

export interface InventoryHealthSummary {
  healthy_count: number;
  low_stock_count: number;
  critical_count: number;
  out_of_stock_count: number;
  bestseller_low_stock_count: number;
  low_stock_products: ProductPerformanceItem[];
}

export interface FulfilmentDistribution {
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  cancellation_rate_percent: number;
  cancellation_explanation: string;
}

export interface CalculatedAnalytics {
  period: TimePeriod;
  date_range: {
    start: string;
    end: string;
  };
  kpis: KPIMetrics;
  comparison: PeriodComparison;
  revenue_trend: TrendPoint[];
  order_trend: TrendPoint[];
  product_performance: ProductPerformanceItem[];
  category_performance: CategoryPerformanceItem[];
  inventory_health: InventoryHealthSummary;
  fulfilment: FulfilmentDistribution;
  has_data: boolean;
}

export interface BusinessInsight {
  id: string;
  type: 'SALES' | 'PRODUCT' | 'INVENTORY' | 'CATEGORY' | 'TREND' | 'OPERATIONAL' | 'OPPORTUNITY' | 'WARNING';
  title: string;
  message: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  trust_level: 'VERIFIED' | 'OBSERVED' | 'INFERRED' | 'UNAVAILABLE';
  evidence: Array<{ metric: string; value: string }>;
  recommendation?: string;
  limitations?: string[];
}

export interface AnalyticsResponseData {
  analytics: CalculatedAnalytics;
  insights: BusinessInsight[];
}

export async function fetchArtisanAnalytics(
  period: TimePeriod = '30d',
  lang: 'en' | 'ta' | 'hi' = 'en'
): Promise<AnalyticsResponseData> {
  const res = await apiRequest<AnalyticsResponseData>(`/analytics/artisan?period=${period}&lang=${lang}`, {
    method: 'GET',
  });
  return res;
}
