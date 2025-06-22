import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ParsedAnalysis, ProductRequirements, KNOWN_SECTION_KEYS } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Helper function to load image as base64 with dimensions
const loadImageAsBase64 = (src: string): Promise<{dataURL: string, width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve({
        dataURL,
        width: img.width,
        height: img.height
      });
    };
    img.onerror = reject;
    img.src = src;
  });
};

export const generatePDFReport = async (
  parsedAnalysis: ParsedAnalysis,
  productRequirements: ProductRequirements,
  complianceScore?: { compliant: number; total: number; percentage: number }
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text with wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    if (!text || text.trim() === '') return y;
    
    doc.setFontSize(fontSize);
    // Be more conservative with width to prevent cutoff
    const safeWidth = Math.min(maxWidth, pageWidth - x - margin);
    const lines = doc.splitTextToSize(text, safeWidth);
    
    // Check if we need page breaks for long content
    const lineHeight = fontSize * 0.5;
    const totalHeight = lines.length * lineHeight;
    if (y + totalHeight > doc.internal.pageSize.height - margin - 10) {
      doc.addPage();
      y = margin;
    }
    
    doc.text(lines, x, y);
    return y + totalHeight + 4;
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number): number => {
    if (yPosition + requiredSpace > doc.internal.pageSize.height - margin) {
      doc.addPage();
      return margin;
    }
    return yPosition;
  };

  // Add header with logo
  doc.setFillColor(0, 102, 153); // Aardwolf blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Add logo
  try {
    const logoData = await loadImageAsBase64('/assets/images/aardwolf-logo-light.png');
    
    // Calculate proportional dimensions - target height of 24px
    const targetHeight = 24;
    const aspectRatio = logoData.width / logoData.height;
    const logoWidth = targetHeight * aspectRatio;
    const logoHeight = targetHeight;
    
    // Add logo to PDF (properly scaled to maintain aspect ratio)
    doc.addImage(logoData.dataURL, 'PNG', margin, 8, logoWidth, logoHeight);
    
    // Add text next to logo with proper spacing
    const textStartX = margin + logoWidth + 8;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AARDWOLF', textStartX, 25);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Alcohol Label Compliance Analyzer', textStartX, 35);
  } catch (error) {
    console.warn('Failed to load logo for PDF, using text fallback:', error);
    // Fallback to text if logo fails to load
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AARDWOLF', margin, 25);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Alcohol Label Compliance Analyzer', margin, 35);
  }

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
        yPosition = addWrappedText('• ' + issue, margin + 5, yPosition, pageWidth - margin * 3, 10);
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
      yPosition = addWrappedText(`${index + 1}. ${item.title}`, margin, yPosition, pageWidth - margin * 3, 11);
      yPosition += 5;

      // Item details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      item.details.forEach((detail) => {
        yPosition = checkPageBreak(20);
        
        // Clean the value text (remove markdown and icons)
        let cleanValue = detail.value
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
          .replace(/✅|❌|⚠️|ℹ️/g, '') // Remove emoji icons
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        // Add compliance status indicator and format compliance notes
        if (detail.isComplianceNote) {
          let statusIndicator = '';
          const lowerValue = cleanValue.toLowerCase();
          if (lowerValue.includes('compliant') && !lowerValue.includes('non-compliant')) {
            statusIndicator = '✓ COMPLIANT: ';
          } else if (lowerValue.includes('non-compliant') || lowerValue.includes('missing') || lowerValue.includes('required')) {
            statusIndicator = '✗ NOT REQUIRED: ';
          } else if (lowerValue.includes('partial')) {
            statusIndicator = '⚠ PARTIAL: ';
          }
          // Clean up repetitive text
          cleanValue = cleanValue.replace(/TTB Compliance Notes:\s*/i, '');
          cleanValue = statusIndicator + cleanValue;
        }

        // Format label and value with proper wrapping - use more conservative widths
        doc.setFont('helvetica', 'bold');
        yPosition = addWrappedText(`${detail.label}:`, margin + 10, yPosition, pageWidth - margin * 3, 9);
        doc.setFont('helvetica', 'normal');
        yPosition = addWrappedText(cleanValue, margin + 15, yPosition, pageWidth - margin * 3 - 5, 9);
        yPosition += 2;
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
      yPosition = addWrappedText(subSection.title, margin, yPosition, pageWidth - margin * 3, 12);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      subSection.points.forEach((point) => {
        yPosition = checkPageBreak(15);
        // Clean the point text
        const cleanPoint = point
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/✅|❌|⚠️|ℹ️/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        yPosition = addWrappedText('• ' + cleanPoint, margin + 5, yPosition, pageWidth - margin * 3, 10);
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
      yPosition = addWrappedText(cleanContent, margin, yPosition, pageWidth - margin * 3, 10);
      yPosition += 5;
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