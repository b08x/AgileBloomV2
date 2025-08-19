import React, { useMemo } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { TrackedStory, StoryStatus, StoryPriority, TaskStatus } from '../types';
import { Book, CheckSquare, Settings2, Trash2, XSquare, FilePlus, Circle, ChevronDown, ChevronUp, ChevronsUp, ChevronsDown, Wand2 } from 'lucide-react';

interface StoryItemCardProps {
  story: TrackedStory;
  onUpdate: (storyId: string, updates: Partial<Omit<TrackedStory, 'id'>>) => void;
  onRemove: (storyId: string) => void;
  onBreakdown: (storyId: string) => void;
  isDisabled: boolean;
}

const statusConfig: Record<StoryStatus, { icon: React.ReactNode; color: string; }> = {
  [StoryStatus.Backlog]: { icon: <FilePlus size={14} />, color: 'text-[#95aac0]' },
  [StoryStatus.SelectedForSprint]: { icon: <Circle size={14} />, color: 'text-[#e2a32d]' },
  [StoryStatus.InProgress]: { icon: <Settings2 size={14} className="animate-spin" style={{ animationDuration: '3s' }} />, color: 'text-yellow-400' },
  [StoryStatus.Done]: { icon: <CheckSquare size={14} />, color: 'text-green-400' },
  [StoryStatus.Rejected]: { icon: <XSquare size={14} />, color: 'text-red-500' },
};

const priorityConfig: Record<StoryPriority, { icon: React.ReactNode; color: string; }> = {
    'Low': { icon: <ChevronsDown size={14} />, color: 'text-gray-400' },
    'Medium': { icon: <ChevronDown size={14} />, color: 'text-[#95aac0]' },
    'High': { icon: <ChevronUp size={14} />, color: 'text-yellow-400' },
    'Critical': { icon: <ChevronsUp size={14} />, color: 'text-red-500' },
};

export const StoryItemCard: React.FC<StoryItemCardProps> = ({ story, onUpdate, onRemove, onBreakdown, isDisabled }) => {
    const { id, userStory, benefit, acceptanceCriteria, status, priority, sprintPoints } = story;
    const { trackedTasks } = useAgileBloomStore.getState();

    const config = statusConfig[status] || statusConfig.Backlog;
    const prioConfig = priorityConfig[priority] || priorityConfig.Medium;

    const linkedTasks = useMemo(() => trackedTasks.filter(t => t.storyId === id), [trackedTasks, id]);
    const doneTasks = useMemo(() => linkedTasks.filter(t => t.status === TaskStatus.Done).length, [linkedTasks]);
    const progress = linkedTasks.length > 0 ? (doneTasks / linkedTasks.length) * 100 : 0;

    const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const points = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
        if (points === undefined || (!isNaN(points) && points >= 0)) {
            onUpdate(id, { sprintPoints: points });
        }
    };
    
    return (
        <div className="w-full text-left p-3 bg-[#333e48] rounded-lg border border-[#5c6f7e] transition-all duration-200 space-y-3">
            
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-[#e2a32d]">
                    <Book size={16} />
                    <h4 className="font-semibold text-sm">User Story #{id.substring(0, 6)}</h4>
                </div>
                <button
                    onClick={() => window.confirm(`Are you sure you want to remove this story?\n\n"${userStory}"`) && onRemove(id)}
                    disabled={isDisabled}
                    className="p-1 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed flex-shrink-0"
                    title="Remove story"
                    aria-label="Remove story"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <p className="text-sm text-gray-200 leading-snug whitespace-pre-wrap">{userStory}</p>
            
            {benefit && (
                <div className="pl-2 border-l-2 border-[#e2a32d]/80">
                    <p className="text-xs text-[#95aac0] italic"><strong>Benefit:</strong> {benefit}</p>
                </div>
            )}
            
            {acceptanceCriteria && acceptanceCriteria.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-[#95aac0] mt-2 mb-1">Acceptance Criteria:</h5>
                    <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-gray-200">
                        {acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}
                    </ul>
                </div>
            )}
            
            {linkedTasks.length > 0 && (
                <div>
                     <h5 className="text-xs font-semibold text-[#95aac0] mb-1">Task Progress</h5>
                     <div className="flex items-center gap-2">
                        <div className="w-full bg-[#5c6f7e] rounded-full h-2.5">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="text-xs font-mono text-gray-200">{doneTasks}/{linkedTasks.length}</span>
                    </div>
                </div>
            )}

            <div className="mt-2 pt-3 border-t border-[#5c6f7e] flex flex-wrap gap-2 justify-between items-center text-xs">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <select value={status} onChange={(e) => onUpdate(id, { status: e.target.value as StoryStatus })} disabled={isDisabled} className={`bg-[#5c6f7e] border border-[#95aac0] rounded text-xs py-0.5 pl-1 pr-6 focus:outline-none focus:ring-1 focus:ring-[#e2a32d] transition-colors disabled:cursor-not-allowed font-medium ${config.color}`} style={{ backgroundImage: 'none', appearance: 'none', backgroundPosition: `right 0.2rem center`}}>
                        {Object.values(StoryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select value={priority} onChange={(e) => onUpdate(id, { priority: e.target.value as StoryPriority })} disabled={isDisabled} className={`bg-[#5c6f7e] border border-[#95aac0] rounded text-xs py-0.5 pl-1 pr-6 focus:outline-none focus:ring-1 focus:ring-[#e2a32d] transition-colors disabled:cursor-not-allowed font-medium ${prioConfig.color}`} style={{ backgroundImage: 'none', appearance: 'none', backgroundPosition: `right 0.2rem center`}}>
                        {Object.keys(priorityConfig).map((prio) => <option key={prio} value={prio}>{prio}</option>)}
                    </select>
                    
                    <div className="flex items-center">
                        <input type="number" value={sprintPoints ?? ''} onChange={handlePointsChange} placeholder="Pts" min="0" className="w-14 text-center bg-[#5c6f7e] border border-[#95aac0] rounded py-0.5 px-1 font-mono focus:outline-none focus:ring-1 focus:ring-[#e2a32d] disabled:cursor-not-allowed" disabled={isDisabled} />
                    </div>
                </div>
                 
                <button 
                    onClick={() => onBreakdown(id)}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#c36e26] hover:bg-[#c36e26]/90 rounded text-white font-semibold disabled:bg-[#5c6f7e] disabled:cursor-not-allowed transition-colors"
                    title="Ask AI team to break this story into tasks"
                >
                    <Wand2 size={14} />
                    Break Down
                </button>
            </div>
        </div>
    );
};