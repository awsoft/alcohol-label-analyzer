
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Settings, Sun, Moon } from 'lucide-react'; // Using lucide-react for icons

export const Header: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
    
    setShowSettings(false);
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
          
          {/* Theme Toggle Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isDarkMode 
                  ? 'hover:bg-slate-700 text-yellow-400 hover:text-yellow-300' 
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
              }`}
              title="Theme Settings"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            
            {/* Settings Dropdown */}
            {showSettings && (
              <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-slate-200'
              } z-50`}>
                <div className="p-2">
                  <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? 'hover:bg-slate-700 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isDarkMode ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span className="text-sm">
                      Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Click outside to close settings */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSettings(false)}
        />
      )}
    </header>
  );
};
