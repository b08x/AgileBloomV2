import { AIModelConfig, AiProvider, Settings } from '../types';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export const PROVIDERS: Record<AiProvider, { name: string; website: string; logo: string; }> = {
    [AiProvider.Google]: { name: "Google", website: "https://aistudio.google.com/", logo: "💎" },
    [AiProvider.Mistral]: { name: "Mistral", website: "https://mistral.ai/", logo: "⚡️" },
    [AiProvider.OpenAI]: { name: "OpenAI", website: "https://openai.com/", logo: "🤖" },
    [AiProvider.OpenRouter]: { name: "OpenRouter", website: "https://openrouter.ai/", logo: "🔄" },
};

const ALL_MODELS_DB: AIModelConfig[] = [
    // --- Google Gemini Models ---
    { 
        id: 'gemini-2.5-flash', 
        name: 'Gemini 2.5 Flash', 
        provider: AiProvider.Google, 
        description: 'A fast, versatile model with Google Search and a configurable thinking budget for balancing latency and quality.', 
        supportsSearch: true,
        supportsVision: true,
        strengths: ["Speed & Low Latency", "Google Search Grounding", "Vision Capabilities", "Cost-Effective"],
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.7 },
            { id: 'topP', name: 'Top-P', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.95 },
            { id: 'topK', name: 'Top-K', type: 'slider', min: 1, max: 100, step: 1, defaultValue: 40 },
            { id: 'maxLength', name: 'Max Output Tokens', type: 'slider', min: 100, max: 2048, step: 64, defaultValue: 1024 },
            { id: 'thinkingBudget', name: 'Thinking Token Budget', type: 'slider', min: 0, max: 1000, step: 10, defaultValue: 200 },
        ]
    },
    // --- Mistral Models ---
    { 
        id: 'mistral-large-latest', 
        name: 'Mistral Large', 
        provider: AiProvider.Mistral, 
        description: 'Top-tier reasoning capacities, for complex, specialized tasks.', 
        supportsSearch: false,
        supportsVision: false,
        strengths: ["Complex Reasoning", "Code Generation", "Multilingual Support"],
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.7 },
        ]
    },
    { 
        id: 'mistral-medium-latest',
        name: 'Mistral Medium',
        provider: AiProvider.Mistral,
        description: 'A balanced model suitable for a variety of tasks.', 
        supportsSearch: false,
        supportsVision: false,
        strengths: ["Balanced Performance", "Good for General Tasks", "Efficient"],
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0.7 },
        ]
    },
    // --- OpenAI Models ---
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: AiProvider.OpenAI,
        description: 'The latest and most advanced model from OpenAI, with excellent vision capabilities.',
        supportsSearch: false,
        supportsVision: true,
        strengths: ["Advanced Vision", "Strong General Reasoning", "State-of-the-Art Performance"],
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
            { id: 'topP', name: 'Top-P', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 1 },
        ]
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: AiProvider.OpenAI,
        description: 'A fast and capable model, optimized for dialogue and general tasks.',
        supportsSearch: false,
        supportsVision: false,
        strengths: ["Fast Response Time", "Cost-Effective", "Good for Chat Applications"],
        parameters: [
            { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
            { id: 'topP', name: 'Top-P', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 1 },
        ]
    },
    // --- OpenRouter Models ---
    {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini (via OpenRouter)',
        provider: AiProvider.OpenRouter,
        description: 'A smaller, faster version of GPT-4o, available through OpenRouter.',
        supportsSearch: false,
        supportsVision: true,
        strengths: ["Speed", "Lower Cost", "Vision Support"],
        parameters: [
             { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
        ]
    },
    {
        id: 'google/gemma-3-27b-it',
        name: 'Gemma 3 27B (via OpenRouter)',
        provider: AiProvider.OpenRouter,
        description: 'Google\'s powerful new open model, available through OpenRouter.',
        supportsSearch: false,
        supportsVision: true,
        strengths: ["Open Model", "Strong Performance", "High Throughput"],
        parameters: [
             { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
        ]
    },
];

const modelCache = new Map<AiProvider, AIModelConfig[]>();

/**
 * Fetches available models for a given provider. Synchronous as it's from a static list.
 */
export const fetchModelsForProvider = (provider: AiProvider): AIModelConfig[] => {
    if (modelCache.has(provider)) {
        return modelCache.get(provider)!;
    }

    const models = ALL_MODELS_DB.filter(model => model.provider === provider);
    modelCache.set(provider, models);

    return models;
};

/**
 * Gets a single model's configuration by its ID.
 */
export const getModelConfigById = (modelId: string): AIModelConfig | undefined => {
    return ALL_MODELS_DB.find(model => model.id === modelId);
};

/**
 * Fetches a list of available models dynamically from a provider.
 */
export const fetchAvailableModels = async (settings: Settings): Promise<string[]> => {
  console.log("Fetching dynamic models for", settings.provider);
  const apiKey = settings.apiKey[settings.provider];
  
  if (!apiKey) {
    throw new Error(`API Key is missing for ${settings.provider}.`);
  }

  let fetchedModels: { id: string; name: string }[] = [];

  try {
    switch (settings.provider) {
      case AiProvider.Google: {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.list();
        for await (const model of response) {
          const id = model.name.replace('models/', '');
          fetchedModels.push({ id, name: model.displayName || id });
        }
        break;
      }
      case AiProvider.OpenAI: {
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        const response = await openai.models.list();
        fetchedModels = response.data.map(m => ({ id: m.id, name: m.id }));
        break;
      }
      case AiProvider.Mistral: {
        const res = await fetch('https://api.mistral.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`Mistral API error: ${res.statusText}`);
        const data = await res.json();
        fetchedModels = data.data.map((m: any) => ({ id: m.id, name: m.id }));
        break;
      }
      case AiProvider.OpenRouter: {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`OpenRouter API error: ${res.statusText}`);
        const data = await res.json();
        fetchedModels = data.data.map((m: any) => ({ id: m.id, name: m.name || m.id }));
        break;
      }
    }
  } catch (error) {
    console.error(`Error fetching models for ${settings.provider}:`, error);
    // Fallback to static models if dynamic fetching fails
    const staticModels = fetchModelsForProvider(settings.provider);
    if (staticModels.length > 0) {
      console.warn(`Falling back to static models for ${settings.provider}`);
      return staticModels.map(m => m.id);
    }
    throw error;
  }

  // Deduplicate fetchedModels by id
  const uniqueFetchedModels: { id: string; name: string }[] = [];
  const seenIds = new Set<string>();
  for (const model of fetchedModels) {
    if (!seenIds.has(model.id)) {
      seenIds.add(model.id);
      uniqueFetchedModels.push(model);
    }
  }

  // Add missing models to ALL_MODELS_DB
  for (const model of uniqueFetchedModels) {
    if (!ALL_MODELS_DB.find(m => m.id === model.id)) {
      ALL_MODELS_DB.push({
        id: model.id,
        name: model.name,
        provider: settings.provider,
        description: `Dynamically fetched model from ${settings.provider}`,
        supportsSearch: false,
        supportsVision: false,
        strengths: [],
        parameters: [
          { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
        ]
      });
    }
  }

  // Update the cache for this provider
  modelCache.set(settings.provider, ALL_MODELS_DB.filter(m => m.provider === settings.provider));

  return uniqueFetchedModels.map(m => m.id);
};
