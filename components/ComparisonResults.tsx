import React from 'react';
import { AlertTriangle, CheckCircle, FileText, HelpCircle, MapPin } from 'lucide-react';
import { ComparisonReport, ComparisonChange, SubmissionRequirement } from '../shared/analysisTypes';

interface ComparisonResultsProps {
  report: ComparisonReport;
}

const SUBMISSION_DISPLAY: Record<SubmissionRequirement, { label: string; color: string; Icon: React.ElementType }> = {
  'required': { label: 'Submission Required', color: 'text-red-600 dark:text-red-400', Icon: AlertTriangle },
  'recommended': { label: 'Submission Recommended', color: 'text-yellow-600 dark:text-yellow-400', Icon: AlertTriangle },
  'not-required': { label: 'No Submission Required', color: 'text-green-600 dark:text-green-400', Icon: CheckCircle },
  'uncertain': { label: 'Uncertain — Verify with TTB', color: 'text-slate-600 dark:text-slate-400', Icon: HelpCircle },
};

const RISK_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const ChangeGroup: React.FC<{
  title: string;
  changes: ComparisonChange[];
  headingColor: string;
  borderColor: string;
  iconColor: string;
}> = ({ title, changes, headingColor, borderColor, iconColor }) => {
  if (changes.length === 0) return null;
  return (
    <div>
      <h5 className={`${headingColor} font-semibold mb-3`}>{title}</h5>
      {changes.map((change, index) => (
        <div key={index} className={`border-l-4 ${borderColor} pl-4 mb-4`}>
          <div className="flex items-center mb-1">
            <MapPin className={`h-4 w-4 ${iconColor} mr-2 flex-shrink-0`} />
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {change.category}
              {change.location && <span className="font-normal text-slate-500 dark:text-slate-400"> — {change.location}</span>}
            </span>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-1">
            <div><span className="font-medium text-slate-500 dark:text-slate-400">Current:</span> {change.currentValue}</div>
            <div><span className="font-medium text-slate-500 dark:text-slate-400">Proposed:</span> {change.proposedValue}</div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{change.impact}</p>
        </div>
      ))}
    </div>
  );
};

export const ComparisonResults: React.FC<ComparisonResultsProps> = ({ report }) => {
  const criticalChanges = report.changes.filter(c => c.significance === 'critical');
  const minorChanges = report.changes.filter(c => c.significance === 'minor');
  const cosmeticChanges = report.changes.filter(c => c.significance === 'cosmetic');

  const submission = SUBMISSION_DISPLAY[report.submissionRequired] ?? SUBMISSION_DISPLAY['uncertain'];
  const riskBadge = RISK_BADGE[report.riskLevel] ?? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
  const noChanges = report.identical || report.changes.length === 0;

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`mr-3 ${submission.color}`}>
                <submission.Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  TTB Submission Analysis
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {report.reasoning}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${riskBadge}`}>
                {report.riskLevel} Risk
              </div>
              <div className={`mt-2 text-lg font-semibold ${submission.color}`}>
                {submission.label}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-6 bg-slate-50 dark:bg-slate-700/50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{report.changes.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Changes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalChanges.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{minorChanges.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Minor</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{cosmeticChanges.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Cosmetic</div>
            </div>
          </div>
        </div>
      </div>

      {/* No differences found */}
      {noChanges && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-6 flex items-start space-x-3">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-green-800 dark:text-green-300">No Differences Detected</h4>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              The AI could not verify any differences between the two label versions. If you expected changes,
              make sure both uploads are correct and legible, then run the comparison again.
            </p>
          </div>
        </div>
      )}

      {/* Change Details */}
      {!noChanges && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-600">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Detailed Change Analysis
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Locations are the AI's description of where each change appears — always verify against the actual labels.
            </p>
          </div>
          <div className="p-6 space-y-6">
            <ChangeGroup
              title="Critical Changes (Require TTB Submission)"
              changes={criticalChanges}
              headingColor="text-red-600 dark:text-red-400"
              borderColor="border-red-500"
              iconColor="text-red-500"
            />
            <ChangeGroup
              title="Minor Changes (May Require TTB Submission)"
              changes={minorChanges}
              headingColor="text-yellow-600 dark:text-yellow-400"
              borderColor="border-yellow-500"
              iconColor="text-yellow-500"
            />
            <ChangeGroup
              title="Cosmetic Changes (No TTB Submission Required)"
              changes={cosmeticChanges}
              headingColor="text-green-600 dark:text-green-400"
              borderColor="border-green-500"
              iconColor="text-green-500"
            />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-600">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Recommendations
            </h4>
          </div>
          <div className="p-6">
            <ul className="space-y-2">
              {report.recommendations.map((rec, index) => (
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
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-sky-600 dark:text-sky-400" />
          Final Determination
        </h4>
        <p className="text-slate-700 dark:text-slate-300 text-lg">
          {report.finalDetermination}
        </p>
      </div>
    </div>
  );
};
