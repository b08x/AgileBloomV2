import { AIModelConfig, AiProvider } from '../types';

// This data is moved from the old constants/providerConfig.ts
const ALL_MODELS_DB: AIModelConfig[] = [
    // --- Google Gemini Models ---
    { 
        id: 'gemini-2.5-flash', 
        name: 'Gemini 2.5 Flash', 
        provider: AiProvider.Google, 
        description: 'A fast, versatile model with Google Search and a configurable thinking budget for balancing latency and quality.', 
        supportsSearch: true,
        supportsVision: true,
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
        description: 'GPT-4o proxied through OpenRouter.',
        supportsSearch: false,
        supportsVision: true,
        parameters: [
             { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
        ]
    },
    {
        id: 'google/gemma-3-27b-it',
        name: 'Gemini Gemma 3-27b-it (via OpenRouter)',
        provider: AiProvider.OpenRouter,
        description: 'Gemini 1.5 Flash proxied through OpenRouter.',
        supportsSearch: false,
        supportsVision: true,
        parameters: [
             { id: 'temperature', name: 'Temperature', type: 'slider', min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
        ]
    },
];

const modelCache = new Map<AiProvider, AIModelConfig[]>();

/**
 * Fetches available models for a given provider, with caching.
 * This is now a synchronous operation.
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
 * This is now a synchronous operation.
 */
export const getModelConfigById = (modelId: string): AIModelConfig | undefined => {
    return ALL_MODELS_DB.find(model => model.id === modelId);
};