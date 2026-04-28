/**
 * Quota/Budget Management Service
 * 
 * Tracks per-user usage and enforces hard limits to prevent cost overruns.
 * - LLM token limits
 * - Image generation limits
 * - Video rendering limits
 * 
 * Integrates with Supabase for persistence and admin control.
 */

import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { sentryService } from './sentryService';
import {
  DEFAULT_QUOTA_TOTALS,
  getCurrentMonth,
  remainingImageGenerations,
  remainingLlmTokens,
  remainingVideoMinutes
} from "../src/domain/billing/quotaPolicy";

export interface UserQuotas {
  userId: string;
  llmTokenLimit: number; // monthly token limit
  imageGenerationLimit: number; // max images per month
  videoRenderingLimit: number; // max video minutes per month
  currentMonth: string; // YYYY-MM format
}

export interface UsageRecord {
  userId: string;
  llmTokensUsed: number;
  imagesGenerated: number;
  videoMinutesRendered: number;
  month: string; // YYYY-MM
  timestamp: string;
}

const DEFAULT_QUOTAS: UserQuotas = {
  userId: '',
  llmTokenLimit: DEFAULT_QUOTA_TOTALS.llmTokenLimit,
  imageGenerationLimit: DEFAULT_QUOTA_TOTALS.imageGenerationLimit,
  videoRenderingLimit: DEFAULT_QUOTA_TOTALS.videoRenderingLimit,
  currentMonth: getCurrentMonth(),
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

class QuotaService {
  private cache: Map<string, { quotas: UserQuotas; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get user's current quotas
   */
  async getQuotas(userId: string): Promise<UserQuotas> {
    if (!userId) {
      throw new Error('User ID required');
    }

    // Check cache
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.quotas;
    }

    // Fetch from Supabase
    if (!isSupabaseConfigured()) {
      return { ...DEFAULT_QUOTAS, userId };
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return { ...DEFAULT_QUOTAS, userId };

      const { data, error } = await supabase
        .from('user_quotas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.warn('⚠️ Failed to fetch quotas:', error.message);
        return { ...DEFAULT_QUOTAS, userId };
      }

      const quotas: UserQuotas = data || {
        ...DEFAULT_QUOTAS,
        userId,
        currentMonth: getCurrentMonth(),
      };

      this.cache.set(userId, { quotas, timestamp: Date.now() });
      return quotas;
    } catch (error) {
      console.error('❌ Quota fetch error:', error);
      sentryService.captureException(error, { context: 'quota_fetch', userId });
      return { ...DEFAULT_QUOTAS, userId };
    }
  }

  /**
   * Get current usage for user this month
   */
  async getUsage(userId: string): Promise<UsageRecord> {
    if (!userId) {
      throw new Error('User ID required');
    }

    const month = getCurrentMonth();

    if (!isSupabaseConfigured()) {
      return {
        userId,
        llmTokensUsed: 0,
        imagesGenerated: 0,
        videoMinutesRendered: 0,
        month,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        return {
          userId,
          llmTokensUsed: 0,
          imagesGenerated: 0,
          videoMinutesRendered: 0,
          month,
          timestamp: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase
        .from('usage_records')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Failed to fetch usage:', error.message);
      }

      return (
        data || {
          userId,
          llmTokensUsed: 0,
          imagesGenerated: 0,
          videoMinutesRendered: 0,
          month,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('❌ Usage fetch error:', error);
      sentryService.captureException(error, { context: 'usage_fetch', userId });
      return {
        userId,
        llmTokensUsed: 0,
        imagesGenerated: 0,
        videoMinutesRendered: 0,
        month,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if user can use LLM tokens
   */
  async canUseLlmTokens(userId: string, tokensNeeded: number): Promise<{ allowed: boolean; remaining: number }> {
    const [quotas, usage] = await Promise.all([
      this.getQuotas(userId),
      this.getUsage(userId),
    ]);

    const remaining = remainingLlmTokens(quotas, usage);
    const allowed = remaining >= tokensNeeded;

    if (!allowed) {
      sentryService.captureMessage(
        `LLM quota exceeded for user ${userId}`,
        'warning',
        { tokensNeeded, remaining, limit: quotas.llmTokenLimit }
      );
    }

    return { allowed, remaining };
  }

  /**
   * Check if user can generate images
   */
  async canGenerateImages(userId: string, count: number): Promise<{ allowed: boolean; remaining: number }> {
    const [quotas, usage] = await Promise.all([
      this.getQuotas(userId),
      this.getUsage(userId),
    ]);

    const remaining = remainingImageGenerations(quotas, usage);
    const allowed = remaining >= count;

    if (!allowed) {
      sentryService.captureMessage(
        `Image quota exceeded for user ${userId}`,
        'warning',
        { requested: count, remaining, limit: quotas.imageGenerationLimit }
      );
    }

    return { allowed, remaining };
  }

  /**
   * Check if user can render video
   */
  async canRenderVideo(userId: string, minutes: number): Promise<{ allowed: boolean; remaining: number }> {
    const [quotas, usage] = await Promise.all([
      this.getQuotas(userId),
      this.getUsage(userId),
    ]);

    const remaining = remainingVideoMinutes(quotas, usage);
    const allowed = remaining >= minutes;

    if (!allowed) {
      sentryService.captureMessage(
        `Video quota exceeded for user ${userId}`,
        'warning',
        { requested: minutes, remaining, limit: quotas.videoRenderingLimit }
      );
    }

    return { allowed, remaining };
  }

  /**
   * Record LLM token usage
   */
  async recordLlmUsage(userId: string, tokensUsed: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const supabase = getSupabase();
      if (!supabase) return true;

      const month = getCurrentMonth();

      const { error } = await supabase.rpc('increment_usage', {
        user_id: userId,
        month_param: month,
        tokens_increment: tokensUsed,
      });

      if (error) {
        console.warn('⚠️ Failed to record LLM usage:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Usage recording error:', error);
      sentryService.captureException(error, { context: 'record_usage', userId, tokensUsed });
      return false;
    }
  }

  /**
   * Record image generation
   */
  async recordImageGeneration(userId: string, count: number = 1): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const supabase = getSupabase();
      if (!supabase) return true;

      const month = getCurrentMonth();

      const { data: usage } = await supabase
        .from('usage_records')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .single();

      if (usage) {
        await supabase
          .from('usage_records')
          .update({
            images_generated: (usage.images_generated || 0) + count,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('month', month);
      } else {
        await supabase.from('usage_records').insert({
          user_id: userId,
          month,
          images_generated: count,
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Image recording error:', error);
      return false;
    }
  }

  /**
   * Record video rendering
   */
  async recordVideoRendering(userId: string, minutes: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const supabase = getSupabase();
      if (!supabase) return true;

      const month = getCurrentMonth();

      const { data: usage } = await supabase
        .from('usage_records')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .single();

      if (usage) {
        await supabase
          .from('usage_records')
          .update({
            video_minutes_rendered: (usage.video_minutes_rendered || 0) + minutes,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('month', month);
      } else {
        await supabase.from('usage_records').insert({
          user_id: userId,
          month,
          video_minutes_rendered: minutes,
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Video recording error:', error);
      return false;
    }
  }

  /**
   * Update quotas (admin only)
   */
  async updateQuotas(userId: string, updates: Partial<UserQuotas>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const supabase = getSupabase();
      if (!supabase) return false;

      const { error } = await supabase
        .from('user_quotas')
        .update(updates)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Failed to update quotas:', error.message);
        return false;
      }

      // Invalidate cache
      this.cache.delete(userId);
      return true;
    } catch (error) {
      console.error('❌ Quota update error:', error);
      return false;
    }
  }

  /**
   * Clear cache for user
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }
}

export const quotaService = new QuotaService();
