# Resume Optimizer AI

An AI-powered resume optimization platform that tailors your resume to any job description — improving ATS compatibility, surfacing keyword gaps, and generating cover letters in seconds.

Many qualified candidates miss the first round not because they lack the experience, but because they don't articulate it in a way that maps to the role. Resume Optimizer AI never fabricates experience — it rewrites what you already have to communicate it more clearly and in language that resonates with the job description.

**[Live Demo →](https://resume-optimizer-ai-two.vercel.app)** *(password: resoptbeta26)*

---

## Features

- **AI Resume Optimization** — Claude analyzes your resume against a job description and rewrites it to be ATS-friendly and keyword-aligned
- **Match Score** — Color-coded keyword match score showing how well your resume covers the JD's key terms
- **One-Click Keyword Injection** — Missing keywords shown as clickable pills; Claude rewrites the best-fit bullet to naturally include them
- **Follow-Up Questions Engine** — Claude surfaces targeted questions based on JD gaps; your answers feed a re-optimization pass that weaves in hidden experience
- **AI Cover Letter Generator** — Tailored cover letter with copy and PDF download
- **Export to PDF & DOCX** — One-page optimized PDF with proper formatting, plus an editable Word document
- **Save Applications** — Save optimized resumes locally to track past applications
- **Mobile Responsive** — Works on any device

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| AI | Claude API (Anthropic) |
| PDF Parsing | pdf2json |
| PDF Export | html2pdf.js |
| DOCX Export | docx |
| Deployment | Vercel |
| CI | GitHub Actions |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/tvscott22/Resume-Optimizer-AI.git
cd Resume-Optimizer-AI

# Install dependencies
npm install

# Add environment variables
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

# Run locally
npm run dev
```

> **Note:** Without a valid `ANTHROPIC_API_KEY`, the app runs in mock mode with placeholder responses — useful for UI development.

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NEXT_PUBLIC_SITE_PASSWORD` | Beta access password |
