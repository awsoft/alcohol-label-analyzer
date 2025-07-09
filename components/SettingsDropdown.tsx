import React, { useState, useRef, useEffect } from 'react';
import { Settings, CheckCircle, XCircle } from 'lucide-react';
import { testApiConnection } from '../services/geminiService';
import { APP_VERSION } from '../constants';

interface SettingsDropdownProps {
  analysisStatus?: string;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  analysisStatus = "Ready"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error' | 'not-configured'>('not-configured');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage on mount and test connection
  useEffect(() => {
    const savedApiKey = localStorage.getItem('alcohol-label-analyzer-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      testConnection();
    } else {
      // Check if environment variable is available
      testConnection();
    }
  }, []);

  const testConnection = async () => {
    setApiStatus('checking');
    try {
      const isConnected = await testApiConnection();
      setApiStatus(isConnected ? 'connected' : 'error');
    } catch (error) {
      setApiStatus('error');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowApiKeyInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('alcohol-label-analyzer-api-key', apiKey.trim());
      setShowApiKeyInput(false);
      await testConnection();
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('alcohol-label-analyzer-api-key');
    setShowApiKeyInput(false);
    setApiStatus('not-configured');
  };

  const hasApiKey = apiKey.trim().length > 0;
  
  const getStatusDisplay = () => {
    switch (apiStatus) {
      case 'checking':
        return { icon: 'checking', text: 'Checking...', color: 'text-yellow-500' };
      case 'connected':
        return { icon: 'success', text: 'Connected', color: 'text-green-500' };
      case 'error':
        return { icon: 'error', text: 'Connection failed', color: 'text-red-500' };
      case 'not-configured':
      default:
        return { icon: 'error', text: 'Not configured', color: 'text-red-500' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hover:scale-110 transition-transform flex items-center justify-center"
        aria-label="Settings"
      >
        <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Settings</h3>
          </div>
          
          <div className="p-4 space-y-4">
            {/* API Key Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gemini API Key
                </label>
                <div className="flex items-center space-x-2">
                  {apiStatus === 'checking' ? (
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : statusDisplay.icon === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs ${statusDisplay.color}`}>
                    {statusDisplay.text}
                  </span>
                </div>
              </div>
              
              {!showApiKeyInput ? (
               <div className="space-y-2">
                 <div className="flex space-x-2">
                   <button
                     onClick={() => setShowApiKeyInput(true)}
                     className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                   >
                     {hasApiKey ? 'Update API Key' : 'Add API Key'}
                   </button>
                   {hasApiKey && (
                     <button
                       onClick={clearApiKey}
                       className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                     >
                       Remove
                     </button>
                   )}
                 </div>
                 <button
                   onClick={testConnection}
                   disabled={apiStatus === 'checking'}
                   className="w-full px-3 py-2 text-sm bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {apiStatus === 'checking' ? 'Testing...' : 'Test Connection'}
                 </button>
               </div>
              ) : (
                <form onSubmit={handleApiKeySubmit} className="space-y-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyInput(false)}
                      className="px-3 py-2 text-sm bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                API key is stored locally in your browser and never sent to our servers.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                v{APP_VERSION}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};