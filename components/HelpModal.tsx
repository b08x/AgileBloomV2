
import React, { useMemo } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { AVAILABLE_COMMANDS, ROLE_SCRUM_LEADER } from '../constants';
import { X } from 'lucide-react';

export const HelpModal: React.FC = () => {
  const { toggleHelpModal, selectedExpertRoles } = useAgileBloomStore();

  const commandsToDisplay = useMemo(() => {
    return AVAILABLE_COMMANDS.map(cmd => {
      if (cmd.name === '/elaborate' || cmd.name === '/show-work') {
          const expertList = selectedExpertRoles.filter(r => r !== ROLE_SCRUM_LEADER).join(', ') || '[No experts selected]';
          return {
              ...cmd,
              description: `Ask a specific expert to elaborate. Active experts: ${expertList}.`,
              example: `/elaborate ${selectedExpertRoles.length > 1 ? selectedExpertRoles.filter(r => r !== ROLE_SCRUM_LEADER)[0] || 'Expert' : 'Expert'}`
          };
      }
      return cmd;
    });
  }, [selectedExpertRoles]);

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
        onClick={toggleHelpModal}
    >
      <div 
        className="bg-[#333e48] p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#e2a32d] scrollbar-track-[#5c6f7e] border border-[#e2a32d]/50 relative"
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <button 
            onClick={toggleHelpModal} 
            className="absolute top-3 right-3 text-[#95aac0] hover:text-[#e2a32d] transition-colors"
            title="Close"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-semibold mb-6 text-[#e2a32d]">Available Commands</h2>
        <div className="space-y-4">
          {commandsToDisplay.map((cmd) => (
            <div key={cmd.name} className="p-3 bg-[#212934] rounded-lg border border-[#5c6f7e]">
              <p className="font-semibold text-[#e2a32d]">
                <code className="text-sm bg-[#5c6f7e]/50 px-1.5 py-0.5 rounded">{cmd.name}</code> 
                {cmd.arguments && <code className="text-xs text-[#95aac0] ml-1">{cmd.arguments}</code>}
              </p>
              <p className="text-xs text-gray-200 mt-1">{cmd.description}</p>
              {cmd.example && <p className="text-xs text-[#95aac0] mt-1"><em>Example: <code className="text-xs bg-[#5c6f7e]/50 px-1 py-0.5 rounded">{cmd.example}</code></em></p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
