import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { safeParseJson } from "@/lib/parseJson";

const MOCK_MODE = !process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-");

const SYSTEM_PROMPT = `You are an expert resume strategist. A candidate has already had their resume optimized against a job description. They have now answered follow-up questions that reveal additional relevant experience.

Your job is to produce a stronger second-pass resume that incorporates their answers naturally.

STRICT RULES:
- Only add experience the candidate explicitly confirmed in their answers
- Do NOT fabricate or infer experience beyond what they described
- Integrate new details into existing bullet points or add new ones where appropriate
- Maintain ATS-friendly plain text formatting
- Keep language concise, results-oriented, and action-verb led
- Use hyphens (-) for bullet points, no special characters
- Sections in this order: Summary, Experience, Skills`;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, answers } = await req.json();

    if (!resume?.trim() || !jobDescription?.trim() || !answers?.length) {
      return NextResponse.json(
        { error: "resume, jobDescription, and answers are required." },
        { status: 400 }
      );
    }

    const filledAnswers = answers.filter((a: { question: string; answer: string }) => a.answer?.trim());
    if (!filledAnswers.length) {
      return NextResponse.json(
        { error: "Please answer at least one question." },
        { status: 400 }
      );
    }

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 1500));
      return NextResponse.json({
        rewritten_resume: resume + "\n\n[Mock re-optimized with your answers]",
        summary_section: "Re-optimized summary incorporating your additional experience.",
        bullet_improvements: [],
      });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const qaBlock = filledAnswers
      .map((a: { question: string; answer: string }) => `Q: ${a.question}\nA: ${a.answer}`)
      .join("\n\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.

Here is the candidate's current optimized resume:

${resume}

Here is the job description:

${jobDescription}

The candidate answered these follow-up questions revealing additional experience:

${qaBlock}

Rewrite the resume incorporating their answers. Return exactly this JSON structure:

{
  "rewritten_resume": "full rewritten resume as plain text",
  "summary_section": "updated professional summary paragraph",
  "bullet_improvements": [
    {
      "original": "original bullet point",
      "improved": "improved bullet point with new context"
    }
  ]
}`,
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = safeParseJson(rawText);

    if ("error" in parsed) {
      return NextResponse.json(
        { error: "Failed to parse AI response.", raw: parsed.raw },
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
