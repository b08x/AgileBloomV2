import React, { Dispatch, SetStateAction } from 'react';
import { Cpu, Loader2, CheckCircle, XCircle, KeyRound, Loader } from 'lucide-react';
import { AIModelConfig, AiProvider } from '../types';
import { SliderInput } from './SliderInput';

// Define Props interface for clarity
interface AIConfigSidebarProps {
  selectedProvider: AiProvider;
  setSelectedProvider: (provider: AiProvider) => void;
  availableModelsForProvider: AIModelConfig[];
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  modelsLoading: boolean;
  modelsError: string | null;
  modelConfigParams: Record<string, number>;
  setModelConfigParams: Dispatch<SetStateAction<Record<string, number>>>;
  userApiKeys: Partial<Record<AiProvider, string>>;
  setUserApiKeys: Dispatch<SetStateAction<Partial<Record<AiProvider, string>>>>;
  apiKeyValidation: Partial<Record<AiProvider, { status: 'unchecked' | 'pending' | 'valid' | 'invalid'; error?: string }>>;
  handleValidateKey: (provider: AiProvider) => void;
  isQuotaExceeded: boolean;
  setQuotaExceeded: (isExceeded: boolean) => void;
  enableGeminiPreprocessing: boolean;
  setEnableGeminiPreprocessing: (enabled: boolean) => void;
}

const ProviderBadge: React.FC<{ provider: AiProvider }> = ({ provider }) => {
  const styles = {
    [AiProvider.Google]: { icon: '💎' },
    [AiProvider.Mistral]: { icon: '⚡️' },
    [AiProvider.OpenAI]: { icon: '🤖' },
    [AiProvider.OpenRouter]: { icon: '🔄' },
  };
  const style = styles[provider];

  return (
    <span className="flex items-center text-xs text-gray-200 bg-[#5c6f7e]/50 px-2 py-0.5 rounded-full">
      {style.icon}
      <span className="ml-1.5">{provider}</span>
    </span>
  );
};

const ApiKeyInput: React.FC<{
    provider: AiProvider, 
    userApiKeys: Partial<Record<AiProvider, string>>,
    setUserApiKeys: Dispatch<SetStateAction<Partial<Record<AiProvider, string>>>>,
    apiKeyValidation: Partial<Record<AiProvider, { status: 'unchecked' | 'pending' | 'valid' | 'invalid'; error?: string }>>,
    handleValidateKey: (provider: AiProvider) => void,
    isQuotaExceeded: boolean,
    setQuotaExceeded: (isExceeded: boolean) => void
}> = ({ provider, userApiKeys, setUserApiKeys, apiKeyValidation, handleValidateKey, isQuotaExceeded, setQuotaExceeded }) => {
    const validation = apiKeyValidation[provider];
    return (
      <div className="bg-[#212934] p-4 rounded-lg border border-[#5c6f7e]">
        <label htmlFor={`${provider}-key`} className="flex items-center text-md font-semibold text-gray-200 mb-2">
            <KeyRound className="mr-3 text-[#e2a32d]" size={20} />
            {provider} API Key
        </label>
        <div className="flex items-center gap-2">
            <input
                id={`${provider}-key`}
                type="password"
                value={userApiKeys[provider] || ''}
                onChange={(e) => {
                    const newKey = e.target.value;
                    setUserApiKeys(prev => ({...prev, [provider]: newKey}));
                    if(isQuotaExceeded) setQuotaExceeded(false);
                }}
                onBlur={() => {
                    const currentValidation = apiKeyValidation[provider];
                    if (!currentValidation || currentValidation.status === 'unchecked') {
                         handleValidateKey(provider);
                    }
                }}
                placeholder={`Enter your ${provider} API key`}
                className="w-full p-3 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#e2a32d] transition-colors disabled:opacity-50"
            />
            <button type="button" onClick={() => handleValidateKey(provider)} disabled={!userApiKeys[provider] || validation?.status === 'pending'} className="px-4 py-2.5 h-[50px] bg-[#5c6f7e] rounded-lg hover:bg-[#95aac0] disabled:bg-[#5c6f7e]/50 disabled:cursor-not-allowed">
              {validation?.status === 'pending' ? <Loader size={20} className="animate-spin" /> : "Validate"}
            </button>
            <div className="w-8 h-8 flex items-center justify-center">
              {validation?.status === 'valid' && <span title="API Key is valid"><CheckCircle size={24} className="text-green-400" /></span>}
              {validation?.status === 'invalid' && <span title={`Invalid: ${validation.error}`}><XCircle size={24} className="text-red-500" /></span>}
            </div>
        </div>
        {validation?.status === 'invalid' && <p className="text-xs text-red-300 mt-2 ml-1">{validation.error}</p>}
      </div>
    );
};

export const AIConfigSidebar: React.FC<AIConfigSidebarProps> = (props) => {
  const {
      selectedProvider, setSelectedProvider,
      availableModelsForProvider, selectedModelId, setSelectedModelId,
      modelsLoading, modelsError,
      modelConfigParams, setModelConfigParams,
      userApiKeys, setUserApiKeys,
      apiKeyValidation, handleValidateKey,
      isQuotaExceeded, setQuotaExceeded,
      enableGeminiPreprocessing, setEnableGeminiPreprocessing,
  } = props;
  
  const selectedModelConfig = availableModelsForProvider.find(m => m.id === selectedModelId);

  return (
    <div className="h-full flex flex-col p-6 lg:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#333e48]">
        <h2 className="text-2xl font-semibold text-[#e2a32d] mb-6 flex items-center gap-3">
            <Cpu size={28} />
            AI Configuration
        </h2>
        <div className="space-y-6">
            {/* Provider and Model Selection */}
            <div className="space-y-4">
               <h3 className="font-semibold text-gray-200">Provider & Model</h3>
               <div className="grid grid-cols-1 gap-4">
                   <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value as AiProvider)} className="w-full p-3 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e2a32d]">
                      {Object.values(AiProvider).map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                   <div className="relative">
                        <select 
                            value={selectedModelId} 
                            onChange={(e) => setSelectedModelId(e.target.value)} 
                            className="w-full p-3 bg-[#212934] border-2 border-[#5c6f7e] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e2a32d] disabled:opacity-50 appearance-none" 
                            disabled={modelsLoading || availableModelsForProvider.length === 0}
                        >
                          {modelsLoading && <option>Loading models...</option>}
                          {!modelsLoading && availableModelsForProvider.length === 0 && <option>No models found</option>}
                          {availableModelsForProvider.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        {modelsLoading && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <Loader2 className="h-5 w-5 text-[#e2a32d] animate-spin" />
                            </div>
                        )}
                   </div>
               </div>
               {modelsError && <p className="text-xs text-red-300 mt-1 pl-1">{modelsError}</p>}
               {selectedModelConfig && 
                  <div className="p-3 bg-[#212934]/50 rounded-lg text-sm text-[#95aac0] flex justify-between items-center">
                      <p>{selectedModelConfig.description}</p>
                      <ProviderBadge provider={selectedProvider} />
                  </div>
                }
            </div>

            {/* Model Parameters */}
            {selectedModelConfig?.parameters?.length > 0 && (
               <div className="space-y-4 p-4 bg-[#212934]/50 rounded-lg">
                  <h3 className="font-semibold text-gray-200">Model Parameters</h3>
                  {selectedModelConfig.parameters.map(param => (
                    <SliderInput
                      key={param.id}
                      id={param.id}
                      label={param.name}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={modelConfigParams[param.id] ?? param.defaultValue}
                      onChange={(val) => setModelConfigParams(prev => ({...prev, [param.id]: val}))}
                    />
                  ))}
               </div>
            )}

            {/* API Key Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-200">API Keys</h3>
              <ApiKeyInput provider={selectedProvider} {...props} />
              {selectedProvider === AiProvider.OpenRouter && (
                <div className="p-4 bg-[#212934] rounded-lg border border-[#5c6f7e]">
                   <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" checked={enableGeminiPreprocessing} onChange={(e) => setEnableGeminiPreprocessing(e.target.checked)} className="h-5 w-5 rounded text-[#c36e26] bg-[#5c6f7e] border-[#95aac0] focus:ring-[#e2a32d]" />
                      <span className="text-gray-200">Enable Gemini Preprocessing</span>
                   </label>
                   {enableGeminiPreprocessing && <div className="mt-4"><ApiKeyInput provider={AiProvider.Google} {...props} /></div>}
                </div>
              )}
            </div>
        </div>
    </div>
  );
};