import React, { useState } from 'react';
import { TrackedQuestionsSidebar } from './TrackedQuestionsSidebar';
import { TrackedStoriesSidebar } from './TrackedStoriesSidebar';
import { MessageSquareQuote, BookOpen } from 'lucide-react';

type ActiveTab = 'questions' | 'stories';

export const RightSidebarContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('questions');

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'questions', label: 'Questions', icon: <MessageSquareQuote size={18} /> },
    { id: 'stories', label: 'Stories', icon: <BookOpen size={18} /> },
  ];

  return (
    <div className="flex flex-col h-full w-full">
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
        {activeTab === 'questions' && <TrackedQuestionsSidebar />}
        {activeTab === 'stories' && <TrackedStoriesSidebar />}
      </div>
    </div>
  );
};