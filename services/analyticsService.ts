import { useStore } from '../store';
import { hybridStorage } from './hybridStorageService';

/**
 * Advanced Analytics Service
 * Tracks campaign ROI, conversion funnels, and predictive metrics
 */

export interface CampaignAnalytics {
  id: string;
  campaignId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
  ctr: number; // Click-through rate
  conversionRate: number;
  roas: number; // Return on ad spend
  averageOrderValue: number;
  timestamp: Date;
}

export interface ConversionFunnel {
  stage: 'impression' | 'click' | 'visit' | 'signup' | 'trial' | 'conversion';
  count: number;
  percentage: number;
  dropoff: number;
}

export interface LeadAnalytics {
  leadId: string;
  source: string;
  campaignId: string;
  score: number;
  status: 'new' | 'engaged' | 'qualified' | 'converted' | 'lost';
  engagementScore: number;
  conversionProbability: number;
  estimatedValue: number;
  touchpoints: number;
  lastTouchDate: Date;
}

export interface ABTestResults {
  testId: string;
  variantA: {
    conversions: number;
    visitors: number;
    conversionRate: number;
  };
  variantB: {
    conversions: number;
    visitors: number;
    conversionRate: number;
  };
  winner: 'A' | 'B' | 'tie' | 'inconclusive';
  confidence: number; // 0-100
  pValue: number;
}

class AnalyticsService {
  private campaignMetrics: CampaignAnalytics[] = [];
  private leadMetrics: LeadAnalytics[] = [];
  private abTestResults: ABTestResults[] = [];

  async initialize(): Promise<void> {
    // Load existing analytics data
    const stored = await hybridStorage.get('campaign-analytics');
    if (stored) {
      this.campaignMetrics = stored;
    }
    console.log('✅ Analytics service initialized');
  }

  /**
   * Log campaign metrics (impressions, clicks, conversions)
   */
  async logCampaignEvent(params: {
    campaignId: string;
    eventType: 'impression' | 'click' | 'conversion';
    value?: number; // Revenue for conversions
  }): Promise<void> {
    // Find or create metric entry
    let metric = this.campaignMetrics.find(m => m.campaignId === params.campaignId);

    if (!metric) {
      metric = {
        id: `analytics-${params.campaignId}-${Date.now()}`,
        campaignId: params.campaignId,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        cost: 0,
        roi: 0,
        ctr: 0,
        conversionRate: 0,
        roas: 0,
        averageOrderValue: 0,
        timestamp: new Date()
      };
      this.campaignMetrics.push(metric);
    }

    // Update metrics
    switch (params.eventType) {
      case 'impression':
        metric.impressions++;
        break;
      case 'click':
        metric.clicks++;
        break;
      case 'conversion':
        metric.conversions++;
        if (params.value) {
          metric.revenue += params.value;
          metric.averageOrderValue = metric.revenue / metric.conversions;
        }
        break;
    }

    // Recalculate derived metrics
    metric.ctr = metric.impressions > 0 ? (metric.clicks / metric.impressions) * 100 : 0;
    metric.conversionRate = metric.clicks > 0 ? (metric.conversions / metric.clicks) * 100 : 0;
    metric.roas = metric.cost > 0 ? metric.revenue / metric.cost : 0;
    metric.roi = metric.cost > 0 ? ((metric.revenue - metric.cost) / metric.cost) * 100 : 0;

    // Persist
    await hybridStorage.set('campaign-analytics', this.campaignMetrics);

    console.log(`📊 Event logged: ${params.eventType} for campaign ${params.campaignId}`);
  }

  /**
   * Get campaign ROI
   */
  async getCampaignROI(campaignId: string): Promise<{
    roi: number;
    roas: number;
    conversions: number;
    revenue: number;
    cost: number;
  }> {
    const metric = this.campaignMetrics.find(m => m.campaignId === campaignId);

    if (!metric) {
      return {
        roi: 0,
        roas: 0,
        conversions: 0,
        revenue: 0,
        cost: 0
      };
    }

    return {
      roi: metric.roi,
      roas: metric.roas,
      conversions: metric.conversions,
      revenue: metric.revenue,
      cost: metric.cost
    };
  }

  /**
   * Get conversion funnel for campaign
   */
  async getConversionFunnel(campaignId: string): Promise<ConversionFunnel[]> {
    const metric = this.campaignMetrics.find(m => m.campaignId === campaignId);

    if (!metric) {
      return [];
    }

    const funnel: ConversionFunnel[] = [
      {
        stage: 'impression',
        count: metric.impressions,
        percentage: 100,
        dropoff: 0
      },
      {
        stage: 'click',
        count: metric.clicks,
        percentage: (metric.clicks / metric.impressions) * 100,
        dropoff: metric.impressions - metric.clicks
      },
      {
        stage: 'conversion',
        count: metric.conversions,
        percentage: (metric.conversions / metric.impressions) * 100,
        dropoff: metric.clicks - metric.conversions
      }
    ];

    return funnel;
  }

  /**
   * Predict lead conversion probability
   */
  predictLeadConversion(lead: {
    engagementScore: number; // 0-100
    touchpoints: number;
    daysSinceFirstTouch: number;
    previousConversions: number;
  }): number {
    // Simple predictive model (can be improved with ML)
    let probability = 0;

    // High engagement increases conversion probability
    probability += lead.engagementScore * 0.4;

    // More touchpoints = higher probability
    probability += Math.min(lead.touchpoints * 5, 30);

    // Recent activity increases probability
    if (lead.daysSinceFirstTouch < 7) probability += 20;
    else if (lead.daysSinceFirstTouch < 30) probability += 10;

    // Previous conversions predict future conversions
    if (lead.previousConversions > 0) probability += 20;

    return Math.min(probability, 100);
  }

  /**
   * Calculate AB test results
   */
  calculateABTestResults(params: {
    testId: string;
    variantAConversions: number;
    variantAVisitors: number;
    variantBConversions: number;
    variantBVisitors: number;
  }): ABTestResults {
    const variantARate = params.variantAConversions / params.variantAVisitors;
    const variantBRate = params.variantBConversions / params.variantBVisitors;

    // Simple chi-square test for statistical significance
    const expectedA = params.variantAVisitors * variantARate;
    const expectedB = params.variantBVisitors * variantBRate;

    const chiSquare =
      Math.pow(params.variantAConversions - expectedA, 2) / expectedA +
      Math.pow(params.variantBConversions - expectedB, 2) / expectedB;

    // Convert chi-square to confidence level
    const confidence = Math.min(chiSquare * 10, 100);

    let winner: 'A' | 'B' | 'tie' | 'inconclusive' = 'inconclusive';
    if (confidence < 80) {
      winner = 'inconclusive';
    } else if (variantARate > variantBRate * 1.05) {
      winner = 'A';
    } else if (variantBRate > variantARate * 1.05) {
      winner = 'B';
    } else {
      winner = 'tie';
    }

    const result: ABTestResults = {
      testId: params.testId,
      variantA: {
        conversions: params.variantAConversions,
        visitors: params.variantAVisitors,
        conversionRate: variantARate * 100
      },
      variantB: {
        conversions: params.variantBConversions,
        visitors: params.variantBVisitors,
        conversionRate: variantBRate * 100
      },
      winner,
      confidence,
      pValue: 1 - (confidence / 100)
    };

    this.abTestResults.push(result);
    return result;
  }

  /**
   * Get top performing campaigns
   */
  async getTopCampaigns(metric: 'roi' | 'revenue' | 'conversions', limit: number = 10): Promise<CampaignAnalytics[]> {
    return [...this.campaignMetrics]
      .sort((a, b) => {
        switch (metric) {
          case 'roi':
            return b.roi - a.roi;
          case 'revenue':
            return b.revenue - a.revenue;
          case 'conversions':
            return b.conversions - a.conversions;
        }
      })
      .slice(0, limit);
  }

  /**
   * Get campaign trend over time
   */
  async getCampaignTrend(campaignId: string): Promise<Array<{
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roi: number;
  }>> {
    // In production, would fetch from time-series database
    const metric = this.campaignMetrics.find(m => m.campaignId === campaignId);

    if (!metric) {
      return [];
    }

    // Return single data point (would be daily aggregates in production)
    const date = new Date(metric.timestamp).toISOString().split('T')[0];

    return [
      {
        date,
        impressions: metric.impressions,
        clicks: metric.clicks,
        conversions: metric.conversions,
        revenue: metric.revenue,
        roi: metric.roi
      }
    ];
  }

  /**
   * Estimate lifetime value of lead
   */
  estimateLeadLifetimeValue(lead: {
    score: number; // 0-100
    engagementScore: number; // 0-100
    previousOrderValue: number; // Average historical order value
  }): number {
    // LTV = (Average Order Value) × (Number of Repeat Purchases) × (Customer Lifespan)

    const conversionProbability = lead.score / 100;
    const repeatPurchaseRate = lead.engagementScore / 100;
    const lifespan = 3; // 3 years average

    const estimatedRepeatPurchases = 12 * repeatPurchaseRate * lifespan; // 12 months/year

    return lead.previousOrderValue * estimatedRepeatPurchases * conversionProbability;
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(daysBack: number = 30): Promise<{
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    averageROI: number;
    averageRoas: number;
    topCampaigns: CampaignAnalytics[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const recentMetrics = this.campaignMetrics.filter(m => new Date(m.timestamp) >= cutoffDate);

    const report = {
      totalImpressions: recentMetrics.reduce((sum, m) => sum + m.impressions, 0),
      totalClicks: recentMetrics.reduce((sum, m) => sum + m.clicks, 0),
      totalConversions: recentMetrics.reduce((sum, m) => sum + m.conversions, 0),
      totalRevenue: recentMetrics.reduce((sum, m) => sum + m.revenue, 0),
      averageROI: recentMetrics.reduce((sum, m) => sum + m.roi, 0) / recentMetrics.length || 0,
      averageRoas: recentMetrics.reduce((sum, m) => sum + m.roas, 0) / recentMetrics.length || 0,
      topCampaigns: recentMetrics.sort((a, b) => b.roi - a.roi).slice(0, 5)
    };

    return report;
  }

  /**
   * Export analytics as CSV
   */
  async exportAsCSV(): Promise<string> {
    const headers = ['Campaign ID', 'Impressions', 'Clicks', 'Conversions', 'Revenue', 'ROI%', 'ROAS'];
    const rows = this.campaignMetrics.map(m => [
      m.campaignId,
      m.impressions.toString(),
      m.clicks.toString(),
      m.conversions.toString(),
      m.revenue.toFixed(2),
      m.roi.toFixed(2),
      m.roas.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return csv;
  }

  /**
   * Reset analytics (for testing)
   */
  async reset(): Promise<void> {
    this.campaignMetrics = [];
    this.leadMetrics = [];
    this.abTestResults = [];
    await hybridStorage.remove('campaign-analytics');
    console.log('🔄 Analytics reset');
  }
}

export const analyticsService = new AnalyticsService();
