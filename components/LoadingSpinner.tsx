
import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 text-[#e2a32d]">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-sm">AI is thinking...</span>
    </div>
  );
};