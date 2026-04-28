import { CloserPortfolio, LeadProfile } from "../../../types";
import { searchLeads } from "@infra/leads/leadResearchAdapter";
import { universalAiService } from "@infra/ai/universalAiService";

export { searchLeads as huntLeads };

export const generateCloserPortfolio = async (lead: LeadProfile): Promise<CloserPortfolio> => {
  const prompt = `
    Act as a World-Class Sales Strategist for CoreDNA.
    Create a "Closer Portfolio" to pitch CoreDNA to ${lead.companyName}.

    Company Context: ${lead.painPointDescription}
    Vulnerabilities identified: ${lead.vulnerabilities.join(', ')}

    Goal: Show them how our AI Brand DNA extraction and autonomous forge can fix their specific problems.

    Return JSON:
    {
      "subjectLine": "string",
      "emailBody": "string",
      "closingScript": "string",
      "objections": [{ "objection": "string", "rebuttal": "string" }],
      "followUpSequence": ["string"]
    }
  `;

  try {
    const response = await universalAiService.generateText({
      prompt,
      responseMimeType: 'application/json',
      featureId: 'closer-portfolio'
    });

    if (response === "FALLBACK_TRIGGERED") throw new Error("Synthesis limit reached.");

    const data = JSON.parse(response || '{}');
    return data as CloserPortfolio;
  } catch (error) {
    console.error("Portfolio generation failed", error);
    return {
      subjectLine: `Strategic Growth Proposal for ${lead.companyName}`,
      emailBody: `Hi ${lead.founderName || 'Team'},\n\nI noticed some opportunities to leverage CoreDNA to solve the ${lead.vulnerabilities[0] || 'marketing friction'} you're facing.`,
      closingScript: "Establish CoreDNA as the neural backbone for expansion.",
      objections: [{ objection: "We have an internal team", rebuttal: "CoreDNA empowers them to produce 10x output." }],
      followUpSequence: ["Day 2: Capability Deck"]
    };
  }
};
