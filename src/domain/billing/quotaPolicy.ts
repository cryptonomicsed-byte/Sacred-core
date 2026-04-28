export interface QuotaTotals {
  llmTokenLimit: number;
  imageGenerationLimit: number;
  videoRenderingLimit: number;
}

export interface UsageSnapshot {
  llmTokensUsed: number;
  imagesGenerated: number;
  videoMinutesRendered: number;
}

export const DEFAULT_QUOTA_TOTALS: QuotaTotals = {
  llmTokenLimit: 1000000,
  imageGenerationLimit: 500,
  videoRenderingLimit: 120
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const remainingLlmTokens = (totals: QuotaTotals, usage: UsageSnapshot): number =>
  totals.llmTokenLimit - usage.llmTokensUsed;

export const remainingImageGenerations = (totals: QuotaTotals, usage: UsageSnapshot): number =>
  totals.imageGenerationLimit - usage.imagesGenerated;

export const remainingVideoMinutes = (totals: QuotaTotals, usage: UsageSnapshot): number =>
  totals.videoRenderingLimit - usage.videoMinutesRendered;
