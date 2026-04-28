import { Lead } from "../../../types-extended";

export interface LeadScore {
  leadId: string;
  score: number;
  factors: ScoreFactor[];
  lastUpdated: Date;
}

export interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
}

export interface LeadActivity {
  leadId: string;
  timestamp: Date;
  action: string;
  details: Record<string, any>;
}

export const defaultLeadScoringWeights = {
  emailOpens: 5,
  emailClicks: 10,
  pageVisits: 3,
  formSubmissions: 25,
  purchaseHistory: 50,
  engagement: 15,
  timeOnSite: 2,
  socialEngagement: 8
} as const;

export const getWeightForAction = (action: string): number => {
  const actionWeights: Record<string, number> = {
    email_open: defaultLeadScoringWeights.emailOpens,
    email_click: defaultLeadScoringWeights.emailClicks,
    page_visit: defaultLeadScoringWeights.pageVisits,
    form_submission: defaultLeadScoringWeights.formSubmissions,
    purchase: defaultLeadScoringWeights.purchaseHistory,
    social_engagement: defaultLeadScoringWeights.socialEngagement
  };

  return actionWeights[action] || 1;
};

export const buildEmptyLeadScore = (leadId: string): LeadScore => ({
  leadId,
  score: 0,
  factors: [],
  lastUpdated: new Date()
});

export const applyActivityScore = (currentScore: number, action: string): number => {
  switch (action) {
    case 'email_open':
      return currentScore + defaultLeadScoringWeights.emailOpens;
    case 'email_click':
      return currentScore + defaultLeadScoringWeights.emailClicks;
    case 'page_visit':
      return currentScore + defaultLeadScoringWeights.pageVisits;
    case 'form_submission':
      return currentScore + defaultLeadScoringWeights.formSubmissions;
    case 'purchase':
      return currentScore + defaultLeadScoringWeights.purchaseHistory;
    case 'social_engagement':
      return currentScore + defaultLeadScoringWeights.socialEngagement;
    default:
      return currentScore;
  }
};

export const summarizeLeadScore = (lead: Lead, activities: LeadActivity[]): LeadScore => {
  const factors: Record<string, number> = {};

  for (const activity of activities) {
    factors[activity.action] = (factors[activity.action] || 0) + 1;
  }

  const scoreBreakdown: ScoreFactor[] = [];
  let totalScore = 0;

  for (const [action, count] of Object.entries(factors)) {
    const weight = getWeightForAction(action);
    const contribution = count * weight;
    totalScore += contribution;
    scoreBreakdown.push({
      name: action,
      weight,
      value: count,
      contribution
    });
  }

  const daysSinceCreated = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.max(0.5, 1 - (daysSinceCreated / 365) * 0.2);
  totalScore *= decayFactor;

  return {
    leadId: lead.id,
    score: Math.round(totalScore),
    factors: scoreBreakdown,
    lastUpdated: new Date()
  };
};
