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

const getInitialSettings = (): Settings => {
    const defaultSettings: Settings = {
        topic: '',
        context: '',
        provider: (process.env.DEFAULT_PROVIDER as AiProvider) || AiProvider.Google,
        model: process.env.DEFAULT_MODEL || 'gemini-2.5-flash',
        apiKey: {
            [AiProvider.Google]: process.env.API_KEY || '',
            [AiProvider.OpenAI]: process.env.OPENAI_API_KEY || '',
            [AiProvider.Mistral]: process.env.MISTRAL_API_KEY || '',
            [AiProvider.OpenRouter]: process.env.OPENROUTER_API_KEY || '',
        },
        parameters: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxLength: 1024,
            thinkingBudget: 200,
        },
        selectedRoles: [...DEFAULT_EXPERT_ROLE_NAMES, ROLE_SCRUM_LEADER]
    };
    
    // Safely parse and apply numeric parameters from environment variables
    const paramsFromEnv = {
        temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || ''),
        topP: parseFloat(process.env.DEFAULT_TOP_P || ''),
        topK: parseInt(process.env.DEFAULT_TOP_K || '', 10),
        maxLength: parseInt(process.env.DEFAULT_MAX_LENGTH || '', 10),
        thinkingBudget: parseInt(process.env.DEFAULT_THINKING_BUDGET || '', 10),
    };

    for (const key in paramsFromEnv) {
        const paramKey = key as keyof typeof paramsFromEnv;
        if (!isNaN(paramsFromEnv[paramKey])) {
            defaultSettings.parameters[paramKey] = paramsFromEnv[paramKey];
        }
    }

    return defaultSettings;
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<'setup' | 'chat'>('setup');
  const { initiateDiscussion } = useAgileBloomChat();
  const { setSettings: setStoreSettings } = useAgileBloomStore();

  const [settings, setSettings] = useState<Settings>(getInitialSettings());
  
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