
import React, { useState, useRef, useEffect } from 'react';
import { TrackedQuestion, QuestionStatus } from '../types';
import { CheckCircle2, MessageSquare, Loader2, XSquare, MoreVertical, Trash2 } from 'lucide-react';

interface QuestionItemCardProps {
  question: TrackedQuestion;
  isSelected: boolean;
  onToggleSelection: (questionId: string) => void;
  onDiscuss: (questionId: string) => void;
  onMarkAddressed: (questionId: string) => void;
  onDismiss: (questionId: string) => void;
  isDisabled: boolean;
}

const statusConfig: Record<QuestionStatus, { icon: React.ReactNode; color: string; label: string }> = {
  [QuestionStatus.Open]: { icon: <MessageSquare size={14} />, color: 'text-[#95aac0]', label: 'Open' },
  [QuestionStatus.Addressing]: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-yellow-400', label: 'Addressing' },
  [QuestionStatus.Addressed]: { icon: <CheckCircle2 size={14} />, color: 'text-green-400', label: 'Addressed' },
  [QuestionStatus.Dismissed]: { icon: <XSquare size={14} />, color: 'text-gray-500', label: 'Dismissed' },
};

export const QuestionItemCard: React.FC<QuestionItemCardProps> = ({ question, isSelected, onToggleSelection, onDiscuss, onMarkAddressed, onDismiss, isDisabled }) => {
  const { id, expertRole, expertEmoji, text, status } = question;
  const config = statusConfig[status] || statusConfig.Open;
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleAction = (action: (id: string) => void) => {
    action(id);
    setIsMenuOpen(false);
  };

  return (
    <div
      className={`relative w-full text-left p-3 bg-[#333e48] rounded-lg border transition-all duration-200 flex gap-3 items-start
        ${isSelected ? 'border-[#e2a32d] shadow-lg' : 'border-[#5c6f7e]'}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelection(id)}
        disabled={isDisabled}
        className="mt-1 h-4 w-4 rounded bg-[#5c6f7e] border-[#95aac0] text-[#c36e26] focus:ring-[#e2a32d] cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
        aria-label={`Select question: ${text}`}
      />
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center text-xs text-[#95aac0]">
                <span className="mr-1.5 text-sm">{expertEmoji}</span>
                <span className="font-semibold text-gray-200">{expertRole}</span>
            </div>
        </div>
        <p className={`text-sm leading-snug ${status === QuestionStatus.Dismissed ? 'text-[#95aac0] line-through' : 'text-gray-200'}`}>{text}</p>
        <div className={`mt-2 flex items-center text-xs font-medium ${config.color}`}>
          {config.icon}
          <span className="ml-1.5">{config.label}</span>
        </div>
      </div>
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
            disabled={isDisabled}
            className="p-1 -mr-1 -mt-1 rounded-full text-[#95aac0] hover:bg-[#5c6f7e] hover:text-[#e2a32d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e2a32d] disabled:cursor-not-allowed"
            title="Question actions"
        >
            <MoreVertical size={18} />
        </button>
        {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#333e48] border border-[#5c6f7e] rounded-lg shadow-xl z-10 animate-fadeIn">
                <ul className="py-1 text-sm text-gray-200">
                    <li className="px-3 py-1 text-xs text-[#95aac0]">Actions</li>
                    <li>
                        <button onClick={() => handleAction(onDiscuss)} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-[#e2a32d]/20 transition-colors">
                            <MessageSquare size={16} /> Discuss
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleAction(onMarkAddressed)} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-[#e2a32d]/20 transition-colors">
                            <CheckCircle2 size={16} /> Mark Addressed
                        </button>
                    </li>
                    <li>
                        <button onClick={() => handleAction(onDismiss)} className="w-full text-left flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/50 transition-colors">
                            <Trash2 size={16} /> Dismiss
                        </button>
                    </li>
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};