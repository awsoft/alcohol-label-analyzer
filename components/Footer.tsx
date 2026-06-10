import { Mail, Linkedin } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const Footer: React.FC = () => {
  const { theme } = useTheme();

  return (
    <footer className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white py-4">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:opacity-80 transition-opacity duration-200"
              aria-label="Go to top"
            >
              <img
                src="/favicon.png"
                alt="Aardwolf"
                className="h-6 md:hidden"
              />
              <img
                src={theme === 'dark' ? "/assets/images/aardwolf-logo-dark.png" : "/assets/images/aardwolf-logo-light.png"}
                alt="Aardwolf"
                className="h-6 hidden md:block"
              />
            </button>
            <a href="mailto:info@aardwolfit.com" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Mail size={16} className="mr-2" />
              <span>info@aardwolfit.com</span>
            </a>
            <a href="https://www.linkedin.com/company/aardwolf-consulting-llc/" target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Linkedin size={16} className="mr-2" />
              <span>LinkedIn</span>
            </a>
          </div>
          <div className="text-center text-gray-600 dark:text-gray-300">
            <p>&copy; {new Date().getFullYear()} by Aardwolf Consulting LLC. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
