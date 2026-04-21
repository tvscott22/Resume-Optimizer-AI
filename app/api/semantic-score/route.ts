import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { keywords, resume } = await req.json()

    if (!Array.isArray(keywords) || !keywords.length || !resume?.trim()) {
      return NextResponse.json(
        { error: "keywords (array) and resume (string) are required." },
        { status: 400 }
      )
    }

    const resumeLower = resume.toLowerCase()
    const matched = keywords.filter((k: string) =>
      resumeLower.includes(k.toLowerCase())
    )
    const score = Math.round((matched.length / keywords.length) * 100)

    return NextResponse.json({ score })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    )
  }
}
