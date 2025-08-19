import React from 'react';
import { MessageSquareQuote, ListChecks, BookOpen, ArrowRight, CheckSquare, BrainCircuit, Wand2, Star, X } from 'lucide-react';

interface SetupHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InfoCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-[#333e48] backdrop-blur-sm p-5 rounded-lg border border-[#5c6f7e]">
    <div className="flex items-center mb-3">
      <div className="p-2 bg-[#e2a32d]/20 rounded-full mr-3 text-[#e2a32d]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
    </div>
    <div className="text-sm text-[#95aac0] space-y-2">
      {children}
    </div>
  </div>
);

const FlowStep: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex items-center text-left p-3 bg-[#333e48]/30 rounded-lg w-full">
        <div className="text-[#e2a32d] mr-4">{icon}</div>
        <div>
          <h4 className="font-semibold text-sm text-gray-200">{title}</h4>
          <p className="text-xs text-[#95aac0]">{description}</p>
        </div>
    </div>
);

export const SetupHelpModal: React.FC<SetupHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }
    
    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-[#212934] p-6 lg:p-8 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#e2a32d] scrollbar-track-[#333e48] border border-[#e2a32d]/50 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-[#95aac0] hover:text-[#e2a32d] transition-colors"
                    title="Close"
                >
                    <X size={24} />
                </button>
                <header className="text-left mb-8">
                  <h1 className="text-3xl font-bold tracking-tight text-[#e2a32d]">
                    From Discussion to Delivery
                  </h1>
                  <p className="text-md text-gray-200 mt-2">
                    Agile Bloom turns conversations into structured outcomes. Here's how.
                  </p>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">
                    <section id="workflow-visual" className="flex-1">
                        <h2 className="text-xl font-semibold text-left mb-4 text-[#e2a32d]">The Core Workflow</h2>
                        <div className="flex flex-col items-center gap-3">
                            <FlowStep icon={<BrainCircuit size={28} />} title="1. AI Discussion" description="Experts discuss the topic, generating 'thoughts'." />
                            <div className="transform rotate-90 text-[#e2a32d]/70"><ArrowRight size={20} /></div>
                            <FlowStep icon={<MessageSquareQuote size={28} />} title="2. Track Questions" description="Key 'thoughts' are automatically logged as questions for review." />
                            <div className="transform rotate-90 text-[#e2a32d]/70"><ArrowRight size={20} /></div>
                            <FlowStep icon={<CheckSquare size={28} />} title="3. Generate Stories" description="Marking a question 'Addressed' prompts the AI to create User Stories." />
                             <div className="transform rotate-90 text-[#e2a32d]/70"><ArrowRight size={20} /></div>
                            <FlowStep icon={<Wand2 size={28} />} title="4. Break Down" description="Use 'Break Down' on a story to have the AI team generate specific, actionable tasks." />
                        </div>
                    </section>
                    
                    <section id="features" className="space-y-6 flex-1">
                        <h2 className="text-xl font-semibold text-left mb-4 text-[#e2a32d]">Key Concepts</h2>
                         <InfoCard icon={<BookOpen size={20} />} title="User Story Backlog">
                            <p>The <strong className="text-[#e2a32d]">'Stories'</strong> tab is your product backlog. They are generated automatically when you address a 'Question', or you can create them manually.</p>
                        </InfoCard>
                        
                        <InfoCard icon={<ListChecks size={20} />} title="Task Breakdown">
                            <p>Use the <strong className="text-[#e2a32d]">'Break Down'</strong> button on any story, and the AI team will collaborate to create a list of concrete tasks to achieve that story.</p>
                        </InfoCard>
                        
                        <InfoCard icon={<Star size={20} />} title="Prioritization & Estimation">
                             <p>On each story card, set a <strong className="text-[#e2a32d]">Priority</strong> and assign <strong className="text-[#e2a32d]">Sprint Points</strong>. Use `/sprint-planning` to get the AI's suggestion for the next batch of work.</p>
                        </InfoCard>

                         <InfoCard icon={<CheckSquare size={20} />} title="Integrated Progress">
                             <p>When all tasks for a story are completed, the story itself is marked as <strong className="text-green-400">'Done'</strong>, giving you a clear, up-to-date view of progress.</p>
                        </InfoCard>
                    </section>
                </div>
            </div>
        </div>
    );
};
