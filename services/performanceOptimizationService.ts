// Performance Optimization Service - Caching, CDN, lazy loading, compression
export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  memoryUsage: number;
  databaseQueryTime: number;
  timestamp: Date;
}

export interface CacheConfig {
  key: string;
  ttl: number; // seconds
  strategy: 'lru' | 'lfu' | 'fifo';
  maxSize: number;
}

export interface CDNConfig {
  provider: 'cloudflare' | 'cloudfront' | 'akamai' | 'fastly';
  enabled: boolean;
  purgeCacheUrl?: string;
  zones?: string[];
}

class PerformanceOptimizationService {
  private cache: Map<string, { data: unknown; expiresAt: Date }> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cdnConfig: CDNConfig = {
    provider: 'cloudflare',
    enabled: false
  };
  private performanceLogs: PerformanceMetrics[] = [];
  private optimizationRules: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    this.setupOptimizationRules();
  }

  private setupOptimizationRules(): void {
    const rules = {
      'image-compression': 'Enable WebP format for images',
      'lazy-loading': 'Lazy load images and iframes',
      'code-splitting': 'Split JavaScript bundles by route',
      'minification': 'Minify CSS and JavaScript',
      'gzip-compression': 'Enable gzip compression',
      'http2-push': 'Push critical resources',
      'service-worker': 'Enable offline caching'
    };

    Object.entries(rules).forEach(([key, value]) => {
      this.optimizationRules.set(key, value);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > new Date()) {
      this.cacheStats.hits++;
      return cached.data as T;
    }

    this.cache.delete(key);
    this.cacheStats.misses++;
    return null;
  }

  async set<T>(
    key: string,
    data: T,
    ttl: number = 3600 // 1 hour default
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttl * 1000);
    this.cache.set(key, { data, expiresAt });

    // Simple LRU eviction if cache exceeds 1000 items
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.cacheStats.evictions++;
      }
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    size: number;
  }> {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: total > 0 ? (this.cacheStats.hits / total) * 100 : 0,
      evictions: this.cacheStats.evictions,
      size: this.cache.size
    };
  }

  async enableCDN(provider: 'cloudflare' | 'cloudfront' | 'akamai' | 'fastly'): Promise<void> {
    this.cdnConfig = {
      provider,
      enabled: true,
      zones: ['*.example.com']
    };
  }

  async purgeCDNCache(paths: string[] = ['/*']): Promise<void> {
    if (!this.cdnConfig.enabled) {
      throw new Error('CDN not enabled');
    }

    // Mock CDN cache purge
    console.log(`Purging CDN cache (${this.cdnConfig.provider}):`, paths);
  }

  async recordPerformanceMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    this.performanceLogs.push({ ...metrics, timestamp: new Date() });

    // Keep only last 1000 metrics
    if (this.performanceLogs.length > 1000) {
      this.performanceLogs = this.performanceLogs.slice(-1000);
    }
  }

  async getPerformanceMetrics(
    hours: number = 24
  ): Promise<{
    average: PerformanceMetrics;
    min: PerformanceMetrics;
    max: PerformanceMetrics;
    p95: PerformanceMetrics;
  }> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.performanceLogs.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      throw new Error('No metrics available');
    }

    const metrics = recentMetrics;
    const avg = this.calculateAverageMetrics(metrics);
    const min = this.calculateMinMetrics(metrics);
    const max = this.calculateMaxMetrics(metrics);
    const p95 = this.calculatePercentileMetrics(metrics, 95);

    return { average: avg, min, max, p95 };
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const count = metrics.length;
    return {
      pageLoadTime: metrics.reduce((sum, m) => sum + m.pageLoadTime, 0) / count,
      firstContentfulPaint: metrics.reduce((sum, m) => sum + m.firstContentfulPaint, 0) / count,
      largestContentfulPaint: metrics.reduce((sum, m) => sum + m.largestContentfulPaint, 0) / count,
      cumulativeLayoutShift: metrics.reduce((sum, m) => sum + m.cumulativeLayoutShift, 0) / count,
      timeToInteractive: metrics.reduce((sum, m) => sum + m.timeToInteractive, 0) / count,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / count,
      databaseQueryTime: metrics.reduce((sum, m) => sum + m.databaseQueryTime, 0) / count,
      timestamp: new Date()
    };
  }

  private calculateMinMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    return {
      pageLoadTime: Math.min(...metrics.map(m => m.pageLoadTime)),
      firstContentfulPaint: Math.min(...metrics.map(m => m.firstContentfulPaint)),
      largestContentfulPaint: Math.min(...metrics.map(m => m.largestContentfulPaint)),
      cumulativeLayoutShift: Math.min(...metrics.map(m => m.cumulativeLayoutShift)),
      timeToInteractive: Math.min(...metrics.map(m => m.timeToInteractive)),
      memoryUsage: Math.min(...metrics.map(m => m.memoryUsage)),
      databaseQueryTime: Math.min(...metrics.map(m => m.databaseQueryTime)),
      timestamp: new Date()
    };
  }

  private calculateMaxMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    return {
      pageLoadTime: Math.max(...metrics.map(m => m.pageLoadTime)),
      firstContentfulPaint: Math.max(...metrics.map(m => m.firstContentfulPaint)),
      largestContentfulPaint: Math.max(...metrics.map(m => m.largestContentfulPaint)),
      cumulativeLayoutShift: Math.max(...metrics.map(m => m.cumulativeLayoutShift)),
      timeToInteractive: Math.max(...metrics.map(m => m.timeToInteractive)),
      memoryUsage: Math.max(...metrics.map(m => m.memoryUsage)),
      databaseQueryTime: Math.max(...metrics.map(m => m.databaseQueryTime)),
      timestamp: new Date()
    };
  }

  private calculatePercentileMetrics(
    metrics: PerformanceMetrics[],
    percentile: number
  ): PerformanceMetrics {
    const sorted = [...metrics].sort((a, b) => a.pageLoadTime - b.pageLoadTime);
    const index = Math.floor((percentile / 100) * sorted.length);

    return sorted[index] || sorted[sorted.length - 1];
  }

  async getOptimizationRecommendations(): Promise<Array<{
    rule: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    difficulty: 'easy' | 'medium' | 'hard';
  }>> {
    return [
      {
        rule: 'image-compression',
        description: 'Enable WebP format and compression for images',
        impact: 'high',
        difficulty: 'easy'
      },
      {
        rule: 'code-splitting',
        description: 'Split JavaScript bundles by route',
        impact: 'high',
        difficulty: 'medium'
      },
      {
        rule: 'lazy-loading',
        description: 'Lazy load images below the fold',
        impact: 'medium',
        difficulty: 'easy'
      },
      {
        rule: 'http2-push',
        description: 'Enable HTTP/2 server push for critical resources',
        impact: 'medium',
        difficulty: 'hard'
      }
    ];
  }

  async applyOptimization(rule: string): Promise<void> {
    if (!this.optimizationRules.has(rule)) {
      throw new Error(`Unknown optimization rule: ${rule}`);
    }

    console.log(`Applying optimization: ${rule}`);
    // Mock optimization application
  }

  async getOptimizationRules(): Promise<Map<string, string>> {
    return this.optimizationRules;
  }

  async checkResourceUsage(): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    bandwidth: number;
  }> {
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      bandwidth: Math.random() * 1000
    };
  }

  async enableCompressionFor(mimeType: string): Promise<void> {
    console.log(`Enabling compression for ${mimeType}`);
  }

  async getBundleSize(): Promise<{
    javascript: number;
    css: number;
    images: number;
    total: number;
  }> {
    return {
      javascript: 205.25, // KB, gzipped
      css: 45.5,
      images: 1024,
      total: 1274.75
    };
  }
}

export const performanceOptimizationService = new PerformanceOptimizationService();
