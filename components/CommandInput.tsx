
import React, { useState, useEffect, useRef } from 'react';
import { useAgileBloomChat } from '../hooks/useAgileBloomChat';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { Send, XCircle } from 'lucide-react';
import { FileUploadButton } from './FileUploadButton';
import { AVAILABLE_COMMANDS } from '../constants';
import { Command } from '../types';

export const CommandInput: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const { sendMessage } = useAgileBloomChat();
  const { 
    isLoading, 
    aiConfig,
    isRateLimited, 
    uploadedFile,
    clearUploadedFile,
    isAutoModeEnabled,
    isQuotaExceeded,
  } = useAgileBloomStore();
  
  const [suggestions, setSuggestions] = useState<Command[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isApiConfigError = !aiConfig;
  const isInputDisabled = isApiConfigError || isLoading || isRateLimited || isQuotaExceeded;
  const isSubmitDisabled = isInputDisabled || (!inputText.trim() && !uploadedFile);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitDisabled) return;
    
    let messageToSend = inputText;
    // Note: The file content is no longer prepended here. The hook handles it.
    
    sendMessage(messageToSend, uploadedFile, false); 
    setInputText('');
    setShowSuggestions(false); // Hide suggestions on submit
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);

    if (newText.startsWith('/') && !newText.includes(' ', 1)) {
      const commandPart = newText.substring(1).toLowerCase();
      if (commandPart.length >= 0) { // Show all if just '/' or filter if more chars
        const filtered = AVAILABLE_COMMANDS.filter(cmd =>
          cmd.name.substring(1).toLowerCase().startsWith(commandPart)
        );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setActiveSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        setInputText(suggestions[activeSuggestionIndex].name + ' ');
        setShowSuggestions(false);
        // Ensure textarea gets focus and cursor is at end
        setTimeout(() => textareaRef.current?.focus(), 0);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
      } else if (e.key === ' ' && inputText.startsWith('/') && !inputText.includes(' ',1)) {
         // If user types a space after a command that could be completed, hide suggestions
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault();
      handleSubmit(); 
    }
  };
  
  const handleSuggestionClick = (command: Command) => {
    setInputText(command.name + ' ');
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (uploadedFile && uploadedFile.textContent && uploadedFile.textContent.length > 200 && inputText.trim() === '') {
      // UX choice: keep or clear inputText. Current: keep.
    }
  }, [uploadedFile, inputText]); 


  let placeholderText = "Type message or /command (e.g., /ask)... Upload image, .txt, .md";
  if (isLoading) {
    placeholderText = "AI is thinking...";
  } else if (isQuotaExceeded) {
    placeholderText = "API quota exceeded. Requests are halted.";
  } else if (isApiConfigError) {
    placeholderText = "Session not configured. Please refresh.";
  } else if (isRateLimited) {
    placeholderText = "Rate limited. Please wait...";
  } else if (uploadedFile?.textContent) {
    placeholderText = `File "${uploadedFile.name}" content will be sent. Add your prompt...`;
  } else if (uploadedFile?.base64Data) {
    placeholderText = `Image "${uploadedFile.name}" ready. Add your prompt...`;
  }

  // Ensure active suggestion is visible in scrollable list
   useEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      const listElement = document.getElementById('command-suggestions-listbox');
      const activeElement = document.getElementById(`suggestion-item-${activeSuggestionIndex}`);
      if (listElement && activeElement) {
        const listRect = listElement.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        if (activeRect.bottom > listRect.bottom) {
          activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } else if (activeRect.top < listRect.top) {
          activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }
    }
  }, [activeSuggestionIndex, showSuggestions, suggestions]);


  return (
    <form onSubmit={handleSubmit} className="p-2 sm:p-0 relative">
      {showSuggestions && suggestions.length > 0 && (
        <div 
          id="command-suggestions-listbox"
          role="listbox"
          aria-activedescendant={`suggestion-item-${activeSuggestionIndex}`}
          className="absolute bottom-full left-0 right-0 mb-1 max-h-60 overflow-y-auto bg-[#333e48]/90 backdrop-blur-md rounded-lg shadow-xl z-30 border border-[#5c6f7e] scrollbar-thin scrollbar-thumb-[#e2a32d] scrollbar-track-[#333e48]"
        >
          {suggestions.map((cmd, index) => (
            <div
              key={cmd.name}
              id={`suggestion-item-${index}`}
              role="option"
              aria-selected={index === activeSuggestionIndex}
              className={`p-3 cursor-pointer hover:bg-[#e2a32d]/20 transition-colors duration-100 ${
                index === activeSuggestionIndex ? 'bg-[#e2a32d]/30' : ''
              }`}
              onClick={() => handleSuggestionClick(cmd)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm text-[#e2a32d]">{cmd.name}</span>
                {cmd.arguments && <span className="text-xs text-[#95aac0] ml-2 truncate">{cmd.arguments}</span>}
              </div>
              <p className="text-xs text-gray-200 mt-0.5 truncate">{cmd.description}</p>
            </div>
          ))}
        </div>
      )}

      {uploadedFile && (
        <div className="flex items-center justify-between text-xs text-[#e2a32d] bg-[#333e48]/80 px-3 py-1.5 rounded-t-md border-b border-[#5c6f7e]">
          <span className="truncate">
            Attached: <span className="font-medium">{uploadedFile.name}</span> 
            ({(uploadedFile.size / 1024).toFixed(1)} KB)
            {uploadedFile.textContent ? ` (${uploadedFile.type === 'text/markdown' ? 'markdown' : 'text'})` : uploadedFile.base64Data ? " (image)" : ""}
          </span>
          <button 
            type="button" 
            onClick={clearUploadedFile} 
            className="ml-2 text-gray-400 hover:text-red-400"
            title="Clear attached file"
            aria-label="Clear attached file"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}
      <div className={`flex items-center space-x-2 bg-[#333e48] backdrop-blur-md p-2 shadow-lg ${uploadedFile ? 'rounded-b-xl border-t-0' : 'rounded-xl'} border border-[#5c6f7e]`}>
        <FileUploadButton disabled={isInputDisabled || !!uploadedFile} />
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="flex-grow p-3 bg-transparent text-gray-200 placeholder-[#95aac0] focus:outline-none resize-none scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#333e48]/50 rounded-md min-h-[50px] max-h-[150px]"
          rows={1}
          disabled={isInputDisabled}
          style={{caretColor: '#e2a32d'}} 
          aria-label="Chat input"
          aria-autocomplete="list"
          aria-controls="command-suggestions-listbox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-activedescendant={showSuggestions && suggestions.length > 0 ? `suggestion-item-${activeSuggestionIndex}` : undefined}
        />
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="p-3 rounded-lg bg-[#c36e26] text-white hover:bg-[#c36e26]/90 disabled:bg-[#5c6f7e] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#e2a32d]"
          title={isSubmitDisabled && !inputText.trim() && !uploadedFile ? "Type a message or attach a file" : "Send (Enter)"}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>
      <div className="flex justify-between items-center mt-1.5 ml-1">
        <p className="text-xs text-[#95aac0]">
          Use <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-200 bg-[#333e48] border border-[#5c6f7e] rounded-md">Shift + Enter</kbd> for new line. Type <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-200 bg-[#333e48] border border-[#5c6f7e] rounded-md">/help</kbd> for commands.
        </p>
        {isAutoModeEnabled && (
          <p className="text-xs text-green-400 font-medium animate-pulse pr-1">
            Auto Mode: ON
          </p>
        )}
      </div>
    </form>
  );
};
