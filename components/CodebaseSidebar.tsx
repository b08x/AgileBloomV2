
import React, { useState } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { CodeBlock } from './CodeBlock';
import { Code2, Github, Loader2, XCircle, FileCode, CheckCircle, ListFilter, Save, History, FileEdit } from 'lucide-react';
import { RepoFileSelector } from './RepoFileSelector';

export const CodebaseSidebar: React.FC = () => {
    const { 
        repoUrl,
        codebaseContext, 
        codebaseImportStatus, 
        codebaseImportMessage, 
        selectedRepoFiles, 
        repoFiles,
        proposedFileEdits,
        clearProposedFileEdits
    } = useAgileBloomStore();

    const [activeTab, setActiveTab] = useState<'context' | 'edits' | 'selector'>('context');

    const selectedFilesArray = Array.from(selectedRepoFiles);

    return (
        <div className="flex flex-col h-full w-full">
            <header className="p-4 border-b border-[#5c6f7e]">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg font-semibold text-[#e2a32d] flex items-center gap-2">
                        <Code2 size={20} />
                        Codebase
                    </h2>
                    {repoUrl && (
                        <span className="text-[10px] text-[#95aac0] font-mono bg-[#212934] px-1.5 py-0.5 rounded truncate max-w-[120px]" title={repoUrl}>
                            {repoUrl.split('/').pop()}
                        </span>
                    )}
                </div>
                
                {repoUrl && (
                    <div className="flex bg-[#212934] rounded-md p-1 mt-3">
                        <button 
                            onClick={() => setActiveTab('context')}
                            className={`flex-1 flex justify-center py-1 rounded text-xs transition-colors ${activeTab === 'context' ? 'bg-[#c36e26] text-white' : 'text-[#95aac0] hover:text-white'}`}
                        >
                            View
                        </button>
                        <button 
                            onClick={() => setActiveTab('selector')}
                            className={`flex-1 flex justify-center py-1 rounded text-xs transition-colors ${activeTab === 'selector' ? 'bg-[#c36e26] text-white' : 'text-[#95aac0] hover:text-white'}`}
                        >
                            Select
                        </button>
                        <button 
                            onClick={() => setActiveTab('edits')}
                            className={`flex-1 flex justify-center py-1 rounded text-xs transition-colors ${activeTab === 'edits' ? 'bg-[#c36e26] text-white' : 'text-[#95aac0] hover:text-white'}`}
                        >
                            Edits {proposedFileEdits.length > 0 && `(${proposedFileEdits.length})`}
                        </button>
                    </div>
                )}
            </header>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934]">
                {!repoUrl ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[#95aac0] p-4">
                        <Github size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-200">No Codebase Connected</h3>
                        <p className="text-xs mt-2">
                            Import a public GitHub repository during setup to provide code context.
                        </p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'selector' && (
                            <div className="animate-fadeIn">
                                <RepoFileSelector repoUrl={repoUrl} />
                            </div>
                        )}

                        {activeTab === 'context' && (
                            <div className="animate-fadeIn space-y-3">
                                {codebaseImportStatus === 'loading_content' ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-yellow-400">
                                        <Loader2 size={32} className="animate-spin mb-2" />
                                        <p className="text-xs">Updating context...</p>
                                    </div>
                                ) : codebaseContext ? (
                                    <>
                                        <div className="p-3 bg-[#212934] rounded-lg border border-[#5c6f7e]">
                                            <h4 className="text-xs font-semibold text-[#95aac0] mb-2 flex items-center justify-between">
                                                <span>Active Context</span>
                                                <span className="bg-[#5c6f7e] text-white px-1.5 py-0.5 rounded-md">{selectedRepoFiles.size} files</span>
                                            </h4>
                                            <div className="max-h-24 overflow-y-auto bg-[#333e48]/50 p-1.5 rounded-md scrollbar-thin">
                                                {selectedFilesArray.map(path => (
                                                    <div key={path} className="text-[10px] text-gray-300 truncate font-mono mb-0.5" title={path}>{path}</div>
                                                ))}
                                            </div>
                                        </div>
                                        <CodeBlock code={codebaseContext} language="auto" />
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-[#95aac0]">
                                        <FileCode size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">No files selected for context.</p>
                                        <button 
                                            onClick={() => setActiveTab('selector')}
                                            className="text-accent hover:underline text-xs mt-2"
                                        >
                                            Select files now
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'edits' && (
                            <div className="animate-fadeIn space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-gray-200">Proposed Changes</h3>
                                    {proposedFileEdits.length > 0 && (
                                        <button onClick={clearProposedFileEdits} className="text-[10px] text-red-400 hover:underline">Clear all</button>
                                    )}
                                </div>
                                {proposedFileEdits.length > 0 ? (
                                    proposedFileEdits.map((edit, idx) => (
                                        <div key={idx} className="bg-[#333e48] border border-[#5c6f7e] rounded-lg overflow-hidden">
                                            <div className="p-2 bg-[#212934] flex justify-between items-center">
                                                <span className="text-[10px] font-mono text-accent truncate max-w-[180px]" title={edit.path}>{edit.path}</span>
                                                <span className={`text-[8px] uppercase font-bold px-1 rounded ${
                                                    edit.status === 'new' ? 'bg-green-600' : 
                                                    edit.status === 'deleted' ? 'bg-red-600' : 'bg-yellow-600'
                                                }`}>
                                                    {edit.status}
                                                </span>
                                            </div>
                                            <div className="p-2">
                                                {edit.explanation && <p className="text-[10px] text-gray-400 mb-2 italic">"{edit.explanation}"</p>}
                                                <CodeBlock code={edit.content} language="auto" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-[#95aac0]">
                                        <Save size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">No proposed edits from the Engineer yet.</p>
                                        <p className="text-[10px] mt-1 max-w-[200px] mx-auto">Ask the Engineer to suggest changes to specific files in the codebase.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
