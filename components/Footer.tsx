
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#333e48]/50 backdrop-blur-sm p-3 text-center text-xs text-[#95aac0] border-t border-[#5c6f7e]">
      Agile Bloom AI &copy; {new Date().getFullYear()}. For demonstration purposes.
    </footer>
  );
};