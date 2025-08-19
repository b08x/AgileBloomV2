import React from 'react';
import useAgileBloomStore from '../store/useAgileBloomStore';
import { CodeBlock } from './CodeBlock';
import { Code2, Github } from 'lucide-react';

export const CodebaseSidebar: React.FC = () => {
    const { codebaseContext } = useAgileBloomStore();

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
                {codebaseContext ? (
                    <CodeBlock code={codebaseContext} language="auto" />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[#95aac0] p-4">
                        <Github size={40} className="mb-3 opacity-50" />
                        <h3 className="font-semibold text-gray-200">No Codebase Imported</h3>
                        <p className="text-xs mt-2">
                            Go to the Setup page to import a public GitHub repository.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
