export type ResumeProps = {
  name: string
  contact: string[]
  summary: string
  experience: {
    company: string
    role: string
    dates: string
    bullets: string[]
  }[]
  skills: string[]
  skillCategories: { label: string; items: string[] }[]
  certifications: string[]
}

export default function ResumeTemplate({
  name,
  contact,
  summary,
  experience,
  skills,
}: ResumeProps) {
  return (
    <div
      id="resume"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
        color: "#111",
        lineHeight: 1.4,
      }}
    >
      {/* HEADER */}
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
        {name}
      </h1>
      {contact.length > 0 && (
        <p style={{ fontSize: "12px", color: "#555", marginBottom: "16px" }}>
          {contact.join(" · ")}
        </p>
      )}

      {/* SUMMARY */}
      <section style={{ marginBottom: "20px" }}>
        <h2 style={sectionHeader}>Summary</h2>
        <p style={bodyText}>{summary}</p>
      </section>

      {/* EXPERIENCE */}
      <section style={{ marginBottom: "20px" }}>
        <h2 style={sectionHeader}>Experience</h2>

        {experience.map((job, idx) => (
          <div key={idx} style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {job.role}
                {job.company ? ` — ${job.company}` : ""}
              </strong>
              <span style={{ fontSize: "12px", color: "#555" }}>{job.dates}</span>
            </div>

            <ul style={{ paddingLeft: "18px", marginTop: "6px" }}>
              {job.bullets.map((b, i) => (
                <li key={i} style={bulletText}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* SKILLS */}
      <section>
        <h2 style={sectionHeader}>Skills</h2>
        <p style={bodyText}>{skills.join(", ")}</p>
      </section>
    </div>
  )
}

const sectionHeader = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "6px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
}

const bodyText = {
  fontSize: "12px",
}

const bulletText = {
  fontSize: "12px",
  marginBottom: "4px",
}
