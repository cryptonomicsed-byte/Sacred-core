import { describe, it, expect, beforeEach } from 'vitest';
import { leadManagementService } from '../../services/leadManagementService';
import { hybridStorage } from '../../services/hybridStorageService';
import type { Lead } from '../../types-extended';

const baseLead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
  portfolioId: 'portfolio-1',
  name: 'Test Lead',
  email: 'lead@example.com',
  company: 'Acme',
  status: 'new',
  source: 'test',
  score: 0
};

describe('leadManagementService scoring', () => {
  beforeEach(async () => {
    await hybridStorage.clear();
    localStorage.clear();
  });

  it('creates a lead with a starting score of 0', async () => {
    const lead = await leadManagementService.createLead(baseLead);
    expect(lead.score).toBe(0);
    expect(lead.id).toMatch(/^lead-/);
  });

  it('increases score using the correct weight per activity type', async () => {
    const lead = await leadManagementService.createLead(baseLead);

    await leadManagementService.recordActivity(lead.id, 'email_open', {});
    let stored = await leadManagementService.getLead(lead.id);
    expect(stored?.score).toBe(5); // emailOpens weight

    await leadManagementService.recordActivity(lead.id, 'form_submission', {});
    stored = await leadManagementService.getLead(lead.id);
    expect(stored?.score).toBe(5 + 25); // + formSubmissions weight

    await leadManagementService.recordActivity(lead.id, 'purchase', {});
    stored = await leadManagementService.getLead(lead.id);
    expect(stored?.score).toBe(5 + 25 + 50); // + purchaseHistory weight
  });

  it('ignores unknown activity types (no score change)', async () => {
    const lead = await leadManagementService.createLead(baseLead);
    await leadManagementService.recordActivity(lead.id, 'unknown_action', {});
    const stored = await leadManagementService.getLead(lead.id);
    expect(stored?.score).toBe(0);
  });

  it('scoreLead recomputes total score as the sum of weighted activity counts', async () => {
    const lead = await leadManagementService.createLead(baseLead);
    await leadManagementService.recordActivity(lead.id, 'email_click', {}); // 10
    await leadManagementService.recordActivity(lead.id, 'email_click', {}); // 10
    await leadManagementService.recordActivity(lead.id, 'page_visit', {});  // 3

    const total = await leadManagementService.scoreLead(lead.id);
    // 2*10 (email_click) + 1*3 (page_visit) = 23, before recency decay
    expect(total).toBeCloseTo(23, 5);
  });

  it('sorts leads within a portfolio by descending score', async () => {
    const leadA = await leadManagementService.createLead(baseLead);
    const leadB = await leadManagementService.createLead({ ...baseLead, name: 'Lead B' });

    await leadManagementService.recordActivity(leadA.id, 'email_open', {}); // 5
    await leadManagementService.recordActivity(leadB.id, 'purchase', {});   // 50

    const leads = await leadManagementService.listLeadsByPortfolio('portfolio-1');
    expect(leads.map(l => l.id)).toEqual([leadB.id, leadA.id]);
  });

  it('filters leads by minimum score', async () => {
    const leadA = await leadManagementService.createLead(baseLead);
    const leadB = await leadManagementService.createLead({ ...baseLead, name: 'Lead B' });

    await leadManagementService.recordActivity(leadA.id, 'email_open', {}); // 5
    await leadManagementService.recordActivity(leadB.id, 'purchase', {});   // 50

    const hot = await leadManagementService.getLeadsByScore('portfolio-1', 20);
    expect(hot).toHaveLength(1);
    expect(hot[0].id).toBe(leadB.id);
  });
});
