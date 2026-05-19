"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawError, setRawError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setFileLoading(true);
    setUploadedFileName(file.name);
    setError("");
    try {
      if (file.name.endsWith(".txt") || file.type === "text/plain") {
        const text = await file.text();
        setResume(text);
      } else if (
        file.name.endsWith(".pdf") ||
        file.type === "application/pdf"
      ) {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .filter((item) => "str" in item)
            .map((item) => (item as { str: string }).str)
            .join(" ");
          pages.push(pageText);
        }

        const text = pages.join("\n\n").trim();
        if (!text) throw new Error("No text found. This PDF may be image-based.");
        setResume(text);
      } else {
        throw new Error("Unsupported file type. Use .txt or .pdf");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file.");
      setUploadedFileName("");
    } finally {
      setFileLoading(false);
    }
  }, []);

  async function handleOptimize() {
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Please fill in both the resume and job description.");
      return;
    }
    setError("");
    setRawError("");
    setLoading(true);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.raw) setRawError(data.raw);
        throw new Error(data.error || "Something went wrong.");
      }
      sessionStorage.setItem(
        "optimizeResult",
        JSON.stringify({ ...data, originalResume: resume, jobDescription })
      );
      router.push("/results");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-57px)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-8 sm:mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Tailor your resume with AI
          </h1>
          <p className="mt-3 text-base text-gray-500 max-w-lg mx-auto leading-relaxed">
            Upload your resume and paste a job description. AI aligns your
            experience to the role — no fabrication, ever.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Resume */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Your Resume
            </label>

            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) await processFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await processFile(file);
                  e.target.value = "";
                }}
              />

              {fileLoading ? (
                <div className="flex items-center justify-center gap-2 py-1">
                  <svg
                    className="animate-spin h-4 w-4 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm text-gray-400">
                    Extracting text…
                  </span>
                </div>
              ) : uploadedFileName ? (
                <div className="flex items-center justify-center gap-2 py-1">
                  <svg
                    className="w-4 h-4 text-green-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700 font-medium truncate max-w-[180px]">
                    {uploadedFileName}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFileName("");
                      setResume("");
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-1 leading-none"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="py-1">
                  <svg
                    className="w-8 h-8 text-gray-300 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-blue-600">
                      Click to upload
                    </span>{" "}
                    or drag & drop
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">.txt or .pdf</p>
                </div>
              )}
            </div>

            <textarea
              className="w-full h-44 sm:h-60 p-4 border border-gray-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-gray-400"
              placeholder="Or paste your resume text here…"
              value={resume}
              onChange={(e) => {
                setResume(e.target.value);
                if (uploadedFileName) setUploadedFileName("");
              }}
            />
          </div>

          {/* Job Description */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Job Description
            </label>
            <textarea
              className="w-full flex-1 min-h-[220px] sm:min-h-[384px] p-4 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-gray-400"
              placeholder="Paste the full job description here…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Errors */}
        {error && (
          <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>
        )}
        {rawError && (
          <details className="mt-3">
            <summary className="text-sm text-amber-600 cursor-pointer select-none hover:text-amber-700">
              Show raw AI response ›
            </summary>
            <pre className="mt-2 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
              {rawError}
            </pre>
          </details>
        )}

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyzing and optimizing…
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Optimize Resume
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
