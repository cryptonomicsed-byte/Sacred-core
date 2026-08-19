import { useStore } from '../store';
import { hybridStorage } from './hybridStorageService';

/**
 * Cost Tracking Service
 * Tracks API usage and costs across all providers
 */

export interface UsageLog {
  id: string;
  userId: string;
  provider: string;
  operationType: 'text_generation' | 'image_generation' | 'video_generation';
  cost: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface CostSummary {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByOperation: Record<string, number>;
  costByDay: Record<string, number>;
  operationCount: Record<string, number>;
}

class CostTrackingService {
  private usageLogs: UsageLog[] = [];

  async initialize(): Promise<void> {
    // Load existing logs from storage
    const stored = await hybridStorage.get('cost-tracking-logs');
    if (stored) {
      this.usageLogs = stored;
    }
    console.log('✅ Cost tracking service initialized');
  }

  /**
   * Log an API usage event with its associated cost
   */
  async logUsage(params: {
    provider: string;
    operationType: 'text_generation' | 'image_generation' | 'video_generation';
    cost: number;
    metadata?: Record<string, any>;
  }): Promise<UsageLog> {
    const { currentBrand } = useStore.getState();
    const userId = currentBrand?.id || 'anonymous';

    const log: UsageLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      provider: params.provider,
      operationType: params.operationType,
      cost: params.cost,
      metadata: params.metadata,
      timestamp: new Date()
    };

    this.usageLogs.push(log);
    await hybridStorage.set('cost-tracking-logs', this.usageLogs);

    console.log(`📊 Cost logged: ${params.provider} (${params.operationType}) - $${params.cost.toFixed(4)}`);
    return log;
  }

  /**
   * Get cost summary for a given time period
   */
  async getCostSummary(daysBack: number = 30): Promise<CostSummary> {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysBack);

    const recentLogs = this.usageLogs.filter(
      log => new Date(log.timestamp) >= cutoffTime
    );

    const summary: CostSummary = {
      totalCost: 0,
      costByProvider: {},
      costByOperation: {},
      costByDay: {},
      operationCount: {}
    };

    for (const log of recentLogs) {
      // Total cost
      summary.totalCost += log.cost;

      // Cost by provider
      summary.costByProvider[log.provider] = (summary.costByProvider[log.provider] || 0) + log.cost;

      // Cost by operation
      summary.costByOperation[log.operationType] = (summary.costByOperation[log.operationType] || 0) + log.cost;

      // Cost by day
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      summary.costByDay[day] = (summary.costByDay[day] || 0) + log.cost;

      // Operation count
      summary.operationCount[log.operationType] = (summary.operationCount[log.operationType] || 0) + 1;
    }

    return summary;
  }

  /**
   * Get cost breakdown by provider
   */
  async getCostByProvider(): Promise<Record<string, number>> {
    const summary = await this.getCostSummary();
    return summary.costByProvider;
  }

  /**
   * Get most expensive operations
   */
  async getMostExpensiveOperations(limit: number = 10): Promise<UsageLog[]> {
    return [...this.usageLogs]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  /**
   * Get provider efficiency metrics (cost per operation)
   */
  async getProviderEfficiency(): Promise<Record<string, {
    avgCost: number;
    totalCost: number;
    operationCount: number;
  }>> {
    const efficiency: Record<string, {
      avgCost: number;
      totalCost: number;
      operationCount: number;
    }> = {};

    for (const log of this.usageLogs) {
      if (!efficiency[log.provider]) {
        efficiency[log.provider] = {
          avgCost: 0,
          totalCost: 0,
          operationCount: 0
        };
      }

      efficiency[log.provider].totalCost += log.cost;
      efficiency[log.provider].operationCount += 1;
      efficiency[log.provider].avgCost = 
        efficiency[log.provider].totalCost / efficiency[log.provider].operationCount;
    }

    return efficiency;
  }

  /**
   * Get daily cost trend for charting
   */
  async getDailyCostTrend(daysBack: number = 30): Promise<Array<{
    date: string;
    cost: number;
    operations: number;
  }>> {
    const summary = await this.getCostSummary(daysBack);
    const trend: Array<{ date: string; cost: number; operations: number }> = [];

    for (const day in summary.costByDay) {
      // Count operations for this day
      const dayOperations = this.usageLogs
        .filter(log => new Date(log.timestamp).toISOString().split('T')[0] === day)
        .length;

      trend.push({
        date: day,
        cost: summary.costByDay[day],
        operations: dayOperations
      });
    }

    return trend.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Estimate cost for an operation
   */
  estimateCost(provider: string, operationType: string): number {
    const costs: Record<string, Record<string, number>> = {
      gemini: {
        text_generation: 0.0001,
        image_generation: 0,
        video_generation: 0
      },
      openai: {
        text_generation: 0.003,
        image_generation: 0.04,
        video_generation: 0.20
      },
      anthropic: {
        text_generation: 0.0015,
        image_generation: 0,
        video_generation: 0
      },
      mistral: {
        text_generation: 0.0007,
        image_generation: 0,
        video_generation: 0
      },
      stability: {
        text_generation: 0,
        image_generation: 0.01,
        video_generation: 0
      },
      'stability-ultra': {
        text_generation: 0,
        image_generation: 0.025,
        video_generation: 0
      },
      'openai-dalle4': {
        text_generation: 0,
        image_generation: 0.08,
        video_generation: 0
      },
      'google-veo': {
        text_generation: 0,
        image_generation: 0,
        video_generation: 0.15
      },
      'openai-sora': {
        text_generation: 0,
        image_generation: 0,
        video_generation: 0.20
      },
      leonardo: {
        text_generation: 0,
        image_generation: 0.005,
        video_generation: 0
      }
    };

    return costs[provider]?.[operationType] || 0.01;
  }

  /**
   * Check if user is within quota
   */
  async checkQuota(limit: number): Promise<boolean> {
    const summary = await this.getCostSummary(30); // Last 30 days
    return summary.totalCost < limit;
  }

  /**
   * Get remaining quota
   */
  async getRemainingQuota(limit: number): Promise<number> {
    const summary = await this.getCostSummary(30);
    return Math.max(0, limit - summary.totalCost);
  }

  /**
   * Export usage logs as CSV
   */
  async exportAsCSV(): Promise<string> {
    const headers = ['Timestamp', 'Provider', 'Operation', 'Cost', 'User ID'];
    const rows = this.usageLogs.map(log => [
      log.timestamp.toISOString(),
      log.provider,
      log.operationType,
      log.cost.toFixed(4),
      log.userId
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Export usage logs as JSON
   */
  async exportAsJSON(): Promise<string> {
    return JSON.stringify(this.usageLogs, null, 2);
  }

  /**
   * Clear old logs (older than X days)
   */
  async clearOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysOld);

    const beforeCount = this.usageLogs.length;
    this.usageLogs = this.usageLogs.filter(
      log => new Date(log.timestamp) >= cutoffTime
    );

    await hybridStorage.set('cost-tracking-logs', this.usageLogs);
    const removed = beforeCount - this.usageLogs.length;
    console.log(`🗑️ Cleared ${removed} logs older than ${daysOld} days`);
    return removed;
  }

  /**
   * Reset all cost tracking data
   */
  async reset(): Promise<void> {
    this.usageLogs = [];
    await hybridStorage.remove('cost-tracking-logs');
    console.log('🔄 Cost tracking data reset');
  }
}

export const costTrackingService = new CostTrackingService();
