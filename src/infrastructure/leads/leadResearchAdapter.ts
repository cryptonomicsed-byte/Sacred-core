import { universalAiService } from "@infra/ai/universalAiService";
import { LeadProfile } from "../../../types";

export interface GroundedLeadResult {
  leads: LeadProfile[];
  sources: { title: string; uri: string }[];
}

export const searchLeads = async (
  industry: string,
  location: string,
  coords?: { lat: number; lng: number }
): Promise<GroundedLeadResult> => {
  const locationContext = coords
    ? `near geographic coordinates ${coords.lat}, ${coords.lng} (${location})`
    : `in ${location}`;

  const prompt = `
    Find 5 REAL, currently active companies in the "${industry}" sector ${locationContext}.

    For each company:
    1. Identify their official website.
    2. Analyze their likely branding or marketing gaps.
    3. Determine how CoreDNA (an AI Brand Intelligence platform) would specifically help them scale or fix these issues.
    4. Estimate their size (headcount/revenue).
    5. Identify a key decision maker if possible.

    CRITICAL: You MUST use Search to find actual, existing businesses. Do not hallucinate names.

    Return a JSON object with this EXACT structure:
    {
      "leads": [
        {
          "companyName": "string",
          "industry": "string",
          "location": "string",
          "website": "string",
          "founderName": "string",
          "opportunityScore": number (0-100),
          "painPointDescription": "string",
          "vulnerabilities": ["string"],
          "techStack": ["string"],
          "estimatedRevenue": "string",
          "headcount": "string"
        }
      ]
    }
  `;

  const text = await universalAiService.generateText({
    prompt,
    responseMimeType: 'application/json',
    featureId: 'lead-hunting',
    tools: [{ googleSearch: {} }]
  });

  if (text === "FALLBACK_TRIGGERED") throw new Error("Neural search limit reached.");

  const data = JSON.parse(text || '{"leads":[]}');
  const leads = (data.leads || []).map((l: any) => ({
    ...l,
    id: crypto.randomUUID(),
    status: 'new',
    industry: l.industry || industry,
    location: l.location || location
  })) as LeadProfile[];

  return { leads, sources: [] };
};
