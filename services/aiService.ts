import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import OpenAI from 'openai';
import { DiscussionMessage, Expert, ExpertRole, GeminiResponseJson, UploadedFile, AiProvider } from '../types';
import { INITIAL_SYSTEM_PROMPT_TEMPLATE, FISH_STORY_TASK_ANALYSIS_PROMPT, SUPPORTED_IMAGE_MIME_TYPES, ROLE_SCRUM_LEADER } from '../constants';
import { getModelConfigById } from './modelService';
import useAgileBloomStore from '../store/useAgileBloomStore';

// --- Helper Functions ---

const escapeForJsonString = (str: string | null | undefined): string => {
  if (!str) return "";
  // JSON.stringify escapes quotes, backslashes, newlines, and all control characters.
  // We slice to remove the outer quotes that stringify adds.
  return JSON.stringify(str).slice(1, -1);
};


function buildSystemPrompt(
  currentTopic: string | null,
  discussionHistory: DiscussionMessage[],
  numThoughts: number,
  memoryContext: string[],
  emulateExpertAs: ExpertRole | undefined,
  initialContext: string | null | undefined,
  assignedTasksContext: string | null | undefined,
  currentUserMessageOrCommand: string
): string {
    const { experts, selectedExpertRoles } = useAgileBloomStore.getState();
    let emulationInstructions = "";
    let responsePersonaInstruction = "Determine who should respond based on the flow of an Agile Daily Scrum, the current user input/command, and conversation history.";
    let specificTaskInstructions = "";
    
    const activeExperts = selectedExpertRoles.map(role => experts[role]).filter(Boolean);
    const expertListForPrompt = activeExperts.map(expert => `- ${escapeForJsonString(expert.name)} (${expert.emoji}): ${escapeForJsonString(expert.description)}`).join('\n');

    if (emulateExpertAs) {
        const expertToEmulate = experts[emulateExpertAs];
        emulationInstructions = `\nYou are currently emulating: ${escapeForJsonString(expertToEmulate.name)} (${expertToEmulate.emoji}). Your response MUST be from this expert's perspective.`;
        responsePersonaInstruction = `You MUST respond as ${escapeForJsonString(expertToEmulate.name)}. The "expert" field in your JSON output MUST be "${escapeForJsonString(expertToEmulate.name)}".`;

        if (emulateExpertAs === ROLE_SCRUM_LEADER) {
            if (currentUserMessageOrCommand.toLowerCase().includes("perform a fish analysis on the following item")) {
                specificTaskInstructions = `\nFollow these specific instructions for the FISH Analysis on the item provided by the user: \n${FISH_STORY_TASK_ANALYSIS_PROMPT}`;
            } else if (currentUserMessageOrCommand.toLowerCase().startsWith("/backlog")) {
                specificTaskInstructions = `\nUser command is /backlog. Provide a health check of the product backlog. In your main 'message', summarize the number of stories and tasks in each status. Point out any items that seem high-risk, poorly defined, or have been inactive for a long time. Suggest 1-2 items that might benefit from a detailed \`/analyze {id}\` command.`;
            }
        }
    }

    const formattedMemory = memoryContext.length > 0
        ? memoryContext.map(entry => `- ${escapeForJsonString(entry)}`).join('\n')
        : "No key points remembered yet.";

    const additionalContextSection = (initialContext && initialContext.trim() !== '')
        ? `\n--- Start of Additional Context ---\nThis initial context was provided by the user to set the stage for the entire discussion:\n\n${escapeForJsonString(initialContext.trim())}\n\n--- End of Additional Context ---\n`
        : "";
    
    const assignedTasksSection = (assignedTasksContext && assignedTasksContext.trim() !== '')
        ? `\n--- Start of Your Assigned Tasks ---\nThis is a list of tasks currently assigned to you. When responding to commands like /show-work, please focus your response on these tasks.\n\n${escapeForJsonString(assignedTasksContext.trim())}\n--- End of Your Assigned Tasks ---\n`
        : "";

    const historyFormatter = (discussion: DiscussionMessage[], maxTurns = 10): string => {
        return discussion.slice(-maxTurns).map(msg => `${escapeForJsonString(msg.expert.name)} (${msg.expert.emoji}): ${escapeForJsonString(msg.text)}${msg.work ? `\nWORK:\n${escapeForJsonString(msg.work)}` : ''}${msg.searchCitations && msg.searchCitations.length > 0 ? `\n(Sources: ${escapeForJsonString(msg.searchCitations.map(c => c.title).join(', '))})` : ''}`).join('\n\n');
    }

    return INITIAL_SYSTEM_PROMPT_TEMPLATE
        .replace('{input_topic}', escapeForJsonString(currentTopic) || "No topic set yet. Await user to set a topic with /topic command.")
        .replace(new RegExp('{num_thoughts}', 'g'), String(numThoughts))
        .replace('{history}', historyFormatter(discussionHistory))
        .replace('{{emulation_instructions}}', emulationInstructions)
        .replace('{{response_persona_instruction}}', responsePersonaInstruction)
        .replace('{{specific_task_instructions}}', specificTaskInstructions)
        .replace('{persistent_memory_context}', formattedMemory)
        .replace('{{additional_context_section}}', additionalContextSection)
        .replace('{{assigned_tasks_section}}', assignedTasksSection)
        .replace('{expert_list}', expertListForPrompt);
}

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let retries = 0;
    let lastError: Error | null = null;
    while (retries <= MAX_RETRIES) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const errorMessage = lastError.message.toLowerCase();
            console.error(`Error calling AI API (Attempt ${retries + 1}/${MAX_RETRIES + 1}):`, lastError);

            if (errorMessage.includes('quota')) {
                console.error("Quota exceeded error detected. Halting further API requests.");
                // This state will be handled at the component level now
                throw new Error("Failed to call the AI API, quota exceeded. Please try again later.");
            }
            if (retries === MAX_RETRIES) {
                throw new Error(`AI API Error (Max retries reached): ${lastError.message}`);
            }
            const delay = INITIAL_DELAY_MS * (2 ** retries) + Math.random() * 1000;
            console.log(`Retrying AI API call in ${delay.toFixed(0)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
        }
    }
    throw new Error(lastError?.message || "AI API Error: Exhausted retries but did not return or throw explicitly from loop.");
}

function parseJsonResponse(rawResponseText: string): GeminiResponseJson {
    let jsonStr = rawResponseText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match?.[2]) {
        jsonStr = match[2].trim();
    }
    return JSON.parse(jsonStr) as GeminiResponseJson;
}

// --- Provider-Specific Implementations ---

async function generateGeminiResponse(
  apiKey: string,
  modelId: string,
  systemPromptText: string,
  userMessage: string,
  useGoogleSearch: boolean,
  params: Record<string, any>,
  uploadedImageFile?: UploadedFile | null,
): Promise<GeminiResponseJson> {
  const geminiAi = new GoogleGenAI({ apiKey });
  const contentParts: Part[] = [];

  if (uploadedImageFile?.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(uploadedImageFile.mimeType)) {
      contentParts.push({ inlineData: { mimeType: uploadedImageFile.mimeType, data: uploadedImageFile.base64Data } });
  }
  contentParts.push({ text: userMessage || "Please analyze the provided content." });
  
  const { temperature, topP, topK, thinkingBudget, maxLength } = params;
  const geminiConfig: any = {
    systemInstruction: systemPromptText,
    tools: useGoogleSearch ? [{ googleSearch: {} }] : undefined,
    responseMimeType: useGoogleSearch ? undefined : "application/json",
    temperature: temperature,
    topP: topP,
    topK: topK,
  };

  if (maxLength !== undefined) {
    geminiConfig.maxOutputTokens = maxLength;
  }

  if (thinkingBudget !== undefined && modelId.includes('flash')) {
    geminiConfig.thinkingConfig = { thinkingBudget: thinkingBudget };
  }

  const response: GenerateContentResponse = await geminiAi.models.generateContent({
      model: modelId,
      contents: { parts: contentParts },
      config: geminiConfig,
  });
  
  const parsedData = parseJsonResponse(response.text);
  
  if (useGoogleSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      parsedData.groundingData = response.candidates[0].groundingMetadata.groundingChunks
          .filter(chunk => chunk.web?.uri && chunk.web?.title)
          .map(chunk => ({ web: { uri: chunk.web!.uri!, title: chunk.web!.title! } }));
  }
  return parsedData;
}

async function generateMistralResponse(
    apiKey: string,
    modelId: string,
    systemPromptText: string,
    userMessage: string,
    params: Record<string, any>,
): Promise<GeminiResponseJson> {
    const mistralProvider = createMistral({ apiKey });
    const { text } = await generateText({
        model: mistralProvider(modelId),
        system: systemPromptText,
        messages: [{ role: 'user', content: userMessage }],
        temperature: params.temperature,
    });
    return parseJsonResponse(text);
}

async function generateOpenAiResponse(
    apiKey: string,
    modelId: string,
    systemPromptText: string,
    userMessage: string,
    uploadedImageFile: UploadedFile | null,
    params: Record<string, any>
): Promise<GeminiResponseJson> {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPromptText },
    ];

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: userMessage }];
    if (uploadedImageFile?.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(uploadedImageFile.mimeType)) {
        userContent.push({
            type: 'image_url',
            image_url: { url: `data:${uploadedImageFile.mimeType};base64,${uploadedImageFile.base64Data}` }
        });
    }
    messages.push({ role: 'user', content: userContent });
    
    const response = await openai.chat.completions.create({
        model: modelId,
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: params.temperature,
        top_p: params.topP,
    });
    
    const responseText = response.choices[0]?.message?.content;
    if (!responseText) throw new Error("OpenAI response was empty.");
    return JSON.parse(responseText) as GeminiResponseJson;
}

async function generateOpenRouterResponse(
    apiKey: string,
    modelId: string,
    systemPromptText: string,
    userMessage: string,
    uploadedImageFile: UploadedFile | null,
    params: Record<string, any>
): Promise<GeminiResponseJson> {
    const openrouter = new OpenAI({ 
        apiKey, 
        baseURL: "https://openrouter.ai/api/v1",
        dangerouslyAllowBrowser: true 
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPromptText },
    ];

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: userMessage }];
    if (uploadedImageFile?.base64Data && SUPPORTED_IMAGE_MIME_TYPES.includes(uploadedImageFile.mimeType)) {
        userContent.push({
            type: 'image_url',
            image_url: { url: `data:${uploadedImageFile.mimeType};base64,${uploadedImageFile.base64Data}` }
        });
    }
    messages.push({ role: 'user', content: userContent });

    const response = await openrouter.chat.completions.create({
        model: modelId,
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: params.temperature,
    });

    const responseText = response.choices[0]?.message?.content;
    if (!responseText) throw new Error("OpenRouter response was empty.");
    return JSON.parse(responseText) as GeminiResponseJson;
}

// --- Main Exported Function (Router) ---

export async function getAiResponse(
  currentTopic: string | null,
  currentUserMessageOrCommand: string, 
  discussionHistory: DiscussionMessage[],
  numThoughts: number,
  memoryContext: string[],
  emulateExpertAs?: ExpertRole,
  uploadedFile?: UploadedFile | null,
  initialContext?: string | null,
  assignedTasksContext?: string | null
): Promise<GeminiResponseJson> {
  
    const { settings, experts } = useAgileBloomStore.getState();

    if (!settings) {
        throw new Error("AI configuration is not set. Please configure the AI provider on the setup page.");
    }

    const { provider, model: modelId, apiKey: apiKeys, parameters: params } = settings;
    const apiKey = apiKeys[provider];

    if (!apiKey) {
        throw new Error(`API Key for the selected provider (${provider}) is missing.`);
    }

    const modelInfo = getModelConfigById(modelId);
    if (!modelInfo) {
        throw new Error(`Model with ID '${modelId}' not found in supported models list.`);
    }

    const systemPrompt = buildSystemPrompt(
        currentTopic, discussionHistory, numThoughts, memoryContext,
        emulateExpertAs, initialContext, assignedTasksContext, currentUserMessageOrCommand
    );

    const aiCall = async (): Promise<GeminiResponseJson> => {
        switch(provider) {
            case AiProvider.Google:
                const commandText = currentUserMessageOrCommand.toLowerCase();
                const useGoogleSearch = (commandText.startsWith("/ask") || commandText.startsWith("/search")) && modelInfo.supportsSearch;
                return await generateGeminiResponse(apiKey, modelId, systemPrompt, currentUserMessageOrCommand, useGoogleSearch, params, uploadedFile);
            
            case AiProvider.Mistral:
                return await generateMistralResponse(apiKey, modelId, systemPrompt, currentUserMessageOrCommand, params);

            case AiProvider.OpenAI:
                 return await generateOpenAiResponse(apiKey, modelId, systemPrompt, currentUserMessageOrCommand, uploadedFile, params);

            case AiProvider.OpenRouter:
                 return await generateOpenRouterResponse(apiKey, modelId, systemPrompt, currentUserMessageOrCommand, uploadedFile, params);
            
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    };
    
    try {
        const result = await withRetry(aiCall);

        // More robust validation and recovery
        if (!result || typeof result !== 'object') {
            throw new Error("AI response is not a valid object.");
        }
        if (!result.expert || !experts[result.expert]) {
            throw new Error(`AI response is missing or has an invalid 'expert' field. Response: ${JSON.stringify(result)}`);
        }
        if (typeof result.message !== 'string') {
            console.warn("AI response 'message' field is not a string. Attempting to recover.", result);
            if (result.tasks && Array.isArray(result.tasks) && result.tasks.length > 0) {
                result.message = `Generated ${result.tasks.length} task(s).`;
            } else if (result.stories && Array.isArray(result.stories) && result.stories.length > 0) {
                result.message = `Generated ${result.stories.length} story(s).`;
            } else {
                result.message = "[AI returned a non-text response message]";
            }
        }

        if (result.work && typeof result.work !== 'string') {
            console.warn(`AI response 'work' field is not a string. Stringifying it.`, result.work);
            result.work = JSON.stringify(result.work, null, 2);
        }

        if (emulateExpertAs && result.expert !== emulateExpertAs) {
            console.warn(`AI was asked to emulate ${emulateExpertAs} but responded as ${result.expert}. Using AI's choice.`);
        }
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof SyntaxError && message.includes('JSON')) {
           throw new Error(`Failed to parse JSON response from AI: "${message}"`);
        }
        throw error; // Re-throw other errors after retry logic
    }
}
