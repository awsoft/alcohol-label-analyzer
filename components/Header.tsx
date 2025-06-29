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
          
          {/* Theme Toggle Button */}
          <button
            onClick={(e) => {
              toggleTheme();
              e.currentTarget.blur();
            }}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-95"
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? (
              // Sun icon for dark mode (switch to light)
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-700 dark:text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              // Moon icon for light mode (switch to dark)
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-700 dark:text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {/* Settings Dropdown */}
          <SettingsDropdown 
            analysisStatus={analysisStatus}
          />
        </div>
      </div>
    </header>
  );
};
