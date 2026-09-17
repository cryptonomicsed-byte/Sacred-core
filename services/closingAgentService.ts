import { Lead } from '../types-extended';
import { universalAiService } from './universalAiService';
import { leadManagementService } from './leadManagementService';

export interface ClosingStrategy {
  leadId: string;
  readinessScore: number; // 0-100
  recommendedApproach: string;
  closingScript: string;
  objectionHandlers: Array<{ objection: string; response: string }>;
  proposalPoints: string[];
  urgencyTriggers: string[];
  closingQuestion: string;
  generatedAt: Date;
}

export interface DealReview {
  leadId: string;
  dealHealth: 'strong' | 'at-risk' | 'stalled';
  redFlags: string[];
  positiveSignals: string[];
  recommendedActions: string[];
  probabilityToClose: number; // 0-100
}

class ClosingAgentService {
  private readonly AGENT_ID = 'closing-agent-1';

  async generateClosingStrategy(lead: Lead, dealContext?: string): Promise<ClosingStrategy> {
    const prompt = `You are a B2B sales closing specialist. Generate a closing strategy for a qualified lead.

Lead:
- Name: ${lead.name}
- Company: ${lead.company}
- Status: ${lead.status}
- Engagement Score: ${lead.score}
- Notes: ${lead.notes || 'none'}
${dealContext ? `\nDeal Context: ${dealContext}` : ''}

Return JSON:
{
  "readinessScore": <0-100 integer based on status and score>,
  "recommendedApproach": "<consultative | assumptive | urgency | trial_close>",
  "closingScript": "<2-3 paragraph closing conversation script>",
  "objectionHandlers": [
    { "objection": "<common objection>", "response": "<handling response>" },
    { "objection": "<price objection>", "response": "<value-based response>" },
    { "objection": "<timing objection>", "response": "<urgency response>" }
  ],
  "proposalPoints": ["<key value point 1>", "<key value point 2>", "<key value point 3>"],
  "urgencyTriggers": ["<legitimate urgency reason 1>", "<urgency reason 2>"],
  "closingQuestion": "<specific closing question to ask>"
}`;

    try {
      const raw = await universalAiService.generateText({
        prompt,
        featureId: 'closing-strategy',
        responseMimeType: 'application/json',
      });

      const parsed = JSON.parse(raw);

      const result: ClosingStrategy = {
        leadId: lead.id,
        readinessScore: parsed.readinessScore ?? this.estimateReadiness(lead),
        recommendedApproach: parsed.recommendedApproach ?? 'consultative',
        closingScript: parsed.closingScript ?? '',
        objectionHandlers: parsed.objectionHandlers ?? this.defaultObjections(),
        proposalPoints: parsed.proposalPoints ?? [],
        urgencyTriggers: parsed.urgencyTriggers ?? [],
        closingQuestion: parsed.closingQuestion ?? `Based on everything we've discussed, does this solve the core challenge for ${lead.company}?`,
        generatedAt: new Date(),
      };

      await leadManagementService.recordActivity(lead.id, 'closing_strategy_generated', {
        readinessScore: result.readinessScore,
        approach: result.recommendedApproach,
        agent: this.AGENT_ID,
      });

      return result;
    } catch {
      return {
        leadId: lead.id,
        readinessScore: this.estimateReadiness(lead),
        recommendedApproach: 'consultative',
        closingScript: `Thank you for taking the time to explore this with us, ${lead.name}. Based on our conversations, I believe we've identified a clear path to [specific outcome] for ${lead.company}.\n\nI'd like to propose we move forward with a pilot engagement so you can see the value firsthand. This would give your team a risk-free way to validate the ROI before full commitment.\n\nWould you be comfortable moving forward with that approach?`,
        objectionHandlers: this.defaultObjections(),
        proposalPoints: [
          'Immediate reduction in manual workflow time',
          'Measurable ROI within 90 days',
          'Dedicated onboarding and support included',
        ],
        urgencyTriggers: [
          'Q4 budget needs to be allocated before year-end',
          'Current promotional pricing expires end of month',
        ],
        closingQuestion: `${lead.name}, what would need to be true for you to feel confident moving forward today?`,
        generatedAt: new Date(),
      };
    }
  }

  async reviewDeal(lead: Lead, conversationHistory?: string): Promise<DealReview> {
    const prompt = `You are a sales manager reviewing a deal. Assess deal health.

Lead:
- Name: ${lead.name}
- Company: ${lead.company}
- Status: ${lead.status}
- Score: ${lead.score}
${conversationHistory ? `\nConversation Notes: ${conversationHistory}` : ''}

Return JSON:
{
  "dealHealth": "strong" | "at-risk" | "stalled",
  "redFlags": ["<warning sign 1>", ...],
  "positiveSignals": ["<positive indicator 1>", ...],
  "recommendedActions": ["<specific action 1>", "<action 2>"],
  "probabilityToClose": <0-100 integer>
}`;

    try {
      const raw = await universalAiService.generateText({
        prompt,
        featureId: 'deal-review',
        responseMimeType: 'application/json',
      });

      const parsed = JSON.parse(raw);
      return { leadId: lead.id, ...parsed };
    } catch {
      const health = lead.score >= 70 ? 'strong' : lead.score >= 40 ? 'at-risk' : 'stalled';
      return {
        leadId: lead.id,
        dealHealth: health,
        redFlags: lead.status === 'qualified' && lead.score < 50 ? ['Low engagement despite qualification'] : [],
        positiveSignals: lead.score >= 50 ? ['Consistent engagement score'] : [],
        recommendedActions: [
          health === 'stalled' ? 'Re-engage with new value proposition' : 'Accelerate to proposal stage',
          'Schedule executive sponsor meeting',
        ],
        probabilityToClose: Math.min(95, Math.max(5, lead.score)),
      };
    }
  }

  async handleObjection(objection: string, lead: Lead, productContext?: string): Promise<string> {
    const prompt = `You are a skilled B2B sales closer. Handle this objection professionally.

Lead: ${lead.name} from ${lead.company}
Objection: "${objection}"
${productContext ? `Product Context: ${productContext}` : ''}

Provide a 2-3 sentence response that:
1. Acknowledges the concern
2. Reframes with value
3. Advances to next step

Return plain text response only.`;

    try {
      return await universalAiService.generateText({
        prompt,
        featureId: 'objection-handling',
      });
    } catch {
      return `I understand your concern about ${objection.toLowerCase()}. Many of our current clients had similar hesitations before they saw the impact firsthand. Could we schedule a brief call so I can walk you through exactly how we address that?`;
    }
  }

  async convertToCustomer(lead: Lead): Promise<Lead> {
    const updated = await leadManagementService.updateLeadStatus(lead.id, 'converted');
    await leadManagementService.recordActivity(lead.id, 'deal_closed', {
      agent: this.AGENT_ID,
      closedAt: new Date().toISOString(),
    });
    return updated;
  }

  private estimateReadiness(lead: Lead): number {
    const statusScore: Record<Lead['status'], number> = {
      new: 10,
      contacted: 30,
      qualified: 60,
      converted: 100,
      lost: 0,
    };
    return Math.min(100, (statusScore[lead.status] ?? 20) + Math.floor(lead.score * 0.4));
  }

  private defaultObjections() {
    return [
      {
        objection: 'It\'s too expensive',
        response: 'I hear you — let\'s look at the ROI. Our customers typically see a 3-5x return within 6 months. What does the cost of NOT solving this look like for you?',
      },
      {
        objection: 'We need more time to decide',
        response: 'Completely understandable. What specific information would help you decide faster? I want to make sure you have everything you need.',
      },
      {
        objection: 'We\'re happy with our current solution',
        response: 'That\'s great to hear. Most of our best customers said the same thing before they saw what they were leaving on the table. Would you be open to a 20-minute comparison?',
      },
    ];
  }
}

export const closingAgentService = new ClosingAgentService();
