
import React from 'react';
import { ShieldCheck } from 'lucide-react'; // Using lucide-react for icons

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="h-10 w-10 text-sky-500" />
          <h1 className="text-2xl font-bold text-sky-400">
            Alcohol Label Analyzer
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-400">Powered by</span>
          <img 
            src="/assets/images/aardwolf-logo-light.png" 
            alt="Aardwolf" 
            className="h-8 w-auto"
          />
        </div>
      </div>
    </header>
  );
};
