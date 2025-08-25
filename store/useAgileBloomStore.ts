

import {create} from 'zustand';
import { DiscussionMessage, ExpertRole, UploadedFile, TrackedQuestion, QuestionStatus, TrackedTask, TaskStatus, Expert, TrackedStory, StoryStatus, StoryPriority, Settings } from '../types';
import { DEFAULT_EXPERTS, DEFAULT_NUM_THOUGHTS, MAX_MEMORY_ENTRIES, DEFAULT_AUTO_MODE_DELAY_SECONDS, ROLE_SYSTEM, ROLE_USER, ROLE_SCRUM_LEADER } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { listGitHubRepoFiles, fetchGitHubFilesContent } from '../services/gitService';

const AGILE_BLOOM_CUSTOM_EXPERTS_KEY = 'agile-bloom-custom-experts';

const getInitialExperts = (): Record<ExpertRole, Expert> => {
  try {
    const customExpertsRaw = localStorage.getItem(AGILE_BLOOM_CUSTOM_EXPERTS_KEY);
    const customExperts = customExpertsRaw ? JSON.parse(customExpertsRaw) : {};
    return { ...DEFAULT_EXPERTS, ...customExperts };
  } catch (error) {
    console.error("Failed to parse custom experts from localStorage:", error);
    return DEFAULT_EXPERTS;
  }
};

type CodebaseImportStatus = 'idle' | 'loading_list' | 'success_list' | 'loading_content' | 'success_content' | 'error';

interface AgileBloomState {
  topic: string | null;
  discussion: DiscussionMessage[];
  isLoading: boolean;
  error: string | null;
  numThoughts: number;
  isHelpModalOpen: boolean;
  userMessageTimestamps: number[];
  isRateLimited: boolean;
  isQuotaExceeded: boolean;
  memoryContext: string[];
  uploadedFile: UploadedFile | null;
  
  trackedQuestions: TrackedQuestion[];
  trackedTasks: TrackedTask[];
  trackedStories: TrackedStory[];

  isAutoModeEnabled: boolean;
  autoModeDelaySeconds: number;
  
  settings: Settings | null;

  narrativeSummary: string;
  isSummaryLoading: boolean;
  
  experts: Record<ExpertRole, Expert>;
  selectedExpertRoles: ExpertRole[];
  lastActionWasAutoContinue: boolean;

  // Codebase Context State
  codebaseContext: string | null;
  codebaseImportStatus: CodebaseImportStatus;
  codebaseImportMessage: string | null;
  repoExcludePatterns: string;
  repoFiles: { path: string; size: number }[];
  selectedRepoFiles: Set<string>;

  setCodebaseContext: (context: string | null) => void;
  setTopic: (topic: string) => void;
  addMessage: (message: Omit<DiscussionMessage, 'id' | 'timestamp' | 'expert'> & { expertName: ExpertRole }) => DiscussionMessage;
  addErrorMessage: (text: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setNumThoughts: (num: number) => void;
  clearChat: () => void;
  toggleHelpModal: () => void;
  addUserMessageTimestamp: (timestamp: number) => void;
  setRateLimitedStatus: (isLimited: boolean) => void;
  setQuotaExceeded: (isExceeded: boolean) => void;
  addMemoryEntry: (entry: string) => void;
  setUploadedFile: (file: UploadedFile | null) => void;
  clearUploadedFile: () => void;
  
  // New Codebase Actions
  setRepoExcludePatterns: (patterns: string) => void;
  listRepoFiles: (repoUrl: string) => Promise<void>;
  confirmRepoFileSelection: (repoUrl: string) => Promise<void>;
  toggleRepoFileSelection: (path: string, select?: boolean) => void;
  toggleSelectAllRepoFiles: (select: boolean) => void;
  clearRepoData: () => void;


  addTrackedQuestion: (question: Omit<TrackedQuestion, 'id' | 'timestamp' | 'status'>) => void;
  updateTrackedQuestionStatus: (id: string, status: QuestionStatus) => void;
  removeTrackedQuestion: (id: string) => void;
  clearAllTrackedQuestions: () => void;
  clearTrackedQuestionsByStatus: (status: QuestionStatus) => void; 

  addTrackedTask: (taskData: Omit<TrackedTask, 'id' | 'timestamp' | 'status' | 'topicContext' | 'priority' | 'order'>) => void;
  updateTrackedTask: (taskId: string, updates: Partial<Omit<TrackedTask, 'id'>>) => void;
  removeTrackedTask: (taskId: string) => void;
  clearAllTrackedTasks: () => void;
  clearTrackedTasksByStatus: (status: TaskStatus) => void;

  addTrackedStory: (storyData: Omit<TrackedStory, 'id' | 'timestamp' | 'status' | 'topicContext'>) => void;
  updateTrackedStory: (storyId: string, updates: Partial<Omit<TrackedStory, 'id'>>) => void;
  removeTrackedStory: (storyId: string) => void;
  clearAllTrackedStories: () => void;
  clearTrackedStoriesByStatus: (status: StoryStatus) => void;

  toggleAutoMode: () => void;
  setAutoModeDelaySeconds: (seconds: number) => void;
  importChatSession: (importedMessages: DiscussionMessage[]) => void;
  
  setSettings: (config: Settings) => void;

  setNarrativeSummary: (summary: string) => void;
  setSummaryLoading: (loading: boolean) => void;
  
  addExpert: (expert: Expert) => void;
  removeExpert: (expertRole: ExpertRole) => void;
  setSelectedExpertRoles: (roles: ExpertRole[]) => void;
  setLastActionWasAutoContinue: (wasAuto: boolean) => void;
}

const useAgileBloomStore = create<AgileBloomState>((set, get) => ({
  topic: null,
  discussion: [],
  isLoading: false,
  error: null,
  numThoughts: DEFAULT_NUM_THOUGHTS,
  isHelpModalOpen: false,
  userMessageTimestamps: [],
  isRateLimited: false,
  isQuotaExceeded: false,
  memoryContext: [],
  uploadedFile: null,
  trackedQuestions: [],
  trackedTasks: [],
  trackedStories: [],
  isAutoModeEnabled: false,
  autoModeDelaySeconds: DEFAULT_AUTO_MODE_DELAY_SECONDS,
  settings: null,
  narrativeSummary: '',
  isSummaryLoading: false,
  experts: getInitialExperts(),
  selectedExpertRoles: [],
  lastActionWasAutoContinue: false,
  
  // Codebase state
  codebaseContext: null,
  codebaseImportStatus: 'idle',
  codebaseImportMessage: null,
  repoExcludePatterns: `# Dependency lock files\npackage-lock.json\nyarn.lock\n\n# Build output\n/dist/\n/build/\n\n# Logs\n*.log`,
  repoFiles: [],
  selectedRepoFiles: new Set(),

  setCodebaseContext: (context) => set({ codebaseContext: context }),
  setTopic: (topic) => set({ topic, error: null }),
  addMessage: (message) => {
    const expert = get().experts[message.expertName] || get().experts[ROLE_SYSTEM];
    const newId = uuidv4();
    const newTimestamp = Date.now();
    const fullMessage: DiscussionMessage = { ...message, id: newId, timestamp: newTimestamp, expert };
    set((state) => ({
      discussion: [...state.discussion, fullMessage],
      isLoading: message.expertName !== ROLE_SYSTEM && message.expertName !== ROLE_USER ? state.isLoading : false, 
    }));
    return fullMessage; 
  },
  addErrorMessage: (text) => {
     set((state) => ({
      discussion: [
        ...state.discussion,
        { 
          id: uuidv4(), 
          expert: get().experts[ROLE_SYSTEM], 
          text, 
          timestamp: Date.now(),
          isError: true,
        },
      ],
      isLoading: false,
      error: text, 
    }));
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setNumThoughts: (num) => set({ numThoughts: num }),
  clearChat: () => {
    set({ 
      discussion: [],
      topic: null, 
      error: null,
      userMessageTimestamps: [],
      isRateLimited: false,
      isQuotaExceeded: false,
      memoryContext: [],
      uploadedFile: null,
      trackedQuestions: [],
      trackedTasks: [],
      trackedStories: [],
      isAutoModeEnabled: false,
      autoModeDelaySeconds: DEFAULT_AUTO_MODE_DELAY_SECONDS,
      narrativeSummary: '',
      isSummaryLoading: false,
      selectedExpertRoles: [],
      lastActionWasAutoContinue: false,
    });
  },
  toggleHelpModal: () => set((state) => ({ isHelpModalOpen: !state.isHelpModalOpen })),
  addUserMessageTimestamp: (timestamp) => set((state) => ({
    userMessageTimestamps: [...state.userMessageTimestamps, timestamp],
  })),
  setRateLimitedStatus: (isLimited) => set({ isRateLimited: isLimited }),
  setQuotaExceeded: (isExceeded) => set({ isQuotaExceeded: isExceeded }),
  addMemoryEntry: (entry: string) => set((state) => {
    const newMemory = [...state.memoryContext, entry];
    return { memoryContext: newMemory.slice(-MAX_MEMORY_ENTRIES) }; 
  }),
  setUploadedFile: (file: UploadedFile | null) => set({ uploadedFile: file }),
  clearUploadedFile: () => set({ uploadedFile: null }),

  // Codebase Actions
  setRepoExcludePatterns: (patterns) => set({ repoExcludePatterns: patterns }),
  listRepoFiles: async (repoUrl) => {
      get().clearRepoData(); // Clear previous results before fetching new list
      set({ codebaseImportStatus: 'loading_list', codebaseImportMessage: 'Fetching repository file list...' });
      try {
          const files = await listGitHubRepoFiles(repoUrl, get().repoExcludePatterns);
          set({
              repoFiles: files,
              codebaseImportStatus: 'success_list',
              codebaseImportMessage: `Found ${files.length} files. Select files to include in context.`,
          });
          get().toggleSelectAllRepoFiles(true); // Select all by default
      } catch (error) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred.';
          set({
              codebaseImportStatus: 'error',
              codebaseImportMessage: message,
          });
      }
  },
  confirmRepoFileSelection: async (repoUrl) => {
      const { selectedRepoFiles } = get();
      if (selectedRepoFiles.size === 0) {
          set({
              codebaseContext: null,
              codebaseImportStatus: 'success_content',
              codebaseImportMessage: 'No files were selected. Codebase context is empty.',
          });
          return;
      }

      set({ codebaseImportStatus: 'loading_content', codebaseImportMessage: `Fetching content for ${selectedRepoFiles.size} selected file(s)...` });
      try {
          const { content: repoContent, fileCount } = await fetchGitHubFilesContent(repoUrl, Array.from(selectedRepoFiles));
          set({
              codebaseContext: repoContent,
              codebaseImportStatus: 'success_content',
              codebaseImportMessage: `Successfully added content from ${fileCount} file(s).`,
          });
      } catch (error) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred.';
          set({
              codebaseContext: null,
              codebaseImportStatus: 'error',
              codebaseImportMessage: message,
          });
      }
  },
  toggleRepoFileSelection: (path, select) => {
    set(state => {
        const newSelected = new Set(state.selectedRepoFiles);
        const shouldSelect = select ?? !newSelected.has(path);
        if (shouldSelect) {
            newSelected.add(path);
        } else {
            newSelected.delete(path);
        }
        return { selectedRepoFiles: newSelected };
    });
  },
  toggleSelectAllRepoFiles: (select) => {
      set(state => {
          if (select) {
              const allPaths = state.repoFiles.map(f => f.path);
              return { selectedRepoFiles: new Set(allPaths) };
          }
          return { selectedRepoFiles: new Set() };
      });
  },
  clearRepoData: () => {
      set({
          codebaseContext: null,
          codebaseImportStatus: 'idle',
          codebaseImportMessage: null,
          repoFiles: [],
          selectedRepoFiles: new Set(),
      });
  },


  addTrackedQuestion: (questionData) => {
    const newQuestion: TrackedQuestion = {
      ...questionData,
      id: uuidv4(),
      timestamp: Date.now(),
      status: QuestionStatus.Open,
    };
    set((state) => ({
      trackedQuestions: [...state.trackedQuestions, newQuestion],
    }));
  },
  updateTrackedQuestionStatus: (id, status) => {
    set((state) => ({
      trackedQuestions: state.trackedQuestions.map((q) =>
        q.id === id ? { ...q, status } : q
      ),
    }));
  },
  removeTrackedQuestion: (id: string) => {
    set((state) => ({
        trackedQuestions: state.trackedQuestions.filter((q) => q.id !== id),
    }));
  },
  clearAllTrackedQuestions: () => set({ trackedQuestions: [] }),
  clearTrackedQuestionsByStatus: (statusToClear: QuestionStatus) => {
    set((state) => ({
        trackedQuestions: state.trackedQuestions.filter(q => q.status !== statusToClear),
    }));
  },

  addTrackedTask: (taskData) => {
    const currentTopic = get().topic || "General";
    const now = Date.now();
    const newTask: TrackedTask = {
      ...taskData,
      id: uuidv4(),
      timestamp: now,
      status: TaskStatus.ToDo,
      priority: 'Medium',
      order: now,
      topicContext: currentTopic,
    };
    set((state) => ({
      trackedTasks: [...state.trackedTasks, newTask],
    }));
  },
  updateTrackedTask: (taskId, updates) => {
    set((state) => ({
      trackedTasks: state.trackedTasks.map((task) =>
        task.id === taskId 
        ? { ...task, ...updates } 
        : task
      ),
    }));
  },
  removeTrackedTask: (taskId) => {
    set((state) => ({
      trackedTasks: state.trackedTasks.filter((task) => task.id !== taskId),
    }));
  },
  clearAllTrackedTasks: () => set({ trackedTasks: [] }),
  clearTrackedTasksByStatus: (statusToClear) => {
    set((state) => ({
      trackedTasks: state.trackedTasks.filter((task) => task.status !== statusToClear),
    }));
  },

  addTrackedStory: (storyData) => {
    const currentTopic = get().topic || "General";
    const newStory: TrackedStory = {
        ...storyData,
        id: uuidv4(),
        timestamp: Date.now(),
        status: StoryStatus.Backlog,
        priority: storyData.priority || 'Medium',
        topicContext: currentTopic,
    };
    set((state) => ({
        trackedStories: [...state.trackedStories, newStory],
    }));
  },
  updateTrackedStory: (storyId, updates) => {
    set(state => ({
        trackedStories: state.trackedStories.map(story => 
            story.id === storyId ? { ...story, ...updates } : story
        )
    }));
  },
  removeTrackedStory: (storyId) => {
      set((state) => ({
          trackedStories: state.trackedStories.filter((story) => story.id !== storyId),
      }));
  },
  clearAllTrackedStories: () => set({ trackedStories: [] }),
  clearTrackedStoriesByStatus: (status) => {
      set((state) => ({
          trackedStories: state.trackedStories.filter((story) => story.status !== status),
      }));
  },


  toggleAutoMode: () => set((state) => ({ isAutoModeEnabled: !state.isAutoModeEnabled })),
  setAutoModeDelaySeconds: (seconds: number) => set({ autoModeDelaySeconds: seconds }),
  importChatSession: (importedMessages: DiscussionMessage[]) => {
    set((state) => {
      // Find topic from imported messages
      let newTopic = 'Imported Session';
      const topicMessage = importedMessages.find(msg => msg.expert.name === ROLE_SYSTEM && msg.text.startsWith('Discussion started on topic:'));
      if (topicMessage) {
        const match = topicMessage.text.match(/topic: "([^"]+)"/);
        if (match && match[1]) {
          newTopic = match[1];
        }
      }

      // Re-hydrate experts that might not be in the default set
      const allExpertsInImport = importedMessages.reduce((acc, msg) => {
          if (!acc[msg.expert.name]) {
              acc[msg.expert.name] = msg.expert;
          }
          return acc;
      }, {} as Record<ExpertRole, Expert>);

      // Re-hydrate selected roles if possible, by looking at AI responses
      const importedRoles = importedMessages.reduce((acc, msg) => {
          if (msg.expert.name !== ROLE_USER && msg.expert.name !== ROLE_SYSTEM) {
              acc.add(msg.expert.name);
          }
          return acc;
      }, new Set<ExpertRole>());
      
      // Ensure Scrum Leader is present if any other experts are
      if (importedRoles.size > 0 && !importedRoles.has(ROLE_SCRUM_LEADER)) {
          const scrumLeaderExists = Object.values(allExpertsInImport).some(e => e.name === ROLE_SCRUM_LEADER);
          if (scrumLeaderExists) {
              importedRoles.add(ROLE_SCRUM_LEADER);
          }
      }

      const successMessage: DiscussionMessage = {
          id: uuidv4(),
          expert: state.experts[ROLE_SYSTEM] || DEFAULT_EXPERTS[ROLE_SYSTEM],
          text: `Successfully imported ${importedMessages.length} messages. Topic set to "${newTopic}". All tracked items (questions, tasks, stories) have been cleared.`,
          isCommandResponse: true,
          timestamp: Date.now(),
      };

      return {
        // Reset state
        topic: newTopic,
        error: null,
        userMessageTimestamps: [],
        isRateLimited: false,
        isQuotaExceeded: false,
        memoryContext: [],
        codebaseContext: null, // Also clear codebase on import
        uploadedFile: null,
        trackedQuestions: [], 
        trackedTasks: [],
        trackedStories: [],
        isAutoModeEnabled: false,
        autoModeDelaySeconds: DEFAULT_AUTO_MODE_DELAY_SECONDS,
        narrativeSummary: '',
        isSummaryLoading: false,
        lastActionWasAutoContinue: false,

        // Set imported data
        discussion: [...importedMessages, successMessage],
        // Merge imported experts with existing ones. Custom experts from localStorage will be preserved.
        experts: { ...state.experts, ...allExpertsInImport },
        selectedExpertRoles: Array.from(importedRoles),
      };
    });
  },
  setSettings: (settings) => set({ settings }),

  setNarrativeSummary: (summary) => set({ narrativeSummary: summary }),
  setSummaryLoading: (loading) => set({ isSummaryLoading: loading }),

  addExpert: (expert) => {
      const expertWithFlag = { ...expert, isCustom: true };
      set((state) => {
          const newExperts = { ...state.experts, [expert.name]: expertWithFlag };
          try {
              const currentCustom = JSON.parse(localStorage.getItem(AGILE_BLOOM_CUSTOM_EXPERTS_KEY) || '{}');
              currentCustom[expert.name] = expertWithFlag;
              localStorage.setItem(AGILE_BLOOM_CUSTOM_EXPERTS_KEY, JSON.stringify(currentCustom));
          } catch (error) {
              console.error("Failed to save custom expert to localStorage:", error);
          }
          return { experts: newExperts };
      });
  },
  removeExpert: (expertRole) => {
      set((state) => {
          const { [expertRole]: _, ...remainingExperts } = state.experts;
          try {
              const customExperts = JSON.parse(localStorage.getItem(AGILE_BLOOM_CUSTOM_EXPERTS_KEY) || '{}');
              delete customExperts[expertRole];
              localStorage.setItem(AGILE_BLOOM_CUSTOM_EXPERTS_KEY, JSON.stringify(customExperts));
          } catch (error) {
              console.error("Failed to remove custom expert from localStorage:", error);
          }
          return { experts: remainingExperts };
      });
  },
  setSelectedExpertRoles: (roles) => set({ selectedExpertRoles: roles }),
  setLastActionWasAutoContinue: (wasAuto) => set({ lastActionWasAutoContinue: wasAuto }),
}));

export default useAgileBloomStore;