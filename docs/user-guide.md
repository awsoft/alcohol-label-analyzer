# User Guide

## Getting Started

The Alcohol Label Compliance Analyzer helps you check whether your alcohol beverage labels meet TTB (Alcohol and Tobacco Tax and Trade Bureau) requirements. This guide walks you through using all features of the application.

## Interface Overview

### Header
- **Aardwolf Logo**: Application branding
- **Theme Toggle**: Switch between light and dark mode
- **Settings**: Gear icon for optionally adding your own Gemini API key — without one, analysis runs through the app's server

### Main Analysis Area
- **Mode Selector**: Switch between "Verify Application" (the default), "New Label" analysis, and "Label Change" comparison
- **Image Upload Section**: Upload and manage label images
- **Product Requirements**: Configure specific ingredients in your product
- **Beverage Category Selector**: Choose your product type
- **Analyze Button**: Start the compliance analysis
- **Results Display**: View detailed analysis results

## Verifying a Label Against an Application (Verify Application Mode)

The app opens in "Verify Application" mode. It is built for agents checking a submitted label against the COLA application data on file: enter the application data, upload the label image, and get a field-by-field match verdict — typically in 2–3 seconds.

### Single Application

1. Fill in the application data form. Four fields are required: Brand Name, Class/Type, Alcohol Content, and Net Contents. Bottler/Producer and Country of Origin (imports only) are optional — leave them blank to skip those checks
2. Drag a label image into the dropzone, or click "Select Image" (one image per verification)
3. Select the beverage category
4. Click "Verify Label" — the result banner shows the elapsed time next to the verdict

### Reading the Verdicts

**Overall banner** — one of three results, computed deterministically from the individual checks below (not chosen by the AI):
- **PASS**: every application field matched and the Government Warning passed
- **FAIL**: at least one field mismatched or was not found on the label, or the Government Warning failed
- **NEEDS REVIEW**: nothing failed outright, but at least one check was too unclear to judge — agent judgment required

**Field table** — one row per application field, showing the application value, the exact text found on the label ("On Label"), a status chip, and a one-line note:
- **MATCH**: same information. Differences in capitalization, punctuation, or spacing still count as a match, as do equivalent expressions — "45% Alc./Vol." matches "90 Proof" (proof is 2× ABV), and "750 mL" matches "750ML" or "75 cl". The note mentions any such difference
- **MISMATCH**: substantively different (different name, number, or designation)
- **NOT FOUND**: the value does not appear anywhere on the label
- **NEEDS REVIEW**: visible but too unclear or ambiguous to judge confidently

**Government Health Warning card** — checked on every label regardless of the application data, with three checks: present, exact word-for-word wording, and "GOVERNMENT WARNING:" in capital letters and bold type.

**Image quality** — if the photo is blurry, glared, or taken at an angle, a yellow warning box describes the problem. Treat verdicts from poor-quality images with caution.

### Verifying a Batch

Switch to the "Batch" tab to verify many applications in one run. Each image is one application.

1. Click "Add Label Images" (or drag and drop) to add all the label images
2. Fill in the four required fields inline on each row, **or** import them from a CSV:
   - Click "Download CSV template" to get the expected format — columns: `image`, `brand_name`, `class_type`, `alcohol_content`, `net_contents`, `bottler_name`, `country_of_origin`, `beverage_category`
   - Upload the images first, then click "Import Application CSV". Rows are matched to images by file name; the app reports any CSV rows with no matching image
3. The beverage category selector below the rows applies to every row that did not get a category from the CSV
4. Click "Verify All" — verifications run in parallel (four at a time). Each row gets a PASS / FAIL / NEEDS REVIEW chip with its own timing, and a summary line shows the totals (x pass · y fail · z review — total seconds)
5. Click "Detail" on any row to expand its full field-by-field result, and "Export Results CSV" to download the per-image results

## Step-by-Step Analysis Process (New Label Mode)

For a full TTB compliance review of a new label, switch to "New Label" using the mode selector at the top.

### Step 1: Upload Label Images

The application supports multi-image analysis for comprehensive label review.

**Supported Image Types:**
- **Front Label**: Main product label with brand name and basic information
- **Back Label**: Ingredients, allergen warnings, and producer information
- **Neck Label**: Collar labels with additional branding or age statements
- **Side Label**: Side panels or additional label information
- **Other Label**: Supplementary stickers, medallions, or certifications

**Upload Process:**
1. Click the "Upload Images" area or drag and drop images
2. Select up to 5 image files (PNG, JPEG, WEBP, HEIC, HEIF supported)
3. Choose the appropriate label type for each image
4. Images are automatically optimized for AI analysis (very large images are downscaled)

**Image Requirements:**
- **File Size**: Maximum 5MB per image
- **Resolution**: At least 800x600 pixels recommended for best results
- **Quality**: Clear, well-lit images with readable text
- **Format**: PNG, JPEG, WEBP, HEIC, or HEIF

### Step 2: Configure Product Requirements

Specify which special ingredients are present in your product. This ensures accurate compliance checking.

**Available Options:**

**Declaration of Sulfites**
- Check if your product contains sulfites (10 ppm or more)
- Required disclosure for wine and some spirits
- AI will look for proper sulfite declarations on labels

**Declaration of Yellow Number Five (FD&C Yellow #5)**
- Check if your product contains Yellow #5 dye
- Required disclosure for colored beverages
- AI will verify proper color additive declarations

**Declaration of Aspartame**
- Check if your product contains aspartame
- Required warning for products with artificial sweeteners
- AI will look for phenylalanine warnings

**Important Notes:**
- Only check ingredients that are actually in your product
- Incorrect selections may lead to inaccurate compliance assessments
- These settings cannot be changed after starting analysis (start fresh for different settings)

### Step 3: Select Beverage Category

Choose the appropriate category for your alcoholic beverage:

**Distilled Spirits**
- Vodka, whiskey, rum, gin, brandy, tequila
- Most comprehensive TTB requirements
- Includes age statements, commodity declarations, state of distillation

**Wine**
- Table wine, sparkling wine, dessert wine, cider, mead
- Specific requirements for wine labeling
- Includes vineyard designations, foreign wine percentages

**Malt Beverages**
- Beer, ale, lager, stout, IPA, porter
- Fewer additional requirements compared to spirits and wine
- Focus on basic mandatory elements

### Step 4: Start Analysis

1. Click the "Analyze Labels" button
2. The AI will process all uploaded images simultaneously
3. Processing typically takes 30-60 seconds depending on image complexity
4. A loading indicator shows progress

**During Analysis:**
- All controls are disabled to prevent changes
- The button shows "Processing..."
- Stay on the page — results appear when processing completes

### Step 5: Review Results

The analysis results are presented in several sections:

**Compliance Status Overview**
- Overall compliance rating (Compliant, Partially Compliant, Non-Compliant, Unable to Determine)
- Compliance score — compliant items out of those that apply (items marked Not Required are excluded)
- Key issues summary
- Color-coded status indicator

**TTB Mandatory Label Information**
Detailed analysis of required elements:
- Brand Name
- Class and Type Designation
- Alcohol Content (ABV)
- Net Contents
- Name and Address of Bottler/Producer/Importer
- Government Health Warning Statement
- Country of Origin (for imported products)

**Category-Specific Requirements**
Additional requirements based on beverage type:
- Coloring materials (spirits)
- Wood treatment (whisky/brandy)
- Age statements (whisky, brandy)
- State of distillation (U.S. whisky)
- Foreign wine percentages (wine)
- Ingredient-specific declarations

**Compliance Observations**
- Missing mandatory information
- Prohibited practices or statements
- Legibility and conspicuousness assessment
- General TTB compliance comments

**Each Item Shows:**
- TTB compliance status badge (Compliant, Non-Compliant, Potential Issue, Not Required)
- "On the label:" — the exact text as it appears on your labels (click an item to expand it)
- "TTB Compliance Notes:" — detailed explanations grounded in TTB rules

## Comparing Label Versions (Label Change Mode)

Use Label Change mode to find out whether a label revision requires a new TTB submission:

1. Switch to "Label Change" using the mode selector at the top
2. Upload your current (approved) label image and your proposed (new) label image
3. Select the beverage category
4. Click "Analyze Label Changes"

The results show a TTB submission determination (Required, Recommended, Not Required, or Uncertain) with a risk level and reasoning, plus each detected change grouped by significance:

- **Critical Changes**: Require TTB submission (brand name, alcohol content, mandatory statements)
- **Minor Changes**: May require TTB submission (ingredients, optional statements)
- **Cosmetic Changes**: No TTB submission required (colors, fonts, graphics)

Each change lists its current and proposed values, a written description of where it appears on the label, and why it matters for TTB submission. The report ends with recommendations and a final determination. If the two versions are identical, the app shows an explicit "No Differences Detected" notice.

Note: change locations are textual descriptions only — the app does not draw highlights on the images. Always verify reported changes against the actual labels.

## Exporting Results

### PDF Report Generation

After analysis completion (New Label mode), you can generate a comprehensive PDF report:

1. Click the "Download Report (PDF)" button in the results section
2. The system generates a formatted PDF with:
   - Compliance status overview with score and key issues
   - Overall TTB compliance summary
   - Detailed analysis of every mandatory item
   - Additional compliance observations

**PDF Features:**
- Professional formatting
- Complete analysis results
- Date and timestamp
- Includes a disclaimer — the report is informational and not official TTB guidance

### Sharing Results

- Copy analysis text for sharing
- Screenshots of results for presentations
- PDF reports for official documentation

## Best Practices

### Image Quality Tips

**Lighting:**
- Use natural daylight or bright, even lighting
- Avoid shadows that obscure text
- Ensure consistent lighting across the label

**Positioning:**
- Hold camera parallel to label surface
- Fill the frame with the label
- Keep labels flat (not curved on bottles)

**Focus:**
- Ensure all text is sharp and readable
- Use macro mode for small text if available
- Take multiple shots if needed

### Analysis Accuracy

**Complete Information:**
- Upload all relevant label images
- Include front, back, and any neck/side labels
- Don't forget small text areas

**Accurate Configuration:**
- Only select ingredients actually in your product
- Choose the correct beverage category
- Review product requirements carefully

**Multiple Angles:**
- If text is hard to read, try different angles
- Flatten curved labels when possible
- Use additional lighting if needed

## Understanding Results

### Compliance Status Meanings

**Compliant**
- Item fully meets TTB requirements
- No changes needed for this element
- Ready for TTB submission

**Non-Compliant**
- Item clearly violates TTB requirements
- Missing required information
- Immediate attention needed

**Potential Issue**
- Item may need TTB evaluation
- Unclear compliance status
- Recommended TTB consultation

**Not Required**
- Item not applicable to this product type
- Based on your product requirements
- Excluded from the compliance score
- No action needed

### Common Issues and Solutions

**Missing Brand Name**
- Ensure brand name is visible and prominent
- Check if it's obscured by glare or shadows
- Verify it's on the front label

**Unclear Alcohol Content**
- Look for "% ALC. BY VOL." or similar
- Ensure it's properly formatted
- Check if it's within TTB tolerance ranges

**Health Warning Issues**
- Verify complete warning text is present
- Check for proper capitalization ("GOVERNMENT WARNING:")
- Ensure adequate size and contrast

**Address Information**
- Confirm complete producer/bottler address
- Check for proper "Bottled by" or "Imported by" language
- Verify city and state are included

## Limitations and Considerations

### AI Analysis Limitations

- AI provides guidance, not legal advice
- Final TTB approval requires official submission
- Complex cases may need human expert review
- AI may miss very small or unclear text

### When to Consult Experts

- Novel product types or formulations
- Conflicting regulatory interpretations
- Complex age or geographic designations
- Special claims or certifications

### TTB Resources

For official guidance:
- TTB Labeling Resources: https://www.ttb.gov/labeling/labeling-resources
- ALFD Contact: 202-453-2250
- COLAs Online: https://www.ttb.gov/colas-online

## Troubleshooting

### Upload Issues
- Check file size (under 5MB)
- Verify supported format (PNG, JPEG, WEBP, HEIC, HEIF)
- Try refreshing the page
- Check internet connection

### Analysis Errors
- Check the Settings menu (gear icon): analysis needs either the app's server key or your own Gemini API key
- Check image quality and readability
- Try uploading fewer or smaller images
- Contact support if errors persist

### Result Interpretation
- Review the [Compliance Analysis Guide](./compliance-analysis.md)
- Check TTB regulations for official requirements
- Consider consulting with regulatory experts

## Getting Help

If you need assistance:
1. Check this user guide for basic operations
2. Review the [Troubleshooting Guide](./troubleshooting.md)
3. Consult TTB resources for regulatory questions
4. Contact technical support for application issues