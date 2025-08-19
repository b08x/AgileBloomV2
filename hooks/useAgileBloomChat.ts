import { useCallback, useEffect, useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { getAiResponse } from '../services/aiService';
import { ExpertRole, GeminiResponseJson, CommandHandlerResult, UploadedFile, SearchCitation, DiscussionMessage, TrackedQuestion, QuestionStatus, TaskStatus, TrackedTask, GeminiGeneratedTask, GeminiGeneratedStory, StoryStatus, Settings } from '../types';
import { 
    DEFAULT_EXPERTS, 
    AVAILABLE_COMMANDS,
    RATE_LIMIT_MAX_MESSAGES_PER_WINDOW,
    RATE_LIMIT_WINDOW_SECONDS,
    SEQUENTIAL_AI_CALL_DELAY_MS,
    SUPPORTED_IMAGE_MIME_TYPES,
    ID_PREFIX_LENGTH_QUESTIONS,
    GENERATE_TASKS_FROM_CONTEXT_PROMPT,
    GENERATE_NARRATIVE_SUMMARY_PROMPT,
    BREAKDOWN_STORY_PROMPT_TEMPLATE,
    COMPILE_DOCUMENTATION_PROMPT_TEMPLATE,
    ROLE_SYSTEM,
    ROLE_USER,
    ROLE_SCRUM_LEADER,
} from '../constants';


// Utility function to parse a markdown table into an array of objects.
// Moved here to be accessible by the hook.
const parseMarkdownTable = (markdown: string): Array<Record<string, string>> => {
  if (!markdown) return [];
  const lines = markdown.trim().split('\n');
  
  const headerLineIndex = lines.findIndex(line => line.includes('|') && !line.includes('---'));
  if (headerLineIndex === -1) return [];

  const separatorLineIndex = lines.findIndex((line, index) => 
    index > headerLineIndex && line.includes('|') && line.includes('---')
  );
  if (separatorLineIndex === -1) return [];

  const headers = lines[headerLineIndex]
    .split('|')
    .map(h => h.trim())
    .filter(h => h !== '');

  const dataRows = lines.slice(separatorLineIndex + 1)
    .map(line => {
      const cells = line.split('|').map(cell => cell.trim());
      if (cells.length > 0 && cells[0] === '') cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
      return cells;
    })
    .filter(rowCells => rowCells.length === headers.length && rowCells.some(cell => cell !== ''));

  return dataRows.map(row => {
    const entry: Record<string, string> = {};
    headers.forEach((header, i) => {
      entry[header] = row[i] || '';
    });
    return entry;
  });
};


export const useAgileBloomChat = () => {
  const store = useAgileBloomStore.getState;

  const {
    topic,
    discussion,
    numThoughts,
    memoryContext,
    isAutoModeEnabled,
    autoModeDelaySeconds,
    addMessage,
    addErrorMessage,
    setLoading,
    setError,
    toggleHelpModal,
    clearChat: storeClearChat,
    isLoading, 
    addUserMessageTimestamp,
    isRateLimited, 
    setRateLimitedStatus,
    addMemoryEntry,
    clearUploadedFile,
    addTrackedQuestion,
    updateTrackedQuestionStatus, 
    addTrackedStory,
    updateTrackedStory,
    addTrackedTask,
    updateTrackedTask,
    toggleAutoMode, // For user interruption of auto mode
    setNarrativeSummary,
    setSummaryLoading,
    setLastActionWasAutoContinue,
  } = useAgileBloomStore();

  const rateLimitTimeoutRef = useRef<number | null>(null);
  const autoContinueTimeoutRef = useRef<number | null>(null);
  const lastAutoContinuedMessageIdRef = useRef<string | null>(null);

  // Helper to make strings safe for injection into a prompt string.
  // This uses JSON.stringify to handle all control characters, quotes, etc.
  const escapeForPrompt = (str: string) => {
    if (!str) return "";
    return JSON.stringify(str).slice(1, -1);
  };

  const getRoundRobinOrder = useCallback(() => {
    const { selectedExpertRoles } = store();
    // Ensure Scrum Leader is always present and first for predictability in certain flows.
    const order = selectedExpertRoles.filter(role => role !== ROLE_SCRUM_LEADER);
    if (selectedExpertRoles.includes(ROLE_SCRUM_LEADER)) {
        order.unshift(ROLE_SCRUM_LEADER);
    }
    return order;
  }, [store]);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Omit<TrackedTask, 'id'>>) => {
    updateTrackedTask(taskId, updates);
    
    // If status was changed, check if we need to update the parent story's status
    if (updates.status) {
        const { trackedTasks, trackedStories, updateTrackedStory } = useAgileBloomStore.getState();
        const task = trackedTasks.find(t => t.id === taskId);
        if (!task?.storyId) return;

        const parentStory = trackedStories.find(s => s.id === task.storyId);
        if (!parentStory) return;

        const tasksForStory = trackedTasks.filter(t => t.storyId === parentStory.id);
        const updatedTasksForStory = tasksForStory.map(t => t.id === taskId ? {...t, ...updates} : t);
        
        let newStoryStatus: StoryStatus | null = null;

        if (updatedTasksForStory.length > 0) {
            if (updatedTasksForStory.every(t => t.status === TaskStatus.Done)) {
                newStoryStatus = StoryStatus.Done;
            } else if (updatedTasksForStory.some(t => t.status === TaskStatus.InProgress)) {
                newStoryStatus = StoryStatus.InProgress;
            } else { // All tasks are ToDo or Done (but not all Done)
                newStoryStatus = StoryStatus.SelectedForSprint;
            }
        }

        if (newStoryStatus && parentStory.status !== newStoryStatus) {
            updateTrackedStory(parentStory.id, { status: newStoryStatus });
        }
    }
  }, [updateTrackedTask]);

  const processAndAddAiResponse = useCallback((aiResponse: GeminiResponseJson, emulatedExpertAs?: ExpertRole, associatedStoryId?: string) => {
    const { experts } = store();
    if (!aiResponse || !aiResponse.expert) {
        console.error("Received an invalid or incomplete AI response:", aiResponse);
        addErrorMessage("Received a malformed response from the AI. Check the console for details.");
        return;
    }
      
    let expertNameKey = Object.keys(experts).find(
      key => key.toLowerCase() === aiResponse.expert.toString().toLowerCase()
    ) as ExpertRole | undefined;

    if (!expertNameKey || !experts[expertNameKey]) {
      console.error("Invalid expert role from AI:", aiResponse.expert, "- using System as fallback.");
      addErrorMessage(`AI returned an invalid expert role: ${aiResponse.expert}. Displaying as System.`);
      expertNameKey = ROLE_SYSTEM;
    }
    
    if (emulatedExpertAs && expertNameKey !== ROLE_SYSTEM && aiResponse.expert !== emulatedExpertAs) {
        console.warn(`AI was asked to emulate ${emulatedExpertAs} but responded as ${aiResponse.expert}. Using AI's choice for attribution: ${aiResponse.expert}`);
    }

    let searchCitations: SearchCitation[] | null = null;
    if (aiResponse.groundingData && aiResponse.groundingData.length > 0) {
      searchCitations = aiResponse.groundingData.map(chunk => ({
        uri: chunk.web.uri,
        title: chunk.web.title,
      }));
    }
    
    const isCmdResponse = aiResponse.isCommandResponse ?? 
                          (!!emulatedExpertAs || !!aiResponse.work || 
                           (useAgileBloomStore.getState().discussion.slice(-1)[0]?.expert.name === ROLE_USER && 
                            useAgileBloomStore.getState().discussion.slice(-1)[0]?.text.startsWith('/')));


    const addedMessage: DiscussionMessage = addMessage({
      expertName: expertNameKey,
      text: aiResponse.message,
      thoughts: aiResponse.thoughts,
      work: aiResponse.work,
      isCommandResponse: isCmdResponse,
      searchCitations: searchCitations,
    });

    if (aiResponse.memoryEntry && typeof aiResponse.memoryEntry === 'string' && aiResponse.memoryEntry.trim() !== '') {
      addMemoryEntry(aiResponse.memoryEntry.trim());
    }

    if (aiResponse.thoughts && aiResponse.thoughts.length > 0 && addedMessage.expert.name !== ROLE_SYSTEM) {
      aiResponse.thoughts.forEach(thoughtText => {
        if (thoughtText.includes('?') || thoughtText.length > 20) { 
          addTrackedQuestion({
            text: thoughtText,
            expertRole: addedMessage.expert.name,
            expertEmoji: addedMessage.expert.emoji,
            originalMessageId: addedMessage.id, 
          });
        }
      });
    }

    // Process user stories from the 'work' field (for manual /stories command)
    if (aiResponse.work && expertNameKey === ROLE_SCRUM_LEADER && isCmdResponse) {
        const parsedStoriesData = parseMarkdownTable(aiResponse.work);
        const stories: Array<any> = parsedStoriesData.filter(item => {
            const keys = Object.keys(item).map(k => k.toLowerCase());
            return keys.includes('user story') && keys.includes('benefit/value');
        });

        if (stories.length > 0) {
            stories.forEach(storyData => {
                const userStoryText = storyData['User Story'] || storyData['user story'] || '';
                const benefit = storyData['Benefit/Value'] || storyData['benefit/value'] || '';
                const acceptanceCriteriaRaw = storyData['Initial Acceptance Criteria'] || storyData['initial acceptance criteria'] || '';
                const fromQuestionId = storyData['ID'] || storyData['id'] || '';

                addTrackedStory({
                    userStory: userStoryText,
                    benefit: benefit,
                    acceptanceCriteria: acceptanceCriteriaRaw.split('\n').map((ac:string) => ac.trim()).filter(Boolean),
                    createdBy: 'AI',
                    priority: 'Medium', // Default priority for generated stories
                    fromQuestionId: fromQuestionId
                });
            });

            addMessage({
                expertName: ROLE_SYSTEM,
                text: `Generated ${stories.length} user stor${stories.length > 1 ? 'ies' : 'y'}. View and manage them in the 'Stories' tab.`,
                isCommandResponse: true,
            });
        }
    }

    // Process auto-generated tasks and stories from JSON fields
    let tasksGenerated = 0;
    let storiesGenerated = 0;

    if (aiResponse.tasks && Array.isArray(aiResponse.tasks)) {
        aiResponse.tasks.forEach((task: GeminiGeneratedTask) => {
            if (task.description && typeof task.description === 'string') {
                addTrackedTask({
                    description: task.description,
                    createdBy: 'AI',
                    assignedTo: task.assignedTo,
                    storyId: associatedStoryId,
                });
                tasksGenerated++;
            } else {
                console.warn("AI returned a task with an invalid description:", task);
            }
        });
    }

    if (aiResponse.stories && Array.isArray(aiResponse.stories)) {
        aiResponse.stories.forEach((story: GeminiGeneratedStory) => {
            if (story.userStory && story.benefit && story.acceptanceCriteria) {
                addTrackedStory({
                    userStory: story.userStory,
                    benefit: story.benefit,
                    acceptanceCriteria: story.acceptanceCriteria,
                    createdBy: 'AI',
                    priority: story.priority || 'Medium',
                    sprintPoints: story.sprintPoints,
                });
                storiesGenerated++;
            }
        });
    }

    if (tasksGenerated > 0 || storiesGenerated > 0) {
        let summaryMessage = "Based on the recent discussion, I've generated";
        if (tasksGenerated > 0) {
            summaryMessage += ` ${tasksGenerated} task${tasksGenerated > 1 ? 's' : ''}`;
            if (associatedStoryId) {
                summaryMessage += ` for story #${associatedStoryId.substring(0,6)}`;
            }
        }
        if (storiesGenerated > 0) {
            summaryMessage += `${tasksGenerated > 0 ? ' and' : ''} ${storiesGenerated} user stor${storiesGenerated > 1 ? 'ies' : 'y'}`;
        }
        summaryMessage += ". You can review them in the sidebar.";
        
        addMessage({
            expertName: ROLE_SYSTEM,
            text: summaryMessage,
            isCommandResponse: true,
        });
    }

  }, [addMessage, addErrorMessage, addMemoryEntry, addTrackedQuestion, addTrackedStory, addTrackedTask, store]);

  const updateNarrativeSummary = useCallback(async () => {
    const { discussion, topic, memoryContext } = useAgileBloomStore.getState();
  
    if (discussion.length < 2) return;
  
    setSummaryLoading(true);
    try {
      const aiResponse = await getAiResponse(
        topic,
        GENERATE_NARRATIVE_SUMMARY_PROMPT,
        discussion,
        0, // No thoughts needed for a summary
        memoryContext,
        ROLE_SCRUM_LEADER
      );
      if (aiResponse.message) {
        setNarrativeSummary(aiResponse.message);
      }
    } catch (error) {
      console.error("Error generating narrative summary:", error);
      setNarrativeSummary("Error updating summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, [setNarrativeSummary, setSummaryLoading]);

  const checkAndApplyRateLimit = (): boolean => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_SECONDS * 1000;
    const currentTimestamps = useAgileBloomStore.getState().userMessageTimestamps; 
    const recentMessages = currentTimestamps.filter(ts => ts > windowStart);

    if (recentMessages.length >= RATE_LIMIT_MAX_MESSAGES_PER_WINDOW) {
      const currentRateLimitedState = useAgileBloomStore.getState().isRateLimited;
      if (!currentRateLimitedState) { 
        setRateLimitedStatus(true);
        addErrorMessage(`Rate limit exceeded. Please wait ${RATE_LIMIT_WINDOW_SECONDS} seconds.`);
      }
      return true; 
    }
    return false; 
  };
  
  const handleCommandInput = (inputText: string): CommandHandlerResult => {
    const { topic, experts, selectedExpertRoles } = store();
    const trimmedInput = inputText.trim();
    if (!trimmedInput.startsWith('/')) {
      if (!topic) {
         return { 
          userMessageText: trimmedInput, 
          action: 'error', 
          errorMessage: "No active discussion. Please refresh the page to start a new one." 
        };
      }
      return { 
        userMessageText: trimmedInput, 
        aiInstructionText: trimmedInput, 
        action: 'round_robin_ai_response' 
      };
    }

    const parts = trimmedInput.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1); // args as an array

    const commandDefinition = AVAILABLE_COMMANDS.find(c => c.name === commandName);
    
    if (!commandDefinition) {
      return { 
        userMessageText: trimmedInput, 
        action: 'error', 
        errorMessage: `Unknown command: ${commandName}. Type /help for a list of commands.` 
      };
    }
    
    const userMessageText = trimmedInput;
    let aiInstructionText = trimmedInput; // Default, can be overridden
    let systemMessageContent = ""; // For local command responses

    switch (commandName) {
      case "/ask":
      case "/search":
      case "/suggest":
      case "/insight":
      case "/direction":
      case "/dataset": 
      case "/debug":
      case "/game":
      case "/continue":
        if (commandName === "/continue" && args.length > 0) {
             return { userMessageText, action: 'error', errorMessage: "/continue command does not take arguments." };
        }
        if (!topic) { 
            return { userMessageText, action: 'error', errorMessage: "No active discussion. Please refresh the page to start a new one." };
        }
        aiInstructionText = args.join(' ') || userMessageText;
        return { userMessageText, aiInstructionText, action: 'round_robin_ai_response' };

      case "/elaborate":
      case "/show-work": {
        if (args.length === 0) return { userMessageText, action: 'error', errorMessage: `Please specify an expert for ${commandName}.` };
        if (!topic) {
            return { userMessageText, action: 'error', errorMessage: "No active discussion. Please refresh the page to start a new one." };
        }
        const targetExpertName = args[0];
        const targetExpertRoleKey = Object.keys(experts).find(key => key.toLowerCase() === targetExpertName.toLowerCase());
        
        if (!targetExpertRoleKey || !selectedExpertRoles.includes(targetExpertRoleKey)) {
             return { userMessageText, action: 'error', errorMessage: `Unknown or inactive expert: ${targetExpertName}. Active experts: ${selectedExpertRoles.join(', ')}.` };
        }

        const { trackedTasks } = useAgileBloomStore.getState();
        const expertRole = targetExpertRoleKey as ExpertRole;
        const assignedTasks = trackedTasks.filter(task => task.assignedTo === expertRole);
        let assignedTasksContext: string | undefined = undefined;

        if (assignedTasks.length > 0) {
            assignedTasksContext = assignedTasks.map(t => `- [${t.status}] ${t.description}`).join('\n');
        }

        return { userMessageText, aiInstructionText, action: 'single_ai_response', targetExpert: experts[expertRole].name, assignedTasksContext };
      }
      
      case "/analyze": {
        const itemIdPrefix = args[0];
        if (!itemIdPrefix) return { userMessageText, action: 'error', errorMessage: "Please provide the ID prefix of the story or task to analyze. e.g., /analyze 1a2b3c" };

        const { trackedStories, trackedTasks } = useAgileBloomStore.getState();
        const storyToAnalyze = trackedStories.find(s => s.id.startsWith(itemIdPrefix));
        const taskToAnalyze = trackedTasks.find(t => t.id.startsWith(itemIdPrefix));

        if (!storyToAnalyze && !taskToAnalyze) {
            return { userMessageText, action: 'error', errorMessage: `Story or task with ID prefix '${itemIdPrefix}' not found.` };
        }
        
        let itemDescriptionForPrompt: string;
        if (storyToAnalyze) {
            itemDescriptionForPrompt = `Type: User Story\nID: ${storyToAnalyze.id}\nStory: "${escapeForPrompt(storyToAnalyze.userStory)}"\nBenefit: "${escapeForPrompt(storyToAnalyze.benefit)}"\nAcceptance Criteria:\n- ${storyToAnalyze.acceptanceCriteria.map(ac => escapeForPrompt(ac)).join('\n- ')}`;
        } else { // taskToAnalyze must be defined here
            itemDescriptionForPrompt = `Type: Task\nID: ${taskToAnalyze!.id}\nDescription: "${escapeForPrompt(taskToAnalyze!.description)}"\nStatus: ${taskToAnalyze!.status}${taskToAnalyze!.storyId ? `\nParent Story ID: ${taskToAnalyze!.storyId}` : ''}`;
        }
        
        const analysisPrompt = `Please perform a FISH analysis on the following item. The analysis framework is provided in your system instructions. Place the full analysis in the 'work' field of your JSON response, and provide a brief summary in the 'message' field.\n\nItem for Analysis:\n---\n${itemDescriptionForPrompt}\n---`;

        return { userMessageText, aiInstructionText: analysisPrompt, action: 'single_ai_response', targetExpert: ROLE_SCRUM_LEADER };
      }

      case "/backlog":
      case "/summary":
        if (!topic) {
            return { userMessageText, action: 'error', errorMessage: "No active discussion. Please refresh the page to start a new one." };
        }
        return { userMessageText, aiInstructionText, action: 'single_ai_response', targetExpert: ROLE_SCRUM_LEADER };

      case "/sprint-planning": {
         const { trackedStories } = useAgileBloomStore.getState();
         const readyStories = trackedStories.filter(s => s.status === StoryStatus.Backlog || s.status === StoryStatus.SelectedForSprint);
         if (readyStories.length === 0) {
            return { userMessageText, action: 'local', aiInstructionText: "There are no stories in the backlog to plan with. Generate some stories from addressed questions first." };
         }
         const planningPrompt = "Please review the following high-priority user stories from the backlog and recommend a selection to form the current sprint. Explain your reasoning.\n\n" +
            readyStories.map(s => `- [${s.priority}] Story #${s.id.substring(0,6)}: ${s.userStory}`).join('\n');
         return { userMessageText, aiInstructionText: planningPrompt, action: 'single_ai_response', targetExpert: ROLE_SCRUM_LEADER };
      }
      
      case "/breakdown": {
        const storyIdPrefix = args[0];
        if (!storyIdPrefix) return { userMessageText, action: 'error', errorMessage: "Please provide the ID prefix of the story to break down. e.g., /breakdown 1a2b3c" };
        
        const { trackedStories } = useAgileBloomStore.getState();
        const storyToBreakDown = trackedStories.find(s => s.id.startsWith(storyIdPrefix));
        if (!storyToBreakDown) return { userMessageText, action: 'error', errorMessage: `Story with ID prefix '${storyIdPrefix}' not found.` };

        updateTrackedStory(storyToBreakDown.id, { status: StoryStatus.SelectedForSprint });
        // The breakdown prompt is handled inside the sendMessage logic now.
        // We just need to tell it which story to break down.
        // The command itself will be the AI instruction.
        return { userMessageText, aiInstructionText: trimmedInput, action: 'round_robin_ai_response' };
      }
      
      case "/questions": {
        const subCommand = args[0]?.toLowerCase();
        
        if (subCommand === 'discuss') {
            const discussIdPrefix = args[1];
            if (!discussIdPrefix) return { userMessageText, action: 'error', errorMessage: "Please provide the ID prefix of the question to discuss." };
            
            const trackedQuestions = useAgileBloomStore.getState().trackedQuestions;
            const questionToDiscuss = trackedQuestions.find(q => q.id.startsWith(discussIdPrefix));
            if (!questionToDiscuss) return { userMessageText, action: 'error', errorMessage: `Question with ID prefix '${discussIdPrefix}' not found.` };
            
            // This is still valid as it can be triggered by a card click
            updateTrackedQuestionStatus(questionToDiscuss.id, QuestionStatus.Addressing);
            const discussionPrompt = `Let's focus the discussion on this specific question that was raised earlier by ${questionToDiscuss.expertRole}. Please provide your perspective. Question: "${escapeForPrompt(questionToDiscuss.text)}"`;
            return { userMessageText, aiInstructionText: discussionPrompt, action: 'round_robin_ai_response' };
        }
        
        systemMessageContent = "The '/questions' command is primarily managed via the sidebar UI. There you can view, filter, and perform bulk actions on tracked questions.";
        return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
      }
      
      case "/stories": {
        const { trackedQuestions } = useAgileBloomStore.getState();
        const addressedQuestions = trackedQuestions.filter(q => q.status === QuestionStatus.Addressed);
        if (addressedQuestions.length === 0) {
            systemMessageContent = "No 'Addressed' questions to generate stories from. Mark some questions as addressed in the sidebar first.";
            return { userMessageText, action: 'local', aiInstructionText: systemMessageContent };
        }
        
        const promptContent = "Please review the following 'Addressed' discussion points and generate formal user stories for the product backlog. Each story should have a clear user, action, and benefit, along with initial acceptance criteria. Present this as a markdown table with columns: 'ID', 'User Story', 'Benefit/Value', and 'Initial Acceptance Criteria'.\n\n" +
            addressedQuestions.map(q => `- ID ${q.id.substring(0, ID_PREFIX_LENGTH_QUESTIONS)}: "${escapeForPrompt(q.text)}" (raised by ${q.expertRole})`).join('\n');

        return { userMessageText, aiInstructionText: promptContent, action: 'single_ai_response', targetExpert: ROLE_SCRUM_LEADER };
      }

      case "/help":
        toggleHelpModal();
        return { userMessageText, action: 'no_action' };
      
      case "/clear":
         if(window.confirm("Are you sure you want to clear the chat and reset the session?")) {
            storeClearChat();
            return { userMessageText, action: 'no_action' };
        }
        return { userMessageText, action: 'no_action' };
        
      default:
        // This case should be unreachable due to the find() check at the start.
        return { 
          userMessageText: trimmedInput, 
          action: 'error', 
          errorMessage: `Unknown command: ${commandName}` 
        };
    }
  };
  
  const sendMessage = useCallback(async (inputText: string, file: UploadedFile | null, isAutoContinue: boolean = false) => {
    if (isLoading) return;
    if (isAutoContinue) {
        setLastActionWasAutoContinue(true);
    } else {
        setLastActionWasAutoContinue(false);
        // User action should cancel any pending auto-continue
        if (autoContinueTimeoutRef.current) {
            clearTimeout(autoContinueTimeoutRef.current);
            autoContinueTimeoutRef.current = null;
        }
        // User action should interrupt auto-mode sequence
        toggleAutoMode(); 
    }
  
    if (!isAutoContinue) {
        if (checkAndApplyRateLimit()) return;
        addUserMessageTimestamp(Date.now());
    }
    
    const { action, userMessageText, aiInstructionText, targetExpert, errorMessage, newTopic, assignedTasksContext } = handleCommandInput(inputText);
    
    if (userMessageText.trim() !== '' || file) {
         addMessage({ expertName: ROLE_USER, text: userMessageText });
    }
    if (action === 'error' && errorMessage) {
        addErrorMessage(errorMessage);
        return;
    }
    if (action === 'local' && aiInstructionText) {
        addMessage({ expertName: ROLE_SYSTEM, text: aiInstructionText, isCommandResponse: true });
        return;
    }
    if (action === 'no_action') {
        return;
    }
    
    setLoading(true);
    setError(null);
    
    const { discussion, numThoughts, memoryContext, codebaseContext, experts } = useAgileBloomStore.getState();

    // Attach file content to the AI instruction text if it's text-based
    let finalAiInstruction = aiInstructionText || userMessageText;
    if (file?.textContent) {
        finalAiInstruction = `The user has provided the following file content named "${file.name}". Please analyze and discuss it.\n\n--- FILE CONTENT ---\n${file.textContent}\n--- END FILE CONTENT ---\n\nUser's prompt: ${finalAiInstruction}`;
    }

    try {
        if (action === 'single_ai_response' && targetExpert) {
            const aiResponse = await getAiResponse(
                topic, finalAiInstruction, discussion, numThoughts, memoryContext, 
                targetExpert, file, codebaseContext, assignedTasksContext
            );
            processAndAddAiResponse(aiResponse, targetExpert);
        } else if (action === 'round_robin_ai_response') {
            const roundRobinOrder = getRoundRobinOrder();
            
            // Special handling for /breakdown command
            const breakdownMatch = finalAiInstruction.match(/^\/breakdown\s+([a-zA-Z0-9]+)/);
            if (breakdownMatch) {
                 const storyIdPrefix = breakdownMatch[1];
                 const { trackedStories } = useAgileBloomStore.getState();
                 const storyToBreakDown = trackedStories.find(s => s.id.startsWith(storyIdPrefix));
                 
                 if (storyToBreakDown) {
                    // All experts (except Scrum Leader) get a tailored prompt
                    const expertsToPrompt = roundRobinOrder.filter(role => role !== ROLE_SCRUM_LEADER);

                    for (const expertRole of expertsToPrompt) {
                        const expert = experts[expertRole];
                        const breakdownPrompt = BREAKDOWN_STORY_PROMPT_TEMPLATE
                            .replace(/{emulated_expert_name}/g, expert.name)
                            .replace(/{emulated_expert_description}/g, escapeForPrompt(expert.description))
                            .replace(/{user_story_text}/g, escapeForPrompt(storyToBreakDown.userStory))
                            .replace(/{user_story_benefit}/g, escapeForPrompt(storyToBreakDown.benefit))
                            .replace(/{user_story_ac}/g, storyToBreakDown.acceptanceCriteria.map(ac => `- ${escapeForPrompt(ac)}`).join('\\n'))
                            .replace(/{expert_emoji_placeholder}/g, expert.emoji);

                        const aiResponse = await getAiResponse(
                            topic, breakdownPrompt, discussion, 0, memoryContext, expertRole, null, codebaseContext, null
                        );
                        processAndAddAiResponse(aiResponse, expertRole, storyToBreakDown.id);
                        await new Promise(resolve => setTimeout(resolve, SEQUENTIAL_AI_CALL_DELAY_MS));
                    }
                 } else {
                     addErrorMessage(`Could not find story with ID prefix ${storyIdPrefix} to break down.`);
                 }
            } else {
                // Regular round-robin for other commands
                for (const expertRole of roundRobinOrder) {
                    const currentDiscussionState = useAgileBloomStore.getState().discussion;
                    const aiResponse = await getAiResponse(
                        topic, finalAiInstruction, currentDiscussionState, numThoughts, memoryContext, 
                        expertRole, file, codebaseContext, null
                    );
                    processAndAddAiResponse(aiResponse, expertRole);
                    // Add a delay between sequential calls
                    if (roundRobinOrder.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, SEQUENTIAL_AI_CALL_DELAY_MS));
                    }
                }
            }
        }
    } catch (error: any) {
        console.error("Error during AI response generation:", error);
        addErrorMessage(error.message || "An unknown error occurred while communicating with the AI.");
    } finally {
        setLoading(false);
        clearUploadedFile();
        updateNarrativeSummary();
    }
  }, [
      isLoading, topic, addMessage, addErrorMessage, setLoading, setError, 
      toggleHelpModal, storeClearChat, checkAndApplyRateLimit, addUserMessageTimestamp, 
      processAndAddAiResponse, getRoundRobinOrder, updateNarrativeSummary, escapeForPrompt
  ]);
  
  const initiateDiscussion = (settings: Settings) => {
      storeClearChat();
      const { setTopic, setSelectedExpertRoles } = useAgileBloomStore.getState();
      setTopic(settings.topic);
      setSelectedExpertRoles(settings.selectedRoles);
      addMessage({
          expertName: ROLE_SYSTEM,
          text: `Discussion started on topic: "${settings.topic}" with experts: ${settings.selectedRoles.join(', ')}.`,
          isCommandResponse: true,
      });

      if (settings.context.trim() !== '') {
          // Add context but don't trigger AI response yet, it will be included in the first user command
          addMessage({
              expertName: ROLE_SYSTEM,
              text: `The following context was provided:\n\n---\n${settings.context}\n---`,
              isCommandResponse: true
          });
      }
      
      // Automatically trigger a /continue to get the discussion started.
      sendMessage("/continue", null, false);
  };
  
  const generateTasksFromContext = useCallback(async () => {
    if (isLoading || !topic) {
        addErrorMessage("Cannot generate tasks without an active discussion topic.");
        return;
    }
    setLoading(true);
    try {
        const { discussion, memoryContext } = useAgileBloomStore.getState();
        const aiResponse = await getAiResponse(
            topic,
            GENERATE_TASKS_FROM_CONTEXT_PROMPT,
            discussion,
            0,
            memoryContext,
            ROLE_SCRUM_LEADER,
        );
        processAndAddAiResponse(aiResponse, ROLE_SCRUM_LEADER);
    } catch(e) {
        const err = e as Error;
        console.error("Error generating backlog:", err);
        addErrorMessage(`Failed to generate backlog: ${err.message}`);
    } finally {
        setLoading(false);
    }
  }, [isLoading, topic, processAndAddAiResponse]);

  const compileDocumentationForExpert = useCallback(async (expertRole: ExpertRole) => {
    if (isLoading || !topic) {
        addErrorMessage("Cannot compile documentation without an active discussion topic.");
        return;
    }

    const { trackedTasks, experts, discussion, memoryContext } = useAgileBloomStore.getState();
    const tasksForExpert = trackedTasks.filter(t => t.assignedTo === expertRole && (t.status === TaskStatus.ToDo || t.status === TaskStatus.InProgress));

    if (tasksForExpert.length === 0) {
        addErrorMessage(`No active tasks found for ${expertRole} to compile documentation from.`);
        return;
    }

    setLoading(true);
    try {
        const expert = experts[expertRole];
        const taskList = tasksForExpert.map(t => `- ${escapeForPrompt(t.description)}`).join('\\n');

        const compilePrompt = COMPILE_DOCUMENTATION_PROMPT_TEMPLATE
            .replace(/{emulated_expert_name}/g, expert.name)
            .replace(/{expert_emoji_placeholder}/g, expert.emoji)
            .replace(/{task_list}/g, taskList);

        const aiResponse = await getAiResponse(
            topic,
            compilePrompt,
            discussion,
            0, // No thoughts needed
            memoryContext,
            expertRole,
        );
        processAndAddAiResponse(aiResponse, expertRole);
    } catch(e) {
        const err = e as Error;
        console.error("Error compiling documentation:", err);
        addErrorMessage(`Failed to compile documentation: ${err.message}`);
    } finally {
        setLoading(false);
    }
  }, [isLoading, topic, processAndAddAiResponse]);


  const updateQuestionStatusAndPotentiallyGenerateActions = useCallback(async (questionId: string, newStatus: QuestionStatus) => {
    if (isLoading) return;

    // Update the status locally first for immediate UI feedback
    updateTrackedQuestionStatus(questionId, newStatus);
    
    if (newStatus === QuestionStatus.Addressing) {
        const question = useAgileBloomStore.getState().trackedQuestions.find(q => q.id === questionId);
        if (question) {
            sendMessage(`/questions discuss ${question.id.substring(0, ID_PREFIX_LENGTH_QUESTIONS)}`, null, false);
        }
    } else if (newStatus === QuestionStatus.Addressed) {
        // Trigger story generation for this specific question
        const question = useAgileBloomStore.getState().trackedQuestions.find(q => q.id === questionId);
        if (question) {
            const prompt = `A key discussion point has been marked 'Addressed'. Please generate a formal user story for the product backlog based on this point. Present it as a markdown table with columns: 'ID', 'User Story', 'Benefit/Value', and 'Initial Acceptance Criteria'.\n\n- ID ${question.id.substring(0, ID_PREFIX_LENGTH_QUESTIONS)}: "${escapeForPrompt(question.text)}" (raised by ${question.expertRole})`;
            
            setLoading(true);
            try {
                const { discussion, memoryContext } = useAgileBloomStore.getState();
                const aiResponse = await getAiResponse(topic, prompt, discussion, 0, memoryContext, ROLE_SCRUM_LEADER);
                processAndAddAiResponse(aiResponse, ROLE_SCRUM_LEADER);
            } catch(e) {
                const err = e as Error;
                console.error("Error generating story from question:", err);
                addErrorMessage(`Failed to generate story: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
    }
    // Dismissed and Open statuses require no further AI action.
  }, [isLoading, updateTrackedQuestionStatus, sendMessage, topic, processAndAddAiResponse, escapeForPrompt]);

  // Effect for rate limiting check
  useEffect(() => {
    if (isRateLimited) {
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
      rateLimitTimeoutRef.current = window.setTimeout(() => {
        setRateLimitedStatus(false);
      }, RATE_LIMIT_WINDOW_SECONDS * 1000);
    }
    return () => {
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, [isRateLimited, setRateLimitedStatus]);

  // Effect for auto-continue mode
  useEffect(() => {
    const { discussion, isLoading: currentLoading, lastActionWasAutoContinue } = store();
    const lastMessage = discussion[discussion.length - 1];
    
    // Clear any existing timeout if conditions are not met
    if (autoContinueTimeoutRef.current) {
        clearTimeout(autoContinueTimeoutRef.current);
        autoContinueTimeoutRef.current = null;
    }

    // Set a new timeout if conditions are met
    if (
        isAutoModeEnabled &&
        !currentLoading &&
        discussion.length > 0 &&
        lastMessage &&
        lastMessage.id !== lastAutoContinuedMessageIdRef.current &&
        !lastActionWasAutoContinue &&
        lastMessage.expert.name !== ROLE_USER
    ) {
        autoContinueTimeoutRef.current = window.setTimeout(() => {
            if (store().isAutoModeEnabled && !store().isLoading) { // Re-check state before sending
                lastAutoContinuedMessageIdRef.current = lastMessage.id;
                sendMessage('/continue', null, true);
            }
        }, autoModeDelaySeconds * 1000);
    }

    return () => {
        if (autoContinueTimeoutRef.current) {
            clearTimeout(autoContinueTimeoutRef.current);
        }
    };
  }, [discussion, isLoading, isAutoModeEnabled, autoModeDelaySeconds, sendMessage, store, setLastActionWasAutoContinue]);

  return {
    initiateDiscussion,
    sendMessage,
    generateTasksFromContext,
    compileDocumentationForExpert,
    updateQuestionStatusAndPotentiallyGenerateActions,
    handleTaskUpdate,
  };
};
