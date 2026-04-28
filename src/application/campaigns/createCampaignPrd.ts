import { BrandDNA, CampaignPRD, CampaignOverview } from "../../../types";
import { generateAdvancedPRD } from "../../infrastructure/ai/geminiCampaignService";
import { universalAiService } from "../../infrastructure/ai/universalAiService";
import { useStore } from "../../../store";

/**
 * Strategy Blueprint Service
 * Initiates the multi-channel campaign PRD synthesis.
 * Routes to the selected LLM provider from settings.
 */
export const createCampaignPRD = async (
  brand: BrandDNA,
  overview: CampaignOverview,
  channels: string[]
): Promise<CampaignPRD> => {
  console.log(`[FORGE] Initiating Strategy Blueprint for: ${brand.name}`);

  const { providers } = useStore.getState();
  const activeLLM = providers.activeLLM || 'gemini';

  if (activeLLM === 'gemini') {
    return await generateAdvancedPRD(brand, overview, channels);
  }

  const prompt = `Generate a comprehensive campaign PRD (Product Requirements Document) for:

Brand: ${brand.name}
Mission: ${brand.mission}
Elevator Pitch: ${brand.elevatorPitch}
Target Audience: ${brand.targetAudience.join(', ')}

Campaign Overview:
- Goal: ${overview.goal}
- Timeline: ${overview.timeline}
- Constraints: ${(overview.constraints || []).join(', ') || 'None'}
- Channels: ${channels.join(', ')}

Return a JSON object with:
{
  "title": "string",
  "objectives": ["string"],
  "channels": [{ "name": "string", "strategy": "string", "budget": number }],
  "timeline": [{ "phase": "string", "duration": number, "activities": ["string"] }],
  "kpis": ["string"],
  "contentPillars": ["string"],
  "assets": [{ "type": "string", "description": "string", "count": number }]
}`;

  try {
    const result = await universalAiService.generateText({
      prompt,
      responseMimeType: 'application/json',
      bypassCache: true
    });

    const parsed = JSON.parse(result);

    return {
      title: parsed.title || `${brand.name} Campaign Strategy`,
      objectives: parsed.objectives || [],
      channels: parsed.channels || channels.map(c => ({ name: c, strategy: '', budget: 0 })),
      timeline: parsed.timeline || [],
      kpis: parsed.kpis || [],
      contentPillars: parsed.contentPillars || [],
      assets: parsed.assets || []
    } as CampaignPRD;
  } catch (error) {
    console.warn(`❌ ${activeLLM} PRD generation failed, falling back to Gemini:`, error);
    return await generateAdvancedPRD(brand, overview, channels);
  }
};
