
import { GoogleGenAI } from "@google/genai";
import { useStore } from "../store";
import { neuralCache } from "./neuralCache";
import { costTrackingService } from "./costTrackingService";

// Same-origin DeepSeek proxy when configured (key stays server-side); falls back to
// the public DeepSeek endpoint with the user's own key.
const AI_PROXY = (import.meta as any).env?.VITE_AI_PROXY as string | undefined;
const DEEPSEEK_BASE = AI_PROXY || 'https://api.deepseek.com';

export interface TextGenerationParams {
  systemInstruction?: string;
  prompt: string;
  responseMimeType?: string;
  responseSchema?: any;
  featureId?: string;
  bypassCache?: boolean;
  tools?: any[];
  modelOverride?: string;
}

export class AiServiceError extends Error {
  constructor(public message: string, public code?: string | number, public status?: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

/**
 * Robustly repairs truncated JSON by balancing braces and brackets.
 * Essential for models that hit token limits or cut off mid-response.
 */
const repairTruncatedJson = (json: string): string => {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }

  let repaired = json.trim();
  // If we're stuck inside a string, close it
  if (inString) repaired += '"';
  
  // Close open brackets and braces in reverse order
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }
  
  return repaired;
};

/**
 * Robust JSON extraction for noisy LLM outputs
 */
const cleanJsonResponse = (text: string): string => {
  if (!text) return '{}';
  
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\n?|```\n?/gi, '').trim();
  
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let start = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }

  if (start !== -1) {
    const candidate = cleaned.substring(start);
    return repairTruncatedJson(candidate);
  }

  return cleaned.startsWith('{') || cleaned.startsWith('[') ? repairTruncatedJson(cleaned) : '{}';
};

export const universalAiService = {
  async generateText(params: TextGenerationParams): Promise<string> {
    const { providers } = useStore.getState();
    const { activeLLM, keys } = providers;
    
    if (!params.bypassCache) {
      const cached = neuralCache.get(params.prompt, { activeLLM, sys: params.systemInstruction });
      if (cached) return cached;
    }

    const finalParams = { ...params };
    
    if (params.responseMimeType === 'application/json' && activeLLM !== 'gemini') {
      finalParams.prompt = `${params.prompt}\n\nCRITICAL: Return ONLY valid JSON. No conversational filler. Start with "{" or "[". BE EXTREMELY BRIEF to avoid token cut-off. Ensure output is balanced.`;
    }

    try {
      let result = '';
      switch (activeLLM) {
        case 'openai': 
          result = await this.generateOpenAI(finalParams, keys.openai); 
          break;
        case 'anthropic': 
          result = await this.generateAnthropic(finalParams, keys.anthropic); 
          break;
        case 'deepseek':
          result = await this.generateGenericOAI(finalParams, keys.deepseek || (AI_PROXY ? 'proxied' : ''), DEEPSEEK_BASE, 'deepseek-chat');
          break;
        case 'groq':
          result = await this.generateGenericOAI(finalParams, keys.groq, 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile');
          break;
        case 'mistral':
          result = await this.generateGenericOAI(finalParams, keys.mistral, 'https://api.mistral.ai/v1', 'mistral-large-latest');
          break;
        case 'gemini':
          const geminiKey = keys.gemini || process.env.API_KEY || '';
          result = await this.generateGemini(finalParams, geminiKey); 
          break;
        default: 
          const defaultKey = keys.gemini || process.env.API_KEY || '';
          if (!defaultKey) throw new AiServiceError(`No API Key configured for provider: ${activeLLM}`, "AUTH_MISSING");
          result = await this.generateGemini(finalParams, defaultKey); 
          break;
      }

      let processedResult = result;
      if (params.responseMimeType === 'application/json') {
        processedResult = cleanJsonResponse(result);
        try { 
          JSON.parse(processedResult); 
        } catch (e) { 
          console.error("JSON Recovery Failed. Attempting forced repair...", processedResult);
          // Last ditch repair
          if (!processedResult.endsWith('}')) processedResult += '}';
          try {
             JSON.parse(processedResult);
          } catch {
             processedResult = params.featureId ? "FALLBACK_TRIGGERED" : "{}"; 
          }
        }
      }

      if (!params.bypassCache && processedResult !== "FALLBACK_TRIGGERED") {
        neuralCache.set(params.prompt, { activeLLM, sys: params.systemInstruction }, processedResult);
      }

      // Track cost
      const cost = costTrackingService.estimateCost(activeLLM, 'text_generation');
      await costTrackingService.logUsage({
        provider: activeLLM,
        operationType: 'text_generation',
        cost: cost,
        metadata: { tokenEstimate: result.length }
      });

      return processedResult;
    } catch (error: any) {
      let msg = error.message || String(error);
      const isQuota = /429|quota|limit|balance|insufficient|RESOURCE_EXHAUSTED/i.test(msg);
      if (isQuota && params.featureId) return "FALLBACK_TRIGGERED";
      if (isQuota) throw new AiServiceError(`Neural Quota Exhausted for ${activeLLM}.`, "QUOTA_EXCEEDED");
      throw new AiServiceError(msg);
    }
  },

  async generateGemini(params: TextGenerationParams, key: string): Promise<string> {
    if (!key) throw new AiServiceError("Gemini Key Missing", "AUTH_MISSING");
    const ai = new GoogleGenAI({ apiKey: key });
    
    const response = await ai.models.generateContent({
      model: params.modelOverride || 'gemini-3-flash-preview',
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: params.responseMimeType,
        responseSchema: params.responseSchema,
        temperature: 0.1,
        tools: params.tools
      }
    });

    return response.text || '';
  },

  async generateOpenAI(params: TextGenerationParams, key?: string): Promise<string> {
    if (!key) throw new AiServiceError("OpenAI Key Missing", "AUTH_MISSING");
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          ...(params.systemInstruction ? [{ role: 'system', content: params.systemInstruction }] : []),
          { role: 'user', content: params.prompt }
        ],
        response_format: params.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
      })
    });
    const data = await response.json();
    if (data.error) throw new AiServiceError(data.error.message, data.error.code);
    return data.choices[0]?.message?.content || '';
  },

  async generateGenericOAI(params: TextGenerationParams, key: string | undefined, baseUrl: string, defaultModel: string): Promise<string> {
    if (!key) throw new AiServiceError(`API Key Missing for provider at ${baseUrl}`, "AUTH_MISSING");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: params.modelOverride || defaultModel,
        messages: [
          ...(params.systemInstruction ? [{ role: 'system', content: params.systemInstruction }] : []),
          { role: 'user', content: params.prompt }
        ],
        max_tokens: 4096,
        temperature: 0.1
      })
    });
    const data = await response.json();
    if (data.error) throw new AiServiceError(data.error.message || "Provider Error", data.error.code);
    return data.choices[0]?.message?.content || '';
  },

  async generateAnthropic(params: TextGenerationParams, key?: string): Promise<string> {
    if (!key) throw new AiServiceError("Anthropic Key Missing", "AUTH_MISSING");
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'x-api-key': key, 
        'anthropic-version': '2023-06-01', 
        'dangerously-allow-browser': 'true' 
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4096,
        system: params.systemInstruction,
        messages: [{ role: 'user', content: params.prompt }]
      })
    });
    const data = await res.json();
    if (data.error) throw new AiServiceError(data.error.message);
    return data.content[0]?.text || '';
  },

  async generateImage(prompt: string): Promise<string> {
    const { providers } = useStore.getState();
    const { activeImage, keys } = providers;
    try {
      if (activeImage === 'stability' && keys.stability) return await this.generateStability(prompt, keys.stability);
      if (activeImage === 'openai') return await this.generateDallE(prompt, keys.openai);
      
      const geminiKey = keys.gemini || process.env.API_KEY || '';
      return await this.generateGeminiImage(prompt, geminiKey);
    } catch (e) {
      console.error("Image generation failed:", e);
      return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80";
    }
  },

  async generateStability(prompt: string, key: string): Promise<string> {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'webp');
    formData.append('aspect_ratio', '1:1');

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/ultra', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json' 
      },
      body: formData
    });

    if (!res.ok) {
       const errData = await res.json();
       throw new Error(errData.errors?.[0] || "Stability API Error");
    }

    const data = await res.json();
    if (data.image) return `data:image/webp;base64,${data.image}`;
    throw new Error("Stability generation returned no image data.");
  },

  async generateGeminiImage(prompt: string, key: string): Promise<string> {
    if (!key) throw new Error("Gemini API Key missing for vision generation.");
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Media generation with gemini-2.5-flash-image requires parts-based contents
    const response = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [{ text: prompt }]
      } 
    });

    // Iterate through all parts to find the image part as required by instructions
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("Vision generation failed: No image data in response.");
  },

  async generateDallE(prompt: string, key?: string): Promise<string> {
    if (!key) throw new Error("OpenAI API Key missing for DALL-E.");
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, response_format: 'b64_json' })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
};
