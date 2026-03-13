

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, AiProvider, ExpertRole, Expert } from '../types';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { BrainCircuit, MessageSquareText, Users, PlusCircle, Trash2, Github, Loader2, CheckCircle, XCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { DEFAULT_EXPERT_ROLE_NAMES, ROLE_SCRUM_LEADER } from '../constants';
import { SetupHelpModal } from './SetupDocumentationSidebar';
import { RepoFileSelector } from './RepoFileSelector';
import { AIConfigSidebar } from './NarrativeSummarySidebar';

interface ProviderSetupPageProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  apiKeyValidation: Partial<Record<AiProvider, { status: 'unchecked' | 'pending' | 'valid' | 'invalid'; error?: string }>>;
  setApiKeyValidation: React.Dispatch<React.SetStateAction<Partial<Record<AiProvider, { status: 'unchecked' | 'pending' | 'valid' | 'invalid'; error?: string }>>>>;
  onComplete: () => void;
}

export const ProviderSetupPage: React.FC<ProviderSetupPageProps> = ({
  settings, setSettings, apiKeyValidation, setApiKeyValidation, onComplete
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
    isQuotaExceeded,
    setQuotaExceeded
  } = useAgileBloomStore();
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showAddExpertForm, setShowAddExpertForm] = useState(false);
  const [newExpert, setNewExpert] = useState({ name: '', emoji: '', description: '' });
  const [gitRepoUrl, setGitRepoUrl] = useState('');

  const handleSetSelectedProvider = useCallback((provider: AiProvider) => setSettings(s => ({ ...s, provider })), [setSettings]);
  const handleSetSelectedModelId = useCallback((model: string) => setSettings(s => ({ ...s, model })), [setSettings]);
  const handleSetModelConfigParams = useCallback((params: React.SetStateAction<Record<string, number>>) => {
    setSettings(s => ({ ...s, parameters: typeof params === 'function' ? params(s.parameters) : params }));
  }, [setSettings]);
  const handleSetUserApiKeys = useCallback((keys: React.SetStateAction<Partial<Record<AiProvider, string>>>) => {
    setSettings(s => ({ ...s, apiKey: typeof keys === 'function' ? keys(s.apiKey) : keys }));
  }, [setSettings]);
  const handleSetEnableGeminiPreprocessing = useCallback((enabled: boolean) => setSettings(s => ({ ...s, useGeminiPreprocessing: enabled })), [setSettings]);

  useEffect(() => {
    // When URL is cleared, reset all repo state
    if (!gitRepoUrl) {
      clearRepoData();
    }
  }, [gitRepoUrl, clearRepoData]);

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
  
  const isNextDisabled = !settings.topic.trim() || apiKeyValidation[settings.provider]?.status !== 'valid' || codebaseImportStatus === 'loading_list' || codebaseImportStatus === 'loading_content';

  return (
    <div className="h-screen w-screen bg-[#212934] flex flex-col lg:flex-row overflow-hidden">
      <SetupHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      {/* Main Form Area */}
      <div className="flex-1 lg:w-7/12 xl:w-8/12 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934]">
        <div className="max-w-3xl w-full mx-auto p-8 sm:p-12 animate-fadeIn">
            <header className="text-center mb-8 relative">
              <h1 className="text-3xl font-bold text-accent">Configure Your AI Assistant</h1>
              <p className="text-secondary mt-2">Set up your AI provider and discussion topic to begin.</p>
               <button onClick={() => setIsHelpOpen(true)} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-accent" title="Help"><HelpCircle /></button>
            </header>

            <form onSubmit={(e) => { e.preventDefault(); onComplete(); }} className="space-y-8">
                
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
      {/* AI Config Sidebar */}
      <div className="flex-1 lg:w-5/12 xl:w-4/12 bg-[#333e48] border-t lg:border-t-0 lg:border-l border-[#5c6f7e] h-full overflow-y-auto">
        <AIConfigSidebar 
            selectedProvider={settings.provider}
            setSelectedProvider={handleSetSelectedProvider}
            selectedModelId={settings.model}
            setSelectedModelId={handleSetSelectedModelId}
            modelConfigParams={settings.parameters}
            setModelConfigParams={handleSetModelConfigParams}
            userApiKeys={settings.apiKey}
            setUserApiKeys={handleSetUserApiKeys}
            apiKeyValidation={apiKeyValidation}
            setApiKeyValidation={setApiKeyValidation}
            isQuotaExceeded={isQuotaExceeded}
            setQuotaExceeded={setQuotaExceeded}
            enableGeminiPreprocessing={settings.useGeminiPreprocessing || false}
            setEnableGeminiPreprocessing={handleSetEnableGeminiPreprocessing}
        />
      </div>
    </div>
  );
};