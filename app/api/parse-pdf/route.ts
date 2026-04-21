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
      const parser = new PDFParser();

      parser.on("pdfParser_dataReady", (data) => {
        const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
        const pages: string[] = data.Pages.map((page) =>
          page.Texts.map((t) => t.R.map((r) => decode(r.T)).join("")).join(" ")
        );
        resolve(pages.join("\n\n"));
      });

      parser.on("pdfParser_dataError", (err) => {
        reject(new Error(String(err.parserError ?? "PDF parse error")));
      });

      parser.parseBuffer(buffer);
    });

    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse PDF." },
      { status: 500 }
    );
  }
}
