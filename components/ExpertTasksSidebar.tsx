
import React, { useState, useMemo } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';
import { TaskStatus, ExpertRole, TaskPriority } from '../types';
import { TaskItemCard } from './TaskItemCard';
import { ListChecks, BrainCircuit, ListTodo, ClipboardList } from 'lucide-react';

export const ExpertTasksSidebar: React.FC = () => {
    const { 
        trackedTasks, 
        isLoading, 
        topic,
        removeTrackedTask,
        selectedExpertRoles,
        experts,
    } = useAgileBloomStore();
    
    const { generateTasksFromContext, sendMessage, handleTaskUpdate } = useAgileBloomChat();

    const tabs: Array<{ label: string; value: ExpertRole | 'Unassigned', emoji: React.ReactNode }> = useMemo(() => [
        ...selectedExpertRoles.map(role => ({
            label: role,
            value: role,
            emoji: experts[role]?.emoji || '❓'
        })),
        { label: 'Unassigned', value: 'Unassigned', emoji: <ClipboardList size={16} /> }
    ], [selectedExpertRoles, experts]);

    const [activeTab, setActiveTab] = useState<ExpertRole | 'Unassigned'>(selectedExpertRoles.length > 0 ? selectedExpertRoles[0] : 'Unassigned');

    const handleShowWork = (expert: ExpertRole) => {
        if (isLoading || !expert) return;
        sendMessage(`/show-work ${expert}`, null, false);
    };
    
    const priorityOrder: Record<TaskPriority, number> = { 'High': 0, 'Medium': 1, 'Low': 2 };

    const filteredTasks = trackedTasks.filter(t => {
        const isCurrent = t.status === TaskStatus.ToDo || t.status === TaskStatus.InProgress;
        if (!isCurrent) return false;

        if (activeTab === 'Unassigned') {
            return !t.assignedTo;
        }
        return t.assignedTo === activeTab;
    }).sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.order - b.order;
    });


    return (
        <div className="flex flex-col h-full w-full bg-[#333e48]/50 backdrop-blur-sm rounded-lg border border-[#5c6f7e]">
            <header className="p-4 border-b border-[#5c6f7e]">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ListChecks className="text-[#e2a32d]" size={20} />
                        <h2 className="text-lg font-semibold text-[#e2a32d]">Current Tasks</h2>
                    </div>
                    <button
                        onClick={generateTasksFromContext}
                        disabled={isLoading || !topic}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#e2a32d] bg-[#e2a32d]/20 hover:bg-[#e2a32d]/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!topic ? "Start a discussion first" : "Generate a task backlog based on the current discussion context."}
                    >
                        <BrainCircuit size={14} />
                        Generate Backlog
                    </button>
                </div>
            </header>
            
            <div className="p-2 border-b border-[#5c6f7e]">
                <div className="grid grid-cols-5 gap-1">
                    {tabs.map(({ label, value, emoji }) => {
                        const tasksForTab = trackedTasks.filter(t => {
                             const isCurrent = t.status === TaskStatus.ToDo || t.status === TaskStatus.InProgress;
                             if (!isCurrent) return false;
                             if (value === 'Unassigned') return !t.assignedTo;
                             return t.assignedTo === value;
                        });
                        const count = tasksForTab.length;

                        return (
                        <button
                            key={value}
                            onClick={() => setActiveTab(value)}
                            title={label}
                            className={`relative flex flex-col items-center justify-center gap-1 p-2 text-xs rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-[#e2a32d] ${
                                activeTab === value
                                    ? 'bg-[#c36e26] text-white font-semibold shadow-md'
                                    : 'bg-[#5c6f7e] hover:bg-[#95aac0] text-gray-200'
                            }`}
                        >
                            <span className="text-lg">{emoji}</span>
                            <span className="hidden lg:inline">{label}</span>
                            {count > 0 && (
                                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                    {count}
                                </span>
                            )}
                        </button>
                    )})}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934]">
                {filteredTasks.length > 0 ? (
                    <div className="space-y-2">
                        {filteredTasks.map(task => (
                           <TaskItemCard 
                                key={task.id} 
                                task={task} 
                                onUpdate={handleTaskUpdate}
                                onRemove={removeTrackedTask}
                                onShowWork={handleShowWork}
                                isDisabled={isLoading}
                                selectedExpertRoles={selectedExpertRoles}
                                experts={experts}
                           />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[#95aac0] p-4">
                        <ListTodo size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-200">No Current Tasks</h3>
                        <p className="text-xs">No 'To Do' or 'In Progress' tasks for {activeTab}.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
