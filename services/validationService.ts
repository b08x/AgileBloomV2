import { GoogleGenAI } from '@google/genai';
import { generateText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import OpenAI from 'openai';
import { AiProvider } from '../types';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export async function validateApiKey(provider: AiProvider, apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { isValid: false, error: 'API Key cannot be empty.' };
  }

  try {
    switch (provider) {
      case AiProvider.Google:
        const geminiAi = new GoogleGenAI({ apiKey });
        await geminiAi.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: 'test'
        });
        return { isValid: true };

      case AiProvider.Mistral:
        const mistralProvider = createMistral({ apiKey });
        await generateText({
          model: mistralProvider('mistral-small-latest'),
          prompt: 'test',
        });
        return { isValid: true };
      
      case AiProvider.OpenAI:
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 2,
        });
        return { isValid: true };

      case AiProvider.OpenRouter:
        const openrouter = new OpenAI({ 
            apiKey, 
            baseURL: "https://openrouter.ai/api/v1",
            dangerouslyAllowBrowser: true 
        });
         await openrouter.chat.completions.create({
            model: 'google/gemini-flash-1.5',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 2,
        });
        return { isValid: true };
        
      default:
        return { isValid: false, error: `Validation for ${provider} is not implemented.` };
    }
  } catch (error: any) {
    console.error(`Validation failed for ${provider}:`, error);
    let errorMessage = "An unknown error occurred.";
    if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
    } else if (error.message) {
        errorMessage = error.message;
    }
    return { isValid: false, error: errorMessage };
  }
}