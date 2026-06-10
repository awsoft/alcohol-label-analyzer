# Troubleshooting Guide

## Overview

This guide helps resolve common issues encountered when using the Alcohol Label Compliance Analyzer application.

## Installation and Setup Issues

### Node.js and npm Problems

**Issue**: `command not found: node` or `command not found: npm`

**Solution**:
```bash
# Install Node.js from official website
# https://nodejs.org/

# Or use a version manager
# macOS/Linux with nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Windows with nvm-windows
# Download from: https://github.com/coreybutler/nvm-windows
```

**Issue**: `npm ERR! peer dep missing`

**Solution**:
```bash
# Install missing peer dependencies
npm install --legacy-peer-deps

# Or clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Permission errors on npm install

**Solution**:
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# Or use npm without sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### API Key Issues

The app can get a Gemini API key from two places:

1. **Server key (default)** — `GEMINI_API_KEY` set in the deployment environment (e.g. the Vercel dashboard). The browser calls the app's serverless endpoints (`/api/analyze`, `/api/compare`, `/api/key-status`); the key never reaches the browser.
2. **Your own key** — added via the Settings menu (gear icon). It is stored in your browser's `localStorage` (`alcohol-label-analyzer-api-key`) and used to call Gemini directly, skipping the server entirely. It always takes priority over the server key.

A `.env.local` file has no effect — the key is never compiled into the client bundle, and client code never reads environment variables.

**Issue**: Settings shows "Not configured" / banner says "No Gemini API key is configured"

**Solution**:
1. Add your own key via Settings → "Add API Key" (get one at [Google AI Studio](https://aistudio.google.com/)), or
2. For a deployment: set `GEMINI_API_KEY` in the hosting platform's environment variables and redeploy, or
3. For local development with the server path: run `vercel dev` with `GEMINI_API_KEY` set — plain `npm run dev` has no `/api` routes, so a server key can never be detected there

**Issue**: "The analysis endpoints are not available in this environment. Add your own Gemini API key via the Settings menu, or run the app with `vercel dev`."

**Cause**: You are running the front-end alone (`npm run dev` or `vite preview`), which serves no `/api` routes, and no personal key is saved in Settings.

**Solution**:
1. Add your own Gemini API key via the Settings menu (the browser then calls Gemini directly), or
2. Run `vercel dev` (requires the Vercel CLI and a linked project) with `GEMINI_API_KEY` available in the environment

**Issue**: "The server has no Gemini API key configured. Add your own key via the Settings menu instead."

**Cause**: The deployed serverless functions are reachable, but `GEMINI_API_KEY` is not set in their environment.

**Solution**:
1. Set `GEMINI_API_KEY` in the hosting platform (Vercel: Project → Settings → Environment Variables)
2. Redeploy the application
3. Or add your own key via Settings as a workaround

**Issue**: "The configured Gemini API key is invalid. Please verify the key."

**Solution**:
1. Identify which key is in use: a key saved in Settings always takes priority over the server key
2. Verify the key is correctly copied (no extra spaces or characters)
3. Generate a new API key at [Google AI Studio](https://aistudio.google.com/)
4. Update it via Settings → "Update API Key", or fix `GEMINI_API_KEY` in the deployment environment and redeploy

**Issue**: "The Gemini API quota has been exceeded. Please check usage and limits."

**Solution**:
1. Check API usage at [Google AI Studio](https://aistudio.google.com/)
2. Wait for the quota to reset or upgrade the API plan
3. If a shared server key is exhausted, add your own key via Settings

### Understanding the Settings Status

Opening Settings only checks key *presence* (localStorage plus a cheap `GET /api/key-status`) — no Gemini quota is spent on page load. A live test runs only when you click "Test Connection" or save a key.

- **Server key configured** — no personal key saved; the server reports a key is present (not live-tested)
- **Your key (untested)** — a personal key is saved but has not been live-tested yet
- **Connected** — the last "Test Connection" succeeded
- **Connection failed** — the live test failed: invalid key, exhausted quota, network problems, or (server path) running locally without `vercel dev`
- **Not configured** — no personal key and no server key detected

### Build and Development Server Issues

**Issue**: `Error: Cannot resolve module 'vite'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

**Issue**: Development server won't start

**Solution**:
```bash
# Check if port is in use
lsof -ti:5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Kill process using port
kill -9 $(lsof -ti:5173)  # macOS/Linux

# Start on different port
npm run dev -- --port 3000
```

**Issue**: TypeScript errors preventing build

**Solution**:
```bash
# Check TypeScript without building
npx tsc --noEmit

# Install React type definitions
npm run install-types
```

## Application Runtime Issues

### Image Upload Problems

**Issue**: Image won't upload or fails to convert

**Symptoms**:
- "Failed to load the image. It might be corrupt or an unsupported format for this browser."
- "Failed to convert the image. The file might be corrupt or in an unusual format."

**Solution**:
1. Use the directly supported formats: PNG, JPEG, WEBP, HEIC, HEIF
2. Other formats are converted to JPEG automatically only if your browser can decode them — convert exotic formats yourself:
   ```bash
   # Using ImageMagick
   convert image.bmp image.png
   ```
3. Re-export the image if it may be corrupt

**Issue**: "File is too large (...MB). Maximum allowed size is 5MB."

**Solution**:
1. Compress or resize the image before upload:
   ```bash
   # Using ImageMagick
   convert input.jpg -quality 85 -resize 2048x2048> output.jpg

   # Using online tools
   # tinypng.com, squoosh.app
   ```
2. Take photos at lower resolution — anything beyond ~2000px on the longest side is downscaled before analysis anyway

**Issue**: "The combined images are too large to send (over ~4 MB). Use fewer or smaller images, or add your own Gemini API key in Settings to lift this limit."

**Cause**: Without a personal key, analysis goes through the app's serverless endpoints, which reject request bodies over ~4.5 MB (a Vercel platform limit; the app caps payloads at ~4.2 MB).

**Solution**:
1. Upload fewer or smaller images
2. Or add your own Gemini API key in Settings — direct browser-to-Gemini calls are not subject to this limit

**Issue**: Images upload but preview doesn't show

**Solution**:
1. Check browser console for errors
2. Try a different image format
3. Refresh page and try again

### Analysis Issues

**Issue**: "Please upload at least one label image first." / "Please upload both current and proposed label images."

**Solution**:
1. Ensure the required image(s) finished processing and appear in the preview area
2. In Label Change mode, both the current and the proposed label are required
3. Try refreshing the page and re-uploading

**Issue**: Analysis takes very long or times out

**Solution**:
1. Reduce number of images (try 1-2 first)
2. Ensure images are clear and well-lit
3. Compress images to reduce processing time
4. Check internet connection stability

**Issue**: "Received an empty response from the AI..." or "The AI returned a response that could not be parsed..."

**Cause**: Gemini is asked for structured JSON via a response schema, so these are rare and usually transient.

**Solution**:
1. Try the analysis again
2. Verify image quality — text should be clearly readable, well-lit, with minimal glare
3. Ensure the images actually show alcohol labels
4. Try fewer images or different angles

**Issue**: Comparison reports "No Differences Detected" but you expected changes

**Solution**:
1. Confirm you uploaded the right files to the right slots (current vs. proposed)
2. Use legible, similarly framed images of both versions
3. Re-run the comparison — only differences the AI can verify are reported

### PDF Generation Issues

**Issue**: "Failed to generate PDF" error

**Solution**:
1. Ensure analysis completed successfully
2. Try again after clearing browser cache
3. Use a different browser if the problem persists

**Issue**: PDF download doesn't start

**Solution**:
1. Check browser download settings
2. Disable popup blockers
3. Check if browser blocks automatic downloads
4. The file is saved as `TTB_Compliance_Report_<timestamp>.pdf` — check your downloads folder

## User Interface Issues

### Display and Layout Problems

**Issue**: Application looks broken or unstyled

**Solution**:
1. Hard refresh page (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache and cookies
3. Check if ad blockers are interfering
4. Try different browser
5. Check browser console for errors

**Issue**: Dark mode not working properly

**Solution**:
1. Use the sun/moon toggle in the header — the theme is stored in the browser (`localStorage` key `theme`) and applied as a `dark` class on the page
2. Clear browser cache / site data and reload
3. With no saved preference, the app follows your system dark/light setting

### Interaction Problems

**Issue**: Buttons don't respond to clicks

**Solution**:
1. Check if JavaScript is enabled
2. Clear browser cache
3. Disable browser extensions temporarily
4. Check browser console for JavaScript errors
5. Note: the analyze controls are intentionally disabled while processing, when no key is configured, and after an analysis completes (change the images to start over)

**Issue**: Drag and drop doesn't work

**Solution**:
1. Use click upload instead
2. Check browser supports HTML5 File API
3. Try different browser

## Performance Issues

### Slow Loading or Processing

**Solution**:
1. Check internet connection speed
2. Reduce image file sizes and upload fewer images at once
3. Check API quota usage
4. Clear browser cache
5. Disable unnecessary browser extensions

### Memory Issues

**Issue**: Browser becomes unresponsive

**Solution**:
1. Close other browser tabs
2. Restart browser
3. Upload smaller/fewer images

## Error Messages and Solutions

### Common Error Messages

**"Could not reach the analysis service. Check your connection and try again."**

**Causes**:
- Internet connection issues
- The app's serverless endpoints temporarily unavailable
- Firewall blocking requests

**Solutions**:
1. Check internet connection
2. Try again later
3. Check firewall/antivirus settings
4. Try different network (mobile hotspot)

**"The AI service encountered an internal error. Please try again later."**

**Causes**:
- Temporary problem on the Gemini side

**Solutions**:
1. Try again in a few minutes
2. Reduce the number or size of images

**"The image format is not supported by the AI, even after conversion attempts. Please try PNG, JPEG, or WEBP."**

**Causes**:
- Unusual or corrupted image file

**Solutions**:
1. Convert to a standard format (PNG, JPEG)
2. Try a different image of the same label
3. Ensure the image is not corrupted

### Browser-Specific Issues

**Chrome Issues**:
- Clear site data: Settings → Privacy → Site Settings → View permissions and data stored across sites
- Disable extensions in incognito mode

**Firefox Issues**:
- Clear cookies and site data
- Disable Enhanced Tracking Protection for site
- Check if JavaScript is enabled

**Safari Issues**:
- Enable JavaScript: Preferences → Security → Enable JavaScript
- Clear website data: Develop → Empty Caches
- Disable content blockers

**Edge Issues**:
- Clear browsing data
- Reset site permissions

## Network and Connectivity Issues

### Firewall and Security Software

**Issue**: Analysis requests blocked by firewall

**Solution**:
1. With your own key (Settings), the browser calls `generativelanguage.googleapis.com` directly — add an exception for that domain
2. Without a personal key, the browser only calls the app's own `/api` endpoints; the Gemini call happens server-side
3. Contact your IT administrator if in a corporate environment

**Issue**: VPN or proxy interfering with requests

**Solution**:
1. Try without VPN
2. Switch VPN server location
3. Request a whitelist entry for googleapis.com if using your own key on a corporate network
4. Use a mobile hotspot temporarily to confirm the network is the cause

## Data and Privacy Concerns

### Image Data Handling

**Question**: Where are my images stored?

**Answer**: They aren't. With your own key, images go straight from your browser to Google's Gemini API. Without one, they pass through the app's serverless functions to Gemini and are not persisted anywhere by the app.

**Question**: Can others see my label images?

**Answer**: No, images are only sent to Google's Gemini API for the duration of the analysis and are not shared with other users.

### API Key Security

**Question**: Is my API key secure?

**Answer**:
- The server key lives only in the deployment environment and is never sent to browsers
- A key you add in Settings stays in your browser's `localStorage` and is used to call Gemini directly — it is never sent to the app's servers; remove it any time with Settings → "Remove"
- Never commit API keys to code repositories
- Rotate keys regularly for security

## Getting Additional Help

### When to Contact Support

Contact technical support for:
- Persistent application errors
- API key configuration issues that can't be resolved
- Feature requests or bug reports
- Integration assistance

### Information to Provide

When contacting support, include:
1. Browser and version
2. Operating system
3. Error messages (exact text)
4. Whether you use your own API key (Settings) or the app's server key
5. Steps to reproduce issue
6. Screenshots if helpful

### TTB Regulatory Questions

For compliance questions, contact:
- TTB Labeling Resources: https://www.ttb.gov/labeling/labeling-resources
- ALFD Phone: 202-453-2250
- ALFD Contact Form: https://www.ttb.gov/about-ttb/contact-us/contact-alfd

### Self-Help Resources

**Browser Developer Tools**:
1. Press F12 to open developer tools
2. Check Console tab for error messages
3. Check Network tab for failed requests (`/api/analyze`, `/api/compare`, `/api/key-status` on the server path)
4. Check Application tab → Local Storage for the saved key (`alcohol-label-analyzer-api-key`) and theme

This troubleshooting guide covers the most common issues encountered with the Alcohol Label Compliance Analyzer. If you encounter an issue not covered here, please contact support with detailed information about the problem.
