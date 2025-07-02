# Alcohol Label Analyzer

A React-based web application for analyzing alcohol label compliance using AI-powered image analysis.

## Features

- **Image Upload**: Upload alcohol label images for analysis
- **Multi-Image Support**: Analyze multiple label images (front, back, neck, side labels) in a single submission
- **Beverage Category Selection**: Specify whether your product is distilled spirits, wine, or malt beverages for category-specific compliance checks
- **Product Requirements**: Configure specific requirements like sulfite declarations, FD&C Yellow #5, and aspartame warnings
- **Label Version Comparison**: Compare old and new label versions to determine if TTB submission is required for changes
- **AI Analysis**: Powered by Google's Gemini AI for intelligent compliance checking
- **TTB Submission Analysis**: Expert analysis of whether label changes require TTB approval based on federal regulations
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Real-time Results**: Get instant feedback on label compliance

## How to Use

### New Label Mode
1. Upload your label images (supports front, back, neck, side, and other label types)
2. Select your beverage category (Distilled Spirits, Wine, or Malt Beverages)
3. Configure product requirements (sulfites, Yellow #5, aspartame)
4. Click "Analyze Labels" to get a comprehensive compliance report

### Label Change Mode
1. Switch to "Label Change" mode using the toggle at the top
2. Upload your current/approved label images in the "Current Labels" section
3. Upload your proposed/new label images in the "Proposed Labels" section
4. Click "Analyze Label Changes & TTB Requirements" to get analysis on whether TTB submission is required

The label change analysis focuses specifically on:
- **Critical Changes**: Modifications that require TTB submission (brand name, alcohol content, mandatory statements)
- **Minor Changes**: Modifications that may require TTB submission (ingredients, optional statements)
- **Cosmetic Changes**: Modifications that don't require TTB submission (colors, fonts, graphics)

This streamlined approach is designed specifically for analyzing changes between label versions rather than conducting a full compliance review.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

## Deployment on Vercel

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: In Vercel dashboard, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key
3. **Deploy**: Vercel will automatically build and deploy your app

### Build Settings for Vercel
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **AI Service**: Google Gemini API
- **Icons**: Lucide React

## Logo Attribution

Powered by Aardwolf - Logo files are included in the public assets directory.
