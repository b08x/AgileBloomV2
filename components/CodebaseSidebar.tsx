

import React from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { CodeBlock } from './CodeBlock';
import { Code2, Github, Loader2, XCircle, FileCode, CheckCircle } from 'lucide-react';

export const CodebaseSidebar: React.FC = () => {
    const { codebaseContext, codebaseImportStatus, codebaseImportMessage, selectedRepoFiles } = useAgileBloomStore();

    const selectedFilesArray = Array.from(selectedRepoFiles);

    return (
        <div className="flex flex-col h-full w-full">
            <header className="p-4 border-b border-[#5c6f7e]">
                <h2 className="text-lg font-semibold text-[#e2a32d] flex items-center gap-3">
                    <Code2 size={20} />
                    Codebase Context
                </h2>
                <p className="text-xs text-[#95aac0]">The code provided to the AI team for reference.</p>
            </header>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934]">
                {codebaseImportStatus === 'loading_list' && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-yellow-400 p-4">
                        <Loader2 size={40} className="mb-3 animate-spin" />
                        <h3 className="font-semibold text-gray-200">Listing Files...</h3>
                        <p className="text-xs mt-2">{codebaseImportMessage}</p>
                    </div>
                )}
                {codebaseImportStatus === 'loading_content' && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-yellow-400 p-4">
                        <Loader2 size={40} className="mb-3 animate-spin" />
                        <h3 className="font-semibold text-gray-200">Fetching Content...</h3>
                        <p className="text-xs mt-2">{codebaseImportMessage}</p>
                    </div>
                )}
                 {codebaseImportStatus === 'error' && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4">
                        <XCircle size={40} className="mb-3" />
                        <h3 className="font-semibold text-gray-200">Import Failed</h3>
                        <p className="text-xs mt-2">{codebaseImportMessage}</p>
                    </div>
                )}
                {codebaseImportStatus === 'success_content' && (
                     <div className="p-2">
                        <div className="mb-4 p-3 bg-[#212934] rounded-lg border border-[#5c6f7e]">
                            <h4 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                                <CheckCircle size={16} className="text-green-400" />
                                Context Loaded
                            </h4>
                            <p className="text-xs text-green-300">{codebaseImportMessage}</p>
                            {selectedFilesArray.length > 0 && (
                                <>
                                 <h5 className="text-xs font-semibold text-[#95aac0] mt-3 mb-1">Included Files ({selectedFilesArray.length}):</h5>
                                 <div className="max-h-24 overflow-y-auto bg-[#333e48]/50 p-1.5 rounded-md scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#212934]">
                                    {selectedFilesArray.map(path => (
                                        <div key={path} className="text-xs text-gray-300 truncate font-mono" title={path}>
                                            {path}
                                        </div>
                                    ))}
                                 </div>
                                </>
                            )}
                        </div>
                        {codebaseContext ? (
                           <CodeBlock code={codebaseContext} language="auto" />
                        ) : (
                           <p className="text-sm text-center text-[#95aac0]">No code content was loaded.</p>
                        )}
                    </div>
                )}
                {codebaseImportStatus !== 'loading_list' && codebaseImportStatus !== 'loading_content' && codebaseImportStatus !== 'error' && codebaseImportStatus !== 'success_content' && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[#95aac0] p-4">
                        <Github size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-200">No Codebase Imported</h3>
                        <p className="text-xs mt-2">
                            Go back to the Setup page to import a public GitHub repository.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};