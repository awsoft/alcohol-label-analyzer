# Alcohol Label Analyzer

A React-based web application for analyzing alcohol label compliance using AI-powered image analysis.

## Features

- **Image Upload**: Upload alcohol label images for analysis
- **Multi-Image Support**: Analyze multiple label images (front, back, neck, side labels) in a single submission
- **Beverage Category Selection**: Specify whether your product is distilled spirits, wine, or malt beverages for category-specific compliance checks
- **Product Requirements**: Configure specific requirements like sulfite declarations, FD&C Yellow #5, and aspartame warnings
- **Label Version Comparison**: Compare old and new label versions to determine if TTB submission is required for changes
- **AI Analysis**: Powered by Google's Gemini AI with structured JSON output for reliable, parseable reports
- **TTB Submission Analysis**: Expert analysis of whether label changes require TTB approval based on federal regulations
- **PDF Export**: Download the compliance report as a branded PDF
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## How to Use

### New Label Mode
1. Upload your label images (supports front, back, neck, side, and other label types)
2. Select your beverage category (Distilled Spirits, Wine, or Malt Beverages)
3. Configure product requirements (sulfites, Yellow #5, aspartame)
4. Click "Analyze Labels" to get a comprehensive compliance report

### Label Change Mode
1. Switch to "Label Change" mode using the toggle at the top
2. Upload your current/approved label image and your proposed/new label image
3. Select the beverage category
4. Click "Analyze Label Changes" to find out whether TTB submission is required

The label change analysis classifies each detected difference as:
- **Critical Changes**: Modifications that require TTB submission (brand name, alcohol content, mandatory statements)
- **Minor Changes**: Modifications that may require TTB submission (ingredients, optional statements)
- **Cosmetic Changes**: Modifications that don't require TTB submission (colors, fonts, graphics)

If the two versions are identical, the app reports that no differences were found.

## Architecture: where the API key lives

The Gemini API key is **never** compiled into the client bundle. There are two supported ways to provide one:

1. **Server-side key (default)** — set `GEMINI_API_KEY` in the deployment environment (e.g. the Vercel dashboard). The browser calls this app's serverless endpoints (`api/analyze`, `api/compare`, `api/key-status`), which hold the key server-side.
2. **Bring your own key** — users can paste their own Gemini API key into the in-app Settings menu (gear icon). It is stored in `localStorage` and used to call Gemini directly from the browser; it is never sent to this app's servers.

Note: requests through the serverless endpoints are limited to ~4.5 MB total body size (a Vercel platform limit). Uploaded images are automatically downscaled client-side (longest side 2000px) to stay comfortably within it.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Development**:
   ```bash
   npm run dev
   ```
   `vite dev` serves only the front-end — the `/api` endpoints are not available. For local development either:
   - add your own Gemini API key via the in-app Settings menu (simplest), or
   - run `vercel dev` (requires the Vercel CLI and a linked project) with `GEMINI_API_KEY` available in the environment, which serves the front-end and the serverless functions together.

## Deployment on Vercel

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: In the Vercel dashboard, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key (used only by the serverless functions; not exposed to browsers)
3. **Deploy**: Vercel will automatically build the Vite app and deploy the functions in `api/`

### Build Settings for Vercel
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### A note on abuse protection

The serverless endpoints constrain usage to label analysis (the prompts are built server-side), but they are unauthenticated — anyone who can reach the deployed site can submit images for analysis on the configured key. If that matters for your deployment, add authentication or rate limiting in front of the `/api` routes.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Build Tool**: Vite
- **AI Service**: Google Gemini API (`@google/genai`, structured JSON output)
- **Serverless**: Vercel Functions (`api/` directory)
- **PDF Export**: jsPDF
- **Icons**: Lucide React

## Logo Attribution

Powered by Aardwolf - Logo files are included in the public assets directory.
