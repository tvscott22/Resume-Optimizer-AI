import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api.js";
import { pathToFileURL } from "url";
import { resolve } from "path";

export const runtime = "nodejs";

// In Node.js, pdfjs needs a file:// URL pointing to the worker — not an empty string
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = new Uint8Array(buffer);

    const loadingTask = pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false });
    const pdf = await loadingTask.promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item): item is TextItem => "str" in item)
        .map((item) => item.str)
        .join(" ");
      pageTexts.push(pageText);
    }

    const text = pageTexts.join("\n\n").trim();

    if (!text) {
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
