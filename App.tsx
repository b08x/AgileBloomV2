import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProviderSetupPage } from './components/ProviderSetupPage';
import { useAgileBloomChat } from './hooks/useAgileBloomChat';
import useAgileBloomStore from './store/useAgileBloomStore';
import { Settings, ApiKeyStatus, ExpertRole, AiProvider } from './types';
import { DEFAULT_EXPERT_ROLE_NAMES, ROLE_SCRUM_LEADER } from './constants';
import { validateApiKey } from './services/validationService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<'setup' | 'chat'>('setup');
  const { initiateDiscussion } = useAgileBloomChat();
  const { setSettings: setStoreSettings } = useAgileBloomStore();

  const [settings, setSettings] = useState<Settings>({
    topic: '',
    context: '',
    provider: AiProvider.Google,
    model: 'gemini-2.5-flash',
    apiKey: {},
    parameters: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxLength: 1024,
      thinkingBudget: 200,
    },
    selectedRoles: [...DEFAULT_EXPERT_ROLE_NAMES, ROLE_SCRUM_LEADER]
  });
  
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({});
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({});

  const handleSetupComplete = () => {
    setStoreSettings(settings);
    initiateDiscussion(settings);
    setAppState('chat');
  };
  
  if (appState === 'setup') {
    return (
      <ProviderSetupPage
        settings={settings}
        setSettings={setSettings}
        apiKeyStatus={apiKeyStatus}
        setApiKeyStatus={setApiKeyStatus}
        dynamicModels={dynamicModels}
        setDynamicModels={setDynamicModels}
        onComplete={handleSetupComplete}
      />
    );
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
