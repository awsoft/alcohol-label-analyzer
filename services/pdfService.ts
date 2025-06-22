import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ParsedAnalysis, ProductRequirements, KNOWN_SECTION_KEYS } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generatePDFReport = (
  parsedAnalysis: ParsedAnalysis,
  productRequirements: ProductRequirements,
  complianceScore?: { compliant: number; total: number; percentage: number }
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text with wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * fontSize * 0.6);
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number): number => {
    if (yPosition + requiredSpace > doc.internal.pageSize.height - margin) {
      doc.addPage();
      return margin;
    }
    return yPosition;
  };

  // Add header with logo area (placeholder)
  doc.setFillColor(0, 102, 153); // Aardwolf blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AARDWOLF', margin, 25);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Alcohol Label Compliance Analyzer', margin, 35);

  yPosition = 55;
  doc.setTextColor(0, 0, 0);

  // Add report title and timestamp
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TTB Compliance Analysis Report', margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 20;

  // Overview Section
  if (parsedAnalysis.overview) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Status Overview', margin, yPosition);
    yPosition += 10;

    // Status with colored background
    const status = parsedAnalysis.overview.status;
    let statusColor: [number, number, number] = [128, 128, 128]; // Default gray
    
    switch (status) {
      case 'Compliant':
        statusColor = [34, 197, 94]; // Green
        break;
      case 'Partially Compliant':
        statusColor = [234, 179, 8]; // Yellow
        break;
      case 'Non-Compliant':
        statusColor = [239, 68, 68]; // Red
        break;
    }

    doc.setFillColor(...statusColor);
    doc.roundedRect(margin, yPosition, 100, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(status, margin + 5, yPosition + 5);
    
    // Compliance score
    if (complianceScore) {
      doc.setTextColor(0, 0, 0);
      doc.text(`Score: ${complianceScore.compliant}/${complianceScore.total} (${complianceScore.percentage}%)`, margin + 110, yPosition + 5);
    }
    
    yPosition += 20;
    doc.setTextColor(0, 0, 0);

    // Key Issues
    if (parsedAnalysis.overview.keyIssues && parsedAnalysis.overview.keyIssues.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Key Issues Identified:', margin, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      parsedAnalysis.overview.keyIssues.forEach((issue) => {
        yPosition = checkPageBreak(15);
        doc.text('• ' + issue, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }
  }

  // Mandatory Information Section
  const mandatorySection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.MANDATORY);
  if (mandatorySection && mandatorySection.items) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TTB Mandatory Label Information', margin, yPosition);
    yPosition += 15;

    mandatorySection.items.forEach((item, index) => {
      yPosition = checkPageBreak(30);
      
      // Item title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${item.title}`, margin, yPosition);
      yPosition += 8;

      // Item details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      item.details.forEach((detail) => {
        yPosition = checkPageBreak(15);
        
        // Clean the value text (remove markdown and icons)
        let cleanValue = detail.value
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
          .replace(/✅|❌|⚠️|ℹ️/g, '') // Remove emoji icons
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        // Add compliance status indicator
        if (detail.isComplianceNote) {
          let statusIndicator = '';
          const lowerValue = cleanValue.toLowerCase();
          if (lowerValue.includes('compliant') && !lowerValue.includes('non-compliant')) {
            statusIndicator = '[✓] ';
          } else if (lowerValue.includes('non-compliant') || lowerValue.includes('missing') || lowerValue.includes('required')) {
            statusIndicator = '[✗] ';
          } else if (lowerValue.includes('partial')) {
            statusIndicator = '[⚠] ';
          }
          cleanValue = statusIndicator + cleanValue;
        }

        const detailText = `${detail.label}: ${cleanValue}`;
        yPosition = addWrappedText(detailText, margin + 10, yPosition, pageWidth - margin * 2 - 10, 9);
        yPosition += 3;
      });
      
      yPosition += 8;
    });
  }

  // Observations Section
  const observationsSection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.OBSERVATIONS);
  if (observationsSection && observationsSection.observationSubSections) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Other TTB Compliance Observations', margin, yPosition);
    yPosition += 15;

    observationsSection.observationSubSections.forEach((subSection) => {
      yPosition = checkPageBreak(25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(subSection.title, margin, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      subSection.points.forEach((point) => {
        yPosition = checkPageBreak(15);
        yPosition = addWrappedText('• ' + point, margin + 5, yPosition, pageWidth - margin * 2 - 5, 10);
        yPosition += 3;
      });
      
      yPosition += 10;
    });
  }

  // Summary Section
  const summarySection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.SUMMARY);
  if (summarySection && summarySection.freeTextContent) {
    yPosition = checkPageBreak(40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall TTB Compliance Summary', margin, yPosition);
    yPosition += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    summarySection.freeTextContent.forEach((content) => {
      yPosition = checkPageBreak(20);
      // Clean markdown and format text
      const cleanContent = content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/✅|❌|⚠️|ℹ️/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      yPosition = addWrappedText(cleanContent, margin, yPosition, pageWidth - margin * 2, 10);
      yPosition += 8;
    });
  }

  // Add footer
  yPosition = checkPageBreak(30);
  if (yPosition < doc.internal.pageSize.height - 40) {
    yPosition = doc.internal.pageSize.height - 30;
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('This report was generated by Aardwolf Alcohol Label Compliance Analyzer', margin, yPosition);
  doc.text(`© ${new Date().getFullYear()} Aardwolf. All rights reserved.`, margin, yPosition + 8);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `TTB_Compliance_Report_${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}; 