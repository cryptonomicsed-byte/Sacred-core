import { Lead } from '../types-extended';
import { universalAiService } from './universalAiService';
import { leadManagementService } from './leadManagementService';

export interface LeadQualification {
  leadId: string;
  qualificationScore: number; // 0-100
  tier: 'hot' | 'warm' | 'cold' | 'disqualified';
  signals: string[];
  nextAction: string;
  personalizedOutreach: string;
  qualificationQuestions: string[];
  generatedAt: Date;
}

export interface LeadOutreachSequence {
  leadId: string;
  subject: string;
  emails: Array<{
    day: number;
    subject: string;
    body: string;
  }>;
  linkedinMessage: string;
  callScript: string;
}

class LeadAgentService {
  private readonly AGENT_ID = 'lead-agent-1';

  async qualifyLead(lead: Lead, brandContext?: string): Promise<LeadQualification> {
    const prompt = `You are a B2B lead qualification specialist.

Lead Data:
- Name: ${lead.name}
- Company: ${lead.company}
- Email: ${lead.email}
- Status: ${lead.status}
- Engagement Score: ${lead.score}
- Source: ${lead.source}
- Notes: ${lead.notes || 'none'}
${brandContext ? `\nBrand Context: ${brandContext}` : ''}

Analyze this lead and return a JSON object with:
{
  "qualificationScore": <0-100 integer>,
  "tier": "hot" | "warm" | "cold" | "disqualified",
  "signals": ["<positive signal 1>", "<positive signal 2>", ...],
  "nextAction": "<specific next step>",
  "personalizedOutreach": "<2-3 sentence personalized opening for first contact>",
  "qualificationQuestions": ["<question 1>", "<question 2>", "<question 3>"]
}`;

    try {
      const raw = await universalAiService.generateText({
        prompt,
        featureId: 'lead-qualify',
        responseMimeType: 'application/json',
      });

      const parsed = JSON.parse(raw);

      const result: LeadQualification = {
        leadId: lead.id,
        qualificationScore: parsed.qualificationScore ?? lead.score,
        tier: parsed.tier ?? this.scoreTier(lead.score),
        signals: parsed.signals ?? [],
        nextAction: parsed.nextAction ?? 'Follow up within 24 hours',
        personalizedOutreach: parsed.personalizedOutreach ?? '',
        qualificationQuestions: parsed.qualificationQuestions ?? [],
        generatedAt: new Date(),
      };

      // Update lead status if now qualified
      if (result.tier === 'hot' && lead.status === 'contacted') {
        await leadManagementService.updateLeadStatus(lead.id, 'qualified');
        await leadManagementService.recordActivity(lead.id, 'ai_qualification', {
          tier: result.tier,
          score: result.qualificationScore,
          agent: this.AGENT_ID,
        });
      }

      return result;
    } catch (err) {
      // Fallback qualification from existing score data
      return {
        leadId: lead.id,
        qualificationScore: lead.score,
        tier: this.scoreTier(lead.score),
        signals: lead.score > 50 ? ['Existing engagement signals'] : [],
        nextAction: lead.status === 'new' ? 'Send initial outreach email' : 'Schedule discovery call',
        personalizedOutreach: `Hi ${lead.name}, I noticed your interest in our platform…`,
        qualificationQuestions: [
          'What is your current challenge with your marketing pipeline?',
          'What is your timeline for implementing a solution?',
          'Who else is involved in this decision?',
        ],
        generatedAt: new Date(),
      };
    }
  }

  async generateOutreachSequence(lead: Lead, brandContext?: string): Promise<LeadOutreachSequence> {
    const prompt = `You are a B2B sales copywriter creating a multi-touch outreach sequence.

Lead:
- Name: ${lead.name}
- Company: ${lead.company}
- Source: ${lead.source}
- Score: ${lead.score}
${brandContext ? `\nProduct/Brand Context: ${brandContext}` : ''}

Generate a JSON outreach sequence:
{
  "subject": "<cold email subject line>",
  "emails": [
    { "day": 1, "subject": "<subject>", "body": "<100-150 word email body>" },
    { "day": 4, "subject": "<follow-up subject>", "body": "<80-100 word follow-up>" },
    { "day": 10, "subject": "<breakup subject>", "body": "<50-70 word final touch>" }
  ],
  "linkedinMessage": "<150 char LinkedIn connection message>",
  "callScript": "<60-second cold call opener script>"
}`;

    try {
      const raw = await universalAiService.generateText({
        prompt,
        featureId: 'lead-outreach',
        responseMimeType: 'application/json',
      });

      const parsed = JSON.parse(raw);
      return { leadId: lead.id, ...parsed };
    } catch {
      return {
        leadId: lead.id,
        subject: `Quick question for ${lead.company}`,
        emails: [
          {
            day: 1,
            subject: `Quick question for ${lead.company}`,
            body: `Hi ${lead.name},\n\nI came across ${lead.company} and noticed you might benefit from our platform. We help teams like yours streamline their marketing workflow.\n\nWould you be open to a 15-minute call this week?\n\nBest,`,
          },
          {
            day: 4,
            subject: `Re: Quick question for ${lead.company}`,
            body: `Hi ${lead.name},\n\nJust circling back on my previous note. Happy to share a quick case study relevant to ${lead.company}.\n\nDoes Thursday or Friday work?\n\nBest,`,
          },
          {
            day: 10,
            subject: `Closing the loop`,
            body: `Hi ${lead.name},\n\nI'll stop reaching out after this — I know your inbox is busy. If the timing is ever right, feel free to reach back out.\n\nWishing you well,`,
          },
        ],
        linkedinMessage: `Hi ${lead.name}, saw some great work from ${lead.company}. I'd love to connect and share how we help similar teams.`,
        callScript: `Hi ${lead.name}, this is [Name] from [Company]. I know this is out of the blue — I'll be brief. We work with companies like ${lead.company} to [benefit]. I had a quick question about your current [pain point]. Do you have 2 minutes?`,
      };
    }
  }

  async bulkQualify(leads: Lead[], brandContext?: string): Promise<LeadQualification[]> {
    return Promise.all(leads.map(l => this.qualifyLead(l, brandContext)));
  }

  private scoreTier(score: number): LeadQualification['tier'] {
    if (score >= 80) return 'hot';
    if (score >= 50) return 'warm';
    if (score >= 20) return 'cold';
    return 'disqualified';
  }
}

export const leadAgentService = new LeadAgentService();
