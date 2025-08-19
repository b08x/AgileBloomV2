import React, { useEffect, useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { MessageBubble } from './MessageBubble';
import { CommandInput } from './CommandInput';
import { LoadingSpinner } from './LoadingSpinner';
import { HelpModal } from './HelpModal';
import { RightSidebarContainer } from './RightSidebarContainer';
import { LeftSidebarContainer } from './LeftSidebarContainer';

export const ChatInterface: React.FC = () => {
  const { 
    discussion, 
    isLoading, 
    error, 
    isHelpModalOpen, 
  } = useAgileBloomStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [discussion]);
  
  return (
    <div className="flex flex-col h-full">
      {isHelpModalOpen && <HelpModal />}
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden p-2 sm:p-4 gap-4">
        
        {/* Left Sidebar (Tasks and Codebase) */}
        <div className="order-1 lg:col-span-3 hidden lg:flex flex-col overflow-hidden">
          <LeftSidebarContainer />
        </div>

        {/* Center Column (Messages + Input) */}
        <div className="order-2 col-span-12 lg:col-span-6 flex flex-col overflow-hidden min-h-[85vh] lg:min-h-0">
          <div 
            className="flex-grow overflow-y-auto rounded-lg glassmorphism scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934]/50 p-3 sm:p-4"
          >
            {error && ( 
              <div className="my-2 p-3 bg-red-600/70 border border-red-600 text-red-300 rounded-md text-sm" role="alert" aria-live="assertive">
                <strong>Error:</strong> {error}
              </div>
            )}
            {discussion.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex-shrink-0 pt-2 sm:pt-4">
            <CommandInput />
          </div>
        </div>

        {/* Right Sidebar (Questions/Stories) */}
        <div className="order-3 lg:col-span-3 hidden lg:flex flex-col overflow-hidden rounded-lg bg-[#333e48]/50 backdrop-blur-sm">
           <RightSidebarContainer />
        </div>
      </div>
    </div>
  );
};
