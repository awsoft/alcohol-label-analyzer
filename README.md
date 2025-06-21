# Alcohol Label Analyzer

A React-based web application for analyzing alcohol label compliance using AI-powered image analysis.

## Features

- **Image Upload**: Upload alcohol label images for analysis
- **AI Analysis**: Powered by Google's Gemini AI for intelligent compliance checking
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Real-time Results**: Get instant feedback on label compliance

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
