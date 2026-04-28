import { getSupabase, isSupabaseConfigured } from "../../../services/supabaseClient";

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface FlagsCache {
  flags: Map<string, boolean>;
  timestamp: number;
  ttl: number;
}

const CACHE_TTL = 5 * 60 * 1000;

class FeatureFlagService {
  private cache: FlagsCache = {
    flags: new Map(),
    timestamp: 0,
    ttl: CACHE_TTL,
  };

  private flagDefaults: Map<string, boolean> = new Map([
    ['video_generation', true],
    ['image_generation', true],
    ['competitor_analysis', true],
    ['ai_optimization', true],
    ['advanced_analytics', true],
    ['affiliate_program', true],
    ['webhook_integrations', true],
    ['multi_region_sync', false],
    ['beta_ai_features', false],
    ['performance_mode', false],
  ]);

  private isCacheValid(): boolean {
    const age = Date.now() - this.cache.timestamp;
    return age < this.cache.ttl;
  }

  async isFeatureEnabled(flagName: string): Promise<boolean> {
    if (this.isCacheValid() && this.cache.flags.has(flagName)) {
      return this.cache.flags.get(flagName) ?? this.flagDefaults.get(flagName) ?? false;
    }

    if (!this.isCacheValid()) {
      await this.refreshCache();
    }

    if (this.cache.flags.has(flagName)) {
      return this.cache.flags.get(flagName) ?? false;
    }

    return this.flagDefaults.get(flagName) ?? false;
  }

  async getAllFlags(): Promise<Record<string, boolean>> {
    if (!this.isCacheValid()) {
      await this.refreshCache();
    }

    const result: Record<string, boolean> = {};
    for (const [key, value] of this.cache.flags.entries()) {
      result[key] = value;
    }

    for (const [key, value] of this.flagDefaults.entries()) {
      if (!(key in result)) {
        result[key] = value;
      }
    }

    return result;
  }

  private async refreshCache(): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.cache.flags = new Map(this.flagDefaults);
      this.cache.timestamp = Date.now();
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        this.cache.flags = new Map(this.flagDefaults);
        this.cache.timestamp = Date.now();
        return;
      }

      const { data, error } = await supabase
        .from('feature_flags')
        .select('name, enabled')
        .eq('enabled', true);

      if (error) {
        console.warn('⚠️ Failed to fetch feature flags:', error.message);
        this.cache.flags = new Map(this.flagDefaults);
        this.cache.timestamp = Date.now();
        return;
      }

      const newFlags = new Map(this.flagDefaults);
      if (data && Array.isArray(data)) {
        data.forEach((flag) => {
          newFlags.set(flag.name, flag.enabled);
        });
      }

      this.cache.flags = newFlags;
      this.cache.timestamp = Date.now();

      console.log('✅ Feature flags refreshed from Supabase');
    } catch (error) {
      console.error('❌ Feature flag refresh error:', error);
      this.cache.flags = new Map(this.flagDefaults);
      this.cache.timestamp = Date.now();
    }
  }

  async refresh(): Promise<void> {
    this.cache.timestamp = 0;
    await this.refreshCache();
  }

  async updateFlag(flagName: string, enabled: boolean): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Cannot update flags without Supabase');
      return false;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return false;

      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('name', flagName);

      if (error) {
        console.error('❌ Failed to update flag:', error.message);
        return false;
      }

      this.cache.timestamp = 0;
      console.log(`✅ Flag '${flagName}' updated to ${enabled}`);
      return true;
    } catch (error) {
      console.error('❌ Flag update error:', error);
      return false;
    }
  }

  getCacheInfo() {
    return {
      flags: Array.from(this.cache.flags.entries()),
      timestamp: this.cache.timestamp,
      isValid: this.isCacheValid(),
      ttl: this.cache.ttl,
    };
  }
}

export const featureFlagService = new FeatureFlagService();
