
import React, { useState, useMemo } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';
import { QuestionItemCard } from './QuestionItemCard';
import { QuestionStatus, ExpertRole } from '../types';
import { Lightbulb, ChevronDown, CheckSquare, XSquare, Loader2, MessageSquare } from 'lucide-react';
import { BULK_ACTION_DELAY_MS } from '../constants';

// An ExpertGroup component to keep the main component cleaner
const ExpertQuestionGroup: React.FC<{
  expert: ReturnType<typeof useAgileBloomStore.getState>['experts'][string];
  questions: ReturnType<typeof useAgileBloomStore.getState>['trackedQuestions'];
  selectedQuestionIds: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: (ids: string[]) => void;
  onDiscuss: (id: string) => void;
  onMarkAddressed: (id: string) => void;
  onDismiss: (id: string) => void;
  isDisabled: boolean;
}> = ({ expert, questions, selectedQuestionIds, onToggleSelection, onSelectAll, onDeselectAll, onDiscuss, onMarkAddressed, onDismiss, isDisabled }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const expertQuestions = useMemo(() => questions.filter(q => q.expertRole === expert.name), [questions, expert.name]);
  const expertQuestionIds = useMemo(() => expertQuestions.map(q => q.id), [expertQuestions]);
  
  const areAllSelected = useMemo(() => expertQuestionIds.length > 0 && expertQuestionIds.every(id => selectedQuestionIds.includes(id)), [expertQuestionIds, selectedQuestionIds]);

  if (expertQuestions.length === 0) {
    return null; // Don't render group if expert has no questions
  }

  const handleSelectAllToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectAll(expertQuestionIds);
    } else {
      onDeselectAll(expertQuestionIds);
    }
  };

  return (
    <div className="bg-[#333e48]/50 rounded-lg border border-[#5c6f7e]">
      <header 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#333e48] transition-colors rounded-t-lg"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
            <input
                type="checkbox"
                checked={areAllSelected}
                onChange={handleSelectAllToggle}
                onClick={(e) => e.stopPropagation()} // Prevent header click from toggling collapse
                disabled={isDisabled}
                className="h-4 w-4 rounded bg-[#5c6f7e] border-[#95aac0] text-[#c36e26] focus:ring-[#e2a32d] cursor-pointer disabled:cursor-not-allowed"
                title={`Select all questions from ${expert.name}`}
            />
            <span className="text-lg">{expert.emoji}</span>
            <span className="font-semibold text-gray-200">{expert.name}</span>
            <span className="text-xs font-mono bg-[#5c6f7e] text-[#e2a32d] px-1.5 py-0.5 rounded-full">{expertQuestions.length}</span>
        </div>
        <ChevronDown size={20} className={`text-[#95aac0] transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
      </header>
      {!isCollapsed && (
        <div className="p-2 space-y-2 border-t border-[#5c6f7e]">
          {expertQuestions.sort((a, b) => a.timestamp - b.timestamp).map(q => (
            <QuestionItemCard
              key={q.id}
              question={q}
              isSelected={selectedQuestionIds.includes(q.id)}
              onToggleSelection={onToggleSelection}
              onDiscuss={onDiscuss}
              onMarkAddressed={onMarkAddressed}
              onDismiss={onDismiss}
              isDisabled={isDisabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};


export const TrackedQuestionsSidebar: React.FC = () => {
    const { trackedQuestions, isLoading, experts, selectedExpertRoles, addErrorMessage } = useAgileBloomStore();
    const { updateQuestionStatusAndPotentiallyGenerateActions } = useAgileBloomChat();
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const isProcessing = isLoading || isBulkUpdating;
    
    const handleDiscuss = (questionId: string) => {
      if (isProcessing) return;
      updateQuestionStatusAndPotentiallyGenerateActions(questionId, QuestionStatus.Addressing);
    };
    
    const handleMarkAddressed = (questionId: string) => {
      if (isProcessing) return;
      updateQuestionStatusAndPotentiallyGenerateActions(questionId, QuestionStatus.Addressed);
    };
    
    const handleDismiss = (questionId: string) => {
        if (isProcessing) return;
        updateQuestionStatusAndPotentiallyGenerateActions(questionId, QuestionStatus.Dismissed);
    };

    const handleToggleSelection = (id: string) => {
        setSelectedQuestionIds(prev =>
            prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
        );
    };

    const handleSelectAllForExpert = (idsToAdd: string[]) => {
        setSelectedQuestionIds(prev => [...new Set([...prev, ...idsToAdd])]);
    };
    
    const handleDeselectAllForExpert = (idsToRemove: string[]) => {
        setSelectedQuestionIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    };

    const handleBulkStatusChange = async (newStatus: QuestionStatus) => {
        if (isProcessing || selectedQuestionIds.length === 0) return;
        
        setIsBulkUpdating(true);
        try {
            const idsToProcess = [...selectedQuestionIds];
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            for (const [index, id] of idsToProcess.entries()) {
                // For actions that trigger AI calls, add a delay between them to avoid rate limits
                if (newStatus === QuestionStatus.Addressed || newStatus === QuestionStatus.Addressing) {
                    if (index > 0) { // No delay before the first call
                        await delay(BULK_ACTION_DELAY_MS);
                    }
                }
                await updateQuestionStatusAndPotentiallyGenerateActions(id, newStatus);
            }
        } catch (error) {
            console.error("Error during bulk update:", error);
            const message = error instanceof Error ? `Bulk update failed: ${error.message}` : "An unknown error occurred during bulk update.";
            addErrorMessage(message);
        } finally {
            setSelectedQuestionIds([]);
            setIsBulkUpdating(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full">
            <header className="p-4 border-b border-[#5c6f7e]">
                <h2 className="text-lg font-semibold text-[#e2a32d]">Tracked Discussion Points</h2>
                <p className="text-xs text-[#95aac0]">Questions raised by the AI team during discussion.</p>
            </header>

            <div className="flex-grow overflow-y-auto p-2 pb-32 scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934] space-y-3">
                {trackedQuestions.length > 0 && selectedExpertRoles.length > 0 ? (
                    selectedExpertRoles.map(expertRole => (
                      <ExpertQuestionGroup
                        key={expertRole}
                        expert={experts[expertRole]}
                        questions={trackedQuestions}
                        selectedQuestionIds={selectedQuestionIds}
                        onToggleSelection={handleToggleSelection}
                        onSelectAll={handleSelectAllForExpert}
                        onDeselectAll={handleDeselectAllForExpert}
                        onDiscuss={handleDiscuss}
                        onMarkAddressed={handleMarkAddressed}
                        onDismiss={handleDismiss}
                        isDisabled={isProcessing}
                      />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[#95aac0] p-4">
                        <Lightbulb size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-200">No Questions Found</h3>
                        <p className="text-xs mt-2">New questions will appear here as the AI team discusses the topic.</p>
                    </div>
                )}
            </div>

            {selectedQuestionIds.length > 0 && (
                 <div className="flex-shrink-0 p-3 border-t border-[#5c6f7e] bg-[#212934] animate-fadeIn">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-gray-200">
                            Bulk Actions ({selectedQuestionIds.length} selected)
                        </h4>
                        <button 
                            onClick={() => setSelectedQuestionIds([])} 
                            disabled={isProcessing}
                            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                            Deselect All
                        </button>
                    </div>
                    {isBulkUpdating && (
                        <div className="flex items-center justify-center p-2 text-yellow-400">
                             <Loader2 size={16} className="animate-spin mr-2" />
                             <span>Applying changes...</span>
                        </div>
                    )}
                    {!isBulkUpdating && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                           <button 
                                onClick={() => handleBulkStatusChange(QuestionStatus.Addressing)} 
                                disabled={isProcessing}
                                className="flex items-center justify-center gap-1.5 p-2 bg-[#e2a32d]/20 hover:bg-[#e2a32d]/30 text-[#e2a32d] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageSquare size={14}/> Discuss
                            </button>
                           <button 
                                onClick={() => handleBulkStatusChange(QuestionStatus.Addressed)} 
                                disabled={isProcessing}
                                className="flex items-center justify-center gap-1.5 p-2 bg-green-800/60 hover:bg-green-700/80 text-green-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckSquare size={14}/> Mark Addressed
                            </button>
                             <button 
                                onClick={() => handleBulkStatusChange(QuestionStatus.Dismissed)}
                                disabled={isProcessing}
                                className="flex items-center justify-center gap-1.5 p-2 bg-red-800/60 hover:bg-red-700/80 text-red-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XSquare size={14}/> Dismiss
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
