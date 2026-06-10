# Alcohol Label Analyzer

A React-based web application for analyzing alcohol label compliance using AI-powered image analysis.

## Features

- **Application Verification**: Enter the COLA application data (brand name, class/type, alcohol content, net contents) and verify the label matches it field-by-field — with human-like judgment (case/punctuation differences match; `45% Alc./Vol.` ≡ `90 Proof`) and an exact Government Warning check. Typical result in **~2–3 seconds**
- **Label-type aware placement rules**: Tell it whether you're verifying the front, back, or neck label and the verdicts follow the actual CFR placement rules — the Government Warning may be on *any* label (27 CFR 16.21: absent here → "needs review", not a failure; and only "GOVERNMENT WARNING:" may be bold), spirits/malt require brand + class + ABV together in one field of vision (27 CFR 5.63/7.63), and wine requires brand + class on the brand label (27 CFR 4.32). Fields that legitimately live on another label report as "not expected" instead of failing
- **Batch Verification**: Drop many label images, fill application data inline or import a CSV, and verify them all in parallel with per-application PASS/FAIL verdicts and a results CSV export
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

### Verify Application Mode (default)
1. Enter the application data: brand name, class/type, alcohol content, and net contents (bottler and country of origin optional)
2. Upload the label image and select the beverage category
3. Click "Verify Label" — each field gets a MATCH / MISMATCH / NOT FOUND / NEEDS REVIEW verdict with the exact text found on the label, plus a Government Warning check (presence, exact wording, caps + bold formatting)

For **batches**: switch to the Batch tab, add all label images (one per application), fill the fields inline or import a CSV (`Download CSV template` shows the format; rows are matched to images by file name), then "Verify All". Results run in parallel and can be exported as CSV.

> Verification uses `gemini-3.1-flash-lite`: benchmarked at 2–3s per label with verdicts identical to `gemini-3.5-flash` (6–12s) on match, mismatch, and warning-formatting test cases. The deeper analysis modes below use `gemini-3.5-flash`.

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

## Approach, Assumptions & Trade-offs

**Approach.** The core agent workflow — "does the label match the application?" — is the default mode and is built for speed: a small structured-output schema on `gemini-3.1-flash-lite` returns field-level verdicts in ~2–3 seconds (benchmarked against `gemini-3.5-flash`, which gave identical verdicts at 6–12s). The deeper compliance-report and label-change modes intentionally use the larger model and take longer; they are review aids, not the high-volume path. Verdict aggregation (PASS/FAIL/NEEDS REVIEW) is computed deterministically in code from the per-field statuses rather than asked of the model. Placement rules are encoded from the actual regulations (27 CFR 16.21 warning placement; 5.63/7.63 field-of-vision rule for spirits/malt; 4.32 wine brand label), so a back label is not failed for information that belongs on the front.

**Assumptions.**
- An agent verifies one label image per application at a time, choosing the label type (front/back/neck); multi-label applications are verified label-by-label.
- The application data is typed or CSV-imported; there is no COLA system integration (explicitly out of scope per the brief).
- Matching tolerates formatting differences a human would wave through (case, punctuation, `90 Proof` ≡ `45% Alc./Vol.`), and flags genuinely ambiguous reads as NEEDS REVIEW rather than guessing.

**Trade-offs & known limitations.**
- *Verification scope*: a single label can't prove container-level compliance (e.g. the warning may legitimately be on another label) — the tool reports NEEDS REVIEW with instructions instead of false certainty.
- *Imperfect photos*: no active deskew/glare correction (flagged as likely out of scope in the brief); the model is tolerant of moderate quality issues and reports them in an image-quality note.
- *Batch scale*: client-side fan-out at concurrency 4; measured 25 applications in ~12s end-to-end against production (~2 min projected for a 300-application batch). Larger batches run unattended; no server-side queue/resume.
- *Abuse protection*: the serverless endpoints are unauthenticated for the prototype (prompts are server-built, so they are not a general-purpose AI relay); production use would add auth/rate limiting.
- *Network posture*: agents' browsers only ever call this app's own domain — the Gemini call happens server-side — so a locked-down agency network needs exactly one domain allowlisted.
- *Type-size rules*: physical measurements (mm type height per 27 CFR 16.22) can't be measured from a photo; legibility is assessed qualitatively.

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
