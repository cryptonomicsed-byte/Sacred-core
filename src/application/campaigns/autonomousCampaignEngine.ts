import { BrandDNA, CampaignAsset, CampaignPRD, UserStory } from "../../../types";
import { generateAssetFromStory, generateCampaignImage } from "../../infrastructure/ai/geminiCampaignService";
import { healAsset } from "../../infrastructure/validation/assetHealer";
import { universalAiService } from "../../infrastructure/ai/universalAiService";
import { imageGenerationService } from "../../infrastructure/ai/imageGenerationService";
import { useStore } from "../../../store";

export type LogCallback = (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
export type ProgressCallback = (completed: number, total: number) => void;
export type AssetCallback = (asset: CampaignAsset) => void;
export type StoryUpdateCallback = (storyId: string, status: UserStory['status']) => void;

/**
 * Stratified Execution Engine
 * Eliminates polling loops in favor of pre-calculated dependency tiers.
 */
export class AutonomousCampaignEngine {
  private brand: BrandDNA;
  private prd: CampaignPRD;
  private onLog: LogCallback;
  private onProgress: ProgressCallback;
  private onAssetGenerated: AssetCallback;
  private onStoryUpdate: StoryUpdateCallback;
  private stopSignal = false;
  private processedCount = 0;

  constructor(
    brand: BrandDNA,
    prd: CampaignPRD,
    onLog: LogCallback,
    onProgress: ProgressCallback,
    onAssetGenerated: AssetCallback,
    onStoryUpdate: StoryUpdateCallback
  ) {
    this.brand = brand;
    this.prd = prd;
    this.onLog = onLog;
    this.onProgress = onProgress;
    this.onAssetGenerated = onAssetGenerated;
    this.onStoryUpdate = onStoryUpdate;
  }

  public stop() {
    this.stopSignal = true;
  }

  private calculateStrata(): UserStory[][] {
    const strata: UserStory[][] = [];
    const remaining = [...this.prd.userStories];
    const completedIds = new Set<string>();

    let safetyCounter = 0;
    while (remaining.length > 0 && safetyCounter < 10) {
      const currentLayer = remaining.filter(s =>
        s.dependencies.length === 0 || s.dependencies.every(id => completedIds.has(id))
      );

      if (currentLayer.length === 0) break;

      strata.push(currentLayer);
      currentLayer.forEach(s => {
        completedIds.add(s.id);
        const idx = remaining.indexOf(s);
        remaining.splice(idx, 1);
      });
      safetyCounter++;
    }

    if (remaining.length > 0) strata.push(remaining);

    return strata;
  }

  public async start() {
    this.onLog(`Initializing Stratified Forge for ${this.brand.name}...`, 'info');

    const strata = this.calculateStrata();
    const total = this.prd.userStories.length;
    this.processedCount = 0;

    for (const layer of strata) {
      if (this.stopSignal) break;

      this.onLog(`Processing Synthesis Layer ${strata.indexOf(layer) + 1}...`, 'info');
      await Promise.all(layer.map(story => this.executeStory(story)));

      this.processedCount += layer.length;
      this.onProgress(this.processedCount, total);
    }

    if (this.stopSignal) {
      this.onLog("Campaign Forge Halted by Operator.", 'warning');
    } else {
      this.onLog("Direct Strategy Synthesis Finalized.", 'success');
    }
  }

  private async executeStory(story: UserStory) {
    this.onStoryUpdate(story.id, 'generating');
    this.onLog(`[${story.channel.toUpperCase()}] Synthesizing Full Post...`, 'info');

    try {
      const { providers } = useStore.getState();
      const activeLLM = providers.activeLLM || 'gemini';
      const activeImage = providers.activeImage || 'stability-ultra';

      let rawAsset;
      if (activeLLM === 'gemini') {
        rawAsset = await generateAssetFromStory(this.brand, story);
      } else {
        const prompt = `Generate a complete campaign asset for this story:\n${JSON.stringify(story)}\n\nBrand context: ${this.brand.name}\n\nReturn valid JSON with: title, headline, content, platformPost, cta, imagePrompt (string), hashtags (array), metadata (object with platformConvention)`;
        const responseText = await universalAiService.generateText({
          prompt,
          responseMimeType: 'application/json',
          bypassCache: true
        });
        rawAsset = JSON.parse(responseText);
      }

      const { asset: finalAssetData, report } = await healAsset(
        this.brand,
        rawAsset,
        story,
        1,
        (msg) => this.onLog(`[AUDIT] ${msg}`, 'info')
      );

      let imageUrl = undefined;
      if (finalAssetData.imagePrompt) {
        this.onLog(`[MEDIA] Rendering Frame...`, 'info');
        try {
          const generatedImage = await imageGenerationService.generate({
            prompt: finalAssetData.imagePrompt,
            provider: activeImage,
            width: 1024,
            height: 1024
          });
          imageUrl = generatedImage.url;
        } catch (imageError) {
          this.onLog(`[MEDIA] Image generation failed, using fallback...`, 'warning');
          imageUrl = await generateCampaignImage(finalAssetData.imagePrompt, this.brand);
        }
      }

      const finalAsset: CampaignAsset = {
        id: crypto.randomUUID(),
        storyId: story.id,
        title: finalAssetData.title || 'Untitled Operation',
        headline: finalAssetData.headline,
        content: finalAssetData.content || '',
        platformPost: finalAssetData.platformPost || '',
        cta: finalAssetData.cta,
        imagePrompt: finalAssetData.imagePrompt,
        imageUrl: imageUrl,
        hashtags: finalAssetData.hashtags || [],
        metadata: {
          channel: story.channel,
          type: story.assetTypes[0],
          status: report.finalScore > 70 ? 'approved' : 'draft',
          qualityScore: report.finalScore,
          scheduledAt: this.calculateScheduleTime(story.dayOffset),
          platformConvention: finalAssetData.metadata?.platformConvention
        },
        healingHistory: [report]
      };

      this.onAssetGenerated(finalAsset);
      this.onStoryUpdate(story.id, 'completed');
    } catch (error) {
      this.onLog(`Critical failure in segment: ${story.id}. Link dropped.`, 'error');
      this.onStoryUpdate(story.id, 'failed');
    }
  }

  private calculateScheduleTime(dayOffset: number = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(9, 0, 0, 0);
    return date.toISOString();
  }
}
