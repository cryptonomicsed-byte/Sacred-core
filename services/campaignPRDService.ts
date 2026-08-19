
import { BrandDNA, CampaignPRD, CampaignOverview } from "../types";
import { generateAdvancedPRD } from "./geminiService";

/**
 * Strategy Blueprint Service
 * Initiates the multi-channel campaign PRD synthesis.
 *
 * generateAdvancedPRD() itself calls universalAiService.generateText(), which
 * already routes to whichever LLM provider is active in the store — so there's
 * no need to special-case providers here.
 */
export const createCampaignPRD = async (
  brand: BrandDNA,
  overview: CampaignOverview,
  channels: string[]
): Promise<CampaignPRD> => {
  console.log(`[FORGE] Initiating Strategy Blueprint for: ${brand.name}`);
  return await generateAdvancedPRD(brand, overview, channels);
};
