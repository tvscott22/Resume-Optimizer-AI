import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import Anthropic from "@anthropic-ai/sdk";
import type { DocumentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Copy into a Node.js Buffer immediately — ArrayBuffer can be detached after first use
    const nodeBuffer = Buffer.from(await file.arrayBuffer());

    // Fast path: try direct text extraction for text-based PDFs
    const { text: rawText } = await extractText(new Uint8Array(nodeBuffer), { mergePages: true });

    if (rawText?.trim()) {
      return NextResponse.json({ text: rawText.trim() });
    }

    // Fallback: use Claude to OCR scanned/image-based PDFs
    const base64 = nodeBuffer.toString("base64");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            } as DocumentBlockParam,
            {
              type: "text",
              text: "Extract all text from this resume exactly as it appears. Output only the extracted text — no commentary, formatting changes, or additional content.",
            },
          ],
        },
      ],
    });

    const ocrText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!ocrText) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. Try copying and pasting your resume text directly." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: ocrText });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse PDF." },
      { status: 500 }
    );
  }
}
