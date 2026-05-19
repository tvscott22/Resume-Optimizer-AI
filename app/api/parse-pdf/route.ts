import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const text = await new Promise<string>((resolve, reject) => {
      // Pass true as second arg to enable raw text collection via getRawTextContent()
      const parser = new PDFParser(null, true);

      parser.on("pdfParser_dataReady", () => {
        resolve(parser.getRawTextContent());
      });

      parser.on("pdfParser_dataError", (err) => {
        const msg =
          err instanceof Error
            ? err.message
            : String((err as { parserError?: unknown }).parserError ?? "PDF parse error");
        reject(new Error(msg));
      });

      parser.parseBuffer(buffer);
    });

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No text found in this PDF. It may be a scanned/image-based file." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse PDF." },
      { status: 500 }
    );
  }
}
