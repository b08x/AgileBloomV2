
export enum AiProvider {
  Google = "Google",
  Mistral = "Mistral",
  OpenAI = "OpenAI",
  OpenRouter = "OpenRouter",
}

export interface ModelParameter {
  id: 'temperature' | 'topP' | 'topK' | 'maxLength' | 'thinkingBudget';
  name: string;
  type: 'slider';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}


export interface AIModelConfig {
  id: string; // e.g., 'gemini-2.5-flash-preview-04-17'
  name: string; // e.g., 'Gemini 2.5 Flash'
  provider: AiProvider;
  parameters: ModelParameter[];
  supportsVision: boolean;
  supportsSearch: boolean; // Gemini-specific
  description: string;
}


// Changed from enum to string to allow for custom roles
export type ExpertRole = string;

export interface Expert {
  name: ExpertRole;
  emoji: string;
  description:string;
  bgColor: string;
  textColor: string;
  isCustom?: boolean; // Flag to identify user-created experts
}

export interface SearchCitation {
  uri: string;
  title: string;
}

export interface DiscussionMessage {
  id: string;
  expert: Expert;
  text: string;
  thoughts?: string[];
  work?: string; // For code, markdown tables, etc.
  isCommandResponse?: boolean;
  timestamp: number;
  isError?: boolean;
  searchCitations?: SearchCitation[] | null;
}

export interface Command {
  name: string;
  arguments: string;
  description: string;
  example?: string;
}

// New interfaces for auto-generation
export interface GeminiGeneratedTask {
  description: string;
  assignedTo?: ExpertRole;
}
export interface GeminiGeneratedStory {
  userStory: string;
  benefit: string;
  acceptanceCriteria: string[];
  priority?: StoryPriority;
  sprintPoints?: number;
}

// Matches the expected JSON output structure from Gemini
export interface GeminiResponseJson {
  expert: ExpertRole; 
  emoji: string;
  message: string;
  thoughts?: string[];
  work?: string;
  isCommandResponse?: boolean;
  memoryEntry?: string | null; 
  groundingData?: Array<{ web: { uri: string; title: string; } }> | null;
  tasks?: GeminiGeneratedTask[];
  stories?: GeminiGeneratedStory[];
}

export interface CommandHandlerResult {
  userMessageText: string; 
  aiInstructionText?: string; 
  action: 'local' | 'single_ai_response' | 'round_robin_ai_response' | 'error' | 'no_action';
  targetExpert?: ExpertRole; 
  newTopic?: string; 
  errorMessage?: string; 
  assignedTasksContext?: string;
}

export interface UploadedFile {
  name: string;
  type: string; // The actual MIME type from the file object
  mimeType: string; // The MIME type to be sent to Gemini (for images) or used for processing (text)
  size: number;
  base64Data?: string; // For images
  textContent?: string; // For text files
}

export enum QuestionStatus {
  Open = "Open",
  Addressing = "Addressing",
  Addressed = "Addressed",
  Dismissed = "Dismissed",
}

export interface TrackedQuestion {
  id: string;
  text: string;
  expertRole: ExpertRole;
  expertEmoji: string;
  status: QuestionStatus;
  timestamp: number;
  originalMessageId: string; 
}

export enum TaskStatus {
  ToDo = "To Do",
  InProgress = "In Progress",
  Done = "Done",
}

export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TrackedTask {
  id: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  assignedTo?: ExpertRole;
  createdBy: ExpertRole | 'User' | 'AI';
  timestamp: number;
  topicContext: string; // Topic at the time of creation
  storyId?: string;
}

export enum StoryStatus {
  Backlog = "Backlog",
  SelectedForSprint = "Selected for Sprint",
  InProgress = "In Progress",
  Done = "Done",
  Rejected = "Rejected",
}

export type StoryPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TrackedStory {
  id: string;
  userStory: string;
  acceptanceCriteria: string[];
  benefit: string;
  status: StoryStatus;
  priority: StoryPriority;
  sprintPoints?: number;
  assignedTo?: ExpertRole; // Potentially assigned to a lead expert for refinement
  createdBy: ExpertRole | 'User' | 'AI';
  timestamp: number;
  topicContext: string;
  fromQuestionId?: string; // Optional link back to the question it came from
}


// Renamed from SupportedModel to avoid confusion
export interface DEPRECATED_SupportedModel {
  id: string;
  name: string;
  provider: AiProvider;
  description: string;
  supportsSearch: boolean;
}

export interface AIConfig {
    provider: AiProvider;
    modelId: string;
    params: Record<string, any>;
    apiKeys: Partial<Record<AiProvider, string>>;
    useGeminiPreprocessing?: boolean;
}
