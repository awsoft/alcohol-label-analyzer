import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SettingsDropdown } from './SettingsDropdown';

interface HeaderProps {
  analysisStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  analysisStatus = "Ready"
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
    <header className={`sticky top-0 z-40 ${isDarkMode ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-lg border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {/* Aardwolf Logo */}
              <a href="https://aardwolfit.com" target="_blank" rel="noopener noreferrer">
                <img
                  src={isDarkMode ? '/assets/images/aardwolf-logo-dark.png' : '/assets/images/aardwolf-logo-light.png'}
                  alt="Aardwolf"
                  className="h-8 w-auto"
                />
              </a>
            </div>
            
            <div className={`border-l ${isDarkMode ? 'border-slate-600' : 'border-slate-300'} pl-3`}>
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Label Check
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} leading-tight`}>
                Alcohol Label Analyzer
              </p>
            </div>
          </div>

          {/* Theme Toggle and Settings */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="hover:scale-110 transition-transform"
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-500 hover:text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} hover:text-slate-800 dark:hover:text-slate-200`} fill="none" viewBox="0 0 24 24" stroke="#6B46C1">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <SettingsDropdown analysisStatus={analysisStatus} />
          </div>
        </div>
      </div>
    </header>
  );
};
