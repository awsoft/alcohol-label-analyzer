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

# Or force install
npm install --force

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
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use npm without sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### API Key Configuration Issues

**Issue**: "Gemini API Key is missing" error

**Symptoms**:
- Red error message in application
- Analysis button disabled
- API key status shows "not configured"

**Solution**:
1. Create `.env.local` file in project root:
   ```bash
   API_KEY=your_actual_api_key_here
   ```

2. Verify API key format:
   ```bash
   # Should start with AIza...
   echo $API_KEY
   ```

3. Restart development server:
   ```bash
   npm run dev
   ```

**Issue**: "The configured Gemini API Key is invalid"

**Solution**:
1. Verify API key is correctly copied
2. Check for extra spaces or characters
3. Generate new API key at [Google AI Studio](https://aistudio.google.com/)
4. Ensure API key has proper permissions

**Issue**: API key works locally but not in production

**Solution**:
1. Set environment variable in hosting platform
2. Verify variable name matches exactly (`API_KEY`)
3. Redeploy application after setting variables
4. Check deployment logs for environment variable issues

### Build and Development Server Issues

**Issue**: `Error: Cannot resolve module 'vite'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+ 

# Install Vite globally if needed
npm install -g vite
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

# Install type definitions
npm run install-types

# Update TypeScript
npm install typescript@latest --save-dev
```

## Application Runtime Issues

### Image Upload Problems

**Issue**: "File type not supported" error

**Symptoms**:
- Image appears selected but won't upload
- Error message about unsupported format

**Solution**:
1. Use supported formats: PNG, JPEG, WEBP
2. Convert images if necessary:
   ```bash
   # Using ImageMagick
   convert image.bmp image.png
   
   # Using online converters
   # cloudconvert.com, convertio.co
   ```

**Issue**: "File size too large" error

**Symptoms**:
- Large images won't upload
- Error about 10MB limit

**Solution**:
1. Compress images before upload:
   ```bash
   # Using ImageMagick
   convert input.jpg -quality 85 -resize 2048x2048> output.jpg
   
   # Using online tools
   # tinypng.com, squoosh.app
   ```

2. Take photos with lower resolution
3. Use photo editing software to reduce file size

**Issue**: Images upload but preview doesn't show

**Solution**:
1. Check browser console for errors
2. Try different image format
3. Refresh page and try again
4. Check if browser supports FileReader API

### Analysis Issues

**Issue**: "No images provided for analysis" error

**Solution**:
1. Ensure at least one image is uploaded
2. Check that images completed upload process
3. Verify images appear in preview area
4. Try refreshing page and re-uploading

**Issue**: "You have exceeded your Gemini API quota"

**Solution**:
1. Check API usage at [Google AI Studio](https://aistudio.google.com/)
2. Wait for quota reset (usually monthly)
3. Upgrade API plan if needed
4. Use fewer/smaller images temporarily

**Issue**: Analysis takes very long or times out

**Solution**:
1. Reduce number of images (try 1-2 first)
2. Ensure images are clear and well-lit
3. Compress images to reduce processing time
4. Check internet connection stability
5. Try again during off-peak hours

**Issue**: Analysis returns empty or garbled results

**Solution**:
1. Verify image quality:
   - Text should be clearly readable
   - Good lighting and focus
   - Minimal glare or shadows

2. Check image content:
   - Ensure images show alcohol labels
   - Verify text is in English
   - Confirm labels are complete

3. Try different images or angles

### PDF Generation Issues

**Issue**: "Failed to generate PDF" error

**Solution**:
1. Ensure analysis completed successfully
2. Check browser supports PDF generation
3. Try again after clearing browser cache
4. Use different browser if problem persists

**Issue**: PDF download doesn't start

**Solution**:
1. Check browser download settings
2. Disable popup blockers
3. Try right-click "Save link as..."
4. Check if browser blocks automatic downloads

## User Interface Issues

### Display and Layout Problems

**Issue**: Application looks broken or unstyled

**Solution**:
1. Hard refresh page (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache and cookies
3. Check if ad blockers are interfering
4. Try different browser
5. Check browser console for CSS errors

**Issue**: Mobile layout issues

**Solution**:
1. Use modern mobile browser
2. Enable JavaScript if disabled
3. Try landscape orientation
4. Use desktop version for complex analysis

**Issue**: Dark mode not working properly

**Solution**:
1. Check browser supports CSS custom properties
2. Clear browser cache
3. Try toggling system dark/light mode
4. Use browser developer tools to check CSS

### Interaction Problems

**Issue**: Buttons don't respond to clicks

**Solution**:
1. Check if JavaScript is enabled
2. Clear browser cache
3. Disable browser extensions temporarily
4. Try different browser
5. Check browser console for JavaScript errors

**Issue**: Drag and drop doesn't work

**Solution**:
1. Use click upload instead
2. Check browser supports HTML5 File API
3. Try different browser
4. Ensure proper file permissions

## Performance Issues

### Slow Loading

**Issue**: Application takes long time to load

**Solution**:
1. Check internet connection speed
2. Clear browser cache
3. Try different time of day
4. Use browser developer tools to identify slow resources
5. Disable unnecessary browser extensions

**Issue**: Analysis processing is very slow

**Solution**:
1. Reduce image file sizes
2. Upload fewer images at once
3. Check API quota usage
4. Try during off-peak hours
5. Ensure stable internet connection

### Memory Issues

**Issue**: Browser becomes unresponsive

**Solution**:
1. Close other browser tabs
2. Restart browser
3. Upload smaller/fewer images
4. Use browser with more available memory
5. Check for memory leaks in browser developer tools

## Error Messages and Solutions

### Common Error Messages

**"Network Error" or "Failed to fetch"**

**Causes**:
- Internet connection issues
- API service temporarily unavailable
- Firewall blocking requests

**Solutions**:
1. Check internet connection
2. Try again later
3. Check firewall/antivirus settings
4. Try different network (mobile hotspot)

**"Invalid API response format"**

**Causes**:
- API service returning unexpected data
- Network interference
- API service updates

**Solutions**:
1. Try again in a few minutes
2. Check if images are appropriate for analysis
3. Reduce image complexity
4. Contact support if persistent

**"Analysis failed: Image format not supported by AI"**

**Causes**:
- Unusual image format
- Corrupted image file
- Image too complex for AI processing

**Solutions**:
1. Convert to standard format (PNG, JPEG)
2. Try different image of same label
3. Ensure image is not corrupted
4. Simplify image (crop to label only)

### Browser-Specific Issues

**Chrome Issues**:
- Clear site data: Settings → Privacy → Site Settings → View permissions and data stored across sites
- Disable extensions in incognito mode
- Reset Chrome settings if necessary

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
- Try compatibility mode

## Network and Connectivity Issues

### Firewall and Security Software

**Issue**: Analysis requests blocked by firewall

**Solution**:
1. Add exception for generativelanguage.googleapis.com
2. Temporarily disable firewall to test
3. Check corporate firewall settings
4. Contact IT administrator if in corporate environment

**Issue**: VPN interfering with requests

**Solution**:
1. Try without VPN
2. Switch VPN server location
3. Use VPN with better Google API support
4. Configure VPN to allow Google AI services

### Proxy and Corporate Networks

**Issue**: Application doesn't work on corporate network

**Solution**:
1. Contact IT administrator
2. Request whitelist for googleapis.com domain
3. Try from personal network
4. Use mobile hotspot temporarily

## Data and Privacy Concerns

### Image Data Handling

**Question**: Where are my images stored?

**Answer**: Images are processed client-side only and sent directly to Google's Gemini API. No images are stored on our servers or in browser storage permanently.

**Question**: Can others see my label images?

**Answer**: No, images are processed privately through your API key and are not shared with other users.

### API Key Security

**Question**: Is my API key secure?

**Answer**: 
- API keys are stored in environment variables only
- Never commit API keys to code repositories
- Use different keys for development and production
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
4. Steps to reproduce issue
5. Screenshots if helpful
6. Network environment (corporate, home, etc.)

### TTB Regulatory Questions

For compliance questions, contact:
- TTB Labeling Resources: https://www.ttb.gov/labeling/labeling-resources
- ALFD Phone: 202-453-2250
- ALFD Contact Form: https://www.ttb.gov/about-ttb/contact-us/contact-alfd

### Self-Help Resources

**Browser Developer Tools**:
1. Press F12 to open developer tools
2. Check Console tab for error messages
3. Check Network tab for failed requests
4. Check Application tab for storage issues

**Application Logs**:
1. Open browser console (F12)
2. Look for error messages in red
3. Copy error text for support requests

This troubleshooting guide covers the most common issues encountered with the Alcohol Label Compliance Analyzer. If you encounter an issue not covered here, please contact support with detailed information about the problem.