
import React, { useState, useMemo } from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { CheckCircle, FileCode, Loader2, Search, XCircle } from 'lucide-react';

interface RepoFileSelectorProps {
    repoUrl: string;
}

export const RepoFileSelector: React.FC<RepoFileSelectorProps> = ({ repoUrl }) => {
    const {
        repoFiles,
        selectedRepoFiles,
        toggleRepoFileSelection,
        toggleSelectAllRepoFiles,
        confirmRepoFileSelection,
        codebaseImportStatus,
        codebaseImportMessage,
    } = useAgileBloomStore();

    const [filterText, setFilterText] = useState('');

    const filteredFiles = useMemo(() => {
        if (!filterText) return repoFiles;
        return repoFiles.filter(file => file.path.toLowerCase().includes(filterText.toLowerCase()));
    }, [filterText, repoFiles]);

    const areAllFilteredSelected = useMemo(() => {
        if (filteredFiles.length === 0) return false;
        return filteredFiles.every(file => selectedRepoFiles.has(file.path));
    }, [filteredFiles, selectedRepoFiles]);
    
    const handleSelectAllFiltered = (e: React.ChangeEvent<HTMLInputElement>) => {
        const shouldSelect = e.target.checked;
        filteredFiles.forEach(file => {
            toggleRepoFileSelection(file.path, shouldSelect);
        });
    };

    return (
        <div className="mt-4 p-4 bg-[#212934] border border-[#5c6f7e] rounded-lg space-y-4">
            <div>
                <h3 className="font-semibold text-gray-200">Select Files for Context</h3>
                <p className="text-[10px] text-[#95aac0]">{codebaseImportMessage}</p>
            </div>

            {/* Filter and Select All */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
                <div className="relative w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#95aac0]" />
                    <input
                        type="text"
                        placeholder={`Search ${repoFiles.length} files...`}
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="w-full bg-[#333e48] border border-[#5c6f7e] rounded-md pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <label htmlFor="select-all-filtered" className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                            id="select-all-filtered"
                            type="checkbox"
                            checked={areAllFilteredSelected}
                            onChange={handleSelectAllFiltered}
                            className="h-4 w-4 rounded bg-[#5c6f7e] border-[#95aac0] text-accent-dark focus:ring-accent"
                        />
                        All ({filteredFiles.length})
                    </label>
                </div>
            </div>

            {/* File List */}
            <div className="max-h-60 overflow-y-auto border border-[#5c6f7e] rounded-lg p-2 bg-[#333e48]/50 scrollbar-thin scrollbar-thumb-[#95aac0] scrollbar-track-[#333e48]">
                {filteredFiles.length > 0 ? (
                    <div className="space-y-1">
                        {filteredFiles.map(file => (
                            <label key={file.path} htmlFor={`file-${file.path}`} className="flex items-center gap-3 p-1.5 rounded hover:bg-[#5c6f7e]/50 cursor-pointer">
                                <input
                                    id={`file-${file.path}`}
                                    type="checkbox"
                                    checked={selectedRepoFiles.has(file.path)}
                                    onChange={() => toggleRepoFileSelection(file.path)}
                                    className="h-4 w-4 rounded bg-[#5c6f7e] border-[#95aac0] text-accent-dark focus:ring-accent flex-shrink-0"
                                />
                                <FileCode size={14} className="text-accent flex-shrink-0" />
                                <span className="text-[10px] font-mono truncate flex-grow text-gray-200" title={file.path}>{file.path}</span>
                                <span className="text-[10px] text-[#95aac0] flex-shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-xs text-[#95aac0] py-4">
                        No files match search.
                    </div>
                )}
            </div>
            
            {/* Action Button */}
            <div className="flex flex-col items-center">
                 <button 
                    type="button" 
                    onClick={() => confirmRepoFileSelection()} 
                    disabled={codebaseImportStatus === 'loading_content' || selectedRepoFiles.size === 0}
                    className="w-full sm:w-auto px-4 py-2 bg-accent-dark rounded-lg text-white text-sm font-semibold hover:bg-accent-dark/90 disabled:bg-[#5c6f7e] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {codebaseImportStatus === 'loading_content' ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Updating...</span>
                        </>
                    ) : (
                        `Update Context (${selectedRepoFiles.size} files)`
                    )}
                </button>
                {selectedRepoFiles.size === 0 && <p className="text-[10px] text-yellow-400 mt-2 text-center">Select files to include in chat context.</p>}
            </div>
        </div>
    );
};
