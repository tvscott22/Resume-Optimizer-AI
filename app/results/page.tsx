"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

    const existing = JSON.parse(localStorage.getItem("savedApplications") || "[]");
    existing.push(entry);
    localStorage.setItem("savedApplications", JSON.stringify(existing));
    setSaved(true);
  }

  if (!result) return null;

  const { match_analysis, rewritten_resume, bullet_improvements, summary_section, originalResume } = result;

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Optimization Results</h1>
          <p className="text-sm text-gray-500 mt-1">Your resume has been aligned to the job description.</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          ← Start over
        </button>
      </div>

      {/* Match Analysis */}
      <section className="mb-8 p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-base font-semibold mb-4">Match Analysis</h2>
        <p className="text-sm text-gray-700 mb-5">{match_analysis.summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">Strengths</h3>
            <ul className="space-y-1">
              {match_analysis.key_strengths.map((s, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-green-500 mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">Gaps</h3>
            <ul className="space-y-1">
              {match_analysis.gaps_or_weaknesses.map((g, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-red-400 mt-0.5">–</span> {g}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Keywords to Emphasize</h3>
            <div className="flex flex-wrap gap-2">
              {match_analysis.keywords_to_emphasize.map((k, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Summary Section */}
      {summary_section && (
        <section className="mb-8 p-6 bg-white border border-gray-200 rounded-xl">
          <h2 className="text-base font-semibold mb-2">Suggested Summary</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{summary_section}</p>
        </section>
      )}

      {/* Side-by-side Resume */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-4">Resume Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Original</span>
            <pre className="p-5 bg-white border border-gray-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed text-gray-700 h-[500px] overflow-y-auto">
              {originalResume}
            </pre>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Optimized</span>
            <pre className="p-5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed text-gray-800 h-[500px] overflow-y-auto">
              {rewritten_resume}
            </pre>
          </div>
        </div>
      </section>

      {/* Bullet Improvements */}
      {bullet_improvements?.length > 0 && (
        <section className="mb-8 p-6 bg-white border border-gray-200 rounded-xl">
          <h2 className="text-base font-semibold mb-4">Bullet Improvements</h2>
          <div className="space-y-4">
            {bullet_improvements.map((b, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Before</p>
                  <p className="text-sm text-gray-700">{b.original}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs font-semibold text-green-600 mb-1">After</p>
                  <p className="text-sm text-gray-800">{b.improved}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Save Application */}
      <section className="p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-base font-semibold mb-4">Save Application</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Role / Job title"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            disabled={saved}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saved ? "Saved ✓" : "Save Application"}
          </button>
        </div>
        {saved && (
          <p className="text-sm text-green-600">Application saved to localStorage.</p>
        )}
      </section>
    </main>
  );
}
