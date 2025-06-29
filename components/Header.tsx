import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SettingsDropdown } from './SettingsDropdown';

interface HeaderProps {
  analysisStatus?: string;
  apiStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  analysisStatus = "Ready",
  apiStatus = "Gemini API configured"
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for saved theme preference or default to light mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      document.body.className = 'bg-slate-900 text-slate-100';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      document.body.className = 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <header className={`${isDarkMode ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-md shadow-lg p-3 md:p-4 sticky top-0 z-50 transition-colors duration-300`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          <ShieldCheck className={`h-8 w-8 md:h-10 md:w-10 flex-shrink-0 ${isDarkMode ? 'text-sky-500' : 'text-sky-600'}`} />
          <h1 className={`text-lg md:text-2xl font-bold ${isDarkMode ? 'text-sky-400' : 'text-sky-700'} leading-tight`}>
            <span className="line-clamp-2">Alcohol Label Analyzer</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          <a 
            href="https://AardwolfIT.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity duration-200"
          >
            <img 
              src={isDarkMode ? "/assets/images/aardwolf-logo-dark.png" : "/assets/images/aardwolf-logo-light.png"}
              alt="Aardwolf" 
              className="h-6 w-auto md:h-8"
            />
          </a>
          
          {/* Theme Toggle Switch */}
          <div className="flex items-center space-x-2">
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {isDarkMode ? '☀️' : '🌙'}
            </span>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isDarkMode 
                  ? 'bg-sky-600' 
                  : 'bg-slate-200'
              }`}
              aria-label={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Settings Dropdown */}
          <SettingsDropdown 
            analysisStatus={analysisStatus}
            apiStatus={apiStatus}
          />
        </div>
      </div>
    </header>
  );
};
