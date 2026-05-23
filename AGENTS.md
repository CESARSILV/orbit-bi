<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRITICAL DATA INGESTION INSTRUCTIONS

The platform MUST fully support real-world exports from:
- Google Ads
- Meta Ads (Facebook Ads)
- Google Analytics
- CSV
- XLSX
- PDF reports
- screenshots
- multiple screenshots

The system MUST NOT only upload files.

It MUST:
- READ the file contents
- EXTRACT all tabular data
- IDENTIFY columns automatically
- NORMALIZE metrics
- CREATE structured database records
- MERGE multiple uploads intelligently
- HANDLE different export formats automatically
- DETECT duplicated periods and campaigns
- UNDERSTAND portuguese and english column names
- CREATE relationships between campaigns, adsets and ads

## GOOGLE ADS FILE SUPPORT

The system MUST correctly parse exports from Google Ads including:
- Campaign
- Ad Group
- Search Terms
- Keywords
- Devices
- Geographic
- Audience
- Asset Groups
- Performance Max
- Video campaigns

The parser must identify:
- Cost
- CPC
- CPM
- CTR
- Clicks
- Impressions
- Conversions
- Conversion Value
- ROAS
- CPA
- Revenue
- Search Impression Share
- Quality Score

The parser MUST work even if:
- columns are renamed
- columns are in PT-BR
- columns are in English
- exports contain empty rows
- exports contain merged cells
- exports contain notes

## META ADS FILE SUPPORT

The system MUST correctly parse Meta Ads exports including:
- Campaigns
- Ad Sets
- Ads
- Creatives
- Audiences
- Placements
- Demographics

The parser must identify:
- Spend
- Reach
- Impressions
- Frequency
- CPM
- CPC
- CTR
- Link Clicks
- Landing Page Views
- Leads
- Purchases
- Cost per Result
- ROAS
- Revenue

The parser MUST work even with:
- custom Meta exports
- PT-BR exports
- English exports
- inconsistent formatting
- duplicated columns

## OCR + SCREENSHOT INTELLIGENCE

The system MUST use multimodal OCR AI to analyze screenshots.

The AI MUST:
- detect tables
- detect metrics
- identify charts
- merge multiple screenshots
- reconstruct dashboards
- understand partial screenshots
- identify duplicated information
- organize data chronologically

If multiple screenshots belong to the same dashboard:
- merge all information automatically
- avoid duplicate records
- reconstruct the complete dataset

## MANDATORY FILE PROCESSING PIPELINE

The ingestion pipeline MUST follow this order:
1. Upload detection
2. File type detection
3. OCR / Spreadsheet parsing
4. Data extraction
5. Column normalization
6. Metric normalization
7. Campaign matching
8. Date matching
9. Duplicate cleaning
10. Database insertion
11. KPI recalculation
12. Dashboard realtime update

## REQUIRED TECHNICAL IMPLEMENTATION

Use robust parsing libraries and services:

### FRONTEND:
- react-dropzone
- papaparse
- sheetjs/xlsx

### BACKEND:
- Python pandas
- openpyxl
- tabula-py
- camelot
- OCR pipeline

### OCR:
- GPT-4o vision
- Tesseract
- multimodal extraction

### DATABASE:
- normalized relational schema
- campaign table
- adset table
- ads table
- metrics table
- daily performance table

# VERY IMPORTANT

The platform MUST NOT behave like a simple file uploader.
It MUST behave like:
- an intelligent BI ingestion engine
- a multimodal marketing analytics processor
- an autonomous data structuring system

The AI must fully understand marketing exports automatically without requiring manual mapping.

## FLEXIBLE COLUMN MAPPING

The system MUST use semantic column matching instead of fixed column names.

Example:
- "Valor usado"
- "Amount Spent"
- "Cost"
- "Gasto"

All represent: SPEND

The AI must normalize all equivalent metrics automatically.
