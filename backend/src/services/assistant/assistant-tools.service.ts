import { getArtisanAnalytics, TimePeriod } from '../analytics.service.js';
import { getProductsByArtisan } from '../product.service.js';
import { getArtisanOrders } from '../order.service.js';
import { getPricingRecord } from '../pricing.service.js';
import { AssistantIntent, BusinessDataResult } from './assistant.types.js';
import { logger } from '../../utils/logger.js';

export class AssistantToolsService {
  /**
   * Executes deterministic verified business tool scoped strictly to the authenticated artisan
   */
  async executeTool(
    artisanId: string,
    intent: AssistantIntent,
    period: TimePeriod = '30d',
    queryText?: string
  ): Promise<BusinessDataResult> {
    logger.info(`[AssistantTools] Executing tool for artisan=${artisanId}, intent=${intent}, period=${period}`);

    switch (intent) {
      case 'SALES_SUMMARY':
      case 'BUSINESS_ANALYTICS': {
        const analytics = await getArtisanAnalytics(artisanId, period);
        return {
          intent,
          period: analytics.period,
          data: {
            total_revenue: analytics.kpis.total_revenue,
            total_orders: analytics.kpis.total_orders,
            units_sold: analytics.kpis.units_sold,
            average_order_value: analytics.kpis.average_order_value,
            active_products: analytics.kpis.active_products,
            revenue_growth_percent: analytics.comparison.revenue_change_percent,
            comparison_label: analytics.comparison.comparison_label,
          },
          evidence: [
            { metric: 'Total Revenue', value: `₹${analytics.kpis.total_revenue.toLocaleString('en-IN')}` },
            { metric: 'Completed Orders', value: `${analytics.kpis.total_orders}` },
            { metric: 'Units Sold', value: `${analytics.kpis.units_sold} units` },
            { metric: 'Average Order Value', value: `₹${analytics.kpis.average_order_value.toLocaleString('en-IN')}` },
          ],
        };
      }

      case 'TOP_PRODUCTS': {
        const analytics = await getArtisanAnalytics(artisanId, period);
        const topProds = analytics.product_performance.slice(0, 5);
        return {
          intent,
          period: analytics.period,
          data: {
            top_products: topProds.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              units_sold: p.units_sold,
              revenue: p.revenue,
              stock: p.stock_quantity,
            })),
          },
          evidence: topProds.map((p) => ({
            metric: p.name,
            value: `${p.units_sold} units (₹${p.revenue.toLocaleString('en-IN')})`,
          })),
        };
      }

      case 'LOW_STOCK':
      case 'INVENTORY_SUMMARY': {
        const analytics = await getArtisanAnalytics(artisanId, period);
        const products = await getProductsByArtisan(artisanId);
        const lowStockList = products.filter((p) => (p.stock_quantity || 0) <= 5);

        return {
          intent,
          data: {
            total_active_products: analytics.kpis.active_products,
            available_stock: analytics.kpis.available_stock,
            low_stock_count: lowStockList.length,
            low_stock_products: lowStockList.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              stock: p.stock_quantity,
              price: p.price,
            })),
          },
          evidence: [
            { metric: 'Total Products', value: `${analytics.kpis.active_products}` },
            { metric: 'Total Stock Units', value: `${analytics.kpis.available_stock}` },
            { metric: 'Low Stock Count (≤5)', value: `${lowStockList.length}` },
          ],
        };
      }

      case 'PRODUCT_COUNT': {
        const products = await getProductsByArtisan(artisanId);
        const publishedCount = products.filter((p) => p.status === 'PUBLISHED').length;
        const draftCount = products.filter((p) => p.status === 'DRAFT').length;

        return {
          intent,
          data: {
            total_count: products.length,
            published_count: publishedCount,
            draft_count: draftCount,
          },
          evidence: [
            { metric: 'Total Products Listed', value: `${products.length}` },
            { metric: 'Published Items', value: `${publishedCount}` },
            { metric: 'Draft Items', value: `${draftCount}` },
          ],
        };
      }

      case 'PRODUCT_DETAILS': {
        const products = await getProductsByArtisan(artisanId);
        let matched = products[0];

        if (queryText) {
          const lower = queryText.toLowerCase();
          const found = products.find((p) => p.name.toLowerCase().includes(lower) || p.category?.toLowerCase().includes(lower));
          if (found) matched = found;
        }

        if (!matched) {
          return {
            intent,
            data: { message: 'No matching products found.' },
            evidence: [],
          };
        }

        return {
          intent,
          data: {
            id: matched.id,
            name: matched.name,
            category: matched.category,
            price: matched.price,
            stock: matched.stock_quantity,
            status: matched.status,
            description: matched.description,
            material: matched.material,
          },
          evidence: [
            { metric: 'Product Name', value: matched.name },
            { metric: 'Price', value: `₹${matched.price}` },
            { metric: 'Stock Available', value: `${matched.stock_quantity} units` },
            { metric: 'Status', value: matched.status },
          ],
        };
      }

      case 'RECENT_ORDERS':
      case 'ORDER_SUMMARY': {
        const orders = await getArtisanOrders(artisanId);
        const recent = orders.slice(0, 5);

        const statusCounts: Record<string, number> = {};
        orders.forEach((o) => {
          statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        });

        return {
          intent,
          data: {
            total_orders: orders.length,
            status_breakdown: statusCounts,
            recent_orders: recent.map((o) => ({
              id: o.id,
              status: o.status,
              total_amount: o.total_amount,
              placed_at: o.placed_at,
              items_count: o.items.length,
            })),
          },
          evidence: [
            { metric: 'Total Order History', value: `${orders.length}` },
            { metric: 'Pending Orders', value: `${statusCounts['PENDING'] || 0}` },
            { metric: 'Delivered Orders', value: `${statusCounts['DELIVERED'] || 0}` },
          ],
        };
      }

      case 'CATEGORY_PERFORMANCE': {
        const analytics = await getArtisanAnalytics(artisanId, period);
        return {
          intent,
          period: analytics.period,
          data: {
            categories: analytics.category_performance,
          },
          evidence: analytics.category_performance.slice(0, 3).map((c) => ({
            metric: c.category,
            value: `₹${c.revenue.toLocaleString('en-IN')} (${c.revenue_share_percent}%)`,
          })),
        };
      }

      case 'PRICING_GUIDANCE': {
        const products = await getProductsByArtisan(artisanId);
        let record = null;
        if (products.length > 0) {
          record = await getPricingRecord(products[0].id, artisanId);
        }

        return {
          intent,
          data: {
            pricingRecord: record,
            productName: products[0]?.name || 'Handcrafted Artisan Product',
          },
          evidence: record
            ? [
                { metric: 'Fair Price Range', value: `₹${record.fair_price_min} - ₹${record.fair_price_max}` },
                { metric: 'Suggested Price', value: `₹${record.suggested_price}` },
                { metric: 'Confidence Level', value: `${record.confidence}` },
              ]
            : [{ metric: 'Fair Pricing Engine', value: 'Active and verified' }],
        };
      }

      case 'GENERAL_M63_HELP':
      default: {
        const analytics = await getArtisanAnalytics(artisanId, '30d');
        return {
          intent: 'GENERAL_M63_HELP',
          data: {
            active_products: analytics.kpis.active_products,
            total_orders: analytics.kpis.total_orders,
            revenue: analytics.kpis.total_revenue,
          },
          evidence: [
            { metric: 'Artisan Workspace', value: 'Active' },
            { metric: 'Products Listed', value: `${analytics.kpis.active_products}` },
          ],
        };
      }
    }
  }
}

export const assistantToolsService = new AssistantToolsService();
