import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, MapPin } from 'lucide-react';
import { ImageProcessingService, ChangeHighlight } from '../services/imageProcessingService';

interface ComparisonResultsProps {
  result: string;
  currentImageUrl: string;
  proposedImageUrl: string;
}

interface ParsedResult {
  submissionRequired: string;
  riskLevel: string;
  reasoning: string;
  criticalChanges: ChangeAnalysis[];
  minorChanges: ChangeAnalysis[];
  cosmeticChanges: ChangeAnalysis[];
  recommendations: string[];
  summary: {
    total: number;
    critical: number;
    minor: number;
    cosmetic: number;
  };
  finalDetermination: string;
}

interface ChangeAnalysis {
  category: string;
  currentVersion: string;
  proposedVersion: string;
  location: ChangeHighlight | null;
  impact: string;
  description?: string;
}

export const ComparisonResults: React.FC<ComparisonResultsProps> = ({
  result,
  currentImageUrl,
  proposedImageUrl
}) => {
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [highlightedImage, setHighlightedImage] = useState<string | null>(null);
  const [allChanges, setAllChanges] = useState<ChangeHighlight[]>([]);

  useEffect(() => {
    const parseResults = () => {
      try {
        // Parse the AI response
        const parsed = parseAIResponse(result);
        setParsedResult(parsed);

        // Extract all change locations
        const changes = ImageProcessingService.parseChangeLocations(result);
        setAllChanges(changes);

        // Create highlighted comparison image
        if (changes.length > 0) {
          ImageProcessingService.createComparisonImage(
            currentImageUrl,
            proposedImageUrl,
            changes
          ).then(setHighlightedImage).catch(console.error);
        }
      } catch (error) {
        console.error('Failed to parse results:', error);
      }
    };

    parseResults();
  }, [result, currentImageUrl, proposedImageUrl]);

  const parseAIResponse = (response: string): ParsedResult => {
    const lines = response.split('\n');
    
    // Extract submission determination
    const submissionMatch = response.match(/\*\*SUBMISSION REQUIRED:\*\*\s*(.+)/);
    const riskMatch = response.match(/\*\*Risk Level:\*\*\s*(.+)/);
    const reasoningMatch = response.match(/\*\*Primary Reasoning:\*\*\s*(.+)/);
    
    // Extract summary
    const totalMatch = response.match(/Total Changes Detected:\s*(\d+)/);
    const criticalMatch = response.match(/Critical Changes:\s*(\d+)/);
    const minorMatch = response.match(/Minor Changes:\s*(\d+)/);
    const cosmeticMatch = response.match(/Cosmetic Changes:\s*(\d+)/);
    
    // Extract final determination
    const finalMatch = response.match(/\*\*FINAL DETERMINATION:\*\*\s*(.+)/);
    
    // Extract recommendations
    const recSection = response.match(/\*\*RECOMMENDATIONS:\*\*(.*?)(?=\*\*SUMMARY:\*\*)/s);
    const recommendations = recSection ? 
      recSection[1].split('\n').filter(line => line.trim().startsWith('*')).map(line => line.replace(/^\*\s*/, '').trim()) : 
      [];

    return {
      submissionRequired: submissionMatch?.[1]?.trim() || 'Unknown',
      riskLevel: riskMatch?.[1]?.trim() || 'Unknown',
      reasoning: reasoningMatch?.[1]?.trim() || 'No reasoning provided',
      criticalChanges: parseChanges(response, 'CRITICAL CHANGES'),
      minorChanges: parseChanges(response, 'MINOR CHANGES'),
      cosmeticChanges: parseChanges(response, 'COSMETIC CHANGES'),
      recommendations,
      summary: {
        total: parseInt(totalMatch?.[1] || '0'),
        critical: parseInt(criticalMatch?.[1] || '0'),
        minor: parseInt(minorMatch?.[1] || '0'),
        cosmetic: parseInt(cosmeticMatch?.[1] || '0')
      },
      finalDetermination: finalMatch?.[1]?.trim() || 'No determination provided'
    };
  };

  const parseChanges = (response: string, sectionType: string): ChangeAnalysis[] => {
    const changes: ChangeAnalysis[] = [];
    const sectionRegex = new RegExp(`\\*\\*${sectionType}.*?\\*\\*:(.*?)(?=\\*\\*[A-Z]|$)`, 's');
    const sectionMatch = response.match(sectionRegex);
    
    if (sectionMatch) {
      const content = sectionMatch[1];
      const locationPattern = /\[x:(\d+),\s*y:(\d+),\s*w:(\d+),\s*h:(\d+),\s*desc:"([^"]+)"\]/g;
      let match;
      
      while ((match = locationPattern.exec(content)) !== null) {
        changes.push({
          category: match[5] || 'Unknown',
          currentVersion: 'Extracted from AI response',
          proposedVersion: 'Extracted from AI response',
          location: {
            x: parseInt(match[1]),
            y: parseInt(match[2]),
            width: parseInt(match[3]),
            height: parseInt(match[4]),
            description: match[5]
          },
          impact: 'Extracted from AI response'
        });
      }
    }
    
    return changes;
  };

  const getStatusColor = (submissionRequired: string) => {
    const lower = submissionRequired.toLowerCase();
    if (lower.includes('yes') || lower.includes('required')) {
      return 'text-red-600 dark:text-red-400';
    } else if (lower.includes('no') || lower.includes('not required')) {
      return 'text-green-600 dark:text-green-400';
    } else if (lower.includes('recommended')) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-slate-600 dark:text-slate-400';
  };

  const getStatusIcon = (submissionRequired: string) => {
    const lower = submissionRequired.toLowerCase();
    if (lower.includes('yes') || lower.includes('required')) {
      return <AlertTriangle className="h-5 w-5" />;
    } else if (lower.includes('no') || lower.includes('not required')) {
      return <CheckCircle className="h-5 w-5" />;
    } else if (lower.includes('recommended')) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    const lower = riskLevel.toLowerCase();
    if (lower.includes('high')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (lower.includes('medium')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (lower.includes('low')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
  };

  if (!parsedResult) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`mr-3 ${getStatusColor(parsedResult.submissionRequired)}`}>
                {getStatusIcon(parsedResult.submissionRequired)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  TTB Submission Analysis
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {parsedResult.reasoning}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskBadgeColor(parsedResult.riskLevel)}`}>
                {parsedResult.riskLevel} Risk
              </div>
              <div className={`mt-2 text-lg font-semibold ${getStatusColor(parsedResult.submissionRequired)}`}>
                {parsedResult.submissionRequired}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-6 bg-slate-50 dark:bg-slate-700/50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{parsedResult.summary.total}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Changes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{parsedResult.summary.critical}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{parsedResult.summary.minor}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Minor</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{parsedResult.summary.cosmetic}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Cosmetic</div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlighted Comparison Image */}
      {highlightedImage && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-600">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Visual Change Detection
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Changes are highlighted with red boxes for easy identification
            </p>
          </div>
          <div className="p-6">
            <img
              src={highlightedImage}
              alt="Comparison with highlighted changes"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Change Details */}
      {(parsedResult.criticalChanges.length > 0 || parsedResult.minorChanges.length > 0 || parsedResult.cosmeticChanges.length > 0) && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-600">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Detailed Change Analysis
            </h4>
          </div>
          <div className="p-6 space-y-6">
            {parsedResult.criticalChanges.length > 0 && (
              <div>
                <h5 className="text-red-600 dark:text-red-400 font-semibold mb-3">Critical Changes (Require TTB Submission)</h5>
                {parsedResult.criticalChanges.map((change, index) => (
                  <div key={index} className="border-l-4 border-red-500 pl-4 mb-3">
                    <div className="flex items-center mb-1">
                      <MapPin className="h-4 w-4 text-red-500 mr-2" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{change.location?.description}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{change.impact}</p>
                  </div>
                ))}
              </div>
            )}

            {parsedResult.minorChanges.length > 0 && (
              <div>
                <h5 className="text-yellow-600 dark:text-yellow-400 font-semibold mb-3">Minor Changes (May Require TTB Submission)</h5>
                {parsedResult.minorChanges.map((change, index) => (
                  <div key={index} className="border-l-4 border-yellow-500 pl-4 mb-3">
                    <div className="flex items-center mb-1">
                      <MapPin className="h-4 w-4 text-yellow-500 mr-2" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{change.location?.description}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{change.impact}</p>
                  </div>
                ))}
              </div>
            )}

            {parsedResult.cosmeticChanges.length > 0 && (
              <div>
                <h5 className="text-green-600 dark:text-green-400 font-semibold mb-3">Cosmetic Changes (No TTB Submission Required)</h5>
                {parsedResult.cosmeticChanges.map((change, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4 mb-3">
                    <div className="flex items-center mb-1">
                      <MapPin className="h-4 w-4 text-green-500 mr-2" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{change.location?.description}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{change.impact}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {parsedResult.recommendations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-600">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Recommendations
            </h4>
          </div>
          <div className="p-6">
            <ul className="space-y-2">
              {parsedResult.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-sky-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Final Determination */}
      <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
          Final Determination
        </h4>
        <p className="text-slate-700 dark:text-slate-300 text-lg">
          {parsedResult.finalDetermination}
        </p>
      </div>
    </div>
  );
}; 