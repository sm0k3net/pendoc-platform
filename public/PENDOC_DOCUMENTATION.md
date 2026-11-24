# PenDoc - Professional Penetration Testing Documentation Platform

## Complete Product Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Dashboard & Navigation](#dashboard--navigation)
4. [Project Management](#project-management)
5. [Vulnerability Management](#vulnerability-management)
6. [AI-Powered Features](#ai-powered-features)
7. [Reporting System](#reporting-system)
8. [Client Portal](#client-portal)
9. [Collaboration Features](#collaboration-features)
10. [Security & Authentication](#security--authentication)
11. [API Documentation](#api-documentation)
12. [Tools & Integrations](#tools--integrations)

---

## Overview

PenDoc is a comprehensive penetration testing documentation and collaboration platform designed for security professionals. It provides tools for organizing vulnerability findings, collaborating with team members, sharing progress with clients, and generating professional penetration testing reports.

### Key Capabilities
- Project-based vulnerability tracking
- AI-powered attack vector analysis
- AI-generated remediation strategies
- Professional report generation (HTML/PDF)
- Client portal with read-only access
- Real-time collaboration
- Multi-language support (English/Russian)
- Dark/Light theme support

---

## Core Features

### 1. Project Organization
- **Hierarchical Structure**: Projects → Folders → Files
- **File Types**: Notes, code files, images, reports
- **Rich Text Editor**: Markdown support, code highlighting, embedded images
- **Version History**: Track changes with full version control
- **File Locking**: Prevent concurrent edits

### 2. Vulnerability Tracking
- **Severity Levels**: Critical, High, Medium, Low, Informational
- **Status Tracking**: Open, Fixed, Accepted, Ignored, Retest
- **CVSS Scoring**: Manual and AI-assisted CVSS 3.1 calculation
- **OWASP Classification**: Full OWASP Top 10 categorization
- **Affected Assets**: Track multiple affected targets per vulnerability
- **Proof of Concept**: Document exploitation steps
- **Remediation Guidance**: Built-in remediation recommendations

### 3. Client Management
- **Organization Profiles**: Company name, logo, website, notes
- **Contact Management**: Multiple contacts per client (up to 5)
- **Branding**: Custom branding per client
- **Access Control**: Granular permissions for client portal

---

## Dashboard & Navigation

### Main Dashboard
- **Project Tree**: Hierarchical view of all projects
- **Organization View**: Client-centric project organization
- **Quick Stats**: Total vulnerabilities, critical findings, reports
- **Recent Activity**: Latest changes and updates

### Sidebar Panels
1. **Tools Panel**: Exploit search, CVSS calculator, AI assistant
2. **Links Panel**: Quick access to external resources
3. **Data Panel**: Project/organization tree browser

### Navigation Features
- **Keyboard Shortcuts**: Quick navigation
- **Search**: Global search across projects
- **Breadcrumbs**: Current location tracking
- **Collapsible Sections**: Customizable workspace

---

## Project Management

### Creating Projects
```
Project Properties:
- Name (required)
- Description
- Client (optional)
- Environment Type: External, Internal, or Both
- Testing Model: Black Box, Gray Box, White Box
- Start/End Dates
- Rules of Engagement
```

### Scope Definition
Supports multiple scope item types:
- **FQDNs**: Domain names
- **URLs**: Web endpoints
- **IP Addresses**: Target IPs
- **Mobile Apps**: Application identifiers
- **Emails**: For social engineering
- **Phone Numbers**: For social engineering

### Project Dashboard Tabs

#### 1. Overview Tab
- Project statistics (files, folders, vulnerabilities)
- Vulnerability distribution charts
- Team participants
- Scope summary
- Configuration settings

#### 2. Attack Vector Tab
AI-generated attack scenario analysis:
- **Mermaid Diagram**: Visual attack flow with severity-colored nodes
- **Attack Description**: Detailed narrative of attack chain
- **Timeline Phases**: Step-by-step attack progression
- **Version History**: Previous generation versions
- **Export**: Download as SVG/PNG

#### 3. Remediation Strategy Tab
AI-generated remediation planning:
- **Executive Summary**: High-level security posture overview
- **Quick Wins**: Immediate low-effort fixes
- **Prioritized Items**: Ranked remediation tasks with:
  - Priority number
  - Severity and effort indicators
  - Timeline estimates
  - Step-by-step instructions
- **Long-term Goals**: Strategic security improvements
- **Export**: Download as Markdown

---

## Vulnerability Management

### Vulnerability Submission
Required fields:
- Title
- Severity (Critical/High/Medium/Low/Info)
- Project association

Optional fields:
- Short description
- Detailed description
- Affected targets
- CVSS score and vector
- OWASP category
- Tool used
- Execution command
- Proof of concept
- Remediation steps
- Reference URLs
- CVE IDs

### Duplicate Detection
AI-powered duplicate checking:
- Analyzes title and description
- Suggests similar existing vulnerabilities
- Confidence scoring
- Option to continue or cancel

### Bulk Validation (Vulnerabilities Dashboard)
- Select multiple vulnerabilities
- Bulk status changes (Fixed, Ignored, Accepted)
- Pagination with "Load More"
- Filtering by severity and status

### Retest Workflow
1. Client requests retest
2. Pentester receives notification
3. Pentester validates fix
4. Status updated with timestamp

---

## AI-Powered Features

### 1. Attack Vector Generation
Uses DeepSeek AI to analyze vulnerabilities and generate:
- Attack flow diagrams (Mermaid.js)
- Severity-colored nodes
- Attack narrative description
- Phase-by-phase timeline

### 2. Remediation Strategy Generation
AI analyzes open vulnerabilities to create:
- Prioritized remediation list
- Effort and timeline estimates
- Step-by-step instructions
- Quick wins identification
- Long-term security goals

### 3. AI CVSS Calculator
- Input vulnerability details
- AI calculates CVSS 3.1 score
- Generates vector string

### 4. Exploit Search with AI Context
- Search exploit databases (NVD, GitHub, PacketStorm)
- Optional AI analysis (disabled by default)
- When enabled: provide target context for relevance
- AI recommendations for exploit selection

### 5. Report Analysis
#### Gap Analysis
Analyzes reports for:
- Documentation gaps
- Potential false positives
- Prioritization issues
- Typos and formatting
- Missing information
- Compliance issues

#### Report Comparison
Compares two reports to identify:
- New vulnerabilities
- Fixed vulnerabilities
- Changed severities
- Security posture changes
- Remediation progress

### 6. AI Assistant
Context-aware AI help for:
- Summarizing content
- Converting to report format
- Identifying vulnerabilities
- Calculating CVSS scores
- Generating remediation steps
- Creating executive summaries
- Building timelines
- Custom queries

---

## Reporting System

### Report Generation
Formats available:
- **HTML**: Downloadable, print-ready
- **PDF**: Print to PDF from HTML

Languages:
- English
- Russian

### Report Types
- **Full Pentest Report**: Complete assessment documentation
- **Executive Summary**: High-level overview for management
- **Technical Report**: Detailed technical findings

### Report Contents
1. Cover page with project details
2. Table of contents
3. Project overview and scope
4. Executive summary with charts
5. Severity definitions
6. OWASP compliance checklists
7. Detailed findings with:
   - Description
   - Affected assets
   - Proof of concept
   - Remediation steps
   - CVSS score
   - References
8. Testing methodology
9. Remediation priority matrix
10. Tools used

### Reports Dashboard
- Total reports count
- Monthly trends chart
- Report type distribution
- Recent reports list
- AI Gap Analysis per report
- AI Report Comparison tool

---

## Client Portal

### Client Access Features
- **Read-only access** to project findings
- **Notification system** for updates
- **Retest requests** capability
- **Comment threads** on vulnerabilities
- **Branded interface** with client logo

### Client Notifications
Notification types:
- New vulnerability discovered
- Vulnerability status changed
- Comment/reply received
- Retest request response

### Email Notifications
- Up to 5 email addresses per client access
- Configurable notification preferences

---

## Collaboration Features

### Sharing
Permission levels:
- **Read**: View-only access
- **Read/Write**: Edit existing content
- **Read/Write/Add**: Full access including creation

### Sharing by Email
- Invite team members by email
- Automatic access provisioning
- Permission management

### Comments System
- Thread-based discussions
- Comment types: Comment, Action Item, Question
- Resolution tracking
- @mentions (future)

---

## Security & Authentication

### Authentication Methods
- Email/Password
- Google OAuth

### Row-Level Security (RLS)
All database tables protected with:
- User-based isolation
- Project-based access control
- Client access verification

### Audit Logging
Tracked actions:
- Login/logout
- Project CRUD
- Vulnerability changes
- Report generation
- File operations
- Share modifications

### Session Management
- Persistent sessions
- Auto-refresh tokens
- Secure logout

---

## API Documentation

### Edge Functions

#### `generate-attack-vector`
Generate AI attack scenario for a project.
```
POST /functions/v1/generate-attack-vector
Body: { projectId: string, action?: 'delete' }
Response: { diagram, description, timeline, vulnerabilityCount }
```

#### `generate-remediation-strategy`
Generate AI remediation plan for a project.
```
POST /functions/v1/generate-remediation-strategy
Body: { projectId: string }
Response: { executive_summary, items, quick_wins, long_term_goals }
```

#### `ai-report-analysis`
AI-powered report analysis.
```
POST /functions/v1/ai-report-analysis
Body: { action: 'gap-analysis' | 'compare', reportId?, reportId1?, reportId2? }
Response: { analysis: string }
```

#### `generate-report`
Generate pentest report.
```
POST /functions/v1/generate-report
Body: { projectId, format, language }
Response: { htmlContent, reportId }
```

#### `check-duplicate-vulnerability`
Check for duplicate vulnerabilities.
```
POST /functions/v1/check-duplicate-vulnerability
Body: { projectId, title, description }
Response: { duplicates: [], confidence: number }
```

#### `ai-assistant`
General AI assistance.
```
POST /functions/v1/ai-assistant
Body: { action, content, customPrompt?, fileType?, fileName? }
Response: { response: string }
```

### Import Functions
- `process-nmap`: Parse Nmap XML output
- `process-acunetix`: Parse Acunetix reports
- `process-nessus`: Parse Nessus exports
- `process-burpsuite`: Parse Burp Suite reports

---

## Tools & Integrations

### Built-in Tools

#### Exploit Search
- Search multiple databases
- AI-enhanced relevance scoring
- Import to documents

#### CVSS Calculator
- CVSS 3.1 compliant
- Manual vector input
- AI-assisted calculation

#### AI Assistant
- Context-aware responses
- Multiple action types
- Custom prompts

### External Integrations
- **PenDoc Tools API**: Exploit search
- **PenDoc AI API**: AI capabilities
- **DeepSeek API**: Attack vector and remediation generation

### Report Import
Supported formats:
- Nmap XML
- Acunetix JSON/XML
- Nessus .nessus
- Burp Suite XML

---

## Database Schema

### Core Tables
- `projects`: Project metadata and configuration
- `folders`: Hierarchical folder structure
- `files`: Documents and attachments
- `vulnerabilities`: Security findings
- `project_reports`: Generated reports
- `attack_vectors`: AI-generated attack scenarios

### User & Access
- `profiles`: User profiles
- `clients`: Client organizations
- `client_access`: Client portal access
- `shares`: Collaboration permissions

### Audit & Notifications
- `audit_logs`: Activity tracking
- `pentester_notifications`: User notifications
- `client_notifications`: Client notifications
- `notification_preferences`: Email settings

---

## Getting Started

1. **Create Account**: Sign up with email or Google
2. **Create Client** (optional): Add client organization
3. **Create Project**: Define scope and parameters
4. **Add Vulnerabilities**: Submit findings manually or import
5. **Generate Reports**: Create professional documentation
6. **Share with Clients**: Grant portal access

---

## Support

For support and feature requests, contact the PenDoc team.

---

*Document Version: 1.0*
*Last Updated: January 2026*
