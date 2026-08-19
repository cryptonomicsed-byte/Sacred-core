import { Lead } from '../types-extended';
import { hybridStorage } from './hybridStorageService';

interface LeadScore {
  leadId: string;
  score: number;
  factors: ScoreFactor[];
  lastUpdated: Date;
}

interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
}

interface LeadActivity {
  leadId: string;
  timestamp: Date;
  action: string;
  details: Record<string, any>;
}

class LeadManagementService {
  private scoringWeights = {
    emailOpens: 5,
    emailClicks: 10,
    pageVisits: 3,
    formSubmissions: 25,
    purchaseHistory: 50,
    engagement: 15,
    timeOnSite: 2,
    socialEngagement: 8
  };

  async createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: `lead-${crypto.randomUUID()}`,
      score: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await hybridStorage.set(`lead-${newLead.id}`, newLead);
    console.log(`✅ Lead created: ${newLead.name}`);

    // Initialize score
    await this.initializeScore(newLead.id);

    return newLead;
  }

  async getLead(id: string): Promise<Lead | null> {
    return await hybridStorage.get(`lead-${id}`);
  }

  async listLeadsByPortfolio(portfolioId: string): Promise<Lead[]> {
    const allData = await hybridStorage.getAll();
    const leads: Lead[] = [];

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('lead-') && value && value.portfolioId === portfolioId) {
        leads.push(value);
      }
    }

    return leads.sort((a, b) => b.score - a.score);
  }

  async updateLeadStatus(id: string, status: Lead['status']): Promise<Lead> {
    const lead = await this.getLead(id);
    if (!lead) throw new Error('Lead not found');

    lead.status = status;
    lead.updatedAt = new Date();

    await hybridStorage.set(`lead-${id}`, lead);
    
    // Log activity
    await this.logActivity(id, 'status_change', { newStatus: status });
    console.log(`✅ Lead status updated: ${lead.name} → ${status}`);

    return lead;
  }

  private async initializeScore(leadId: string): Promise<void> {
    const score: LeadScore = {
      leadId,
      score: 0,
      factors: [],
      lastUpdated: new Date()
    };

    await hybridStorage.set(`lead-score-${leadId}`, score);
  }

  async recordActivity(leadId: string, action: string, details: Record<string, any>): Promise<void> {
    const activity: LeadActivity = {
      leadId,
      timestamp: new Date(),
      action,
      details
    };

    const activities = (await hybridStorage.get(`lead-activities-${leadId}`)) || [];
    activities.push(activity);
    await hybridStorage.set(`lead-activities-${leadId}`, activities);

    // Update score based on activity
    await this.updateScore(leadId, action, details);
    console.log(`📊 Activity recorded for lead: ${action}`);
  }

  private async logActivity(leadId: string, action: string, details: Record<string, any>): Promise<void> {
    await this.recordActivity(leadId, action, details);
  }

  private async updateScore(leadId: string, action: string, details: Record<string, any>): Promise<void> {
    const lead = await this.getLead(leadId);
    if (!lead) return;

    const scoreData = await hybridStorage.get(`lead-score-${leadId}`);
    if (!scoreData) return;

    // Calculate score increase based on action
    let scoreIncrease = 0;

    switch (action) {
      case 'email_open':
        scoreIncrease = this.scoringWeights.emailOpens;
        break;
      case 'email_click':
        scoreIncrease = this.scoringWeights.emailClicks;
        break;
      case 'page_visit':
        scoreIncrease = this.scoringWeights.pageVisits;
        break;
      case 'form_submission':
        scoreIncrease = this.scoringWeights.formSubmissions;
        break;
      case 'purchase':
        scoreIncrease = this.scoringWeights.purchaseHistory;
        break;
      case 'social_engagement':
        scoreIncrease = this.scoringWeights.socialEngagement;
        break;
    }

    scoreData.score += scoreIncrease;
    lead.score = scoreData.score;
    scoreData.lastUpdated = new Date();

    await hybridStorage.set(`lead-score-${leadId}`, scoreData);
    await hybridStorage.set(`lead-${leadId}`, lead);
  }

  async getLeadScore(leadId: string): Promise<LeadScore | null> {
    return await hybridStorage.get(`lead-score-${leadId}`);
  }

  async getLeadActivities(leadId: string, limit = 50): Promise<LeadActivity[]> {
    const activities = (await hybridStorage.get(`lead-activities-${leadId}`)) || [];
    return activities.slice(-limit).reverse();
  }

  async scoreLead(leadId: string): Promise<number> {
    const lead = await this.getLead(leadId);
    if (!lead) throw new Error('Lead not found');

    const activities = await this.getLeadActivities(leadId, 100);
    const scoreData: LeadScore = {
      leadId,
      score: 0,
      factors: [],
      lastUpdated: new Date()
    };

    // Calculate factors
    const factors: Record<string, number> = {};

    for (const activity of activities) {
      factors[activity.action] = (factors[activity.action] || 0) + 1;
    }

    // Apply weights
    let totalScore = 0;
    for (const [action, count] of Object.entries(factors)) {
      const weight = this.getWeightForAction(action);
      const contribution = count * weight;
      totalScore += contribution;

      scoreData.factors.push({
        name: action,
        weight,
        value: count,
        contribution
      });
    }

    // Decay score for older activities
    const daysSinceCreated = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.max(0.5, 1 - (daysSinceCreated / 365) * 0.2);
    totalScore *= decayFactor;

    scoreData.score = Math.round(totalScore);
    lead.score = scoreData.score;

    await hybridStorage.set(`lead-score-${leadId}`, scoreData);
    await hybridStorage.set(`lead-${leadId}`, lead);

    return totalScore;
  }

  private getWeightForAction(action: string): number {
    const actionWeights: Record<string, number> = {
      'email_open': this.scoringWeights.emailOpens,
      'email_click': this.scoringWeights.emailClicks,
      'page_visit': this.scoringWeights.pageVisits,
      'form_submission': this.scoringWeights.formSubmissions,
      'purchase': this.scoringWeights.purchaseHistory,
      'social_engagement': this.scoringWeights.socialEngagement
    };

    return actionWeights[action] || 1;
  }

  async getLeadsByScore(portfolioId: string, minScore: number = 0): Promise<Lead[]> {
    const leads = await this.listLeadsByPortfolio(portfolioId);
    return leads.filter(l => l.score >= minScore);
  }

  async generateLeadReport(portfolioId: string): Promise<any> {
    const leads = await this.listLeadsByPortfolio(portfolioId);

    const report = {
      totalLeads: leads.length,
      byStatus: {
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        qualified: leads.filter(l => l.status === 'qualified').length,
        converted: leads.filter(l => l.status === 'converted').length,
        lost: leads.filter(l => l.status === 'lost').length
      },
      averageScore: leads.reduce((sum, l) => sum + l.score, 0) / leads.length,
      topLeads: leads.slice(0, 10),
      hotLeads: leads.filter(l => l.score >= 100)
    };

    console.log(`📊 Lead report generated for portfolio`);
    return report;
  }
}

export const leadManagementService = new LeadManagementService();
