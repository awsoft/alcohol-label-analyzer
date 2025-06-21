import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, Info, ShieldAlert, ShieldCheck, ShieldQuestion, ChevronDown, ChevronRight } from 'lucide-react';
import { 
    ReportSectionData, 
    ReportItem, 
    ReportDetail, 
    ObservationSubSection, 
    KNOWN_SECTION_KEYS, 
    SectionKey,
    ReportOverviewData,
    ParsedAnalysis,
    ComplianceStatus,
    ProductRequirements
} from '../types';

// Constants for parsing
const SECTION_TITLE_MAP: Record<string, SectionKey> = {
  "Compliance Status Overview": KNOWN_SECTION_KEYS.OVERVIEW,
  "TTB Mandatory Label Information": KNOWN_SECTION_KEYS.MANDATORY,
  "Other TTB Compliance Observations": KNOWN_SECTION_KEYS.OBSERVATIONS,
  "Overall TTB Compliance Summary": KNOWN_SECTION_KEYS.SUMMARY
};



const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

function normalizeForComparison(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\u00A0/g, ' ') 
    .replace(/[^\w\s]/gi, '') 
    .replace(/\s+/g, ' ') 
    .trim();
}

// Main parsing function
function parseAnalysisResult(resultText: string): ParsedAnalysis {
  const parsed: ParsedAnalysis = {
    overview: null,
    sections: []
  };

  if (!resultText || resultText.trim() === "") {
    console.warn("parseAnalysisResult received empty or whitespace-only input.");
    return parsed;
  }
  
  const normalizedResultText = resultText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedResultText.split('\n');

  let currentSection: ReportSectionData | null = null;
  let currentItem: ReportItem | null = null;
  let currentObservationSubSection: ObservationSubSection | null = null;
  let accumulatingContentForObservation = false;
  let isParsingOverviewKeyIssues = false;

  const sectionMarkerRegex = /^\s*\*\*(.+)\*\*\s*$/; 

  for (const line of lines) {
    const trimmedLine = line.trim();

    let identifiedSectionKey: SectionKey | null = null;
    let identifiedCanonicalTitle: string | null = null;

    const potentialSectionMatch = trimmedLine.match(sectionMarkerRegex);

    if (potentialSectionMatch) {
      const textInsideBold = potentialSectionMatch[1]; 
      if (textInsideBold.endsWith(':')) {
        const titleCandidate = textInsideBold.slice(0, -1).trim(); 
        const normalizedTitleCandidate = normalizeForComparison(titleCandidate);

        for (const [canonicalKeyString, sectionKeyVal] of Object.entries(SECTION_TITLE_MAP)) {
          const normalizedCanonicalKey = normalizeForComparison(canonicalKeyString);
          if (normalizedTitleCandidate === normalizedCanonicalKey) {
            identifiedSectionKey = sectionKeyVal;
            identifiedCanonicalTitle = canonicalKeyString; 
            // console.log(`[Parser Debug] Matched section: "${identifiedCanonicalTitle}" (Key: ${identifiedSectionKey})`);
            break;
          }
        }
        if (!identifiedSectionKey && titleCandidate) {
             // console.warn(`[Parser Debug] Title candidate "${titleCandidate}" (normalized: "${normalizedTitleCandidate}") did not match known section titles.`);
        }
      }
    }

    if (identifiedSectionKey && identifiedCanonicalTitle) {
      isParsingOverviewKeyIssues = false; // Reset for new section
      if (identifiedSectionKey === KNOWN_SECTION_KEYS.OVERVIEW) {
        parsed.overview = { status: 'Unknown', statusText: '', keyIssues: [] };
        currentSection = null; 
      } else {
        currentSection = {
          id: slugify(identifiedCanonicalTitle),
          title: identifiedCanonicalTitle,
          key: identifiedSectionKey,
          items: identifiedSectionKey === KNOWN_SECTION_KEYS.MANDATORY ? [] : undefined,
          observationSubSections: identifiedSectionKey === KNOWN_SECTION_KEYS.OBSERVATIONS ? [] : undefined,
          freeTextContent: identifiedSectionKey === KNOWN_SECTION_KEYS.SUMMARY ? [] : undefined,
        };
        parsed.sections.push(currentSection);
      }
      currentItem = null;
      currentObservationSubSection = null;
      accumulatingContentForObservation = false;
      continue; 
    }

    // --- Parsing for Overview Section ---
    if (parsed.overview && !currentSection) { 
        const overviewStatusMatch = trimmedLine.match(/^\s*\*\s+Overall Compliance Status:\s*(.*)/i);
        if (overviewStatusMatch) {
            const statusText = overviewStatusMatch[1].trim();
            parsed.overview.statusText = statusText;
            const lowerStatus = statusText.toLowerCase();
            if (lowerStatus.includes("non-compliant")) parsed.overview.status = 'Non-Compliant';
            else if (lowerStatus.includes("partially compliant")) parsed.overview.status = 'Partially Compliant';
            else if (lowerStatus.includes("compliant")) parsed.overview.status = 'Compliant';
            else parsed.overview.status = 'Unknown';
            isParsingOverviewKeyIssues = false; 
            continue;
        }

        const overviewKeyIssuesTitleMatch = trimmedLine.match(/^\s*\*\s+Key Issues \(if any, max 2-3 brief bullet points\):\s*(.*)/i);
         const overviewKeyIssuesTitleMatchAlt = trimmedLine.match(/^\s*\*\s+Key Issues:\s*(.*)/i);


        if (overviewKeyIssuesTitleMatch || overviewKeyIssuesTitleMatchAlt) {
            isParsingOverviewKeyIssues = true;
            const firstIssueText = (overviewKeyIssuesTitleMatch ? overviewKeyIssuesTitleMatch[1] : (overviewKeyIssuesTitleMatchAlt ? overviewKeyIssuesTitleMatchAlt[1] : "")).trim();
            if (firstIssueText && !firstIssueText.toLowerCase().includes("no critical issues identified")) {
                 parsed.overview.keyIssues.push(firstIssueText.replace(/^\s*[-\*\u2022]\s*/, ''));
            }
            continue;
        }


        if (isParsingOverviewKeyIssues && trimmedLine) {
            const issueText = trimmedLine.replace(/^\s*[-\*\u2022]\s*/, '');
             if (issueText && !issueText.toLowerCase().includes("no critical issues identified")) {
                parsed.overview.keyIssues.push(issueText);
            }
        }
        continue; 
    }


    if (!currentSection) continue;

    // --- Parsing logic for content within other sections ---
    if (currentSection.key === KNOWN_SECTION_KEYS.MANDATORY && currentSection.items) {
      const itemLineRegex = /^(\d+\.\s+)(.*)$/; // Capture numeric prefix and the rest of the line.
      const itemLineMatch = trimmedLine.match(itemLineRegex);

      if (itemLineMatch) {
        // const prefix = itemLineMatch[1]; // e.g., "1.  "
        let contentAfterPrefix = itemLineMatch[2].trim(); // e.g., "**Brand Name**Brand Name:" or "**Brand Name**:"

        if (contentAfterPrefix.endsWith(':')) {
          contentAfterPrefix = contentAfterPrefix.slice(0, -1).trim(); // Remove trailing colon
        }
        // Now contentAfterPrefix is e.g., "**Brand Name**Brand Name" or "**Brand Name**"

        let cleanTitle = contentAfterPrefix;
        const parts = contentAfterPrefix.split('**');
        
        if (parts.length > 1) { // Contains '**'
            // Find the first non-empty part, this is usually the intended title.
            // e.g., "**A**B" -> ["", "A", "B"] -> "A"
            // e.g., "**A**" -> ["", "A", ""] -> "A"
            // e.g., "A**B" -> ["A", "B"] -> "A"
            cleanTitle = (parts.find(part => part.trim() !== "") || parts[0] || contentAfterPrefix).trim();
        } else { // No '**'
            cleanTitle = parts[0].trim();
        }
        
        currentItem = {
          id: slugify(cleanTitle),
          title: cleanTitle, // Store the cleaned title
          fullItemTitle: trimmedLine, // Store the original line
          details: [],
        };
        currentSection.items.push(currentItem);
        accumulatingContentForObservation = false;
        continue;
      }

      if (currentItem) {
        const detailMatch = trimmedLine.match(/^\s*\*\s+(.+?):\s*(.*)$/);
        if (detailMatch) {
          const label = detailMatch[1].trim();
          const value = detailMatch[2].trim();
          currentItem.details.push({
            label,
            value,
            isComplianceNote: label.toLowerCase().includes("ttb compliance notes"),
          });
        } else if (trimmedLine && currentItem.details.length > 0) {
          const lastDetail = currentItem.details[currentItem.details.length - 1];
          lastDetail.value += `\n${trimmedLine}`;
        }
      }
    } else if (currentSection.key === KNOWN_SECTION_KEYS.OBSERVATIONS && currentSection.observationSubSections) {
      const obsSubHeadingMatch = trimmedLine.match(/^\s*\*\s+\*\*(.+)\*\*(.*)$/); 
      if (obsSubHeadingMatch) {
        const textInsideBold = obsSubHeadingMatch[1]; 
        const firstLineContent = obsSubHeadingMatch[2].trim();
        const title = textInsideBold.endsWith(':') ? textInsideBold.slice(0, -1).trim() : textInsideBold.trim();

        currentObservationSubSection = {
          title: title,
          points: []
        };
        if (firstLineContent) {
          currentObservationSubSection.points.push(firstLineContent);
        }
        currentSection.observationSubSections.push(currentObservationSubSection);
        accumulatingContentForObservation = true; 
        continue;
      }

      if (currentObservationSubSection && accumulatingContentForObservation) {
        if (trimmedLine) {
          const textToAdd = trimmedLine.replace(/^\s*[-\*\u2022]\s*/, ''); 
          if (currentObservationSubSection.points.length === 0 || trimmedLine.match(/^\s*[-\*\u2022]\s/)) {
            currentObservationSubSection.points.push(textToAdd);
          } else if (currentObservationSubSection.points.length > 0 && textToAdd !== "") { 
             const lastPointIndex = currentObservationSubSection.points.length - 1;
             currentObservationSubSection.points[lastPointIndex] += `\n${textToAdd}`;
          }
        }
      }
    } else if (currentSection.key === KNOWN_SECTION_KEYS.SUMMARY && currentSection.freeTextContent) {
      if (trimmedLine) {
        currentSection.freeTextContent.push(trimmedLine);
      }
      accumulatingContentForObservation = false; 
    }
  }
  return parsed;
}

const getValueWithComplianceIcon = (value: string): JSX.Element => {
  const cleanValue = cleanMarkdownText(value);
  const lowerValue = cleanValue.toLowerCase();
  let icon = null;

  if (lowerValue.includes("compliant") || lowerValue.includes("appears correct") || lowerValue.includes("present and correct") || lowerValue.includes("verified")) {
    icon = <CheckCircle className="inline h-4 w-4 mr-1 text-green-400 flex-shrink-0" />;
  } else if (lowerValue.includes("non-compliant") || lowerValue.includes("missing") || lowerValue.includes("issue") || lowerValue.includes("not present") || lowerValue.includes("incorrect") || lowerValue.includes("violation")) {
    icon = <AlertTriangle className="inline h-4 w-4 mr-1 text-red-400 flex-shrink-0" />;
  } else if (lowerValue.includes("unclear") || lowerValue.includes("potential concern") || lowerValue.includes("recommend") || lowerValue.includes("partially visible") || lowerValue.includes("confirm")) {
     icon = <Info className="inline h-4 w-4 mr-1 text-yellow-400 flex-shrink-0" />;
  }
  
  return <span className="flex items-start">{icon}{cleanValue}</span>;
};

// Helper function to clean markdown formatting from text
const cleanMarkdownText = (text: string): string => {
  if (!text) return text;
  
  return text
    // Remove bold markdown **text**
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic markdown *text*
    .replace(/\*(.*?)\*/g, '$1')
    // Remove code markdown `text`
    .replace(/`(.*?)`/g, '$1')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to determine compliance status from text
const getComplianceStatus = (value: string): 'compliant' | 'non-compliant' | 'partial' | 'unknown' => {
  const lowerValue = value.toLowerCase();
  
  // Check for explicit status indicators from the new prompt format first
  if (lowerValue.startsWith("compliant:") || lowerValue.includes("compliant:")) {
    return 'compliant';
  }
  
  if (lowerValue.startsWith("non-compliant:") || lowerValue.includes("non-compliant:")) {
    return 'non-compliant';
  }
  
  if (lowerValue.startsWith("potential issue:") || lowerValue.includes("potential issue:")) {
    return 'partial';
  }
  
  if (lowerValue.startsWith("not required:") || lowerValue.includes("not required:")) {
    return 'compliant';
  }
  
  // Fallback to legacy detection logic for older analyses
  
  // Special case: "Not required" items are compliant if they're truly not required
  if ((lowerValue.includes("not required") || lowerValue.includes("not applicable")) && 
      (lowerValue.includes("domestic") || lowerValue.includes("for domestic products"))) {
    return 'compliant';
  }
  
  // Check for explicit non-compliance first - but exclude "not required" cases
  if (lowerValue.includes("non-compliant") || lowerValue.includes("missing") || lowerValue.includes("not present") || 
      lowerValue.includes("incorrect") || lowerValue.includes("violation") || lowerValue.includes("absent") ||
      lowerValue.includes("not found") || lowerValue.includes("lacks") || lowerValue.includes("fails to") ||
      lowerValue.includes("no declaration") || lowerValue.includes("not visible") ||
      lowerValue.includes("is missing") || lowerValue.includes("are missing") || lowerValue.includes("without") ||
      lowerValue.includes("needs to include") || lowerValue.includes("must include") || 
      lowerValue.includes("should include") || lowerValue.includes("omitted") || lowerValue.includes("excluded")) {
    // But don't mark as non-compliant if it's not required
    if (lowerValue.includes("not required") || lowerValue.includes("not applicable")) {
      return 'compliant';
    }
    return 'non-compliant';
  }
  
  // Check for explicit compliance - be more specific about what constitutes compliance
  if ((lowerValue.includes("compliant") && !lowerValue.includes("non-compliant")) || 
      lowerValue.includes("present and clearly legible") || lowerValue.includes("clearly legible") ||
      lowerValue.includes("correctly displayed") || lowerValue.includes("properly displayed") ||
      lowerValue.includes("appropriate") || lowerValue.includes("adequate") ||
      lowerValue.includes("satisfies") || lowerValue.includes("meets requirements") || 
      lowerValue.includes("meets the formatting") || lowerValue.includes("appears compliant") ||
      (lowerValue.includes("visible") && lowerValue.includes("legible")) ||
      (lowerValue.includes("present") && lowerValue.includes("legible"))) {
    return 'compliant';
  }
  
  // Check for partial compliance or potential issues
  if (lowerValue.includes("unclear") || lowerValue.includes("potential concern") || lowerValue.includes("partially") ||
      lowerValue.includes("somewhat") || lowerValue.includes("may need") || lowerValue.includes("could be") ||
      lowerValue.includes("needs review") || lowerValue.includes("should be") || lowerValue.includes("concern") ||
      lowerValue.includes("issue") || lowerValue.includes("problem") || lowerValue.includes("potential issue") ||
      lowerValue.includes("may require") || lowerValue.includes("might need")) {
    return 'partial';
  }
  
  // Special handling for detected/identified items
  if (lowerValue.includes("detected") || lowerValue.includes("found") || lowerValue.includes("identified") ||
      lowerValue.includes("appears prominent") || lowerValue.includes("clearly identifiable")) {
    // If it mentions being detected BUT has issues, it's non-compliant
    if (lowerValue.includes("but") || lowerValue.includes("however") || lowerValue.includes("although") ||
        lowerValue.includes("needs") || lowerValue.includes("missing") || lowerValue.includes("without") ||
        lowerValue.includes("lacks") || lowerValue.includes("should") || lowerValue.includes("must")) {
      return 'non-compliant';
    }
    // If simply detected without issues, it's compliant
    return 'compliant';
  }
  
  // Handle cases where brand name or other elements are clearly present
  if (lowerValue.includes("brand name") && (lowerValue.includes("red hook") || lowerValue.includes("prominent"))) {
    return 'compliant';
  }
  
  return 'unknown';
};

// Function to calculate compliance score from parsed analysis
const calculateComplianceScore = (parsedAnalysis: ParsedAnalysis, productRequirements?: ProductRequirements): { compliant: number; total: number; percentage: number } => {
  let compliantCount = 0;
  let totalCount = 0;

  // Check mandatory items
  const mandatorySection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.MANDATORY);
  if (mandatorySection && mandatorySection.items) {
    mandatorySection.items.forEach((item, index) => {
      // Items 8, 9, and 10 (0-indexed as 7, 8, 9) are conditional
      const itemNumber = index + 1;
      let shouldInclude = true;
      
      if (productRequirements) {
        if (itemNumber === 8 && !productRequirements.includesSulfites) {
          shouldInclude = false;
        } else if (itemNumber === 9 && !productRequirements.includesYellowNumberFive) {
          shouldInclude = false;
        } else if (itemNumber === 10 && !productRequirements.includesAspartame) {
          shouldInclude = false;
        }
      }
      
      if (!shouldInclude) {
        return; // Skip this item in compliance calculation
      }
      
      // Look for TTB Compliance Notes in the item details
      const complianceNote = item.details.find(detail => detail.isComplianceNote);
      if (complianceNote) {
        totalCount++;
        const status = getComplianceStatus(complianceNote.value);
        if (status === 'compliant') {
          compliantCount++;
        }
      }
    });
  }

  const percentage = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;
  
  return {
    compliant: compliantCount,
    total: totalCount,
    percentage
  };
};

const RenderReportItem: React.FC<{ item: ReportItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Extract number prefix from fullItemTitle for display
  const prefixMatch = item.fullItemTitle.match(/^(\d+\.\s+)/);
  const displayPrefix = prefixMatch ? prefixMatch[0] : "";
  
  // Clean the item title
  const cleanTitle = cleanMarkdownText(item.title);

  // Get compliance status for the item to show in the header
  const complianceNote = item.details.find(detail => detail.isComplianceNote);
  const complianceStatus = complianceNote ? getComplianceStatus(complianceNote.value) : 'unknown';
  
  // Determine styling based on compliance status
  let statusColor = 'text-slate-600 dark:text-slate-400';
  let StatusIcon = Info;
  let statusBadge = 'Unknown';
  
  switch (complianceStatus) {
    case 'compliant':
      statusColor = 'text-green-600 dark:text-green-400';
      StatusIcon = CheckCircle;
      statusBadge = 'Compliant';
      break;
    case 'non-compliant':
      statusColor = 'text-red-600 dark:text-red-400';
      StatusIcon = AlertTriangle;
      statusBadge = 'Non-Compliant';
      break;
    case 'partial':
      statusColor = 'text-orange-600 dark:text-orange-400';
      StatusIcon = AlertTriangle;
      statusBadge = 'Potential Issue';
      break;
    default:
      statusColor = 'text-slate-600 dark:text-slate-400';
      StatusIcon = Info;
      statusBadge = 'Unknown';
      break;
  }

  return (
    <div className="mb-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 transition-all duration-300 hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusColor}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {displayPrefix}{cleanTitle}
                </span>
                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                  complianceStatus === 'compliant' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  complianceStatus === 'non-compliant' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  complianceStatus === 'partial' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {statusBadge}
                </span>
              </div>
              {complianceNote && (
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate">
                  {cleanMarkdownText(complianceNote.value).length > 80 
                    ? `${cleanMarkdownText(complianceNote.value).substring(0, 80)}...` 
                    : cleanMarkdownText(complianceNote.value)
                  }
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center ml-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30">
          <div className="p-4 space-y-4">
            {item.details.map((detail, index) => (
              <div key={index} className="space-y-2">
                <dt className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                  {cleanMarkdownText(detail.label)}:
                </dt>
                <dd className={`text-slate-800 dark:text-slate-200 ${
                  detail.isComplianceNote 
                    ? 'bg-white dark:bg-slate-600/30 p-3 rounded-md border-l-4 border-sky-500' 
                    : 'pl-3'
                }`}>
                  {detail.isComplianceNote 
                    ? getValueWithComplianceIcon(cleanMarkdownText(detail.value))
                    : cleanMarkdownText(detail.value)
                  }
                </dd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RenderObservationSubSection: React.FC<{ subSection: ObservationSubSection }> = ({ subSection }) => (
  <div className="mb-4">
    <h5 className="text-base font-semibold text-sky-600 dark:text-sky-300 mb-1">{subSection.title}:</h5>
    <div className="ml-2 space-y-1 text-slate-700 dark:text-slate-300">
      {subSection.points.map((point, i) => (
        <div key={i} className="whitespace-pre-wrap py-0.5">{getValueWithComplianceIcon(point)}</div>
      ))}
    </div>
  </div>
);



const RenderOverviewBar: React.FC<{ overview: ReportOverviewData | null; complianceScore?: { compliant: number; total: number; percentage: number } }> = ({ overview, complianceScore }) => {
  if (!overview || !overview.statusText) return null;

  let bgColor = 'bg-slate-600';
  let textColor = 'text-slate-100';
  let IconComponent: React.ElementType = Info;

  switch (overview.status) {
    case 'Compliant':
      bgColor = 'bg-green-700';
      textColor = 'text-green-100';
      IconComponent = ShieldCheck;
      break;
    case 'Partially Compliant':
      bgColor = 'bg-yellow-600';
      textColor = 'text-yellow-100';
      IconComponent = ShieldAlert;
      break;
    case 'Non-Compliant':
      bgColor = 'bg-red-700';
      textColor = 'text-red-100';
      IconComponent = AlertTriangle;
      break;
    case 'Unknown':
    default:
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
      IconComponent = ShieldQuestion;
      break;
  }

  return (
    <div className={`p-4 md:p-5 rounded-lg shadow-lg mb-8 ${bgColor} ${textColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <IconComponent className="h-7 w-7 mr-3 flex-shrink-0" />
          <h2 className="text-xl font-bold">{overview.statusText || 'Compliance Overview'}</h2>
        </div>
        {complianceScore && complianceScore.total > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold">
              {complianceScore.compliant}/{complianceScore.total}
            </div>
            <div className="text-sm opacity-90">
              {complianceScore.percentage}% Compliant
            </div>
          </div>
        )}
      </div>
      {overview.keyIssues && overview.keyIssues.length > 0 && (
        <div className="ml-10 mt-1">
          <p className="text-sm font-semibold mb-1">Key Issues Identified:</p>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {overview.keyIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


interface AnalysisDisplayProps {
  result: string;
  productRequirements: ProductRequirements;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, productRequirements }) => {

  const parsedAnalysis = useMemo(() => {
    if (!result) return null; 
    try {
      return parseAnalysisResult(result);
    } catch (e: any) {
      console.error("AnalysisDisplay: Error during parseAnalysisResult:", e.message, e.stack);
      console.error("AnalysisDisplay: Input string that caused parsing error:", result);
      return null; 
    }
  }, [result]);

  const complianceScore = useMemo(() => {
    if (!parsedAnalysis) return null;
    return calculateComplianceScore(parsedAnalysis, productRequirements);
  }, [parsedAnalysis, productRequirements]);
  
  const hasContentToShow = parsedAnalysis && (parsedAnalysis.overview || parsedAnalysis.sections.length > 0);

  if (!parsedAnalysis || (!parsedAnalysis.overview && parsedAnalysis.sections.length === 0)) {
    if (result && result.trim().length > 0 ) { // Check if parsing failed but there was input
        console.warn(
            "AnalysisDisplay: Parsing yielded no structured data (overview or sections), but received a non-empty result. Raw AI Result:",
            result 
        );
    }
    return (
      <div className="bg-slate-100 dark:bg-slate-700/80 shadow-lg rounded-xl p-6 text-slate-700 dark:text-slate-300 transition-colors duration-300">
        <div className="flex items-center mb-4 border-b border-slate-300 dark:border-slate-600 pb-3">
          <FileText className="h-7 w-7 text-sky-600 dark:text-sky-400 mr-3" />
          <h3 className="text-2xl font-semibold text-sky-600 dark:text-sky-400">Analysis Report</h3>
        </div>
        <p>No analysis data to display or the response could not be parsed. The AI might not have provided a response in the expected format, or an error occurred. Please check the browser console for more details if the issue persists.</p>
        {result && result.trim().length > 0 && ( // Show raw only if there was actual input
            <details className="mt-4 text-xs bg-slate-200 dark:bg-slate-600 p-2 rounded">
                <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">View Raw AI Response (for debugging)</summary>
                <pre className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-400">{result}</pre>
            </details>
        )}
      </div>
    );
  }

  // Separate sections by type for custom ordering
  const summarySection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.SUMMARY);
  const mandatorySection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.MANDATORY);
  const observationsSection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.OBSERVATIONS);

  return (
    <div className="bg-white dark:bg-slate-800 shadow-xl rounded-xl p-4 md:p-6 transition-colors duration-300">
      {parsedAnalysis.overview && <RenderOverviewBar overview={parsedAnalysis.overview} complianceScore={complianceScore} />}
      
      {/* TTB Compliance Summary - moved to top */}
      {summarySection && (
        <section className="mb-8 p-3 md:p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-xl md:text-2xl font-semibold text-sky-600 dark:text-sky-400 border-b-2 border-sky-300 dark:border-sky-600 pb-2 mb-4">
            {summarySection.title}
          </h2>
          
          {summarySection.freeTextContent && (
            <div className="space-y-3 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {summarySection.freeTextContent.map((paragraph, index) => (
                <div key={index}>{getValueWithComplianceIcon(paragraph)}</div>
              ))}
            </div>
          )}
        </section>
      )}
      
      {parsedAnalysis.sections.length > 0 && (
        <>
          <div className="flex items-center mb-6 border-b border-slate-300 dark:border-slate-600 pb-3 mt-4">
            <FileText className="h-8 w-8 text-sky-600 dark:text-sky-400 mr-3 flex-shrink-0" />
            <h3 className="text-2xl md:text-3xl font-bold text-sky-600 dark:text-sky-400">Detailed Compliance Analysis</h3>
          </div>
          
          {/* TTB Mandatory Label Information */}
          {mandatorySection && (
            <section className="mb-8 p-3 md:p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg shadow-md transition-colors duration-300">
              <h2 className="text-xl md:text-2xl font-semibold text-sky-600 dark:text-sky-400 border-b-2 border-sky-300 dark:border-sky-600 pb-2 mb-4">
                {mandatorySection.title}
              </h2>
              
              {mandatorySection.items && mandatorySection.items.map(item => (
                <RenderReportItem key={item.id} item={item} />
              ))}
            </section>
          )}

          {/* Other TTB Compliance Observations */}
          {observationsSection && (
            <section className="mb-8 p-3 md:p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg shadow-md transition-colors duration-300">
              <h2 className="text-xl md:text-2xl font-semibold text-sky-600 dark:text-sky-400 border-b-2 border-sky-300 dark:border-sky-600 pb-2 mb-4">
                {observationsSection.title}
              </h2>
              
              {observationsSection.observationSubSections && observationsSection.observationSubSections.map((subSec, index) => (
                <RenderObservationSubSection key={index} subSection={subSec} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
};
