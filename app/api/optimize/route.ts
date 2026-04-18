import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert resume strategist and former recruiter.

Your job is to optimize resumes for higher response rates WITHOUT fabricating or inventing experience.

STRICT RULES:
- Do NOT add new roles, skills, or experiences that are not present
- You may reframe, restructure, and enhance clarity
- You may suggest metrics, but only if clearly marked as optional
- Keep language concise, sharp, and results-oriented
- Avoid fluff and generic phrases

GOAL:
Align the candidate's real experience as closely as possible with the job description, improving clarity, keyword alignment, and impact.`;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "resume and jobDescription are required." }, { status: 400 });
    }

    const userMessage = `Here is a candidate's resume:

${resume}

Here is the job description:

${jobDescription}

Return your response in JSON with the following structure:

{
  "match_analysis": {
    "summary": "...",
    "key_strengths": ["..."],
    "gaps_or_weaknesses": ["..."],
    "keywords_to_emphasize": ["..."]
  },
  "rewritten_resume": "...",
  "bullet_improvements": [
    {
      "original": "...",
      "improved": "..."
    }
  ],
  "summary_section": "..."
}

IMPORTANT:
- Do not fabricate experience
- Keep rewritten resume clean and ready to use
- Maintain truthful representation
- Return ONLY valid JSON, no markdown code fences`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to parse AI response." }, { status: 500 });
      }
      parsed = JSON.parse(jsonMatch[0]);
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
