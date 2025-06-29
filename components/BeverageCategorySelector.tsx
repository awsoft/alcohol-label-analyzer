import React from 'react';
import { Wine, Beer, Martini } from 'lucide-react';
import { BeverageCategory, BEVERAGE_CATEGORIES } from '../types';

interface BeverageCategorySelectorProps {
  selectedCategory: BeverageCategory;
  onCategoryChange: (category: BeverageCategory) => void;
  disabled?: boolean;
}

export const BeverageCategorySelector: React.FC<BeverageCategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  disabled = false
}) => {
  const getCategoryIcon = (categoryId: BeverageCategory) => {
    switch (categoryId) {
      case 'distilled-spirits':
        return <Martini className="h-6 w-6" />;
      case 'wine':
        return <Wine className="h-6 w-6" />;
      case 'malt-beverages':
        return <Beer className="h-6 w-6" />;
      default:
        return <Wine className="h-6 w-6" />;
    }
  };

  return (
    <div className="mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Beverage Category</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Select the type of alcoholic beverage to ensure accurate TTB compliance analysis
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BEVERAGE_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            disabled={disabled}
            className={`
              rounded-lg border-2 transition-all duration-200 text-left h-full flex flex-col overflow-hidden
              ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'}
              ${selectedCategory === category.id
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-600'
              }
            `}
          >
            {/* Header area with icon and title */}
            <div className={`
              px-4 py-3 border-b h-20 flex items-center w-full
              ${selectedCategory === category.id
                ? 'bg-sky-100 dark:bg-sky-800/30 border-sky-200 dark:border-sky-700'
                : 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
              }
            `}>
              <div className={`mr-3 flex-shrink-0 ${selectedCategory === category.id ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {getCategoryIcon(category.id)}
              </div>
              <h4 className={`font-bold text-lg leading-tight flex-1 ${selectedCategory === category.id ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}`}>
                {category.name}
              </h4>
            </div>
            
            {/* Content area */}
            <div className="p-4 flex flex-col flex-grow">
              {/* Description */}
              <p className={`text-sm mb-4 ${selectedCategory === category.id ? 'text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {category.description}
              </p>
              
              {/* Examples */}
              <div className="mt-auto">
                <p className={`text-xs font-medium mb-2 ${selectedCategory === category.id ? 'text-sky-500 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  Common Types:
                </p>
                <div className="space-y-1">
                  {category.examples.map((example, index) => (
                    <div
                      key={index}
                      className={`
                        flex items-center text-xs py-1 px-2 rounded
                        ${selectedCategory === category.id
                          ? 'bg-sky-100/50 dark:bg-sky-800/30 text-sky-700 dark:text-sky-300'
                          : 'bg-slate-100/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                        }
                      `}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0 ${
                        selectedCategory === category.id
                          ? 'bg-sky-500 dark:bg-sky-400'
                          : 'bg-slate-400 dark:bg-slate-500'
                      }`}></div>
                      <span className="truncate">{example}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}; 