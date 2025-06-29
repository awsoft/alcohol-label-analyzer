import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900/80 text-center p-4 mt-auto">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-slate-400 mb-2">
          &copy; {new Date().getFullYear()} Aardwolf Consulting LLC. 
        </p>
        <p className="text-xs text-slate-500">
          <strong>DISCLAIMER:</strong> The information from this app is in no way affiliated with official TTB business. 
          This analysis is for informational purposes only and should not be considered as official TTB guidance or approval. 
          Always consult with TTB directly and qualified legal experts for official compliance matters.
        </p>
      </div>
    </footer>
  );
};
