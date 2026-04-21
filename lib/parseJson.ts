export interface OptimizeResult {
  match_analysis: {
    summary: string;
    key_strengths: string[];
    gaps_or_weaknesses: string[];
    keywords_to_emphasize: string[];
  };
  rewritten_resume: string;
  bullet_improvements: Array<{ original: string; improved: string }>;
  summary_section: string;
}

export type ParsedResponse = OptimizeResult | { error: true; raw: string };

export function safeParseJson(text: string): ParsedResponse {
  let cleaned = text.trim();

  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();

  try {
    return JSON.parse(cleaned) as OptimizeResult;
  } catch {}

  // Extract first JSON object from text
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as OptimizeResult;
    } catch {}

    // Remove trailing commas before } or ]
    const fixed = match[0].replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(fixed) as OptimizeResult;
    } catch {}
  }

  return { error: true, raw: text };
}

export function isValidResult(data: ParsedResponse): data is OptimizeResult {
  if ("error" in data) return false;
  const r = data as Partial<OptimizeResult>;
  return (
    typeof r.rewritten_resume === "string" &&
    r.rewritten_resume.length > 0 &&
    typeof r.match_analysis === "object" &&
    r.match_analysis !== null &&
    Array.isArray(r.match_analysis.key_strengths)
  );
}
