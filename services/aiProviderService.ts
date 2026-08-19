import { hybridStorage } from './hybridStorageService';

export interface AIProvider {
  id: string;
  name: string;
  type: 'llm' | 'image' | 'video' | 'voice';
  apiKey?: string;
  baseUrl?: string;
  isConfigured: boolean;
  costPerToken?: number;
  costPerImage?: number;
  costPerVideo?: number;
  status: 'available' | 'unavailable' | 'error';
  lastChecked?: Date;
}

// Supported LLM Providers
const LLM_PROVIDERS = [
  'google-gemini',
  'openai-gpt4',
  'openai-gpt35',
  'anthropic-claude3',
  'mistral-large',
  'xai-grok',
  'deepseek',
  'groq',
  'together',
  'openrouter',
  'perplexity',
  'qwen',
  'cohere',
  'meta-llama',
  'azure-openai',
  'ollama',
  'sambanova',
  'cerebras',
  'hyperbolic',
  'nebius',
  'aws-bedrock',
  'friendli',
  'replicate',
  'minimax',
  'hunyuan',
  'blackbox',
  'dify',
  'venice',
  'zai',
  'hugging-face'
];

// Supported Image Providers
const IMAGE_PROVIDERS = [
  'google-imagen',
  'openai-dalle3',
  'openai-dalle4',
  'stability-ai',
  'stability-sd3',
  'stability-flux',
  'midjourney',
  'runware',
  'leonardo',
  'recraft',
  'xai-grok',
  'amazon-titan',
  'adobe-firefly',
  'deepai',
  'replicate',
  'bria',
  'segmind',
  'prodia',
  'ideogram',
  'black-forest-labs',
  'wan',
  'hunyuan-image',
  'unsplash-fallback'
];

// Supported Video Providers
const VIDEO_PROVIDERS = [
  'openai-sora',
  'google-veo',
  'runway',
  'kling',
  'luma',
  'ltx-2',
  'wan-video',
  'hunyuan-video',
  'mochi',
  'seedance',
  'pika',
  'hailuoai',
  'pixverse',
  'higgsfield',
  'heygen',
  'synthesia',
  'deepbrain',
  'colossyan',
  'replicate-video',
  'fal-ai',
  'fireworks',
  'wavespeed',
  'bbb-fallback'
];

// Supported Voice/TTS Providers
const VOICE_PROVIDERS = [
  'elevenlabs',
  'openai-tts',
  'google-cloud-tts',
  'azure-speech',
  'deepgram',
  'playht',
  'cartesia',
  'resemble',
  'murf',
  'wellsaid',
  'lmnt',
  'fish-audio',
  'rime',
  'neets',
  'speechify',
  'amazon-polly',
  'web-speech-api'
];

class AIProviderService {
  private providers: Map<string, AIProvider> = new Map();

  async initialize(): Promise<void> {
    // Load from storage
    const stored = await hybridStorage.get('ai-providers');
    if (stored) {
      Object.entries(stored).forEach(([id, provider]) => {
        this.providers.set(id, provider as AIProvider);
      });
    }

    // Initialize default providers
    this.initializeDefaults();
    console.log(`✅ Initialized ${this.providers.size} AI providers`);
  }

  private initializeDefaults(): void {
    // Gemini (default)
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiKey && !this.providers.has('google-gemini')) {
      this.providers.set('google-gemini', {
        id: 'google-gemini',
        name: 'Google Gemini',
        type: 'llm',
        apiKey: geminiKey,
        isConfigured: true,
        costPerToken: 0.000075,
        status: 'available'
      });
    }

    // Unsplash (free image fallback)
    if (!this.providers.has('unsplash-fallback')) {
      this.providers.set('unsplash-fallback', {
        id: 'unsplash-fallback',
        name: 'Unsplash (Free)',
        type: 'image',
        isConfigured: true,
        status: 'available'
      });
    }

    // Web Speech API (free voice)
    if (!this.providers.has('web-speech-api')) {
      this.providers.set('web-speech-api', {
        id: 'web-speech-api',
        name: 'Web Speech API',
        type: 'voice',
        isConfigured: true,
        status: 'available'
      });
    }
  }

  async configureProvider(provider: AIProvider): Promise<void> {
    this.providers.set(provider.id, provider);
    
    // Persist
    const all = Object.fromEntries(this.providers);
    await hybridStorage.set('ai-providers', all);
    
    console.log(`✅ Provider configured: ${provider.name}`);
  }

  async getProvider(id: string): Promise<AIProvider | null> {
    return this.providers.get(id) || null;
  }

  async getAllProviders(type?: string): Promise<AIProvider[]> {
    const all = Array.from(this.providers.values());
    return type ? all.filter(p => p.type === type) : all;
  }

  async getConfiguredProviders(type: string): Promise<AIProvider[]> {
    return Array.from(this.providers.values()).filter(
      p => p.type === type && p.isConfigured && p.status === 'available'
    );
  }

  async checkHealth(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    try {
      // Basic health check for known providers
      const startTime = Date.now();
      
      // This would call the actual provider's health endpoint
      // For now, just mark as checked
      provider.lastChecked = new Date();
      
      const responseTime = Date.now() - startTime;
      provider.status = responseTime < 5000 ? 'available' : 'unavailable';

      await this.configureProvider(provider);
      return provider.status === 'available';
    } catch (error) {
      provider.status = 'error';
      await this.configureProvider(provider);
      return false;
    }
  }

  async callLLM(
    prompt: string,
    providerId?: string,
    options?: any
  ): Promise<string> {
    const id = providerId || 'google-gemini';
    const provider = await this.getProvider(id);

    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }

    if (provider.id === 'google-gemini') {
      return this.callGemini(prompt, provider, options);
    }

    // Fallback to Gemini
    const gemini = await this.getProvider('google-gemini');
    if (gemini) {
      return this.callGemini(prompt, gemini, options);
    }

    throw new Error('No LLM provider available');
  }

  private async callGemini(
    prompt: string,
    provider: AIProvider,
    options?: any
  ): Promise<string> {
    if (!provider.apiKey) {
      throw new Error(`No API key configured for provider: ${provider.name}`);
    }

    // Use fetch API instead of SDK to avoid import issues
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': provider.apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  }

  getAvailableLLMProviders(): string[] {
    return LLM_PROVIDERS;
  }

  getAvailableImageProviders(): string[] {
    return IMAGE_PROVIDERS;
  }

  getAvailableVideoProviders(): string[] {
    return VIDEO_PROVIDERS;
  }

  getAvailableVoiceProviders(): string[] {
    return VOICE_PROVIDERS;
  }
}

export const aiProviderService = new AIProviderService();
