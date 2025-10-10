

import React, { useRef } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { Settings, HelpCircle, Trash2, Zap, ZapOff, Download, UploadCloud, MessageSquarePlus, MessageSquareText } from 'lucide-react'; 
import { MIN_AUTO_MODE_DELAY_SECONDS, MAX_AUTO_MODE_DELAY_SECONDS, DEFAULT_EXPERTS, ROLE_SYSTEM } from '../constants';
import { DiscussionMessage, ExpertRole, Expert } from '../types';

export const Header: React.FC = () => {
  const { 
    topic, 
    toggleHelpModal, 
    clearChat, 
    isAutoModeEnabled,
    toggleAutoMode,
    autoModeDelaySeconds,
    setAutoModeDelaySeconds,
    discussion,
    importChatSession,
    addErrorMessage,
    isConciseResponseMode,
    toggleConciseResponseMode,
  } = useAgileBloomStore();
  const [showSettings, setShowSettings] = React.useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleAutoModeDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val >= MIN_AUTO_MODE_DELAY_SECONDS && val <= MAX_AUTO_MODE_DELAY_SECONDS) {
      setAutoModeDelaySeconds(val);
    }
  };

  const handleExportChat = () => {
    if (discussion.length === 0) {
      addErrorMessage("Chat is empty. Nothing to export.");
      return;
    }

    const jsonString = JSON.stringify(discussion, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeString = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    a.download = `agile-bloom_chat_${dateString}_${timeString}.json`;
    
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTriggerImport = () => {
    importFileRef.current?.click();
  };
  
  const isValidDiscussionMessage = (msg: any, index: number): msg is DiscussionMessage => {
    const allExperts = {...useAgileBloomStore.getState().experts, ...DEFAULT_EXPERTS};
    if (typeof msg !== 'object' || msg === null) {
      console.error(`Import validation error: Message at index ${index} is not an object or is null. Message:`, msg);
      return false;
    }
    if (typeof msg.id !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'id' (type: ${typeof msg.id}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.text !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'text' (type: ${typeof msg.text}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.timestamp !== 'number') {
      console.error(`Import validation error: Message at index ${index} has invalid 'timestamp' (type: ${typeof msg.timestamp}). Expected number. Message:`, msg);
      return false;
    }
    if (typeof msg.expert !== 'object' || msg.expert === null) {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert' object (type: ${typeof msg.expert}). Expected object. Message:`, msg);
      return false;
    }
    // Check if the expert name is a valid string, not necessarily in the current expert list
    if (typeof msg.expert.name !== 'string') {
        console.error(`Import validation error: Message at index ${index}, expert.name is not a string. Message:`, msg);
        return false;
    }
    if (typeof msg.expert.emoji !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert.emoji' (type: ${typeof msg.expert.emoji}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.expert.bgColor !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert.bgColor' (type: ${typeof msg.expert.bgColor}). Expected string. Message:`, msg);
      return false;
    }
    if (typeof msg.expert.textColor !== 'string') {
      console.error(`Import validation error: Message at index ${index} has invalid 'expert.textColor' (type: ${typeof msg.expert.textColor}). Expected string. Message:`, msg);
      return false;
    }
    // Optional fields
    if (msg.thoughts !== undefined && !Array.isArray(msg.thoughts)) {
      console.error(`Import validation error: Message at index ${index} has 'thoughts' but it's not an array (type: ${typeof msg.thoughts}). Message:`, msg);
      return false;
    }
    if (msg.work !== undefined && typeof msg.work !== 'string' && msg.work !== null) { // Allow null for work
      console.error(`Import validation error: Message at index ${index} has 'work' but it's not a string or null (type: ${typeof msg.work}). Message:`, msg);
      return false;
    }
    if (msg.isCommandResponse !== undefined && typeof msg.isCommandResponse !== 'boolean') {
      console.error(`Import validation error: Message at index ${index} has 'isCommandResponse' but it's not a boolean (type: ${typeof msg.isCommandResponse}). Message:`, msg);
      return false;
    }
    if (msg.isError !== undefined && typeof msg.isError !== 'boolean') {
      console.error(`Import validation error: Message at index ${index} has 'isError' but it's not a boolean (type: ${typeof msg.isError}). Message:`, msg);
      return false;
    }
    if (msg.searchCitations !== undefined && msg.searchCitations !== null && !Array.isArray(msg.searchCitations)) {
      console.error(`Import validation error: Message at index ${index} has 'searchCitations' but it's not an array or null (type: ${typeof msg.searchCitations}). Message:`, msg);
      return false;
    }
    return true;
  };


  const handleImportChat = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      addErrorMessage("Invalid file type. Please select a JSON file (.json).");
      if(importFileRef.current) importFileRef.current.value = ""; // Reset file input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error("Failed to read file content as string.");
        }
        const parsedData = JSON.parse(content);

        if (!Array.isArray(parsedData)) {
          throw new Error("Invalid JSON format. Imported file must be an array of chat messages.");
        }
        
        const validatedMessages: DiscussionMessage[] = [];
        const allExperts = useAgileBloomStore.getState().experts;

        for (let i = 0; i < parsedData.length; i++) {
          const msg = parsedData[i];
          if (!isValidDiscussionMessage(msg, i)) {
            // Detailed console error is now inside isValidDiscussionMessage
            throw new Error(`Imported file contains an invalid message structure at index ${i}. Check the browser console for specific details on the problematic message object and field.`);
          }
          
          // Use the expert data from the file, ensuring it conforms to the Expert type.
          const expertData: Expert = {
              name: msg.expert.name,
              emoji: msg.expert.emoji,
              description: msg.expert.description || allExperts[msg.expert.name as ExpertRole]?.description || 'Imported expert',
              bgColor: msg.expert.bgColor,
              textColor: msg.expert.textColor,
          };
          
          validatedMessages.push({ ...msg, expert: expertData });
        }
        
        // Bypassing window.confirm due to potential environment issues.
        // Import will proceed directly after validation.
        importChatSession(validatedMessages);
        // The success message is handled within the importChatSession action in the store.

      } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during import.";
        addErrorMessage(`Error importing chat: ${message}`);
        console.error("Import process error:", error);
      } finally {
        if(importFileRef.current) importFileRef.current.value = ""; 
      }
    };
    reader.onerror = () => {
      addErrorMessage("Failed to read the selected file.");
      if(importFileRef.current) importFileRef.current.value = ""; 
    };
    reader.readAsText(file);
  };
  
  return (
    <header className="relative z-20 bg-[#333e48]/80 backdrop-blur-md shadow-lg p-3 sm:p-4 text-white flex justify-between items-center border-b border-[#5c6f7e]">
      <div className="flex items-center space-x-2">
        <img src="https://picsum.photos/seed/agile-bloom/40/40" alt="Agile Bloom Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#e2a32d]" />
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-gray-200">
          Agile <span className="text-[#e2a32d]">Bloom</span> AI
        </h1>
      </div>
      {topic && (
        <div className="hidden md:block text-center text-sm sm:text-base text-[#95aac0] truncate max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl" title={topic}>
          Topic: <span className="font-medium text-gray-200">{topic}</span>
        </div>
      )}
      <div className="flex items-center space-x-1 sm:space-x-2"> 
        <input 
          type="file" 
          ref={importFileRef} 
          onChange={handleImportChat} 
          accept=".json" 
          className="hidden" 
          aria-hidden="true"
        />
        <button
          onClick={handleTriggerImport}
          className="p-2 rounded-full hover:bg-green-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          title="Import Chat from JSON"
        >
          <UploadCloud size={20} />
        </button>
        <button
          onClick={handleExportChat}
          className="p-2 rounded-full hover:bg-[#e2a32d]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#e2a32d]"
          title="Export Chat as JSON"
        >
          <Download size={20} />
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-[#e2a32d]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#e2a32d]"
          title="Settings"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={toggleHelpModal}
          className="p-2 rounded-full hover:bg-[#e2a32d]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#e2a32d]"
          title="Help / Commands"
        >
          <HelpCircle size={20} />
        </button>
        <button
          onClick={() => {
            if(window.confirm("Are you sure you want to clear the chat and reset the session? This will NOT delete your custom-created experts.")) {
              clearChat();
            }
          }}
          className="p-2 rounded-full hover:bg-red-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          title="Clear Chat"
        >
          <Trash2 size={20} />
        </button>
      </div>
      {showSettings && (
        <div className="absolute top-16 right-4 mt-2 w-72 p-4 bg-[#333e48]/90 backdrop-blur-md rounded-lg shadow-xl z-50 border border-[#5c6f7e]">
          <h3 className="text-md font-semibold mb-3 text-[#e2a32d]">Settings</h3>
          
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="autoModeToggle" className="text-sm font-medium text-[#95aac0]">
                Auto Mode
              </label>
              <button
                id="autoModeToggle"
                onClick={toggleAutoMode}
                className={`p-1 rounded-full transition-colors ${
                  isAutoModeEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-[#5c6f7e] hover:bg-gray-500'
                }`}
                title={isAutoModeEnabled ? 'Disable Auto Mode' : 'Enable Auto Mode'}
              >
                {isAutoModeEnabled ? <Zap size={18} className="text-white" /> : <ZapOff size={18} className="text-[#95aac0]" />}
              </button>
            </div>
          </div>

          {isAutoModeEnabled && (
            <div className="mb-4 pl-1">
              <label htmlFor="autoModeDelay" className="block text-xs font-medium text-gray-400 mb-1">
                Auto Mode Delay: <span className="text-[#e2a32d]">{autoModeDelaySeconds}s</span>
              </label>
              <input
                type="range"
                id="autoModeDelay"
                min={MIN_AUTO_MODE_DELAY_SECONDS}
                max={MAX_AUTO_MODE_DELAY_SECONDS}
                value={autoModeDelaySeconds}
                onChange={handleAutoModeDelayChange}
                className="w-full h-2 bg-[#5c6f7e] rounded-lg appearance-none cursor-pointer accent-[#e2a32d]"
              />
            </div>
          )}

          <div className="border-t border-[#5c6f7e] my-3"></div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="conciseModeToggle" className="text-sm font-medium text-[#95aac0]">
                Concise Responses
              </label>
              <button
                id="conciseModeToggle"
                onClick={toggleConciseResponseMode}
                className={`p-1 rounded-full transition-colors ${
                  isConciseResponseMode ? 'bg-green-500 hover:bg-green-600' : 'bg-[#5c6f7e] hover:bg-gray-500'
                }`}
                title={isConciseResponseMode ? 'Disable Concise Mode' : 'Enable Concise Mode'}
              >
                {isConciseResponseMode ? <MessageSquareText size={18} className="text-white" /> : <MessageSquarePlus size={18} className="text-[#95aac0]" />}
              </button>
            </div>
             <p className="text-xs text-gray-400 mt-1 pl-1">Keep AI responses brief (~47 words). Use the "Elaborate" button on a message for more detail.</p>
          </div>


          <button 
            onClick={() => setShowSettings(false)}
            className="w-full mt-2 px-3 py-1.5 text-sm bg-[#c36e26] hover:bg-[#c36e26]/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#e2a32d]"
          >
            Close
          </button>
        </div>
      )}
    </header>
  );
};