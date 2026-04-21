"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseResumeToProps } from "@/lib/parseResumeProps";

interface BulletImprovement {
  original: string;
  improved: string;
}

interface MatchAnalysis {
  summary: string;
  key_strengths: string[];
  gaps_or_weaknesses: string[];
  keywords_to_emphasize: string[];
}

interface OptimizeResult {
  match_analysis: MatchAnalysis;
  rewritten_resume: string;
  bullet_improvements: BulletImprovement[];
  summary_section: string;
  originalResume: string;
  jobDescription: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [saved, setSaved] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [bulletsOpen, setBulletsOpen] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("optimizeResult");
    if (!raw) {
      router.push("/");
      return;
    }
    setResult(JSON.parse(raw));
  }, [router]);

  function handleSave() {
    if (!result) return;
    const entry = {
      id: Date.now().toString(),
      company,
      role,
      jobDescription: result.jobDescription,
      originalResume: result.originalResume,
      tailoredResume: result.rewritten_resume,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(
      localStorage.getItem("savedApplications") || "[]"
    );
    existing.push(entry);
    localStorage.setItem("savedApplications", JSON.stringify(existing));
    setSaved(true);
  }

  function renderResumeHTML(resumeText: string, summaryOverride: string): string {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const props = parseResumeToProps(resumeText, summaryOverride);
    const { name, summary, experience, skills } = props;

    const expHTML = experience.map((job) => {
      const bullets = job.bullets.map((b) => `<li style="font-size:12px;margin-bottom:4px">${esc(b)}</li>`).join("");
      return `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between">
            <strong>${esc(job.role)}${job.company ? ` — ${esc(job.company)}` : ""}</strong>
            <span style="font-size:12px;color:#555">${esc(job.dates)}</span>
          </div>
          ${bullets ? `<ul style="padding-left:18px;margin-top:6px">${bullets}</ul>` : ""}
        </div>`;
    }).join("");

    const sectionHeader = `font-size:14px;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #fff; }</style>
</head>
<body>
  <div id="resume" style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#111;line-height:1.4">
    <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">${esc(name)}</h1>

    <section style="margin-bottom:20px">
      <h2 style="${sectionHeader}">Summary</h2>
      <p style="font-size:12px">${esc(summary)}</p>
    </section>

    <section style="margin-bottom:20px">
      <h2 style="${sectionHeader}">Experience</h2>
      ${expHTML}
    </section>

    <section>
      <h2 style="${sectionHeader}">Skills</h2>
      <p style="font-size:12px">${skills.map(esc).join(", ")}</p>
    </section>
  </div>
</body>
</html>`;
  }

  async function handleDownloadPDF() {
    if (!result) return;
    setPdfLoading(true);
    setPdfError("");
    let container: HTMLDivElement | null = null;
    try {
      const { default: html2pdf } = await import("html2pdf.js");

      const fullHtml = renderResumeHTML(result.rewritten_resume, result.summary_section);

      container = document.createElement("div");
      container.innerHTML = fullHtml;
      container.style.cssText = "position:absolute;left:-9999px;top:0;width:816px;";
      document.body.appendChild(container);

      const resumeEl = container.querySelector("#resume");
      if (!resumeEl) throw new Error("Resume element not found");

      const safeName = (s: string) => s.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `resume_${safeName(company || "company")}_${safeName(role || "role")}.pdf`;

      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
        })
        .from(resumeEl as HTMLElement)
        .save();
    } catch (err: unknown) {
      console.error("PDF generation failed:", err);
      setPdfError("PDF generation failed. Try again or copy the text manually.");
    } finally {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setPdfLoading(false);
    }
  }

  if (!result) return null;

  const {
    match_analysis,
    rewritten_resume,
    bullet_improvements,
    summary_section,
    originalResume,
  } = result;

  return (
    <main className="min-h-[calc(100vh-57px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Optimization Results
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Your resume has been aligned to the job description.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors mt-1"
          >
            ← Start over
          </button>
        </div>

        {/* Match Analysis */}
        <section className="mb-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            Match Analysis
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            {match_analysis.summary}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-3">
                Strengths
              </h3>
              <ul className="space-y-2">
                {match_analysis.key_strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2 items-start">
                    <span className="text-green-500 shrink-0 leading-5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-3">
                Gaps
              </h3>
              <ul className="space-y-2">
                {match_analysis.gaps_or_weaknesses.map((g, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2 items-start">
                    <span className="text-red-400 shrink-0 leading-5">–</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-3">
                Keywords to Emphasize
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {match_analysis.keywords_to_emphasize.map((k, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-white text-blue-700 text-xs rounded-full border border-blue-200 font-medium"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Suggested Summary */}
        {summary_section && (
          <section className="mb-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              Suggested Summary
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {summary_section}
            </p>
          </section>
        )}

        {/* Resume Comparison */}
        <section className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Resume Comparison
            </h2>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {pdfLoading ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5"
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
                  Generating…
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
          {pdfError && (
            <p className="mt-2 text-xs text-red-500">{pdfError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Original
                </span>
              </div>
              <pre className="p-5 bg-white border border-gray-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed text-gray-700 h-[340px] sm:h-[520px] overflow-y-auto shadow-sm">
                {originalResume}
              </pre>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Optimized
                </span>
              </div>
              <pre className="p-5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed text-gray-800 h-[340px] sm:h-[520px] overflow-y-auto shadow-sm">
                {rewritten_resume}
              </pre>
            </div>
          </div>
        </section>

        {/* Bullet Improvements */}
        {bullet_improvements?.length > 0 && (
          <section className="mb-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <button
              onClick={() => setBulletsOpen((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Bullet Improvements
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {bullet_improvements.length} improved
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    bulletsOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {bulletsOpen && (
              <div className="mt-4 space-y-3">
                {bullet_improvements.map((b, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 mb-1.5">
                        Before
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {b.original}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-xs font-semibold text-green-600 mb-1.5">
                        After
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {b.improved}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Save Application */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Save Application
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Company name"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setSaved(false);
              }}
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 placeholder:text-gray-400"
            />
            <input
              type="text"
              placeholder="Role / Job title"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setSaved(false);
              }}
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 placeholder:text-gray-400"
            />
            <button
              onClick={handleSave}
              disabled={saved}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {saved ? "Saved ✓" : "Save Application"}
            </button>
          </div>
          {saved && (
            <p className="mt-3 text-sm text-green-600">
              Application saved to your device.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
