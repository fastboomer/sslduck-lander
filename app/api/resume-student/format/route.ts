import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  TabStopType, Packer, PageBreak, LineRuleType,
  convertInchesToTwip,
} from 'docx';

// ── Constants ────────────────────────────────────────────────────────────────
const FONT = 'Arial';
const S14 = 28; const S11 = 22; const S10 = 20;
const SS = { line: 240, lineRule: LineRuleType.AUTO };
const RIGHT_TAB = convertInchesToTwip(6.5);

const KNOWN_HEADERS = new Set([
  'PROFESSIONAL PROFILE', 'SKILLS', 'EDUCATION', 'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE',
  'OTHER EXPERIENCE', 'CERTIFICATIONS', 'VOLUNTEER WORK',
  'ADDITIONAL PROFESSIONAL PROFILE VARIATIONS', 'FINAL NOTES', 'FINAL NOTES / RATIONALE',
  '2 PROFESSIONAL PROFILE VARIATIONS:', '2 PROFESSIONAL PROFILE VARIATIONS'
]);

// ── Pre-processor: cleans ChatGPT/other LLM quirks ──────────────────────────
function preprocessLLMOutput(raw: string): string {
  // 1. Replace block HTML elements with newlines, strip remaining tags
  let text = raw
    .replace(/<(div|p|br|h[1-6]|section|article|header)[^>]*>/gi, '\n')
    .replace(/<\/(div|p|h[1-6]|section|article|header)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  // 2. Expand pipe-collapsed blobs into separate lines
  const rawLines = text.split('\n');
  const expanded: string[] = [];

  for (const line of rawLines) {
    const t = line.trim();
    if (!t) continue;

    const parts = t.split(/\s*\|\s*/);
    const hasLong = parts.some(p => p.trim().length > 50);
    const hasKnown = parts.some(p => KNOWN_HEADERS.has(p.trim().toUpperCase()));

    if ((hasLong || hasKnown) && parts.length > 1) {
      // Collapsed blob — expand
      for (const p of parts) {
        const s = p.replace(/\t+/g, ' | ').trim();
        if (!s) continue;
        if (KNOWN_HEADERS.has(s.toUpperCase())) {
          expanded.push(s.toUpperCase() === 'WORK EXPERIENCE' ? 'PROFESSIONAL EXPERIENCE' : s.toUpperCase());
        } else if (s.length > 50) {
          expanded.push('• ' + s.replace(/^[•\-\*]\s*/, ''));
        } else {
          expanded.push(s);
        }
      }
    } else {
      // Normalize tabs → pipe for skills lines
      expanded.push(t.replace(/\t+/g, ' | '));
    }
  }

  // 3. Fix em-dash company–location separators, deduplicate headers
  const seen = new Set<string>();
  const result: string[] = [];
  let inExp = false;

  for (const line of expanded) {
    const up = line.trim().toUpperCase();

    if (KNOWN_HEADERS.has(up)) {
      const normalized = up === 'WORK EXPERIENCE' ? 'PROFESSIONAL EXPERIENCE' : up;
      if (normalized === 'PROFESSIONAL PROFILE' && seen.has('PROFESSIONAL PROFILE')) continue;
      seen.add(normalized);
      inExp = normalized === 'PROFESSIONAL EXPERIENCE' || normalized === 'OTHER EXPERIENCE';
      result.push(normalized);
      continue;
    }

    if (inExp && !line.startsWith('•') && !line.startsWith('-')) {
      // Convert em-dash company—location to double-space
      result.push(line.replace(/\s*[—–]\s*/g, '  '));
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

// ── Paragraph helpers ────────────────────────────────────────────────────────
const blank = () => new Paragraph({ spacing: { ...SS, before: 0, after: 0 }, children: [new TextRun({ text: '', font: FONT, size: S11 })] });
const nameP = (t: string) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { ...SS, before: 0, after: 0 }, children: [new TextRun({ text: t, bold: true, size: S14, font: FONT })] });
const contactP = (t: string) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { ...SS, before: 0, after: 0 }, children: [new TextRun({ text: t, size: S11, font: FONT })] });
const sectionHeader = (t: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...SS, before: 240, after: 0 }, children: [new TextRun({ text: t, bold: true, size: S14, font: FONT })] });
const centeredBoldP = (t: string, size = S11) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...SS, before: 0, after: 0 }, children: [new TextRun({ text: t, bold: true, size, font: FONT })] });
const centeredP = (t: string, size = S11) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...SS, before: 0, after: 0 }, children: [new TextRun({ text: t, size, font: FONT })] });
const leftP = (t: string, size = S11, bold = false, italic = false) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { ...SS, before: 0, after: 0 }, children: [new TextRun({ text: t, size, bold, italic, font: FONT })] });

const companyP = (company: string, location: string) => new Paragraph({
  alignment: AlignmentType.LEFT, spacing: { ...SS, before: 0, after: 0 },
  children: [
    new TextRun({ text: company, bold: true, size: S11, font: FONT }),
    ...(location ? [new TextRun({ text: '  ' + location, size: S11, font: FONT })] : []),
  ],
});

const jobTitleP = (title: string, dates: string, size = S11) => new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
  spacing: { ...SS, before: 0, after: 0 },
  children: [
    new TextRun({ text: title, italic: true, size, font: FONT }),
    new TextRun({ text: '\t' + dates, size, font: FONT }),
  ],
});

const bulletP = (t: string, size = S11) => new Paragraph({
  bullet: { level: 0 }, spacing: { ...SS, before: 0, after: 0 },
  children: [new TextRun({ text: t.replace(/^[•\-\*]\s*/, ''), size, font: FONT })],
});

const pageBreakP = () => new Paragraph({ children: [new PageBreak()] });

// ── Parser ───────────────────────────────────────────────────────────────────
interface ExpBlock { company: string; location: string; jobTitle: string; dates: string; bullets: string[]; }
interface EduBlock { school: string; major: string; }
interface Parsed {
  name: string; contactLines: string[];
  profileJobTitle: string; profileTraits: string; profileParagraph: string;
  skillsContent: string;
  education: EduBlock[];
  experiences: ExpBlock[]; otherExperiences: ExpBlock[];
  certifications: string[]; volunteerWork: string[];
  variationsRaw: string[]; finalNotesRaw: string[];
}

function hasDate(line: string) {
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{4}/i.test(line) ||
    /\b(present|projected|expected)\b/i.test(line) ||
    /\d{4}/.test(line);
}

function splitJobLine(line: string): { jobTitle: string; dates: string } {
  const m = line.match(/^(.+?)\s{2,}(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).+|present.+|projected.+|expected.+|\d{4}.+)$/i);
  if (m) return { jobTitle: m[1].trim(), dates: m[2].trim() };
  return { jobTitle: '', dates: line.trim() };
}

function splitCompanyLocation(line: string): { company: string; location: string } {
  const m = line.match(/^(.+?)\s{2,}(.+)$/);
  if (m) return { company: m[1].trim(), location: m[2].trim() };
  return { company: line.trim(), location: '' };
}

function isBullet(line: string) { return /^[•\-\*]/.test(line.trim()); }

function parseExperienceLines(lines: string[]): ExpBlock[] {
  const blocks: ExpBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || isBullet(line)) { i++; continue; }

    // Company line
    const { company, location } = splitCompanyLocation(line);
    i++;

    let jobTitle = '';
    let dates = '';

    // Next non-empty, non-bullet lines until we hit bullets or next company
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) { i++; continue; }
      if (isBullet(next)) break;

      if (hasDate(next)) {
        const { jobTitle: jt, dates: d } = splitJobLine(next);
        if (d) { if (!jobTitle) jobTitle = jt; dates = d; }
        else { dates = next; }
        i++; break;
      } else {
        // Job title line (no date yet)
        jobTitle = next; i++;
      }
    }

    // Bullets
    const bullets: string[] = [];
    while (i < lines.length) {
      const bl = lines[i].trim();
      if (!bl) { i++; continue; }
      if (isBullet(bl)) { bullets.push(bl); i++; }
      else break;
    }

    if (company) blocks.push({ company, location, jobTitle, dates, bullets });
  }
  return blocks;
}

function parseResume(raw: string): Parsed {
  const text = preprocessLLMOutput(raw);
  const lines = text.split('\n').map(l => l.trimEnd());

  const result: Parsed = {
    name: '', contactLines: [],
    profileJobTitle: '', profileTraits: '', profileParagraph: '',
    skillsContent: '', education: [],
    experiences: [], otherExperiences: [],
    certifications: [], volunteerWork: [],
    variationsRaw: [], finalNotesRaw: [],
  };

  type Sec = 'HEADER'|'PROFILE'|'SKILLS'|'EDU'|'EXP'|'OTHER'|'CERTS'|'VOLUNTEER'|'VARIATIONS'|'NOTES';
  let sec: Sec = 'HEADER';
  let profileState = 0;
  const buckets: Record<string, string[]> = {
    SKILLS: [], EDU: [], EXP: [], OTHER: [], CERTS: [], VOLUNTEER: [], VARIATIONS: [], NOTES: []
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;

    if (t === 'PROFESSIONAL PROFILE')          { sec = 'PROFILE'; profileState = 0; continue; }
    if (t === 'SKILLS')                         { sec = 'SKILLS'; continue; }
    if (t === 'EDUCATION')                      { sec = 'EDU'; continue; }
    if (t === 'PROFESSIONAL EXPERIENCE')        { sec = 'EXP'; continue; }
    if (t === 'OTHER EXPERIENCE')               { sec = 'OTHER'; continue; }
    if (t === 'CERTIFICATIONS')                 { sec = 'CERTS'; continue; }
    if (t === 'VOLUNTEER WORK')                 { sec = 'VOLUNTEER'; continue; }
    if (/^ADDITIONAL PROFESSIONAL PROFILE/.test(t) || t === '2 PROFESSIONAL PROFILE VARIATIONS:') { sec = 'VARIATIONS'; continue; }
    if (/^FINAL NOTES/.test(t) || /^RATIONALE/.test(t))                 { sec = 'NOTES'; continue; }

    if (sec === 'HEADER') {
      if (!result.name) result.name = t;
      else result.contactLines.push(t);
    } else if (sec === 'PROFILE') {
      if (profileState === 0) { result.profileJobTitle = t; profileState = 1; }
      else if (profileState === 1) { result.profileTraits = t; profileState = 2; }
      else result.profileParagraph += (result.profileParagraph ? ' ' : '') + t;
    } else if (sec in buckets) {
      buckets[sec].push(raw);
    }
  }

  result.skillsContent = buckets.SKILLS.map(l => l.trim()).filter(Boolean).join(' | ');
  result.experiences = parseExperienceLines(buckets.EXP);
  result.otherExperiences = parseExperienceLines(buckets.OTHER);
  result.certifications = buckets.CERTS.map(l => l.trim()).filter(Boolean);
  result.volunteerWork = buckets.VOLUNTEER.map(l => l.trim()).filter(Boolean);
  result.variationsRaw = buckets.VARIATIONS.map(l => l.trim()).filter(Boolean);
  result.finalNotesRaw = buckets.NOTES.map(l => l.trim()).filter(Boolean);

  // Education
  const eduLines = buckets.EDU.map(l => l.trim()).filter(Boolean);
  let ei = 0;
  while (ei < eduLines.length) {
    const school = eduLines[ei++];
    const major = (ei < eduLines.length && !eduLines[ei].match(/university|college|school|institute/i)) ? eduLines[ei++] : '';
    result.education.push({ school, major });
  }

  return result;
}

// ── Document builder ─────────────────────────────────────────────────────────
function buildDoc(p: Parsed): Document {
  const paras: Paragraph[] = [];

  paras.push(nameP(p.name));
  for (const cl of p.contactLines) paras.push(contactP(cl));

  paras.push(sectionHeader('PROFESSIONAL PROFILE'));
  if (p.profileJobTitle) paras.push(centeredBoldP(p.profileJobTitle));
  if (p.profileTraits) paras.push(centeredP(p.profileTraits));
  if (p.profileParagraph) { paras.push(blank()); paras.push(leftP(p.profileParagraph)); }

  paras.push(sectionHeader('SKILLS'));
  paras.push(blank());
  if (p.skillsContent) paras.push(leftP(p.skillsContent));

  paras.push(sectionHeader('EDUCATION'));
  paras.push(blank());
  for (const ed of p.education) {
    paras.push(leftP(ed.school, S11, true));
    if (ed.major) paras.push(leftP(ed.major));
    paras.push(blank());
  }

  paras.push(sectionHeader('PROFESSIONAL EXPERIENCE'));
  paras.push(blank());
  for (const exp of p.experiences) {
    paras.push(companyP(exp.company, exp.location));
    if (exp.jobTitle || exp.dates) paras.push(jobTitleP(exp.jobTitle, exp.dates));
    for (const b of exp.bullets) paras.push(bulletP(b));
    paras.push(blank());
  }

  if (p.otherExperiences.length > 0) {
    paras.push(sectionHeader('OTHER EXPERIENCE'));
    paras.push(blank());
    for (const exp of p.otherExperiences) {
      paras.push(companyP(exp.company, exp.location));
      if (exp.jobTitle || exp.dates) paras.push(jobTitleP(exp.jobTitle, exp.dates));
      for (const b of exp.bullets) paras.push(bulletP(b));
      paras.push(blank());
    }
  }

  if (p.certifications.length > 0) {
    paras.push(sectionHeader('CERTIFICATIONS'));
    paras.push(blank());
    for (const c of p.certifications) {
      if (isBullet(c)) {
        paras.push(bulletP(c));
      } else {
        paras.push(leftP(c));
      }
    }
  }

  if (p.volunteerWork.length > 0) {
    paras.push(sectionHeader('VOLUNTEER WORK'));
    paras.push(blank());
    for (const v of p.volunteerWork) {
      if (isBullet(v)) {
        paras.push(bulletP(v));
      } else {
        paras.push(leftP(v));
      }
    }
  }

  if (p.variationsRaw.length > 0 || p.finalNotesRaw.length > 0) {
    paras.push(pageBreakP());
    if (p.variationsRaw.length > 0) {
      paras.push(centeredBoldP('Additional Professional Profile Variations', S14));
      paras.push(blank());
      for (const line of p.variationsRaw) {
        paras.push(leftP(line));
        paras.push(blank());
      }
    }
    if (p.finalNotesRaw.length > 0) {
      paras.push(pageBreakP());
      paras.push(centeredBoldP('Final Notes / Rationale', S14));
      paras.push(blank());
      for (const line of p.finalNotesRaw) {
        paras.push(leftP(line));
        paras.push(blank());
      }
    }
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1), bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1), right: convertInchesToTwip(1),
          },
        },
      },
      children: paras,
    }],
  });
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { resumeText } = await req.json() as { resumeText: string };
    if (!resumeText?.trim()) return NextResponse.json({ error: 'No resume text provided.' }, { status: 400 });
    const parsed = parseResume(resumeText);
    const doc = buildDoc(parsed);
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="student_resume.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('Student Resume format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
