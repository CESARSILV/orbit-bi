<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI MARKETING BI PLATFORM — MASTER SYSTEM PROMPT (PRODUCTION READY)

IMPORTANT:
THE ENTIRE PLATFORM MUST ALWAYS BE IN BRAZILIAN PORTUGUESE (PT-BR), regardless of the language used in prompts, uploads, internal logic or AI processing.

ALL UI ELEMENTS MUST BE IN PT-BR:
- buttons
- dashboards
- charts
- reports
- AI chat
- notifications
- tooltips
- labels
- KPIs
- filters
- tables
- exports
- settings

The platform must feel like a premium next-generation SaaS product.

====================================================
PRIMARY OBJECTIVE
====================================================

Create an advanced AI-powered Business Intelligence SaaS platform focused on:

- Google Ads analytics
- Meta Ads analytics
- executive dashboards
- marketing intelligence
- paid media reporting
- strategic insights
- realtime KPI visualization

The platform must help users:
- analyze marketing performance
- compare periods
- identify trends
- detect bottlenecks
- generate executive reports
- make strategic decisions
- present monthly results in meetings

The AI must behave like:
- senior media buyer
- growth strategist
- marketing analyst
- BI consultant
- executive assistant

====================================================
CRITICAL IMPLEMENTATION RULE
====================================================

DO NOT create a fake dashboard UI without real data processing.

The platform MUST implement a REAL structured data ingestion system.

The application MUST prioritize:
1. stable imports
2. reliable database structure
3. metric normalization
4. KPI calculation
5. dashboard rendering

ONLY AFTER that:
- animations
- AI insights
- advanced visual effects

====================================================
V1 IMPORT SYSTEM (MANDATORY)
====================================================

VERSION 1 MUST SUPPORT ONLY:

- CSV imports
- XLSX imports

DO NOT IMPLEMENT OCR OR SCREENSHOT ANALYSIS IN V1.

DO NOT implement autonomous screenshot interpretation yet.

The first version must focus on reliable structured data imports.

====================================================
SUPPORTED SOURCES
====================================================

The platform must support imports from:

GOOGLE ADS:
- campaign reports
- ad group reports
- keyword reports
- search term reports
- device reports
- audience reports

META ADS:
- campaign exports
- ad set exports
- ad exports
- audience exports
- placement exports

====================================================
MANDATORY IMPORT FLOW
====================================================

Create a PROFESSIONAL IMPORT WIZARD.

The import flow MUST work exactly like this:

STEP 1:
User uploads CSV or XLSX file

STEP 2:
System detects:
- platform
- available sheets
- columns
- date ranges

STEP 3:
System displays spreadsheet preview

STEP 4:
AI suggests automatic column mapping

STEP 5:
User confirms or edits mappings

STEP 6:
System saves reusable import template

STEP 7:
System processes data asynchronously

STEP 8:
System normalizes metrics

STEP 9:
System inserts records into database

STEP 10:
System recalculates KPIs

STEP 11:
Dashboards update in realtime

====================================================
MANDATORY COLUMN NORMALIZATION
====================================================

The system MUST normalize all metrics into standardized fields.

Examples:

"Valor usado"
"Cost"
"Amount Spent"
"Gasto"

ALL become:
SPEND

Examples:

"Clique no link"
"Link Clicks"
"Cliques"

ALL become:
CLICKS

====================================================
STANDARDIZED METRIC ENGINE
====================================================

Create a unified metric schema with:

SPEND
CLICKS
IMPRESSIONS
CTR
CPC
CPM
CPA
CPL
ROAS
REVENUE
PURCHASES
LEADS
CONVERSIONS
FREQUENCY
REACH

The system MUST create one unified structure independent of source platform.

====================================================
DATABASE ARCHITECTURE
====================================================

Create normalized relational database tables:

platforms
accounts
campaigns
adsets
ads
daily_metrics
imports
import_templates
users

====================================================
PROCESSING ENGINE
====================================================

File processing MUST be asynchronous.

After upload:
- queue processing
- parse spreadsheet
- validate rows
- normalize metrics
- detect duplicates
- save records
- calculate KPIs
- refresh dashboards

====================================================
ERROR HANDLING
====================================================

The platform MUST gracefully handle:

- empty rows
- broken spreadsheets
- duplicated columns
- missing metrics
- invalid dates
- merged spreadsheet cells
- inconsistent formatting

The UI must clearly show:
- import errors
- warnings
- missing mappings
- duplicate detections
- processing progress

====================================================
AI ANALYTICS CHAT
====================================================

Create a native AI assistant integrated into the dashboard.

The AI assistant must:
- answer questions about metrics
- explain performance changes
- compare periods
- summarize campaigns
- generate insights
- suggest optimizations
- identify waste
- recommend scaling opportunities

Examples:
- “Qual campanha teve melhor ROAS?”
- “Por que o CPA aumentou?”
- “Compare os últimos 3 meses.”
- “Onde estamos perdendo verba?”
- “Qual campanha escalar?”

The AI MUST use real imported data.

====================================================
REPORT GENERATION
====================================================

Create premium executive reports in:

- PDF
- Excel

====================================================
PDF REPORTS
====================================================

PDF reports must include:
- premium design
- executive summary
- KPI overview
- trend analysis
- charts
- comparisons
- strategic insights
- AI-generated conclusions

The visual style should resemble:
- McKinsey
- Apple
- Stripe
- Linear

====================================================
EXCEL EXPORTS
====================================================

Excel exports MUST:
- contain formulas
- remain editable
- auto recalculate metrics
- contain professional formatting
- include filters
- include KPI summaries

====================================================
EXECUTIVE DASHBOARD
====================================================

Create realtime dashboards with:

- KPI cards
- trend charts
- comparison charts
- timeline graphs
- campaign tables
- top performers
- worst performers
- platform comparison

====================================================
VISUAL STYLE
====================================================

The visual design must be:
- premium
- elegant
- futuristic
- minimalist
- ultra smooth

References:
- Apple
- Linear
- Stripe
- Notion
- Framer
- Arc Browser
- Raycast

====================================================
UI/UX REQUIREMENTS
====================================================

Use:
- smooth transitions
- realtime animations
- glassmorphism
- elegant typography
- modern spacing
- premium dark mode
- fluid hover effects
- motion design
- GPU accelerated animations

Dashboards must feel alive and responsive.

====================================================
RECOMMENDED STACK
====================================================

FRONTEND:
- React
- Next.js
- Tailwind
- Framer Motion
- TanStack Table
- Recharts or ECharts

FILE IMPORT:
- react-dropzone
- papaparse
- sheetjs/xlsx

BACKEND:
- Node.js
- Python microservices
- pandas
- openpyxl

DATABASE:
- PostgreSQL
- Supabase

AI:
- OpenAI API

====================================================
PERFORMANCE REQUIREMENTS
====================================================

The application must:
- load fast
- process imports efficiently
- support large spreadsheets
- update dashboards in realtime
- avoid UI freezes
- use caching
- use lazy loading

====================================================
IMPORTANT FINAL RULES
====================================================

DO NOT create fake analytics.

DO NOT generate static dashboards with mock data.

The system MUST:
- process REAL imported files
- normalize REAL metrics
- calculate REAL KPIs
- generate REAL reports

The platform must behave like:
- Triple Whale
- Supermetrics
- Looker Studio AI
- Northbeam

Focus on:
1. stable ingestion
2. reliable processing
3. normalized metrics
4. accurate dashboards
5. executive reporting
6. AI-powered insights

Only after the import pipeline is stable should advanced AI OCR and screenshot analysis be implemented.
