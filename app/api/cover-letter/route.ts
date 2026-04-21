import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const MOCK_MODE = !process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-");

const MOCK_COVER_LETTER = `Dear Hiring Manager,

I am writing to express my strong interest in the Senior Software Engineer position at Acme Corp. With over five years of experience building scalable backend systems and a passion for clean, maintainable architecture, I am confident I would be a strong addition to your engineering team.

Throughout my career I have developed a deep expertise in designing distributed systems and REST APIs that serve hundreds of thousands of users. At my most recent role, I led the migration of a monolithic platform to a microservices architecture, which improved deployment frequency by 3x and reduced system downtime significantly. I am particularly drawn to Acme Corp's focus on developer productivity and the scale of engineering challenges your team is tackling.

What excites me most about this role is the opportunity to work on infrastructure that directly impacts the speed and reliability of your platform. My experience with CI/CD pipelines, TypeScript, and cross-functional collaboration aligns closely with what you are looking for, and I am eager to bring that foundation to a team of this caliber.

I would welcome the opportunity to discuss how my background maps to your team's goals. Thank you for your time and consideration.

Sincerely,
Jane Smith`;

const SYSTEM_PROMPT = `You are an expert career coach who writes compelling, personalized cover letters.

RULES:
- Write in a confident, professional, and natural tone — not robotic or generic
- Reference specific experience and achievements from the resume
- Connect the candidate's background directly to the job description
- Do NOT fabricate experience, skills, or accomplishments not present in the resume
- Keep it to 4 paragraphs: opening, why this company/role, relevant experience, closing
- Do not use clichés like "I am a hard worker" or "I am passionate about..."
- Address it to "Dear Hiring Manager" unless a name is provided
- Sign off with the candidate's name if available, otherwise "Sincerely, [Your Name]"
- Return plain text only — no markdown, no formatting symbols`;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, company, role } = await req.json();

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "resume and jobDescription are required." },
        { status: 400 }
      );
    }

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json({ cover_letter: MOCK_COVER_LETTER });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Write a tailored cover letter for the following candidate.

${company ? `Company: ${company}` : ""}
${role ? `Role: ${role}` : ""}

Candidate's resume:
${resume}

Job description:
${jobDescription}

Return the cover letter as plain text only. No subject line, no markdown.`,
        },
      ],
    });

    const cover_letter =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    if (!cover_letter) {
      return NextResponse.json(
        { error: "Failed to generate cover letter." },
        { status: 500 }
      );
    }

    return NextResponse.json({ cover_letter });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}
