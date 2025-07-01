# Alcohol Label Compliance Analyzer - Documentation

## Overview

The Alcohol Label Compliance Analyzer is a React-based web application that leverages Google's Gemini AI to analyze alcohol label images for TTB (Alcohol and Tobacco Tax and Trade Bureau) compliance. This tool helps alcohol beverage producers, distributors, and regulatory professionals ensure their labels meet federal requirements before submission to the TTB.

## Key Features

- **Multi-Image Analysis**: Upload multiple label images (front, back, neck, side labels) for comprehensive analysis
- **AI-Powered Analysis**: Uses Google Gemini 2.5 Flash Preview for intelligent compliance checking
- **Category-Specific Analysis**: Supports three beverage categories with tailored requirements:
  - Distilled Spirits
  - Wine (including cider and mead)
  - Malt Beverages (beer)
- **Product Requirements Configuration**: Specify ingredients like sulfites, FD&C Yellow #5, and aspartame
- **PDF Report Generation**: Export detailed compliance reports as PDF documents
- **Modern UI**: Clean, responsive interface with dark mode support
- **Real-time Results**: Get instant feedback on label compliance

## Documentation Structure

This documentation is organized into several sections:

### Getting Started
- [Installation Guide](./installation.md) - Setup and configuration instructions
- [User Guide](./user-guide.md) - How to use the application
- [Configuration](./configuration.md) - Environment variables and settings

### Technical Documentation
- [Architecture Overview](./architecture.md) - Application structure and design
- [API Reference](./api-reference.md) - Service interfaces and types
- [Components Guide](./components.md) - UI component documentation

### Regulatory Information
- [TTB Labeling Requirements](./labeling-requirements.md) - Comprehensive TTB compliance guide
- [Compliance Analysis](./compliance-analysis.md) - How the AI analyzes labels

### Development
- [Development Guide](./development.md) - Setting up development environment
- [Deployment Guide](./deployment.md) - Production deployment instructions
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env.local` file with your Gemini API key:
   ```bash
   API_KEY=your_gemini_api_key_here
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Open Application**:
   Navigate to `http://localhost:5173` in your browser

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **AI Service**: Google Gemini API
- **PDF Generation**: jsPDF with autoTable
- **Icons**: Lucide React
- **Analytics**: Vercel Analytics

## License and Attribution

Powered by Aardwolf - Logo files are included in the public assets directory.

## Support

For technical issues or questions about the application, please refer to the [Troubleshooting Guide](./troubleshooting.md) or contact the development team.

For TTB regulatory questions, contact the Alcohol Labeling and Formulation Division at 202-453-2250 or use their [contact form](https://www.ttb.gov/about-ttb/contact-us/contact-alfd).