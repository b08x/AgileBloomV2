
import React, { useState } from 'react';
import { DiscussionMessage, Expert, SearchCitation } from '../types';
import { CodeBlock } from './CodeBlock'; 
import { ExternalLink, CornerDownRight, Clipboard, Download } from 'lucide-react';
import { ROLE_SCRUM_LEADER, ROLE_USER, ROLE_SYSTEM } from '../constants';

const CitationLink: React.FC<{ citation: SearchCitation }> = ({ citation }) => (
  <a
    href={citation.uri}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center text-xs text-[#e2a32d] hover:text-[#e2a32d]/80 transition-colors duration-150"
    title={citation.title}
  >
    <ExternalLink size={12} className="mr-1.5 flex-shrink-0" />
    <span className="truncate">{citation.title || "Untitled Source"}</span>
  </a>
);

interface MessageBubbleProps {
  message: DiscussionMessage;
  onElaborate?: (expert: Expert, message: DiscussionMessage) => void;
}


export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, onElaborate }) => {
  const { expert, text, thoughts, work, timestamp, isError, isCommandResponse, searchCitations } = message;
  const isUser = expert.name === ROLE_USER;
  const [isCopied, setIsCopied] = useState(false);

  const bubbleClasses = isUser
    ? `${expert.bgColor} ml-auto`
    : `${expert.bgColor}`;
  
  const containerClasses = `flex mb-3 animate-fadeIn ${isUser ? "justify-end" : "justify-start"}`;

  const formattedTimestamp = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isFishAnalysis = 
    isCommandResponse &&
    expert.name === ROLE_SCRUM_LEADER && 
    work && 
    (work.toLowerCase().includes("fish analysis") || work.toLowerCase().includes("rationale score"));

  const isScrumLeaderStoryResponse = expert.name === ROLE_SCRUM_LEADER && 
                                   isCommandResponse && 
                                   work &&
                                   work.toLowerCase().includes("user story") &&
                                   work.includes("|") &&
                                   work.includes("---");
  
  const isCompiledDocumentation =
    work &&
    isCommandResponse &&
    text.startsWith("I have compiled the documentation");

  const showElaborateButton = !isUser && expert.name !== ROLE_SYSTEM && !isError && !work;

  const handleCopyToClipboard = () => {
    if (!work) return;
    navigator.clipboard.writeText(work).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  const handleDownloadMarkdown = () => {
    if (!work) return;
    const blob = new Blob([work], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${expert.name.toLowerCase().replace(/\s+/g, '-')}-documentation.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className={containerClasses}>
      <div className={`max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-3 rounded-xl shadow-md ${bubbleClasses} backdrop-blur-sm`}>
        <div className="flex items-center mb-1.5">
          {!isUser && <span className="mr-2 text-xl">{expert.emoji}</span>}
          <span className="font-semibold text-sm text-[#e2a32d]">
            {expert.name}
          </span>
          {isUser && <span className="ml-2 text-xl">{expert.emoji}</span>}
        </div>
        {isError ? (
           <p className="text-sm text-red-300 whitespace-pre-wrap">{text}</p>
        ) : (
           <p className="text-sm whitespace-pre-wrap text-gray-200">{text}</p>
        )}
       
        {thoughts && thoughts.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#5c6f7e]">
            <h4 className="text-xs font-semibold mb-1 opacity-80 text-gray-200">Thoughts:</h4>
            <ul className="list-disc list-inside pl-1 space-y-0.5">
              {thoughts.map((thought, index) => (
                <li key={index} className="text-xs opacity-90 text-gray-200">{thought}</li>
              ))}
            </ul>
          </div>
        )}
        {work && (
          <div className="mt-2 pt-2 border-t border-[#5c6f7e]">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-xs font-semibold opacity-80 text-gray-200">
                {isFishAnalysis ? "FISH Analysis:" : isScrumLeaderStoryResponse ? "Generated User Stories:" : isCompiledDocumentation ? "Compiled Documentation:" : "Work:"}
              </h4>
              {isCompiledDocumentation && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCopyToClipboard}
                    className="flex items-center gap-1.5 text-xs text-[#95aac0] hover:text-[#e2a32d] transition-colors"
                    title="Copy to clipboard"
                  >
                    <Clipboard size={14} />
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1.5 text-xs text-[#95aac0] hover:text-[#e2a32d] transition-colors"
                    title="Download as Markdown"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              )}
            </div>
            <CodeBlock code={work} language={isFishAnalysis || isScrumLeaderStoryResponse ? "markdown" : "auto"} />
          </div>
        )}
        {searchCitations && searchCitations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#5c6f7e]">
            <h4 className="text-xs font-semibold mb-1 opacity-80 text-gray-200">Sources:</h4>
            <ul className="space-y-1">
              {searchCitations.map((citation, index) => (
                <li key={index}>
                  <CitationLink citation={citation} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={`flex items-center justify-between text-xs mt-2 text-[#95aac0] ${isUser ? "text-right" : "text-left"}`}>
          {showElaborateButton ? (
            <button 
              onClick={() => onElaborate?.(expert, message)}
              className="flex items-center gap-1 text-[#95aac0] hover:text-[#e2a32d] transition-colors"
            >
              <CornerDownRight size={14}/> Elaborate
            </button>
          ) : <div></div>}
          <span>{formattedTimestamp}</span>
        </div>
      </div>
    </div>
  );
});
