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

  // Helper function to add text with wrapping - completely rewritten for better reliability
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, isBold: boolean = false): number => {
    if (!text || text.trim() === '') return y;
    
    // Clean text of problematic characters
    const cleanText = text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return y;
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    // Use extremely conservative width - fixed values to prevent any calculation errors
    let effectiveWidth = maxWidth;
    
    // Different safety margins based on text type and position
    if (isBold || fontSize > 11) {
      // Headings need extra space
      effectiveWidth = Math.min(420, pageWidth - x - 35);
    } else {
      // Regular text
      effectiveWidth = Math.min(450, pageWidth - x - 30);
    }
    
    // Additional safety for indented text
    if (x > margin + 5) {
      effectiveWidth -= 15;
    }
    
    // Ensure minimum width
    effectiveWidth = Math.max(200, effectiveWidth);
    
    const lines = doc.splitTextToSize(cleanText, effectiveWidth);
    let currentY = y;
    
    // Check if we need a page break before starting
    const lineHeight = fontSize * 0.7 + 1;
    const totalHeight = lines.length * lineHeight;
    const pageHeight = doc.internal.pageSize.height;
    
    if (currentY + totalHeight > pageHeight - 50) {
      doc.addPage();
      currentY = 40;
    }
    
    // Add each line with proper spacing
    lines.forEach((line: string, index: number) => {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 40;
      }
      doc.text(line.trim(), x, currentY);
      currentY += lineHeight;
    });
    
    return currentY + (isBold ? 8 : 5);
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number): number => {
    if (yPosition + requiredSpace > doc.internal.pageSize.height - margin) {
      doc.addPage();
      return margin;
    }
    return yPosition;
  };

  // Add clean header with properly sized logo
  try {
    const logoData = await loadImageAsBase64('/assets/images/aardwolf-logo-light.png');
    
    // Calculate proportional dimensions - target height of 20px for good balance
    const targetHeight = 20;
    const aspectRatio = logoData.width / logoData.height;
    const logoWidth = targetHeight * aspectRatio;
    const logoHeight = targetHeight;
    
    // Center logo horizontally
    const logoX = (pageWidth - logoWidth) / 2;
    
    // Add logo to PDF (centered, appropriately sized)
    doc.addImage(logoData.dataURL, 'PNG', logoX, 15, logoWidth, logoHeight);
    
    yPosition = 45;
  } catch (error) {
    console.warn('Failed to load logo for PDF, using text fallback:', error);
    // Fallback to text if logo fails to load
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AARDWOLF', pageWidth / 2, 25, { align: 'center' });
    
    yPosition = 35;
  }

  // Add company subtitle
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Alcohol Label Compliance Analyzer', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;
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
    
    yPosition = addWrappedText('Compliance Status Overview', margin, yPosition, pageWidth - 60, 14, true);
    yPosition += 5;

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
      yPosition = addWrappedText('Key Issues Identified:', margin, yPosition, pageWidth - 60, 12, true);
      yPosition += 3;
      
      parsedAnalysis.overview.keyIssues.forEach((issue) => {
        yPosition = checkPageBreak(15);
        yPosition = addWrappedText('• ' + issue, margin + 5, yPosition, pageWidth - 70, 10, false);
      });
      yPosition += 10;
    }
  }

  // Mandatory Information Section
  const mandatorySection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.MANDATORY);
  if (mandatorySection && mandatorySection.items) {
    yPosition = checkPageBreak(40);
    
    yPosition = addWrappedText('TTB Mandatory Label Information', margin, yPosition, pageWidth - 60, 14, true);
    yPosition += 10;

    mandatorySection.items.forEach((item, index) => {
      yPosition = checkPageBreak(30);
      
      // Item title
      yPosition = addWrappedText(`${index + 1}. ${item.title}`, margin, yPosition, pageWidth - 60, 11, true);
      yPosition += 5;
      
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

        // Format label and value with proper wrapping - use very conservative widths
        yPosition = addWrappedText(`${detail.label}:`, margin + 10, yPosition, pageWidth - 80, 9, true);
        yPosition = addWrappedText(cleanValue, margin + 15, yPosition, pageWidth - 85, 9, false);
        yPosition += 3;
      });
      
      yPosition += 8;
    });
  }

  // Observations Section
  const observationsSection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.OBSERVATIONS);
  if (observationsSection && observationsSection.observationSubSections) {
    yPosition = checkPageBreak(40);
    
    yPosition = addWrappedText('Other TTB Compliance Observations', margin, yPosition, pageWidth - 60, 14, true);
    yPosition += 10;

    observationsSection.observationSubSections.forEach((subSection) => {
      yPosition = checkPageBreak(25);
      
      yPosition = addWrappedText(subSection.title, margin, yPosition, pageWidth - 60, 12, true);
      yPosition += 5;
      
      subSection.points.forEach((point) => {
        yPosition = checkPageBreak(15);
        // Clean the point text
        const cleanPoint = point
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/✅|❌|⚠️|ℹ️/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        yPosition = addWrappedText('• ' + cleanPoint, margin + 5, yPosition, pageWidth - 70, 10, false);
      });
      
      yPosition += 10;
    });
  }

  // Summary Section
  const summarySection = parsedAnalysis.sections.find(section => section.key === KNOWN_SECTION_KEYS.SUMMARY);
  if (summarySection && summarySection.freeTextContent) {
    yPosition = checkPageBreak(40);
    
    yPosition = addWrappedText('Overall TTB Compliance Summary', margin, yPosition, pageWidth - 60, 14, true);
    yPosition += 10;
    
    summarySection.freeTextContent.forEach((content) => {
      yPosition = checkPageBreak(20);
      // Clean markdown and format text
      const cleanContent = content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/✅|❌|⚠️|ℹ️/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      yPosition = addWrappedText(cleanContent, margin, yPosition, pageWidth - 60, 10, false);
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