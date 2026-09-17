
import { Agent, AgentMessage } from "../types";
import { consultConfucius } from "./ccaService";
import { githubService } from "./githubService";
import { universalAiService } from "./universalAiService";
import { leadAgentService } from "./leadAgentService";
import { closingAgentService } from "./closingAgentService";
import { leadManagementService } from "./leadManagementService";

export const chatWithAgent = async (agent: Agent, history: AgentMessage[], userMessage: string): Promise<string> => {

  // Specialized Agent: Confucius Code Agent
  if (agent.id === 'cca-1') {
    const wisdom = await consultConfucius(userMessage);
    return `> *"${wisdom.aphorism}"*\n\n**🏛️ Architectural Advice:**\n${wisdom.architecturalAdvice}\n\n(Harmony: ${wisdom.harmonyScore}/100)`;
  }

  // Specialized Agent: Ralph
  if (agent.id === 'ralph-1') {
    const review = await githubService.reviewPullRequest(userMessage);
    return `**🔥 Snark Score: ${review.score}/10**\n\n${review.roast}`;
  }

  // Lead Agent — qualifies leads and generates outreach sequences
  if (agent.id === 'lead-agent-1') {
    const leadIdMatch = userMessage.match(/lead[:\-\s]+([a-z0-9\-]+)/i);
    if (leadIdMatch) {
      const lead = await leadManagementService.getLead(leadIdMatch[1]);
      if (lead) {
        const qualification = await leadAgentService.qualifyLead(lead, agent.knowledgeBase.join('\n'));
        return `**Lead Qualification: ${lead.name} @ ${lead.company}**\n\n` +
          `**Tier:** ${qualification.tier.toUpperCase()} (Score: ${qualification.qualificationScore}/100)\n\n` +
          `**Signals:**\n${qualification.signals.map(s => `• ${s}`).join('\n')}\n\n` +
          `**Next Action:** ${qualification.nextAction}\n\n` +
          `**Personalized Opener:**\n${qualification.personalizedOutreach}\n\n` +
          `**Qualification Questions:**\n${qualification.qualificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
      }
    }
    // Generate outreach if "outreach" keyword detected
    if (userMessage.toLowerCase().includes('outreach') || userMessage.toLowerCase().includes('sequence')) {
      const leads = await leadManagementService.getLeadsByScore('', 40);
      if (leads.length > 0) {
        const seq = await leadAgentService.generateOutreachSequence(leads[0], agent.knowledgeBase.join('\n'));
        return `**Outreach Sequence for ${leads[0].name}**\n\n` +
          seq.emails.map(e => `**Day ${e.day} — ${e.subject}**\n${e.body}`).join('\n\n---\n\n') +
          `\n\n**LinkedIn:** ${seq.linkedinMessage}\n\n**Call Opener:** ${seq.callScript}`;
      }
    }
    // Fall through to general chat with lead context
  }

  // Closing Agent — generates closing strategies and handles objections
  if (agent.id === 'closing-agent-1') {
    const leadIdMatch = userMessage.match(/lead[:\-\s]+([a-z0-9\-]+)/i);
    if (leadIdMatch) {
      const lead = await leadManagementService.getLead(leadIdMatch[1]);
      if (lead) {
        const strategy = await closingAgentService.generateClosingStrategy(lead, agent.knowledgeBase.join('\n'));
        return `**Closing Strategy: ${lead.name} @ ${lead.company}**\n\n` +
          `**Readiness:** ${strategy.readinessScore}/100 | **Approach:** ${strategy.recommendedApproach}\n\n` +
          `**Closing Script:**\n${strategy.closingScript}\n\n` +
          `**Proposal Points:**\n${strategy.proposalPoints.map(p => `• ${p}`).join('\n')}\n\n` +
          `**Objection Handlers:**\n${strategy.objectionHandlers.map(o => `**"${o.objection}"**\n→ ${o.response}`).join('\n\n')}\n\n` +
          `**Closing Question:** *${strategy.closingQuestion}*`;
      }
    }
    // Handle direct objection
    if (userMessage.toLowerCase().includes('objection:') || userMessage.toLowerCase().includes('they said:')) {
      const objText = userMessage.replace(/^.*?(objection:|they said:)\s*/i, '').trim();
      const response = await closingAgentService.handleObjection(objText, {
        id: 'unknown', name: 'Prospect', company: 'Company', email: '', status: 'qualified',
        score: 60, source: 'direct', createdAt: new Date(), updatedAt: new Date(), portfolioId: '',
      });
      return `**Objection Response:**\n\n${response}`;
    }
  }

  // Standard Agent Chat via Router
  const systemPrompt = `IDENTITY: ${agent.name}, Role: ${agent.role}, Personality: ${agent.personality}. Instruction: ${agent.systemInstruction}`;

  try {
    return await universalAiService.generateText({
      prompt: userMessage,
      systemInstruction: systemPrompt,
      featureId: 'agent-chat'
    });
  } catch (e) {
    console.error("Agent chat error", e);
    return "Neural link disrupted. Please verify provider status in Settings.";
  }
};

export { leadAgentService, closingAgentService };
