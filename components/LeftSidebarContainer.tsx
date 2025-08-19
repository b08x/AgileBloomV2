import React, { useState } from 'react';
import { ExpertTasksSidebar } from './ExpertTasksSidebar';
import { CodebaseSidebar } from './CodebaseSidebar';
import { ListChecks, Code2 } from 'lucide-react';

type ActiveTab = 'tasks' | 'codebase';

export const LeftSidebarContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'tasks', label: 'Tasks', icon: <ListChecks size={18} /> },
    { id: 'codebase', label: 'Codebase', icon: <Code2 size={18} /> },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#333e48]/50 backdrop-blur-sm rounded-lg border border-[#5c6f7e]">
      <div className="flex-shrink-0 p-2 border-b border-[#5c6f7e]">
        <div className="flex bg-[#212934] rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex justify-center items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e2a32d] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                activeTab === tab.id
                  ? 'bg-[#c36e26] text-white shadow-inner'
                  : 'text-gray-200 hover:bg-[#333e48] hover:text-white'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        {activeTab === 'tasks' && <ExpertTasksSidebar />}
        {activeTab === 'codebase' && <CodebaseSidebar />}
      </div>
    </div>
  );
};
