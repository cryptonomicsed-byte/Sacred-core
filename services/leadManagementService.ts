import { Lead } from '../types-extended';
import { hybridStorage } from './hybridStorageService';
import {
  LeadActivity,
  LeadScore,
  applyActivityScore,
  buildEmptyLeadScore,
  defaultLeadScoringWeights,
  getWeightForAction,
  summarizeLeadScore
} from "../src/domain/leads/leadScoring";

class LeadManagementService {
  private scoringWeights = defaultLeadScoringWeights;

  async createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: `lead-${Date.now()}`,
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
    const score: LeadScore = buildEmptyLeadScore(leadId);

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
    scoreData.score = applyActivityScore(scoreData.score, action);
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
    const summary = summarizeLeadScore(lead, activities);
    scoreData.factors = summary.factors;
    scoreData.score = summary.score;
    lead.score = scoreData.score;

    await hybridStorage.set(`lead-score-${leadId}`, scoreData);
    await hybridStorage.set(`lead-${leadId}`, lead);

    return scoreData.score;
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
