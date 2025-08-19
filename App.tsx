
import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { SetupPage } from './components/SetupPage';
import { useAgileBloomChat } from './hooks/useAgileBloomChat';
import useAgileBloomStore from './store/useAgileBloomStore';
import { AIConfig, ExpertRole } from './types';
import { ExplanationPage } from './components/ExplanationPage';

const App: React.FC = () => {
  const [appState, setAppState] = useState<'landing' | 'setup' | 'explanation' | 'chat'>('landing');
  const [discussionData, setDiscussionData] = useState<{
    topic: string;
    context: string;
    selectedRoles: ExpertRole[];
  } | null>(null);
  
  const { initiateDiscussion } = useAgileBloomChat();
  const { setAiConfig } = useAgileBloomStore();

  const handleSetupComplete = (topic: string, context: string, config: AIConfig, selectedRoles: ExpertRole[]) => {
    setAiConfig(config);
    setDiscussionData({ topic, context, selectedRoles });
    setAppState('explanation');
  };

  const handleExplanationContinue = () => {
    if (discussionData) {
        initiateDiscussion(discussionData.topic, discussionData.context, discussionData.selectedRoles);
        setAppState('chat');
    } else {
        console.error("Discussion data not found after explanation page.");
        setAppState('setup');
    }
  };

  if (appState === 'landing') {
    return <LandingPage onEnter={() => setAppState('setup')} />;
  }
  
  if (appState === 'setup') {
    return <SetupPage onBegin={handleSetupComplete} />;
  }

  if (appState === 'explanation') {
    return <ExplanationPage onContinue={handleExplanationContinue} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#212934]">
      <Header />
      <main className="flex-grow overflow-hidden flex flex-row">
        <div className="flex-grow overflow-hidden">
          <ChatInterface />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
