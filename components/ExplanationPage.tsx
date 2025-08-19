import React from 'react';
import { MessageSquareQuote, ListChecks, BookOpen, ArrowRight, CheckSquare, BrainCircuit, Wand2, Star } from 'lucide-react';

interface ExplanationPageProps {
  onContinue: () => void;
}

const InfoCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-[#333e48] backdrop-blur-sm p-6 rounded-lg border border-[#5c6f7e]">
    <div className="flex items-center mb-3">
      <div className="p-2 bg-[#e2a32d]/20 rounded-full mr-4 text-[#e2a32d]">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-200">{title}</h3>
    </div>
    <div className="text-sm text-[#95aac0] space-y-2">
      {children}
    </div>
  </div>
);

const FlowStep: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex flex-col items-center text-center p-4 bg-[#333e48]/30 rounded-lg max-w-[200px] flex-1">
        <div className="text-[#e2a32d] mb-3">{icon}</div>
        <h4 className="font-semibold text-gray-200 mb-1">{title}</h4>
        <p className="text-xs text-[#95aac0]">{description}</p>
    </div>
);

const FlowArrow: React.FC = () => (
    <div className="flex-shrink-0 self-center text-[#e2a32d]/70 mx-2 hidden md:block">
        <ArrowRight size={32} />
    </div>
);

export const ExplanationPage: React.FC<ExplanationPageProps> = ({ onContinue }) => {
  return (
    <div className="min-h-screen bg-[#212934] text-gray-200 font-sans flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl w-full mx-auto animate-fadeIn space-y-12">
        
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#e2a32d]">
            From Discussion to Delivery
          </h1>
          <p className="text-lg text-gray-200 mt-3 max-w-3xl mx-auto">
            Agile Bloom is designed to turn free-flowing conversations into structured, actionable outcomes. Understand the core workflow.
          </p>
        </header>

        <main className="space-y-12">
            <section id="workflow-visual" className="p-6 md:p-8 bg-[#333e48]/50 backdrop-blur-md rounded-xl border border-[#e2a32d]/30">
                <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8 text-[#e2a32d]">The Core Workflow</h2>
                <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 flex-wrap">
                    <FlowStep icon={<BrainCircuit size={32} />} title="1. AI Discussion" description="Experts discuss the topic, generating 'thoughts'." />
                    <FlowArrow />
                    <FlowStep icon={<MessageSquareQuote size={32} />} title="2. Track Questions" description="Key 'thoughts' are automatically logged as questions for review." />
                    <FlowArrow />
                    <FlowStep icon={<CheckSquare size={32} />} title="3. Generate Stories" description="Marking a question 'Addressed' prompts the AI to create User Stories for the backlog." />
                    <FlowArrow />
                    <FlowStep icon={<BookOpen size={32} />} title="4. Refine Backlog" description="You prioritize stories and estimate points directly on the story cards." />
                    <FlowArrow />
                    <FlowStep icon={<Wand2 size={32} />} title="5. Break Down" description="Click 'Break Down' on a story to have the AI team generate specific, actionable tasks." />
                </div>
            </section>

          <section id="features" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard icon={<BookOpen size={24} />} title="The User Story Backlog">
                <p>The <strong className="text-[#e2a32d]">'Stories'</strong> tab is your central product backlog. Stories are the heart of the agile process, capturing a requirement from a user's perspective.</p>
                <p>They are generated automatically when you address a 'Question', or you can create them manually. This transforms a resolved discussion point directly into a development-ready artifact.</p>
            </InfoCard>
            
            <InfoCard icon={<ListChecks size={24} />} title="Task Breakdown">
                <p>A story is a high-level goal. To make it actionable, it must be broken down into <strong className="text-[#e2a32d]">Tasks</strong>. In the 'Stories' tab, simply click the <strong className="text-[#e2a32d]">'Break Down'</strong> button on any story.</p>
                <p>The entire AI team will collaborate to create a list of concrete tasks required to complete that story. These tasks will appear in the 'Tasks' tab, linked back to their parent story.</p>
            </InfoCard>
            
            <InfoCard icon={<Star size={24} />} title="Prioritization & Estimation">
                 <p>A healthy backlog is a prioritized one. On each story card, you can set a <strong className="text-[#e2a32d]">Priority</strong> (from Low to Critical) and assign <strong className="text-[#e2a32d]">Sprint Points</strong> to estimate effort.</p>
                 <p>This helps you and the Scrum Leader AI decide which stories to focus on next. Use the `/sprint-planning` command to get the AI's suggestion for the next batch of work.</p>
            </InfoCard>

             <InfoCard icon={<CheckSquare size={24} />} title="Integrated Progress">
                 <p>The system is smart. When you move a task to 'In Progress', its parent story automatically updates to 'In Progress' too. When all tasks for a story are completed, the story itself is marked as <strong className="text-green-400">'Done'</strong>.</p>
                 <p>This gives you a clear and always up-to-date view of your progress, from individual tasks right up to the high-level user stories.</p>
            </InfoCard>

          </section>
        </main>

        <footer className="text-center mt-8">
          <button 
            onClick={onContinue} 
            className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-[#c36e26] rounded-lg shadow-lg hover:bg-[#c36e26]/90 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#e2a32d]/50 transform hover:scale-105"
          >
            Got It, Let's Get Started
            <ArrowRight className="ml-3 h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </footer>

      </div>
    </div>
  );
};