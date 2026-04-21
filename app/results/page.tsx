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
  follow_up_questions: string[];
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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reoptimizing, setReoptimizing] = useState(false);
  const [reoptimizeError, setReoptimizeError] = useState("");
  const [reoptimized, setReoptimized] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [copied, setCopied] = useState(false);

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
    const { name, contact, summary, experience, skills, skillCategories, certifications } = props;

    const expHTML = experience.map((job) => {
      const bullets = job.bullets
        .map((b) => `<li style="font-size:10px;margin-bottom:2px;line-height:1.45">${esc(b)}</li>`)
        .join("");
      return `
        <div style="margin-bottom:9px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <strong style="font-size:11px">${esc(job.role)}${job.company ? ` — ${esc(job.company)}` : ""}</strong>
            <span style="font-size:10px;color:#555;white-space:nowrap;flex-shrink:0">${esc(job.dates)}</span>
          </div>
          ${bullets ? `<ul style="padding-left:14px;margin-top:3px;list-style-type:disc">${bullets}</ul>` : ""}
        </div>`;
    }).join("");

    const sectionHeader = `font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#333;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:10px`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: Inter, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="resume" style="width:100%;color:#111;line-height:1.45">
    <div style="margin-bottom:12px">
      <h1 style="font-size:16px;font-weight:700;margin-bottom:3px">${esc(name)}</h1>
      ${contact.length ? `<p style="font-size:11px;color:#555">${contact.map(esc).join(" &nbsp;·&nbsp; ")}</p>` : ""}
    </div>

    <div style="margin-bottom:11px">
      <h2 style="${sectionHeader}">Summary</h2>
      <p style="font-size:10.5px;line-height:1.5">${esc(summary)}</p>
    </div>

    <div style="margin-bottom:11px">
      <h2 style="${sectionHeader}">Skills</h2>
      ${skillCategories.length
        ? skillCategories.map((cat) => `
          <div style="margin-top:5px">
            ${cat.label ? `<span style="font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:#555">${esc(cat.label)}: </span>` : ""}
            <div style="columns:4;column-gap:10px;margin-top:2px">
              ${cat.items.map((s) => `<div style="break-inside:avoid;font-size:9.5px;margin-bottom:2px">${esc(s)}</div>`).join("")}
            </div>
          </div>`).join("")
        : `<div style="columns:4;column-gap:10px;margin-top:4px">
            ${skills.map((s) => `<div style="break-inside:avoid;font-size:9.5px;margin-bottom:2px">${esc(s)}</div>`).join("")}
          </div>`
      }
    </div>

    ${certifications.length ? `
    <div style="margin-bottom:11px">
      <h2 style="${sectionHeader}">Certifications</h2>
      <div style="margin-top:4px">
        ${certifications.map((c) => `<div style="font-size:10.5px;margin-bottom:2px">• ${esc(c)}</div>`).join("")}
      </div>
    </div>` : ""}

    <div>
      <h2 style="${sectionHeader}">Experience</h2>
      ${expHTML}
    </div>
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

      const candidateName = parseResumeToProps(result.rewritten_resume, "").name;
      const safeName = (s: string) => s.replace(/[^a-z0-9 ]/gi, "").trim() || "Resume";
      const filename = `${safeName(candidateName)} Resume.pdf`;

      await html2pdf()
        .set({
          margin: [40, 45, 40, 45],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
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

  async function handleDownloadDOCX() {
    if (!result) return;
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = await import("docx");
      const props = parseResumeToProps(result.rewritten_resume, result.summary_section);
      const { name, contact, summary, experience, skills, skillCategories, certifications } = props;

      const sectionHeading = (text: string) =>
        new Paragraph({
          children: [new TextRun({ text, bold: true, size: 22, allCaps: true, color: "333333" })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } },
        });

      const children = [
        new Paragraph({
          children: [new TextRun({ text: name, bold: true, size: 32 })],
          spacing: { after: 40 },
        }),
        ...(contact.length
          ? [new Paragraph({
              children: [new TextRun({ text: contact.join(" · "), color: "555555", size: 18 })],
              spacing: { after: 180 },
            })]
          : []),

        sectionHeading("Summary"),
        new Paragraph({
          children: [new TextRun({ text: summary, size: 20 })],
          spacing: { after: 180 },
        }),

        sectionHeading("Skills"),
        new Paragraph({
          children: [new TextRun({
            text: skillCategories.length
              ? skillCategories.map((cat) => cat.label ? `${cat.label}: ${cat.items.join(", ")}` : cat.items.join(", ")).join("  |  ")
              : skills.join(", "),
            size: 20,
          })],
          spacing: { after: 180 },
        }),

        sectionHeading("Experience"),
        ...experience.flatMap((job) => [
          new Paragraph({
            children: [
              new TextRun({ text: job.role + (job.company ? ` — ${job.company}` : ""), bold: true, size: 20 }),
              ...(job.dates ? [new TextRun({ text: `  |  ${job.dates}`, color: "555555", size: 20 })] : []),
            ],
            spacing: { before: 140, after: 40 },
          }),
          ...job.bullets.map((b) =>
            new Paragraph({
              children: [new TextRun({ text: b, size: 20 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          ),
        ]),

        ...(certifications.length
          ? [
              sectionHeading("Certifications"),
              ...certifications.map((c) =>
                new Paragraph({
                  children: [new TextRun({ text: c, size: 20 })],
                  bullet: { level: 0 },
                  spacing: { after: 40 },
                })
              ),
            ]
          : []),
      ];

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9 ]/gi, "").trim() || "Resume"} Resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX generation failed:", err);
    }
  }

  async function handleReoptimize() {
    if (!result) return;
    setReoptimizing(true);
    setReoptimizeError("");
    try {
      const answerPayload = (result.follow_up_questions || []).map((q, i) => ({
        question: q,
        answer: answers[i] || "",
      }));
      const res = await fetch("/api/reoptimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: result.rewritten_resume,
          jobDescription: result.jobDescription,
          answers: answerPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Re-optimization failed.");
      setResult((prev) =>
        prev
          ? {
              ...prev,
              rewritten_resume: data.rewritten_resume,
              summary_section: data.summary_section ?? prev.summary_section,
              bullet_improvements: data.bullet_improvements?.length
                ? data.bullet_improvements
                : prev.bullet_improvements,
            }
          : prev
      );
      setReoptimized(true);
    } catch (err: unknown) {
      setReoptimizeError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setReoptimizing(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!result) return;
    setCoverLoading(true);
    setCoverError("");
    setCoverLetter("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: result.rewritten_resume,
          jobDescription: result.jobDescription,
          company,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate cover letter.");
      setCoverLetter(data.cover_letter);
    } catch (err: unknown) {
      setCoverError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setCoverLoading(false);
    }
  }

  async function handleCopyCoverLetter() {
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadCoverLetterPDF() {
    let container: HTMLDivElement | null = null;
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const safeName = (s: string) => s.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `cover_letter_${safeName(company || "company")}_${safeName(role || "role")}.pdf`;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
        <style>*, *::before, *::after{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,-apple-system,sans-serif;color:#111;line-height:1.7;font-size:12px;white-space:pre-wrap}</style>
        </head><body><div id="cover">${coverLetter.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div></body></html>`;

      container = document.createElement("div");
      container.innerHTML = html;
      container.style.cssText = "position:absolute;left:-9999px;top:0;width:816px;";
      document.body.appendChild(container);

      const el = container.querySelector("#cover");
      if (!el) throw new Error("Cover letter element not found");

      await html2pdf()
        .set({
          margin: [50, 55, 50, 55],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(el as HTMLElement)
        .save();
    } catch (err) {
      console.error("Cover letter PDF failed:", err);
    } finally {
      if (container && document.body.contains(container)) document.body.removeChild(container);
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

        {/* Follow-up Questions */}
        {result.follow_up_questions?.length > 0 && !reoptimized && (
          <section className="mb-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">
                Surface Hidden Experience
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Answer what applies — skip the rest. Claude will weave your answers into a stronger resume.
              </p>
            </div>

            <div className="space-y-5">
              {result.follow_up_questions.map((q, i) => (
                <div key={i}>
                  <p className="text-sm text-gray-700 font-medium mb-2 leading-relaxed">
                    <span className="text-blue-500 font-bold mr-2">{i + 1}.</span>
                    {q}
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Type your answer, or leave blank to skip…"
                    value={answers[i] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 placeholder:text-gray-400 leading-relaxed"
                  />
                </div>
              ))}
            </div>

            {reoptimizeError && (
              <p className="mt-4 text-sm text-red-500">{reoptimizeError}</p>
            )}

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Only answered questions will be used.
              </p>
              <button
                onClick={handleReoptimize}
                disabled={reoptimizing || Object.values(answers).every((a) => !a?.trim())}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {reoptimizing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Re-optimizing…
                  </>
                ) : (
                  <>
                    Re-optimize Resume
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {reoptimized && (
          <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700 font-medium">Resume updated with your additional experience.</p>
          </div>
        )}

        {/* Resume Comparison */}
        <section className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Resume Comparison
            </h2>
            <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadDOCX}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Word / Pages
            </button>
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

        {/* Cover Letter */}
        <section className="mb-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Cover Letter
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                AI-written using your optimized resume and the job description.
              </p>
            </div>
            {!coverLetter && (
              <button
                onClick={handleGenerateCoverLetter}
                disabled={coverLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
              >
                {coverLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Writing…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Generate Cover Letter
                  </>
                )}
              </button>
            )}
          </div>

          {coverError && (
            <p className="text-sm text-red-500 mb-3">{coverError}</p>
          )}

          {coverLetter && (
            <>
              <pre className="p-5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-sans whitespace-pre-wrap leading-relaxed text-gray-800 max-h-[520px] overflow-y-auto mb-4">
                {coverLetter}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopyCoverLetter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copied ? "Copied ✓" : "Copy Text"}
                </button>
                <button
                  onClick={handleDownloadCoverLetterPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={() => { setCoverLetter(""); setCoverError(""); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </>
          )}
        </section>

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
