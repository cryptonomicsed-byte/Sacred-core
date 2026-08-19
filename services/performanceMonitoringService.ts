import { hybridStorage } from './hybridStorageService';

/**
 * Performance Monitoring Service
 * Tracks response times, success rates, and provider efficiency
 */

export interface PerformanceMetric {
  id: string;
  provider: string;
  operationType: 'text_generation' | 'image_generation' | 'video_generation';
  duration: number; // milliseconds
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

export interface ProviderMetrics {
  provider: string;
  operationCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];

  async initialize(): Promise<void> {
    const stored = await hybridStorage.get('performance-metrics');
    if (stored) {
      this.metrics = stored;
    }
    console.log('✅ Performance monitoring service initialized');
  }

  /**
   * Record a performance metric
   */
  async recordMetric(params: {
    provider: string;
    operationType: 'text_generation' | 'image_generation' | 'video_generation';
    duration: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<PerformanceMetric> {
    const metric: PerformanceMetric = {
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: params.provider,
      operationType: params.operationType,
      duration: params.duration,
      success: params.success,
      errorMessage: params.errorMessage,
      timestamp: new Date()
    };

    this.metrics.push(metric);
    await hybridStorage.set('performance-metrics', this.metrics);

    console.log(
      `⏱️ Performance logged: ${params.provider} (${params.operationType}) - ${params.duration}ms ${params.success ? '✓' : '✗'}`
    );

    return metric;
  }

  /**
   * Get metrics for a specific provider
   */
  async getProviderMetrics(provider: string): Promise<ProviderMetrics> {
    const providerMetrics = this.metrics.filter(m => m.provider === provider);

    if (providerMetrics.length === 0) {
      return {
        provider,
        operationCount: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      };
    }

    const successCount = providerMetrics.filter(m => m.success).length;
    const failureCount = providerMetrics.length - successCount;
    const durations = providerMetrics.map(m => m.duration).sort((a, b) => a - b);

    return {
      provider,
      operationCount: providerMetrics.length,
      successCount,
      failureCount,
      successRate: (successCount / providerMetrics.length) * 100,
      avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      p50ResponseTime: this.getPercentile(durations, 0.5),
      p95ResponseTime: this.getPercentile(durations, 0.95),
      p99ResponseTime: this.getPercentile(durations, 0.99)
    };
  }

  /**
   * Get metrics for all providers
   */
  async getAllProviderMetrics(): Promise<ProviderMetrics[]> {
    const providers = new Set(this.metrics.map(m => m.provider));
    const metricsArray: ProviderMetrics[] = [];

    for (const provider of providers) {
      metricsArray.push(await this.getProviderMetrics(provider));
    }

    return metricsArray.sort((a, b) => b.operationCount - a.operationCount);
  }

  /**
   * Get metrics by operation type
   */
  async getMetricsByOperationType(operationType: string): Promise<ProviderMetrics[]> {
    const filtered = this.metrics.filter(m => m.operationType === operationType);
    const providers = new Set(filtered.map(m => m.provider));
    const metricsArray: ProviderMetrics[] = [];

    for (const provider of providers) {
      const providerMetrics = filtered.filter(m => m.provider === provider);
      if (providerMetrics.length > 0) {
        const successCount = providerMetrics.filter(m => m.success).length;
        const durations = providerMetrics.map(m => m.duration).sort((a, b) => a - b);

        metricsArray.push({
          provider,
          operationCount: providerMetrics.length,
          successCount,
          failureCount: providerMetrics.length - successCount,
          successRate: (successCount / providerMetrics.length) * 100,
          avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
          minResponseTime: Math.min(...durations),
          maxResponseTime: Math.max(...durations),
          p50ResponseTime: this.getPercentile(durations, 0.5),
          p95ResponseTime: this.getPercentile(durations, 0.95),
          p99ResponseTime: this.getPercentile(durations, 0.99)
        });
      }
    }

    return metricsArray;
  }

  /**
   * Get slowest operations
   */
  async getSlowestOperations(limit: number = 10): Promise<PerformanceMetric[]> {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get failed operations
   */
  async getFailedOperations(limit: number = 10): Promise<PerformanceMetric[]> {
    return [...this.metrics]
      .filter(m => !m.success)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get average response time trend
   */
  async getResponseTimeTrend(daysBack: number = 30): Promise<Array<{
    date: string;
    avgResponseTime: number;
    operationCount: number;
  }>> {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysBack);

    const recentMetrics = this.metrics.filter(
      m => new Date(m.timestamp) >= cutoffTime
    );

    const trendData: Record<string, { total: number; count: number }> = {};

    for (const metric of recentMetrics) {
      const day = new Date(metric.timestamp).toISOString().split('T')[0];
      if (!trendData[day]) {
        trendData[day] = { total: 0, count: 0 };
      }
      trendData[day].total += metric.duration;
      trendData[day].count += 1;
    }

    const trend = Object.entries(trendData)
      .map(([date, data]) => ({
        date,
        avgResponseTime: data.total / data.count,
        operationCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trend;
  }

  /**
   * Get success rate by provider
   */
  async getSuccessRateByProvider(): Promise<Record<string, number>> {
    const providers = new Set(this.metrics.map(m => m.provider));
    const rates: Record<string, number> = {};

    for (const provider of providers) {
      const providerMetrics = this.metrics.filter(m => m.provider === provider);
      const successCount = providerMetrics.filter(m => m.success).length;
      rates[provider] = (successCount / providerMetrics.length) * 100;
    }

    return rates;
  }

  /**
   * Get error rate by provider
   */
  async getErrorRateByProvider(): Promise<Record<string, number>> {
    const rates = await this.getSuccessRateByProvider();
    const errorRates: Record<string, number> = {};

    for (const provider in rates) {
      errorRates[provider] = 100 - rates[provider];
    }

    return errorRates;
  }

  /**
   * Check if a provider is performing well
   */
  async isProviderHealthy(provider: string, minSuccessRate: number = 95): Promise<boolean> {
    const metrics = await this.getProviderMetrics(provider);
    return metrics.successRate >= minSuccessRate;
  }

  /**
   * Get provider health summary
   */
  async getProviderHealth(): Promise<Record<string, {
    healthy: boolean;
    successRate: number;
    avgResponseTime: number;
  }>> {
    const allMetrics = await this.getAllProviderMetrics();
    const health: Record<string, {
      healthy: boolean;
      successRate: number;
      avgResponseTime: number;
    }> = {};

    for (const metrics of allMetrics) {
      health[metrics.provider] = {
        healthy: metrics.successRate >= 95,
        successRate: metrics.successRate,
        avgResponseTime: metrics.avgResponseTime
      };
    }

    return health;
  }

  /**
   * Export metrics as CSV
   */
  async exportAsCSV(): Promise<string> {
    const headers = ['Timestamp', 'Provider', 'Operation', 'Duration(ms)', 'Status'];
    const rows = this.metrics.map(metric => [
      metric.timestamp.toISOString(),
      metric.provider,
      metric.operationType,
      metric.duration.toString(),
      metric.success ? 'success' : 'failed'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Export metrics as JSON
   */
  async exportAsJSON(): Promise<string> {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear old metrics
   */
  async clearOldMetrics(daysOld: number = 90): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysOld);

    const beforeCount = this.metrics.length;
    this.metrics = this.metrics.filter(
      m => new Date(m.timestamp) >= cutoffTime
    );

    await hybridStorage.set('performance-metrics', this.metrics);
    const removed = beforeCount - this.metrics.length;
    console.log(`🗑️ Cleared ${removed} metrics older than ${daysOld} days`);
    return removed;
  }

  /**
   * Reset all performance data
   */
  async reset(): Promise<void> {
    this.metrics = [];
    await hybridStorage.remove('performance-metrics');
    console.log('🔄 Performance metrics reset');
  }

  // Helper method to calculate percentile
  private getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile * values.length) - 1);
    return values[Math.max(0, index)];
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
