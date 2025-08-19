
import React from 'react';
// For a full implementation, you might use react-syntax-highlighter.
// This is a basic version for now for markdown tables and simple code.

interface CodeBlockProps {
  code: string;
  language?: string; // 'markdown' or a programming language
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  // Basic detection for markdown table
  const isMarkdownTable = language === 'markdown' || (code.includes('|') && code.includes('---'));

  if (isMarkdownTable) {
    // This is a very naive way to render markdown tables.
    // A proper markdown parser (like 'marked' or 'react-markdown') would be better.
    const lines = code.trim().split('\n');
    const headerLine = lines.find(line => line.includes('|') && line.includes('---'));
    const headerIndex = headerLine ? lines.indexOf(headerLine) : -1;
    
    const headers = headerIndex > 0 ? lines[headerIndex-1].split('|').map(h => h.trim()).filter(Boolean) : [];
    const rows = lines.slice(headerIndex + 1).map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));

    if (headers.length > 0 && rows.length > 0) {
        return (
            <div className="overflow-x-auto my-2 bg-[#212934] p-2 rounded-md border border-[#5c6f7e] text-xs">
                <table className="min-w-full divide-y divide-[#5c6f7e]">
                    <thead className="bg-[#333e48]">
                        <tr>
                            {headers.map((header, i) => (
                                <th key={i} scope="col" className="px-3 py-1.5 text-left text-xs font-medium text-[#e2a32d] uppercase tracking-wider">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-[#212934]/50 divide-y divide-[#5c6f7e]">
                        {rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-1.5 whitespace-nowrap">{cell}</td>
                                ))}
                            </tr>
                        ))}
                         {rows.length === 0 && (
                            <tr>
                                <td colSpan={headers.length} className="px-3 py-1.5 text-center text-[#95aac0]">No data</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }
  }

  // Default to pre-formatted text for code or unparsable markdown
  return (
    <pre className="bg-[#212934] p-3 my-2 rounded-md overflow-x-auto text-xs text-gray-200 border border-[#5c6f7e] scrollbar-thin scrollbar-thumb-[#5c6f7e] scrollbar-track-[#333e48] font-mono">
      <code>{code}</code>
    </pre>
  );
};