/**
 * Feature Flag Service
 * 
 * Manages feature toggles stored in Supabase table.
 * Provides caching (5 min TTL) and fallback behavior.
 * 
 * Usage:
 *   const isEnabled = await featureFlagService.isFeatureEnabled('video_generation');
 *   if (isEnabled) { showVideoFeature(); }
 * 
 * Zustand Hook:
 *   const flags = useFeatureFlags();
 *   const hasVideos = flags.videoGeneration;
 */

export * from "../src/infrastructure/state/featureFlagService";

/**
 * React Hook for using feature flags
 * 
 * Usage in components:
 *   const flags = useFeatureFlags();
 *   if (flags.videoGeneration) { <VideoComponent /> }
 */
export function useFeatureFlags() {
  // This is a placeholder. Full implementation requires Zustand integration.
  // For now, return a hook that fetches on mount.
  // See: createFeatureFlagsStore() below for Zustand integration.
}

/**
 * Zustand store creator for feature flags
 * 
 * Usage:
 *   const useFeatureFlags = createFeatureFlagsStore();
 *   const { videoGeneration, imageGeneration, refresh } = useFeatureFlags();
 */
export const createFeatureFlagsStore = () => {
  // This is created in store.ts where Zustand is imported
  // Prevents circular dependencies
};

/**
 * Utility: camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Utility: snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Pre-fetch flags on service load for quick initial access
if (isSupabaseConfigured()) {
  featureFlagService.refresh().catch((err) => {
    console.warn('⚠️ Initial feature flag load failed (will use defaults):', err);
  });
}
