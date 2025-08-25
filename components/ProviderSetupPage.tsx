

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, AiProvider, ExpertRole, Expert, ApiKeyStatus, ApiKeyStatusValue } from '../types';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { BrainCircuit, MessageSquareText, Users, PlusCircle, Trash2, Github, Loader2, CheckCircle, XCircle, HelpCircle, KeyRound, ArrowRight, ShieldCheck, ShieldAlert, BadgeInfo } from 'lucide-react';
import { DEFAULT_EXPERT_ROLE_NAMES, ROLE_SCRUM_LEADER } from '../constants';
import { SetupHelpModal } from './SetupDocumentationSidebar';
import { PROVIDERS, fetchModelsForProvider, getModelConfigById, fetchAvailableModels } from '../services/modelService';
import { validateApiKey } from '../services/validationService';
import { SliderInput } from './SliderInput';
import { RepoFileSelector } from './RepoFileSelector';

interface ProviderSetupPageProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  apiKeyStatus: ApiKeyStatus;
  setApiKeyStatus: React.Dispatch<React.SetStateAction<ApiKeyStatus>>;
  onComplete: () => void;
  dynamicModels: Record<string, string[]>;
  setDynamicModels: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

const statusIndicatorConfig: Record<ApiKeyStatusValue | 'verifying', { text: string; color: string; icon: React.ReactNode }> = {
    unverified: { text: "Unverified", color: "text-gray-400", icon: <BadgeInfo size={16} /> },
    verifying: { text: "Validating...", color: "text-yellow-400", icon: <Loader2 size={16} className="animate-spin" /> },
    valid: { text: "Verified", color: "text-green-400", icon: <ShieldCheck size={16} /> },
    invalid: { text: "Invalid Key", color: "text-red-400", icon: <ShieldAlert size={16} /> },
    ratelimited: { text: "Service Unavailable", color: "text-orange-400", icon: <ShieldAlert size={16} /> },
};


export const ProviderSetupPage: React.FC<ProviderSetupPageProps> = ({
  settings, setSettings, apiKeyStatus, setApiKeyStatus, onComplete, dynamicModels, setDynamicModels
}) => {
  const { 
    experts, 
    addExpert, 
    removeExpert,
    repoExcludePatterns,
    setRepoExcludePatterns,
    listRepoFiles,
    codebaseImportStatus,
    codebaseImportMessage,
    clearRepoData,
  } = useAgileBloomStore();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showAddExpertForm, setShowAddExpertForm] = useState(false);
  const [newExpert, setNewExpert] = useState({ name: '', emoji: '', description: '' });
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const initialValidationRef = useRef(false);

  const staticModelsForProvider = useMemo(() => fetchModelsForProvider(settings.provider), [settings.provider]);
  const currentModelDetails = useMemo(() => getModelConfigById(settings.model), [settings.model]);
  const currentProviderStatus = apiKeyStatus[settings.provider] || 'unverified';

  useEffect(() => {
    // When URL is cleared, reset all repo state
    if (!gitRepoUrl) {
      clearRepoData();
    }
  }, [gitRepoUrl, clearRepoData]);

  const handleProviderSelect = (provider: AiProvider) => {
    const staticModels = fetchModelsForProvider(provider);
    const newModelId = staticModels.length > 0 ? staticModels[0].id : '';

    setSettings(prev => ({
      ...prev,
      provider,
      model: newModelId,
      // Do not clear API key on switch, as it might be from env vars
    }));

    // If the new provider has a key but no status, it will be auto-validated by the effect
  };

  const validateAndFetchModels = async () => {
    if (!settings.apiKey[settings.provider] || isVerifying) return;
    setIsVerifying(true);
    setApiKeyStatus(prev => ({...prev, [settings.provider]: 'verifying' as ApiKeyStatusValue}));
    
    const result = await validateApiKey(settings.provider, settings.apiKey[settings.provider]!);
    const newStatus = result.isValid ? 'valid' : 'invalid';
    setApiKeyStatus(prev => ({...prev, [settings.provider]: newStatus}));
    
    if (result.isValid) {
        setIsFetchingModels(true);
        try {
            const models = await fetchAvailableModels(settings);
            setDynamicModels(prev => ({ ...prev, [settings.provider]: models }));
            if (!models.includes(settings.model)) {
                setSettings(prev => ({ ...prev, model: models[0] || '' }));
            }
        } catch (error) {
            console.error("Failed to fetch dynamic models", error);
        } finally {
            setIsFetchingModels(false);
        }
    }
    setIsVerifying(false);
  };

  useEffect(() => {
    if (initialValidationRef.current) return;

    const provider = settings.provider;
    const key = settings.apiKey[provider];
    const status = apiKeyStatus[provider];

    if (key && (!status || status === 'unverified')) {
        initialValidationRef.current = true;
        validateAndFetchModels();
    }
  }, [settings.provider, settings.apiKey, apiKeyStatus]);
  
  const handleExpertSelection = (role: ExpertRole) => {
    if (role === ROLE_SCRUM_LEADER) return;
    setSettings(prev => {
        const newRoles = prev.selectedRoles.includes(role)
            ? prev.selectedRoles.filter(r => r !== role)
            : [...prev.selectedRoles, role];
        return { ...prev, selectedRoles: newRoles };
    });
  };

  const handleAddNewExpert = () => {
    if (newExpert.name.trim() && newExpert.emoji.trim() && newExpert.description.trim()) {
        if (experts[newExpert.name]) {
            alert("An expert with this name already exists.");
            return;
        }
        const expertToAdd: Expert = {
            ...newExpert,
            bgColor: "bg-[#333e48]",
            textColor: "text-gray-200",
            isCustom: true,
        };
        addExpert(expertToAdd);
        setSettings(prev => ({ ...prev, selectedRoles: [...prev.selectedRoles, expertToAdd.name] }));
        setNewExpert({ name: '', emoji: '', description: '' });
        setShowAddExpertForm(false);
    }
  };

  const handleRemoveExpert = (role: ExpertRole) => {
    if (window.confirm(`Are you sure you want to permanently delete the expert "${role}"?`)) {
      removeExpert(role);
      setSettings(prev => ({ ...prev, selectedRoles: prev.selectedRoles.filter(r => r !== role) }));
    }
  };
  
  const handleListFiles = () => {
    if (!gitRepoUrl || codebaseImportStatus === 'loading_list') return;
    listRepoFiles(gitRepoUrl);
  };
  
  const isNextDisabled = !settings.topic.trim() || isVerifying || isFetchingModels || apiKeyStatus[settings.provider] !== 'valid' || codebaseImportStatus === 'loading_list' || codebaseImportStatus === 'loading_content';

  return (
    <div className="min-h-screen bg-background text-gray-200 flex items-center justify-center p-4">
      <SetupHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <div className="w-full max-w-3xl bg-surface rounded-lg border border-muted shadow-2xl animate-fadeIn max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934]">
          <div className="p-8">
            <header className="text-center mb-8 relative">
              <h1 className="text-3xl font-bold text-accent">Configure Your AI Assistant</h1>
              <p className="text-secondary mt-2">Set up your AI provider and discussion topic to begin.</p>
               <button onClick={() => setIsHelpOpen(true)} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-accent" title="Help"><HelpCircle /></button>
            </header>

            <form onSubmit={(e) => { e.preventDefault(); onComplete(); }} className="space-y-8">
                
                {/* AI Configuration */}
                <fieldset>
                    {/* Provider Selection */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.values(AiProvider).map(p => (
                            <button key={p} type="button" onClick={() => handleProviderSelect(p)} className={`p-3 rounded-lg border-2 text-center transition-all ${settings.provider === p ? 'bg-accent text-background border-accent' : 'bg-[#212934] border-[#5c6f7e] hover:border-accent/50'}`}>
                                <span className="text-2xl">{PROVIDERS[p].logo}</span>
                                <span className="block text-sm font-semibold mt-1">{PROVIDERS[p].name}</span>
                            </button>
                        ))}
                    </div>

                    {/* API Key Input */}
                    <div className="mt-6">
                        <label className="flex items-center text-lg font-semibold text-gray-200 mb-2"><KeyRound className="mr-3 text-accent" /> API Key</label>
                        <div className="flex items-center gap-2">
                            <input type="password" value={settings.apiKey[settings.provider] || ''} onChange={(e) => setSettings(p => ({...p, apiKey: {...p.apiKey, [p.provider]: e.target.value}}))} placeholder={`Enter your ${settings.provider} API key`} className="w-full p-3 bg-[#212934] border border-[#5c6f7e] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                            <button type="button" onClick={validateAndFetchModels} disabled={isVerifying || !settings.apiKey[settings.provider] || currentProviderStatus === 'valid'} className="px-4 py-2 bg-[#5c6f7e] rounded-lg hover:bg-[#95aac0] disabled:opacity-50 h-[48px]">{isVerifying ? <Loader2 className="animate-spin"/> : "Validate"}</button>
                        </div>
                        <div className={`flex items-center gap-2 mt-2 text-sm ${statusIndicatorConfig[isVerifying ? 'verifying' : currentProviderStatus].color}`}>{statusIndicatorConfig[isVerifying ? 'verifying' : currentProviderStatus].icon}{statusIndicatorConfig[isVerifying ? 'verifying' : currentProviderStatus].text}</div>
                    </div>
                
                    {/* Model Parameters */}
                    <fieldset disabled={currentProviderStatus !== 'valid'} className="space-y-4 disabled:opacity-50 transition-opacity mt-6">
                        <legend className="text-lg font-semibold text-gray-200 mb-2">Model Parameters</legend>
                        <select value={settings.model} onChange={e => setSettings(p => ({...p, model: e.target.value}))} disabled={isFetchingModels} className="w-full p-3 bg-[#212934] border border-[#5c6f7e] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed">
                            {isFetchingModels ? <option>Loading models...</option> : (dynamicModels[settings.provider] || staticModelsForProvider.map(m=>m.id)).map(modelId => <option key={modelId} value={modelId}>{getModelConfigById(modelId)?.name || modelId}</option>)}
                        </select>
                        
                        {currentModelDetails && (
                            <div className="p-4 bg-background/50 border border-muted rounded-lg space-y-3">
                                <h4 className="text-xl font-bold text-accent">{currentModelDetails.name}</h4>
                                <p className="text-sm text-primary/80">{currentModelDetails.description}</p>
                                <div className="p-3 bg-[#333e48]/50 rounded-md border-l-4 border-accent">
                                    <h5 className="text-sm font-semibold mb-2">Strengths:</h5>
                                    <ul className="flex flex-wrap gap-2">{currentModelDetails.strengths.map(s => <li key={s} className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">{s}</li>)}</ul>
                                </div>
                            </div>
                        )}

                        {currentModelDetails?.parameters.map(param => (
                            <SliderInput 
                                key={param.id} 
                                id={param.id}
                                label={param.name}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={settings.parameters[param.id] ?? param.defaultValue} 
                                onChange={(val) => setSettings(p => ({...p, parameters: {...p.parameters, [param.id]: val}}))} 
                            />
                        ))}
                    </fieldset>
                </fieldset>

                {/* Topic and Context */}
                <fieldset className="space-y-6">
                    <div>
                        <label htmlFor="topic" className="flex items-center text-lg font-semibold text-gray-200 mb-2"><BrainCircuit className="mr-3 text-accent" /> Main Topic <span className="text-red-500 ml-1">*</span></label>
                        <input id="topic" type="text" value={settings.topic} onChange={(e) => setSettings(p => ({...p, topic: e.target.value}))} placeholder="e.g., Brainstorm features for a new productivity app" required className="w-full p-3 bg-[#212934] border border-[#5c6f7e] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                     <div className="space-y-3">
                        <label htmlFor="github-repo" className="flex items-center text-lg font-semibold text-gray-200"><Github className="mr-3 text-accent" /> Import Code from GitHub Repo (Optional)</label>
                        <div className="flex gap-2">
                            <input id="github-repo" type="url" value={gitRepoUrl} onChange={(e) => setGitRepoUrl(e.target.value)} placeholder="e.g., https://github.com/owner/repo" className="w-full p-3 bg-[#212934] border border-[#5c6f7e] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                            <button type="button" onClick={handleListFiles} disabled={!gitRepoUrl || codebaseImportStatus === 'loading_list'} className="px-4 py-2 bg-[#5c6f7e] rounded-lg hover:bg-[#95aac0] disabled:opacity-50 flex items-center justify-center w-32 shrink-0">{codebaseImportStatus === 'loading_list' ? <Loader2 className="animate-spin" /> : "List Files"}</button>
                        </div>
                        <label htmlFor="exclude-patterns" className="text-sm text-secondary">Exclude patterns (one per line, gitignore format):</label>
                        <textarea id="exclude-patterns" value={repoExcludePatterns} onChange={(e) => setRepoExcludePatterns(e.target.value)} rows={3} className="w-full p-2 bg-[#212934] border border-[#5c6f7e] rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
                        
                        {(codebaseImportStatus !== 'idle') && (
                            <div className="animate-fadeIn">
                                {codebaseImportStatus === 'error' && <p className="text-sm text-red-400 flex items-center gap-2"><XCircle size={14}/>{codebaseImportMessage}</p>}
                                {codebaseImportStatus === 'success_list' && <RepoFileSelector repoUrl={gitRepoUrl}/>}
                            </div>
                        )}
                    </div>
                </fieldset>

                {/* Expert Selection */}
                <fieldset className="space-y-4">
                    <label className="flex items-center text-lg font-semibold text-gray-200"><Users className="mr-3 text-accent" /> Assemble Your AI Team</label>
                    <div className="space-y-3 p-4 bg-[#212934]/50 rounded-lg">
                        {Object.values(experts).map((expert: Expert) => (
                        <div key={expert.name} className="flex items-center justify-between p-3 bg-[#212934] rounded-lg">
                            <label htmlFor={`expert-${expert.name}`} className="flex items-center cursor-pointer flex-grow">
                            <input id={`expert-${expert.name}`} type="checkbox" checked={settings.selectedRoles.includes(expert.name)} onChange={() => handleExpertSelection(expert.name)} disabled={expert.name === ROLE_SCRUM_LEADER} className="h-5 w-5 rounded text-accent-dark bg-[#5c6f7e] border-[#95aac0] focus:ring-accent disabled:opacity-50" />
                            <span className="ml-4 text-2xl">{expert.emoji}</span>
                            <div className="ml-3"><p className="font-semibold">{expert.name}</p><p className="text-xs text-secondary">{expert.description}</p></div>
                            </label>
                            {expert.isCustom && <button type="button" onClick={() => handleRemoveExpert(expert.name)} className="p-2 rounded-full text-red-500 hover:bg-red-500/20"><Trash2 size={16} /></button>}
                        </div>
                        ))}
                        {showAddExpertForm ? (
                        <div className="p-3 bg-surface rounded-lg border border-accent/50 space-y-3">
                            <input type="text" placeholder="New Expert Name" value={newExpert.name} onChange={e => setNewExpert({...newExpert, name: e.target.value})} className="w-full p-2 bg-[#212934] border border-[#5c6f7e] rounded text-sm"/>
                            <input type="text" placeholder="Emoji" value={newExpert.emoji} onChange={e => setNewExpert({...newExpert, emoji: e.target.value})} className="w-full p-2 bg-[#212934] border border-[#5c6f7e] rounded text-sm"/>
                            <textarea placeholder="Description" value={newExpert.description} onChange={e => setNewExpert({...newExpert, description: e.target.value})} rows={2} className="w-full p-2 bg-[#212934] border border-[#5c6f7e] rounded text-sm"/>
                            <div className="flex gap-2"><button type="button" onClick={handleAddNewExpert} className="flex-1 p-2 bg-green-600 hover:bg-green-700 rounded text-sm">Save</button><button type="button" onClick={() => setShowAddExpertForm(false)} className="flex-1 p-2 bg-[#5c6f7e] hover:bg-[#95aac0] rounded text-sm">Cancel</button></div>
                        </div>
                        ) : <button type="button" onClick={() => setShowAddExpertForm(true)} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-muted rounded-lg text-secondary hover:border-accent hover:text-accent transition-colors"><PlusCircle size={18} /> Add New Expert</button>}
                    </div>
                </fieldset>

                <div className="pt-4 text-center">
                    <button type="submit" disabled={isNextDisabled} className="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white bg-accent-dark rounded-lg shadow-lg hover:bg-accent-dark/90 transition-all focus:outline-none focus:ring-4 focus:ring-accent/50 disabled:bg-[#5c6f7e] disabled:cursor-not-allowed">
                        Begin Discussion <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
                    </button>
                    {!isNextDisabled && !settings.topic.trim() && <p className="text-xs text-yellow-400 mt-2">Please enter a topic to continue.</p>}
                </div>
            </form>
          </div>
      </div>
    </div>
  );
};