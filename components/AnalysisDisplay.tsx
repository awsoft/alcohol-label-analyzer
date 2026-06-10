import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, Info, ShieldAlert, ShieldCheck, ShieldQuestion, ChevronDown, ChevronRight, Download, MinusCircle } from 'lucide-react';
import {
  AnalysisReport,
  AnalysisReportItem,
  AnalysisObservation,
  ItemComplianceStatus,
  ComplianceScore,
  calculateComplianceScore,
} from '../shared/analysisTypes';
import { generatePDFReport } from '../services/pdfService';

const STATUS_DISPLAY: Record<ItemComplianceStatus, {
  badge: string;
  badgeClass: string;
  iconClass: string;
  Icon: React.ElementType;
}> = {
  COMPLIANT: {
    badge: 'Compliant',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    iconClass: 'text-green-600 dark:text-green-400',
    Icon: CheckCircle,
  },
  NON_COMPLIANT: {
    badge: 'Non-Compliant',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    iconClass: 'text-red-600 dark:text-red-400',
    Icon: AlertTriangle,
  },
  POTENTIAL_ISSUE: {
    badge: 'Potential Issue',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    iconClass: 'text-orange-600 dark:text-orange-400',
    Icon: AlertTriangle,
  },
  NOT_REQUIRED: {
    badge: 'Not Required',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    iconClass: 'text-slate-500 dark:text-slate-400',
    Icon: MinusCircle,
  },
};

const FALLBACK_STATUS_DISPLAY = {
  badge: 'Unknown',
  badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  iconClass: 'text-slate-600 dark:text-slate-400',
  Icon: Info,
} as const;

const RenderReportItem: React.FC<{ item: AnalysisReportItem; index: number }> = ({ item, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const display = STATUS_DISPLAY[item.status] ?? FALLBACK_STATUS_DISPLAY;
  const { Icon } = display;

  return (
    <div className="mb-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 transition-all duration-300 hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 md:p-4 text-left transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2 md:space-x-3 flex-1 min-w-0">
            <Icon className={`h-4 w-4 md:h-5 md:w-5 flex-shrink-0 mt-0.5 ${display.iconClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm md:text-base leading-tight">
                  {index + 1}. {item.title}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 self-start sm:self-center ${display.badgeClass}`}>
                  {display.badge}
                </span>
              </div>
              <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                <div className="break-words">
                  {item.notes.length > 80 ? `${item.notes.substring(0, 80)}...` : item.notes}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center ml-2 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30">
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="space-y-1 md:space-y-2">
              <dt className="font-medium text-slate-700 dark:text-slate-300 text-xs md:text-sm">
                On the label:
              </dt>
              <dd className="text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed pl-2 md:pl-3 break-words">
                {item.finding}
              </dd>
            </div>
            <div className="space-y-1 md:space-y-2">
              <dt className="font-medium text-slate-700 dark:text-slate-300 text-xs md:text-sm">
                TTB Compliance Notes:
              </dt>
              <dd className="text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed bg-white dark:bg-slate-600/30 p-2 md:p-3 rounded-md border-l-4 border-sky-500 break-words">
                <span className="flex items-start">
                  <Icon className={`inline h-4 w-4 mr-2 mt-1 flex-shrink-0 ${display.iconClass}`} />
                  {item.notes}
                </span>
              </dd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RenderObservation: React.FC<{ observation: AnalysisObservation }> = ({ observation }) => (
  <div className="mb-4">
    <h5 className="text-base font-semibold text-sky-600 dark:text-sky-300 mb-1">{observation.title}:</h5>
    <ul className="ml-2 space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
      {observation.points.map((point, i) => (
        <li key={i} className="py-0.5 break-words">{point}</li>
      ))}
    </ul>
  </div>
);

const RenderOverviewBar: React.FC<{
  report: AnalysisReport;
  complianceScore: ComplianceScore;
}> = ({ report, complianceScore }) => {
  // Fall back to listing non-compliant items when the model returns no key issues
  let keyIssues = report.keyIssues;
  if (keyIssues.length === 0) {
    keyIssues = report.mandatoryItems
      .filter(item => item.status === 'NON_COMPLIANT')
      .map(item => `${item.title}: ${item.notes}`);
  }

  let bgColor = 'bg-sky-700';
  let textColor = 'text-sky-100';
  let IconComponent: React.ElementType = ShieldQuestion;
  let displayStatus = 'Status Unknown';

  switch (report.overallStatus) {
    case 'Compliant':
      bgColor = 'bg-green-700';
      textColor = 'text-green-100';
      IconComponent = ShieldCheck;
      displayStatus = 'Compliant';
      break;
    case 'Partially Compliant':
      bgColor = 'bg-yellow-600';
      textColor = 'text-yellow-100';
      IconComponent = ShieldAlert;
      displayStatus = 'Partially Compliant - Minor Issues';
      break;
    case 'Non-Compliant':
      bgColor = 'bg-red-700';
      textColor = 'text-red-100';
      IconComponent = AlertTriangle;
      displayStatus = 'Non-Compliant - Issues Found';
      break;
    case 'Unable to Determine':
      displayStatus = 'Unable to Determine';
      break;
  }

  return (
    <div className={`p-3 md:p-5 rounded-lg shadow-lg mb-6 md:mb-8 ${bgColor} ${textColor}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div className="flex items-center min-w-0">
          <IconComponent className="h-6 w-6 md:h-7 md:w-7 mr-2 md:mr-3 flex-shrink-0" />
          <h2 className="text-lg md:text-xl font-bold leading-tight">{displayStatus}</h2>
        </div>
        {complianceScore.total > 0 && (
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="text-xl md:text-2xl font-bold">
              {complianceScore.compliant}/{complianceScore.total}
            </div>
            <div className="text-xs md:text-sm opacity-90">
              {complianceScore.percentage}% Compliant
            </div>
          </div>
        )}
      </div>
      {keyIssues.length > 0 && (
        <div className="ml-8 md:ml-10 mt-2">
          <p className="text-xs md:text-sm font-semibold mb-1">Key Issues Identified:</p>
          <ul className="list-disc list-inside text-xs md:text-sm space-y-0.5 leading-relaxed">
            {keyIssues.map((issue, index) => (
              <li key={index} className="break-words">{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


interface AnalysisDisplayProps {
  report: AnalysisReport;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ report }) => {
  const complianceScore = useMemo(() => calculateComplianceScore(report), [report]);
  const observations = report.observations.filter(obs => obs.points.length > 0);

  return (
    <div className="bg-white dark:bg-slate-800 shadow-xl rounded-xl p-4 md:p-6 transition-colors duration-300">
      <RenderOverviewBar report={report} complianceScore={complianceScore} />

      {/* TTB Compliance Summary */}
      {report.summary && (
        <section className="mb-8 p-3 md:p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-xl md:text-2xl font-semibold text-sky-600 dark:text-sky-400 border-b-2 border-sky-300 dark:border-sky-600 pb-2 mb-4">
            Overall TTB Compliance Summary
          </h2>
          <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{report.summary}</p>
        </section>
      )}

      <div className="flex items-center mb-6 border-b border-slate-300 dark:border-slate-600 pb-3 mt-4">
        <FileText className="h-8 w-8 text-sky-600 dark:text-sky-400 mr-3 flex-shrink-0" />
        <h3 className="text-2xl md:text-3xl font-bold text-sky-600 dark:text-sky-400">Detailed Compliance Analysis</h3>
      </div>

      {/* TTB Mandatory Label Information */}
      {report.mandatoryItems.length > 0 && (
        <section className="mb-8 p-3 md:p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-xl md:text-2xl font-semibold text-sky-600 dark:text-sky-400 border-b-2 border-sky-300 dark:border-sky-600 pb-2 mb-4">
            TTB Mandatory Label Information
          </h2>
          {report.mandatoryItems.map((item, index) => (
            <RenderReportItem key={`${item.title}-${index}`} item={item} index={index} />
          ))}
        </section>
      )}

      {/* Other TTB Compliance Observations */}
      {observations.length > 0 && (
        <section className="mb-8 p-3 md:p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-xl md:text-2xl font-semibold text-sky-600 dark:text-sky-400 border-b-2 border-sky-300 dark:border-sky-600 pb-2 mb-4">
            Other TTB Compliance Observations
          </h2>
          {observations.map((observation, index) => (
            <RenderObservation key={`${observation.title}-${index}`} observation={observation} />
          ))}
        </section>
      )}

      {/* Download Report Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={async () => {
            try {
              await generatePDFReport(report, complianceScore);
            } catch (error) {
              console.error('Failed to generate PDF:', error);
              alert('Failed to generate PDF. Please try again.');
            }
          }}
          className="inline-flex items-center px-6 py-3 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Download className="h-5 w-5 mr-2" />
          Download Report (PDF)
        </button>
      </div>
    </div>
  );
};
