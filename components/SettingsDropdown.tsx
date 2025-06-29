import React, { useState, useRef, useEffect } from 'react';
import { Settings, CheckCircle, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { GEMINI_MODEL_NAME, getApiKeyStatus } from '../services/geminiService';
import { APP_VERSION } from '../constants';

interface SettingsDropdownProps {
  analysisStatus?: string;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ 
  analysisStatus = "Ready"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get real API status
  const apiStatusInfo = getApiKeyStatus();
  const apiStatus = apiStatusInfo.status;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getStatusColor = (status: string) => {
    if (status.includes('configured') || status.includes('Ready') || status.includes('completed')) {
      return 'text-green-600 dark:text-green-400';
    } else if (status.includes('not configured') || status.includes('Error')) {
      return 'text-red-600 dark:text-red-400';
    } else {
      return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('configured') || status.includes('Ready') || status.includes('completed')) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (status.includes('not configured') || status.includes('Error')) {
      return <AlertCircle className="w-4 h-4" />;
    } else {
      return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="App Settings"
      >
        <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">App Status</h3>
            
            {/* API Status */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className={`mr-2 ${getStatusColor(apiStatus)}`}>
                  {getStatusIcon(apiStatus)}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">API Status</span>
              </div>
              <p className={`text-xs ${getStatusColor(apiStatus)} pl-6`}>
                {apiStatus}
              </p>
            </div>

            {/* Analysis Status */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className={`mr-2 ${getStatusColor(analysisStatus)}`}>
                  {getStatusIcon(analysisStatus)}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Analysis Engine</span>
              </div>
              <p className={`text-xs ${getStatusColor(analysisStatus)} pl-6`}>
                {analysisStatus}
              </p>
            </div>

            {/* Model Information */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className="mr-2 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">AI Model</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 pl-6">
                {GEMINI_MODEL_NAME}
              </p>
            </div>

            {/* Features */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className="mr-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Features</span>
              </div>
              <div className="pl-6 space-y-1">
                <p className="text-xs text-green-600 dark:text-green-400">✓ Multi-Image Label Analysis</p>
                <p className="text-xs text-green-600 dark:text-green-400">✓ Beverage Category Compliance</p>
                <p className="text-xs text-green-600 dark:text-green-400">✓ Cross-Label Information Detection</p>
                <p className="text-xs text-green-600 dark:text-green-400">✓ Professional PDF Reports</p>
                <p className="text-xs text-green-600 dark:text-green-400">✓ Real-Time TTB Compliance</p>
              </div>
            </div>

            {/* Version */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Label Analyzer v{APP_VERSION}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">© Aardwolf</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 