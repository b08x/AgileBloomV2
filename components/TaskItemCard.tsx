
import React, { useMemo } from 'react';
import { TrackedTask, TaskStatus, ExpertRole, Expert, TaskPriority } from '../types';
import { Circle, Settings2, Check, Trash2, Play, Link, ChevronsUp, ChevronDown, ChevronsDown } from 'lucide-react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { ROLE_SCRUM_LEADER } from '../constants';

interface TaskItemCardProps {
  task: TrackedTask;
  onUpdate: (taskId: string, updates: Partial<Omit<TrackedTask, 'id'>>) => void;
  onRemove: (taskId: string) => void;
  onShowWork: (expert: ExpertRole) => void;
  isDisabled: boolean;
  selectedExpertRoles: ExpertRole[];
  experts: Record<ExpertRole, Expert>;
}

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; color: string; }> = {
  [TaskStatus.ToDo]: { icon: <Circle size={14} />, color: 'text-[#95aac0]' },
  [TaskStatus.InProgress]: { icon: <Settings2 size={14} className="animate-spin" style={{ animationDuration: '3s' }} />, color: 'text-yellow-400' },
  [TaskStatus.Done]: { icon: <Check size={14} />, color: 'text-green-400' },
};

const priorityConfig: Record<TaskPriority, { icon: React.ReactNode; color: string; label: string }> = {
    'High': { icon: <ChevronsUp size={14} />, color: 'text-red-400', label: 'High' },
    'Medium': { icon: <ChevronDown size={14} />, color: 'text-yellow-400', label: 'Medium' },
    'Low': { icon: <ChevronsDown size={14} />, color: 'text-gray-400', label: 'Low' },
};

export const TaskItemCard: React.FC<TaskItemCardProps> = ({ task, onUpdate, onRemove, onShowWork, isDisabled, selectedExpertRoles, experts }) => {
    const { id, description, status, assignedTo, storyId, priority } = task;
    const { trackedStories } = useAgileBloomStore.getState();
    
    const statusCfg = statusConfig[status] || statusConfig[TaskStatus.ToDo];
    const priorityCfg = priorityConfig[priority] || priorityConfig.Medium;
    const expert = assignedTo ? experts[assignedTo] : null;

    const parentStory = storyId ? trackedStories.find(s => s.id === storyId) : null;

    const assignableExperts = useMemo(() => {
        return selectedExpertRoles.filter(role => role !== ROLE_SCRUM_LEADER);
    }, [selectedExpertRoles]);

    const handleAssign = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const expertRole = e.target.value as ExpertRole;
        if (expertRole) {
            onUpdate(id, { assignedTo: expertRole });
        }
    };

    return (
        <div className="w-full text-left p-3 bg-[#333e48] rounded-lg border border-[#5c6f7e] transition-all duration-200 space-y-2">
             {parentStory && (
                <div className="text-xs text-[#e2a32d] flex items-center gap-1.5 bg-[#e2a32d]/20 px-2 py-1 rounded-full w-fit">
                   <Link size={12}/>
                   From Story: #{parentStory.id.substring(0, 6)}
                </div>
             )}
            <div className="flex justify-between items-start">
                <p className="text-sm text-gray-200 leading-snug flex-grow pr-2 whitespace-pre-wrap">{description}</p>
                <button
                    onClick={() => window.confirm(`Are you sure you want to remove this task?\n\n"${description}"`) && onRemove(id)}
                    disabled={isDisabled}
                    className="p-1 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed flex-shrink-0"
                    title="Remove task"
                    aria-label="Remove task"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="mt-2 pt-2 border-t border-[#5c6f7e] flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                     <span className={`flex items-center font-medium ${statusCfg.color}`}>
                        {statusCfg.icon}
                        <span className="ml-1.5">{status}</span>
                    </span>

                    <div className="relative group">
                        <button disabled={isDisabled} title="Set Priority" className={`flex items-center font-medium rounded px-1.5 py-0.5 ${priorityCfg.color} bg-black/20 hover:bg-black/40 disabled:cursor-not-allowed`}>
                            {priorityCfg.icon}
                            <span className="ml-1.5">{priorityCfg.label}</span>
                        </button>
                        <div className="absolute bottom-full mb-2 -left-2 w-32 bg-[#333e48] border border-[#5c6f7e] rounded-lg shadow-xl z-10 hidden group-hover:block animate-fadeIn">
                            <ul className="py-1 text-sm text-gray-200">
                                {(['High', 'Medium', 'Low'] as TaskPriority[]).map(p => (
                                    <li key={p}>
                                        <button onClick={() => onUpdate(id, { priority: p })} className={`w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-[#e2a32d]/20 transition-colors ${priorityConfig[p].color}`}>
                                            {priorityConfig[p].icon} {priorityConfig[p].label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    
                    {expert ? (
                        <span className="flex items-center text-[#95aac0]" title={`Assigned to ${expert.name}`}>
                            {expert.emoji}
                            <span className="ml-1 font-medium text-gray-200">{expert.name}</span>
                        </span>
                    ) : (
                         <select
                            value=""
                            onChange={handleAssign}
                            disabled={isDisabled || assignableExperts.length === 0}
                            className="bg-[#333e48] border border-[#5c6f7e] rounded text-xs py-0.5 px-2 focus:outline-none focus:ring-1 focus:ring-[#e2a32d] transition-colors disabled:cursor-not-allowed disabled:bg-[#333e48]/50 text-gray-200"
                            aria-label={`Assign task: ${description}`}
                            title={assignableExperts.length === 0 ? "No experts available to assign" : "Assign task"}
                        >
                            <option value="" disabled>Assign to...</option>
                            {assignableExperts.map(role => (
                                <option key={role} value={role}>
                                    {experts[role]?.emoji || '🧑‍💻'} {role}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                 
                 <div className="flex items-center gap-2">
                    {task.status === TaskStatus.InProgress && task.assignedTo && (
                        <button
                            onClick={() => onShowWork(task.assignedTo!)}
                            disabled={isDisabled}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-green-300 bg-green-900/40 hover:bg-green-800/60 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Ask ${task.assignedTo} to show their work on this task`}
                        >
                            <Play size={12} />
                            Show Work
                        </button>
                    )}
                    <select
                        value={status}
                        onChange={(e) => onUpdate(id, { status: e.target.value as TaskStatus })}
                        disabled={isDisabled}
                        className="bg-[#5c6f7e] border border-[#95aac0] rounded text-xs py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-[#e2a32d] transition-colors disabled:cursor-not-allowed"
                        aria-label={`Change status for task: ${description}`}
                    >
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};
