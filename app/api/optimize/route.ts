import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { safeParseJson, isValidResult } from "@/lib/parseJson";

// Set to true to skip the Claude API and return mock data for UI testing
const MOCK_MODE = !process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-");

const MOCK_RESPONSE = {
  match_analysis: {
    summary:
      "Strong overall match. The candidate's background in software engineering aligns well with the role's core requirements, particularly around backend systems and cross-functional collaboration. A few gaps exist around specific tooling mentioned in the job description.",
    key_strengths: [
      "5+ years of backend engineering experience",
      "Proven track record of shipping at scale",
      "Strong communication and cross-team collaboration",
    ],
    gaps_or_weaknesses: [
      "No explicit mention of Kubernetes or container orchestration",
      "Limited public-facing work on distributed systems",
    ],
    keywords_to_emphasize: [
      "REST APIs",
      "distributed systems",
      "CI/CD",
      "TypeScript",
      "system design",
    ],
  },
  rewritten_resume: `Jane Smith
jane@example.com | linkedin.com/in/janesmith | github.com/janesmith

SUMMARY
Results-driven software engineer with 5+ years of experience building scalable backend systems and REST APIs. Adept at cross-functional collaboration and delivering high-impact features in fast-moving environments. Passionate about clean architecture and developer productivity.

EXPERIENCE

Acme Corp — Senior Software Engineer
Jan 2021 – Present
- Designed and shipped a distributed event-processing pipeline handling 50M+ events/day, reducing latency by 40%
- Led migration of monolithic services to microservices architecture, improving deployment frequency by 3x
- Partnered with product and design to define technical requirements and deliver features on schedule

Startup Inc — Software Engineer
Jun 2018 – Dec 2020
- Built and maintained REST APIs serving 200K+ daily active users
- Implemented CI/CD pipelines using GitHub Actions, cutting release cycles from 2 weeks to 2 days
- Mentored 2 junior engineers and led bi-weekly technical design reviews

SKILLS
TypeScript, Node.js, Python, PostgreSQL, Redis, REST APIs, distributed systems, CI/CD, system design, Docker`,
  bullet_improvements: [
    {
      original: "Worked on backend services for the platform",
      improved:
        "Designed and maintained backend services powering core platform features, supporting 200K+ daily active users",
    },
    {
      original: "Helped with CI/CD setup",
      improved:
        "Implemented end-to-end CI/CD pipelines using GitHub Actions, reducing release cycles from 2 weeks to 2 days",
    },
    {
      original: "Collaborated with other teams",
      improved:
        "Partnered cross-functionally with product, design, and data teams to define requirements and ship features on schedule",
    },
  ],
  summary_section:
    "Results-driven software engineer with 5+ years of experience building scalable backend systems and REST APIs. Adept at cross-functional collaboration and delivering high-impact features in fast-moving environments. Passionate about clean architecture, system design, and developer productivity.",
  follow_up_questions: [
    "Have you worked with container orchestration tools like Kubernetes or Docker Swarm? This role lists it as a key requirement but it's not mentioned in your resume.",
    "Did you own or contribute to any system design decisions at Acme Corp? The JD emphasizes architectural thinking.",
    "Have you worked in an on-call rotation or owned production reliability for any of your systems?",
    "Were there any mentorship or leadership responsibilities in your recent roles beyond what's listed?",
  ],
};

const SYSTEM_PROMPT = `You are an expert resume strategist and former recruiter.

Your job is to optimize resumes for higher response rates WITHOUT fabricating or inventing experience.

STRICT RULES:
- Do NOT add new roles, skills, or experiences that are not present
- You may reframe, restructure, and enhance clarity
- You may suggest metrics, but only if clearly marked as optional
- Keep language concise, sharp, and results-oriented
- Avoid fluff and generic phrases

KEYWORD STRATEGY:
- Extract the most important keywords from the job description
- Integrate them naturally into bullet points and skills sections
- Do NOT keyword stuff or repeat keywords unnaturally
- Prioritize contextual usage over frequency

FORMATTING RULES:
- Output a clean, single-column, ATS-friendly resume
- Use only these standard sections in this order: Summary, Experience, Skills
- Every bullet point must:
  - Start with a strong action verb
  - Include measurable impact or results when possible
  - Be concise — 1 to 2 lines maximum
- Use plain hyphens (-) for bullet points, no special characters
- No tables, columns, icons, or complex layouts
- Maintain consistent spacing: one blank line between sections, no extra blank lines within sections

PDF READINESS:
- The rewritten_resume field must be plain text that translates cleanly into a professional PDF
- Use only standard ASCII characters
- Structure must be consistent and predictable for clean rendering

FOLLOW-UP QUESTIONS:
- After analyzing the resume against the job description, generate 3-5 targeted follow-up questions
- Each question should reference a specific gap, requirement, or keyword from the JD that isn't addressed in the resume
- Questions should prompt the user to think of real experience they may have forgotten to include
- Keep questions concise and specific — not generic
- Do NOT ask about skills or experience already present in the resume

GOAL:
Align the candidate's real experience as closely as possible with the job description, improving clarity, keyword alignment, and impact.`;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "resume and jobDescription are required." },
        { status: 400 }
      );
    }

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json(MOCK_RESPONSE);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userMessage = `Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.

Here is a candidate's resume:

${resume}

Here is the job description:

${jobDescription}

Rewrite the resume following ALL formatting and keyword rules from your instructions. The rewritten_resume must:
- Use only plain text with sections in this order: Summary, Experience, Skills
- Use hyphens (-) for bullet points
- Have one blank line between sections
- Contain no special characters, tables, or symbols

Return exactly this JSON structure and nothing else:

{
  "match_analysis": {
    "summary": "2-3 sentence overview of fit",
    "key_strengths": ["strength 1", "strength 2"],
    "gaps_or_weaknesses": ["gap 1", "gap 2"],
    "keywords_to_emphasize": ["keyword1", "keyword2"]
  },
  "rewritten_resume": "full rewritten resume as plain text",
  "bullet_improvements": [
    {
      "original": "original bullet point",
      "improved": "improved bullet point"
    }
  ],
  "summary_section": "suggested professional summary paragraph",
  "follow_up_questions": [
    "Question 1 — reference a specific gap or requirement from the JD and ask if the candidate has relevant experience not yet mentioned",
    "Question 2",
    "Question 3"
  ]
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const parsed = safeParseJson(rawText);

    if (!isValidResult(parsed)) {
      const raw = "error" in parsed ? parsed.raw : rawText;
      return NextResponse.json(
        { error: "Failed to parse AI response.", raw },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}
