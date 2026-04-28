import { BrandDNA, CampaignAsset, UserStory, HealingReport } from "../../../types";
import { validateAssetStrict } from "../ai/geminiCampaignService";

/**
 * Neural Validation
 * Performs a single pass quality check without recursive loops.
 */
export const healAsset = async (
  brand: BrandDNA,
  asset: Partial<CampaignAsset>,
  story: UserStory,
  maxRetries = 1,
  onLog?: (msg: string) => void
): Promise<{ asset: Partial<CampaignAsset>, report: HealingReport }> => {
  const currentAsset = { ...asset };

  if (onLog) onLog("Validating generated asset alignment...");
  const validation = await validateAssetStrict(brand, currentAsset, story);

  const finalReport: HealingReport = {
    attempt: 1,
    originalScore: validation.score,
    finalScore: validation.score,
    issuesDetected: validation.issues,
    fixApplied: "Direct Synthesis Validation",
    timestamp: new Date().toISOString()
  };

  if (onLog) {
    onLog(`Asset Processed. Quality Index: ${validation.score}`);
  }

  return {
    asset: currentAsset,
    report: finalReport
  };
};
