
import { Campaign } from "../types";

export interface ScheduleParams {
  campaignId: string;
  scheduledAt: string;
  platforms: string[];
  content: {
    text: string;
    imageUrl?: string;
  };
}

export const autoPostService = {
  async scheduleCampaign(params: ScheduleParams): Promise<void> {
    try {
      const response = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Scheduling failed");
      }
    } catch (error) {
      console.error("Auto-post scheduling failed:", error);
      throw error;
    }
  }
};
