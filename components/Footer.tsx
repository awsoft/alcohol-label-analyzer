
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900/80 text-center p-4 mt-auto">
      <p className="text-sm text-slate-400">
        &copy; {new Date().getFullYear()} AI Label Analyzer. For informational purposes only. Always consult with a legal expert for compliance matters.
      </p>
    </footer>
  );
};
