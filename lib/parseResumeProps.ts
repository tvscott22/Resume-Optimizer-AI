import type { ResumeProps } from "@/components/ResumeTemplate";

const BULLET_RE    = /^[-•*]\s*/;
const SECTION_RE   = /^(SUMMARY|PROFESSIONAL SUMMARY|EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|SKILLS|TECHNICAL SKILLS|EDUCATION|CERTIFICATIONS?|LICENSES? & CERTIFICATIONS?|LICENSES? AND CERTIFICATIONS?)$/i;
// Matches lines that are primarily a date range, e.g. "Jan 2021 – Present" or "2019 – 2022"
const DATE_LINE_RE = /^\s*[\w\s,]*\d{4}\s*[-–—]\s*([\w\s,]*\d{4}|present|current)\s*$/i;

interface RawSection { label: string; lines: string[] }
interface RawRole    { title: string; date: string; bullets: string[] }

function parseSections(text: string): { header: string[]; sections: RawSection[] } {
  const sections: RawSection[] = [];
  const header: string[] = [];
  let cur: RawSection | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (SECTION_RE.test(line)) {
      if (cur) sections.push(cur);
      cur = { label: line.toUpperCase(), lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    } else {
      header.push(line);
    }
  }
  if (cur) sections.push(cur);
  return { header, sections };
}

function parseRoles(lines: string[]): RawRole[] {
  const roles: RawRole[] = [];
  let cur: RawRole | null = null;

  for (const line of lines) {
    if (!line) continue;
    if (BULLET_RE.test(line)) {
      cur?.bullets.push(line.replace(BULLET_RE, "").trim());
    } else if (DATE_LINE_RE.test(line) && cur && !cur.date && cur.bullets.length === 0) {
      cur.date = line.trim();
    } else {
      if (cur) roles.push(cur);
      cur = { title: line, date: "", bullets: [] };
    }
  }
  if (cur) roles.push(cur);
  return roles;
}

function splitRoleHeader(title: string): { role: string; company: string } {
  // "Role — Company" or "Company — Role"
  const dashParts = title.split(/\s+[—–-]\s+/);
  if (dashParts.length >= 2) {
    return { role: dashParts[0].trim(), company: dashParts[1].trim() };
  }
  // "Role at Company"
  const atMatch = title.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return { role: atMatch[1].trim(), company: atMatch[2].trim() };
  }
  return { role: title.trim(), company: "" };
}

export function parseResumeToProps(
  resumeText: string,
  summaryOverride = ""
): ResumeProps {
  const { header, sections } = parseSections(resumeText);

  // ── Name + Contact ──
  const nonEmpty = header.filter(Boolean);
  const name = nonEmpty[0] ?? "";
  const contact = nonEmpty.slice(1);

  // ── Summary ──
  const summarySection = sections.find((s) => s.label.includes("SUMMARY"));
  const summary =
    summaryOverride ||
    summarySection?.lines.filter(Boolean).join(" ") ||
    "";

  // ── Experience ──
  const expSection = sections.find((s) => s.label.includes("EXPERIENCE"));
  const experience: ResumeProps["experience"] = (
    expSection ? parseRoles(expSection.lines) : []
  ).map((r) => ({
    ...splitRoleHeader(r.title),
    dates: r.date,
    bullets: r.bullets,
  }));

  // ── Skills ──
  const skillsSection = sections.find((s) => s.label.includes("SKILL"));
  const skillLines = skillsSection ? skillsSection.lines.filter(Boolean) : [];
  const hasCategories = skillLines.some((l) => /^[^,\-•*]+:\s/.test(l));

  const skillCategories: { label: string; items: string[] }[] = hasCategories
    ? skillLines.map((l) => {
        const colonIdx = l.indexOf(":");
        if (colonIdx > -1) {
          return {
            label: l.slice(0, colonIdx).trim(),
            items: l.slice(colonIdx + 1).split(/[,|]/).map((s) => s.replace(BULLET_RE, "").trim()).filter(Boolean),
          };
        }
        return { label: "", items: l.split(/[,|]/).map((s) => s.replace(BULLET_RE, "").trim()).filter(Boolean) };
      })
    : [];

  const skills: string[] = hasCategories
    ? []
    : skillLines.join(", ").split(/[,|]/).map((s) => s.replace(BULLET_RE, "").trim()).filter(Boolean);

  // ── Certifications ──
  const certSection = sections.find((s) => s.label.includes("CERTIF"));
  const certifications: string[] = certSection
    ? certSection.lines
        .filter(Boolean)
        .map((s) => s.replace(BULLET_RE, "").trim())
        .filter(Boolean)
    : [];

  return { name, contact, summary, experience, skills, skillCategories, certifications };
}
