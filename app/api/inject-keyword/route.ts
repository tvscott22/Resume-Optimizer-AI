import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"
import { safeParseJson } from "@/lib/parseJson"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert resume strategist.

A keyword is missing from the resume but is likely implied by a bullet.

Your task:
- Rewrite the bullet to naturally incorporate the keyword
- Do NOT fabricate experience
- Keep it concise and impact-driven`

export async function POST(req: NextRequest) {
  try {
    const { keyword, bullet } = await req.json()

    if (!keyword?.trim() || !bullet?.trim()) {
      return NextResponse.json(
        { error: "keyword and bullet are required." },
        { status: 400 }
      )
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.

Keyword: ${keyword}

Bullet:
${bullet}

OUTPUT:
{"improved_bullet": "..."}`,
        },
      ],
    })

    const rawText = message.content[0].type === "text" ? message.content[0].text : ""
    const parsed = safeParseJson(rawText)

    if ("error" in parsed) {
      return NextResponse.json(
        { error: "Failed to parse AI response.", raw: parsed.raw },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    )
  }
}
