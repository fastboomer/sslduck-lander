import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  TabStopType, Packer, PageBreak, LineRuleType,
  convertInchesToTwip,
} from 'docx';

// ── Constants ────────────────────────────────────────────────────────────────
const FONT = 'Arial';
const RIGHT_TAB = convertInchesToTwip(6.5);

const KNOWN_HEADERS = new Set([
  'PROFESSIONAL PROFILE', 'SUMMARY', 'SKILLS', 'EDUCATION', 'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE',
  'OTHER EXPERIENCE', 'PROFESSIONAL ORGANIZATIONS', 'PROFESSIONAL ORGANIZATION', 'ACHIEVEMENTS',
  'CERTIFICATIONS', 'VOLUNTEER WORK',
  'ADDITIONAL PROFESSIONAL PROFILE VARIATIONS', 'FINAL NOTES', 'FINAL NOTES / RATIONALE',
  '2 PROFESSIONAL PROFILE VARIATIONS:', '2 PROFESSIONAL PROFILE VARIATIONS'
]);

// ── Conversational preamble cleaner helper ──────────────────────────────────
function isConversationalPreamble(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return false;
  
  if (/^(certainly|sure|absolutely|here is|here's|below is|i have|based on|congratulations|happy to help|here are|sure!)/i.test(t)) {
    return true;
  }
  
  if (t.includes('resume') && (t.includes('here') || t.includes('formatting') || t.includes('created') || t.includes('optimized') || t.includes('structured') || t.includes('tailored') || t.includes('adjusted') || t.includes('polished') || t.includes('drafted'))) {
    return true;
  }
  
  return false;
}

// ── Pre-processor: cleans ChatGPT/other LLM quirks ──────────────────────────
function cleanMarkdown(line: string): string {
  let t = line.trim();
  if (/^```[a-zA-Z0-9]*\s*$/.test(t)) {
    return '';
  }
  
  // Replace markdown links [Text](URL) with just Text
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  t = t.replace(/^#+\s+/, '');
  t = t.replace(/\*\*|__/g, '');
  t = t.replace(/\*(?!\s)([^*]+)\*/g, '$1');
  t = t.replace(/_(?!\s)([^_]+)_/g, '$1');
  
  if (t.startsWith('*') && !t.startsWith('* ')) {
    t = t.slice(1);
  }
  if (t.endsWith('*') && !t.endsWith(' *')) {
    t = t.slice(0, -1);
  }
  if (t.startsWith('_') && !t.startsWith('_ ')) {
    t = t.slice(1);
  }
  if (t.endsWith('_') && !t.endsWith(' _')) {
    t = t.slice(0, -1);
  }
  
  return t.trim();
}

function preprocessLLMOutput(raw: string): string {
  let text = raw
    .replace(/<(div|p|br|h[1-6]|section|article|header)[^>]*>/gi, '\n')
    .replace(/<\/(div|p|h[1-6]|section|article|header)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const rawLines = text.split('\n');
  const expanded: string[] = [];

  for (const line of rawLines) {
    const cleaned = cleanMarkdown(line);
    if (!cleaned) continue;

    const parts = cleaned.split(/\s*\|\s*/);
    const hasLong = parts.some(p => p.trim().length > 50);
    const hasKnown = parts.some(p => KNOWN_HEADERS.has(p.trim().toUpperCase()));

    if ((hasLong || hasKnown) && parts.length > 1) {
      for (const p of parts) {
        const cleanedPart = cleanMarkdown(p);
        const s = cleanedPart.replace(/\t+/g, ' | ').trim();
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
      expanded.push(cleaned.replace(/\t+/g, ' | '));
    }
  }

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
      result.push(line.replace(/\s*[—–]\s*/g, '  '));
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

// ── Parser ───────────────────────────────────────────────────────────────────
interface ExpBlock { company: string; location: string; jobTitle: string; dates: string; bullets: string[]; }
interface EduBlock { school: string; major: string; }
interface ContactInfo { cityState: string; phone: string; email: string; linkedin: string; }

interface Parsed {
  name: string;
  contactInfo: ContactInfo;
  profileJobTitle: string; profileTraits: string; profileParagraph: string;
  skillsContent: string;
  experiences: ExpBlock[]; otherExperiences: ExpBlock[];
  orgsContent: string;
  achievements: string[];
  education: EduBlock[];
  certifications: string[];
  volunteerWork: string[];
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

function isBullet(line: string) {
  return /^[•\-\*\+\▪\◦\■\•]/.test(line.trim()) || /^\d+[\.\)]\s+/.test(line.trim());
}

function formatPhoneNumber(token: string): string {
  // Strip all non-digit characters to extract the raw digits
  const digits = token.replace(/\D/g, '');
  
  // If we have exactly 10 digits
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // If we have 11 digits and it starts with 1, strip the leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    const rest = digits.slice(1);
    return `${rest.slice(0, 3)}-${rest.slice(3, 6)}-${rest.slice(6)}`;
  }
  
  // Try to find any consecutive sequence of 10 digits
  const match10 = digits.match(/\d{10}/);
  if (match10) {
    const d = match10[0];
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  
  // Fallback: strip parentheses and replace all dots/spaces with hyphens
  let cleaned = token
    .replace(/[\(\)]/g, '') // remove parentheses
    .replace(/[\s\.]+/g, '-') // convert spaces and periods to hyphens
    .replace(/-+/g, '-') // collapse multiple consecutive hyphens
    .replace(/^-|-$/g, ''); // trim leading and trailing hyphens
  return cleaned;
}

function parseExperienceLines(lines: string[]): ExpBlock[] {
  const blocks: ExpBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Proactively skip page breaks from experience blocks
    if (/page[\s_-]*break/i.test(line)) {
      i++;
      continue;
    }

    if (isBullet(line)) {
      if (blocks.length > 0) {
        if (!/page[\s_-]*break/i.test(line)) {
          blocks[blocks.length - 1].bullets.push(line);
        }
      }
      i++;
      continue;
    }

    const { company, location } = splitCompanyLocation(line);
    i++;

    let jobTitle = '';
    let dates = '';

    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) { i++; continue; }
      if (/page[\s_-]*break/i.test(next)) {
        break;
      }
      if (isBullet(next)) break;

      if (hasDate(next)) {
        const { jobTitle: jt, dates: d } = splitJobLine(next);
        if (d) { if (!jobTitle) jobTitle = jt; dates = d; }
        else { dates = next; }
        i++; break;
      } else {
        const words = next.split(/\s+/);
        const startsWithAction = /^(developed|led|created|designed|built|managed|collaborated|implemented|analyzed|assisted|worked|supported|coordinated|facilitated|formulated|spearheaded|executed|supervised|established|improved|increased|reduced|maximized|minimized|optimized|strengthened|enhanced|excelled|achieved|attained|delivered|earned|won|resolved|solv|conducted|gathered|researched|prepared|wrote|drafted|edited|presented|taught|trained|mentored|tutored)/i.test(words[0]);
        if (startsWithAction && words.length > 4) {
          break;
        }
        jobTitle = next; i++;
      }
    }

    const bullets: string[] = [];
    while (i < lines.length) {
      const bl = lines[i].trim();
      if (!bl) { i++; continue; }
      
      if (/page[\s_-]*break/i.test(bl)) {
        i++;
        break; // Stop parsing bullets/experience on a page break
      }

      if (isBullet(bl)) {
        bullets.push(bl);
        i++;
      } else {
        const { location: loc } = splitCompanyLocation(bl);
        const hasDt = hasDate(bl);
        const words = bl.split(/\s+/);
        const startsWithAction = /^(developed|led|created|designed|built|managed|collaborated|implemented|analyzed|assisted|worked|supported|coordinated|facilitated|formulated|spearheaded|executed|supervised|established|improved|increased|reduced|maximized|minimized|optimized|strengthened|enhanced|excelled|achieved|attained|delivered|earned|won|resolved|solv|conducted|gathered|researched|prepared|wrote|drafted|edited|presented|taught|trained|mentored|tutored)/i.test(words[0]);

        if ((loc && words.length < 8) || hasDt || (words.length < 4 && !startsWithAction)) {
          break;
        }

        bullets.push('• ' + bl);
        i++;
      }
    }

    if (company) blocks.push({ company, location, jobTitle, dates, bullets });
  }
  return blocks;
}

function parseResume(raw: string): Parsed {
  const text = preprocessLLMOutput(raw);
  const lines = text.split('\n').map(l => l.trimEnd());

  let startIndex = 0;
  while (startIndex < Math.min(lines.length, 10)) {
    const line = lines[startIndex].trim();
    if (!line) {
      startIndex++;
      continue;
    }
    if (isConversationalPreamble(line)) {
      startIndex++;
    } else {
      break;
    }
  }
  const cleanLines = lines.slice(startIndex);

  const result: Parsed = {
    name: '',
    contactInfo: { cityState: '', phone: '', email: '', linkedin: '' },
    profileJobTitle: '', profileTraits: '', profileParagraph: '',
    skillsContent: '', education: [],
    experiences: [], otherExperiences: [],
    orgsContent: '', achievements: [],
    certifications: [], volunteerWork: [],
    variationsRaw: [], finalNotesRaw: [],
  };

  type Sec = 'HEADER'|'PROFILE'|'SKILLS'|'EDU'|'EXP'|'OTHER'|'ORGS'|'ACHIEVE'|'CERTS'|'VOLUNTEER'|'VARIATIONS'|'NOTES';
  let sec: Sec = 'HEADER';
  let profileState = 0;
  const buckets: Record<string, string[]> = {
    SKILLS: [], EDU: [], EXP: [], OTHER: [], ORGS: [], ACHIEVE: [], CERTS: [], VOLUNTEER: [], VARIATIONS: [], NOTES: []
  };

  const rawContactLines: string[] = [];

  for (const rawLine of cleanLines) {
    const t = rawLine.trim();
    if (!t) continue;

    const up = t.toUpperCase().replace(/[:#\*]/g, '').trim();

    if (up === 'PROFESSIONAL PROFILE' || up === 'SUMMARY') {
      sec = 'PROFILE';
      profileState = 0;
      continue;
    }
    if (up === 'SKILLS') {
      sec = 'SKILLS';
      continue;
    }
    if (up === 'EDUCATION') {
      sec = 'EDU';
      continue;
    }
    if (up === 'PROFESSIONAL EXPERIENCE' || up === 'WORK EXPERIENCE') {
      sec = 'EXP';
      continue;
    }
    if (up === 'OTHER EXPERIENCE') {
      sec = 'OTHER';
      continue;
    }
    if (up === 'PROFESSIONAL ORGANIZATIONS' || up === 'PROFESSIONAL ORGANIZATION') {
      sec = 'ORGS';
      continue;
    }
    if (up === 'ACHIEVEMENTS') {
      sec = 'ACHIEVE';
      continue;
    }
    if (up === 'CERTIFICATIONS') {
      sec = 'CERTS';
      continue;
    }
    if (up === 'VOLUNTEER WORK') {
      sec = 'VOLUNTEER';
      continue;
    }
    if (up.includes('VARIATION') || up.includes('ADDITIONAL PROFILE') || up.includes('ADDITIONAL PROFESSIONAL PROFILE')) {
      sec = 'VARIATIONS';
      continue;
    }
    if (sec !== 'NOTES' && (up.includes('FINAL NOTES') || up.includes('RATIONALE') || (up.includes('GLO') && t.length < 40))) {
      sec = 'NOTES';
      continue;
    }

    if (sec === 'HEADER') {
      if (!result.name) {
        result.name = t;
      } else {
        rawContactLines.push(t);
      }
    } else if (sec === 'PROFILE') {
      if (profileState === 0) { result.profileJobTitle = t; profileState = 1; }
      else if (profileState === 1) { result.profileTraits = t; profileState = 2; }
      else result.profileParagraph += (result.profileParagraph ? ' ' : '') + t;
    } else if (sec in buckets) {
      buckets[sec].push(rawLine);
    }
  }

  // Segment raw contact lines into individual header tokens
  const headerTokens: string[] = [];
  for (const line of rawContactLines) {
    const parts = line.split(/\s*[\/|•·\t]\s*/);
    for (const p of parts) {
      const token = p.trim();
      if (token) headerTokens.push(token);
    }
  }

  let cityState = '';
  let phone = '';
  let email = '';
  let linkedin = '';

  for (const token of headerTokens) {
    const tLower = token.toLowerCase();
    
    // 1. Exclude GitHub and other social handles strictly
    if (tLower.includes('github') || tLower.includes('git/')) {
      continue;
    }
    
    // 2. Parse LinkedIn
    if (/linkedin\.com/i.test(token) || /linkedin/i.test(token)) {
      let rawUrl = token.replace(/^(linkedin:\s*|url:\s*|link:\s*)/i, '').trim();
      // Remove https://, http://, www.
      rawUrl = rawUrl.replace(/^https?:\/\/(www\.)?/i, '').replace(/^www\./i, '');
      linkedin = rawUrl;
      continue;
    }
    
    // 3. Parse Email
    const emailM = token.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailM) {
      email = emailM[1].replace(/mailto:/gi, '').trim();
      continue;
    }
    
    // 4. Parse Phone
    const digits = token.replace(/\D/g, '');
    if ((digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) || /phone|tel|cell|mobile/i.test(token)) {
      phone = formatPhoneNumber(token);
      continue;
    }
    
    // 5. Parse City, State
    if (token.includes(',') || /[a-zA-Z\s]{4,}/.test(token)) {
      if (!cityState && token.length < 50 && !tLower.includes('phone') && !tLower.includes('email') && !tLower.includes('linkedin')) {
        cityState = token;
      }
    }
  }

  result.contactInfo = { cityState, phone, email, linkedin };

  result.skillsContent = buckets.SKILLS.map(l => l.trim()).filter(Boolean).join(' | ');
  result.experiences = parseExperienceLines(buckets.EXP);
  result.otherExperiences = parseExperienceLines(buckets.OTHER);
  result.orgsContent = buckets.ORGS.map(l => l.trim()).filter(Boolean).join(' | ');
  result.achievements = buckets.ACHIEVE.map(l => l.trim()).filter(Boolean);
  result.certifications = buckets.CERTS.map(l => l.trim()).filter(Boolean);
  result.volunteerWork = buckets.VOLUNTEER.map(l => l.trim()).filter(Boolean);
  result.variationsRaw = buckets.VARIATIONS.map(l => l.trim()).filter(Boolean);
  result.finalNotesRaw = buckets.NOTES.map(l => l.trim()).filter(Boolean);

  const eduLines = buckets.EDU.map(l => l.trim()).filter(Boolean);
  let ei = 0;
  while (ei < eduLines.length) {
    const school = eduLines[ei++];
    const major = (ei < eduLines.length && !eduLines[ei].match(/university|college|school|institute/i)) ? eduLines[ei++] : '';
    result.education.push({ school, major });
  }

  return result;
}

// ── Estimated Lines on Page 1 (for auto-compactor) ───────────────────────
function estimatePage1Lines(p: Parsed): number {
  let lines = 0;
  lines += 1; // Name
  if (p.contactInfo.cityState) lines += 1;
  if (p.contactInfo.phone) lines += 1;
  if (p.contactInfo.email) lines += 1;
  if (p.contactInfo.linkedin) lines += 1;

  lines += 2; // PROFILE header + blank
  if (p.profileJobTitle) lines += 1;
  if (p.profileTraits) lines += 1;
  if (p.profileParagraph) {
    lines += Math.ceil(p.profileParagraph.split(/\s+/).length / 15) + 1; // plus blank
  }
  lines += 2; // SKILLS header + blank
  if (p.skillsContent) {
    lines += Math.ceil(p.skillsContent.split(/\s+/).length / 15);
  }
  lines += 2; // EDUCATION header + blank
  for (const ed of p.education) {
    lines += 1; // school
    if (ed.major) lines += 1;
    lines += 1; // blank
  }
  if (p.experiences.length > 0) {
    lines += 2; // EXPERIENCE header + blank
    for (const exp of p.experiences) {
      lines += 1; // company
      if (exp.jobTitle || exp.dates) lines += 1;
      lines += exp.bullets.length;
      lines += 1; // blank
    }
  }
  if (p.otherExperiences.length > 0) {
    lines += 2; // OTHER EXPERIENCE header + blank
    for (const exp of p.otherExperiences) {
      lines += 1; // company
      if (exp.jobTitle || exp.dates) lines += 1;
      lines += exp.bullets.length;
      lines += 1; // blank
    }
  }
  if (p.achievements.length > 0) {
    lines += 2; // ACHIEVEMENTS header + blank
    lines += p.achievements.length;
  }
  if (p.orgsContent) {
    lines += 2; // ORGS header + blank
    lines += Math.ceil(p.orgsContent.split(/\s+/).length / 15);
  }
  if (p.certifications.length > 0) {
    lines += 2; // CERTS header + blank
    lines += p.certifications.length;
  }
  if (p.volunteerWork.length > 0) {
    lines += 2; // VOLUNTEER header + blank
    lines += p.volunteerWork.length;
  }
  return lines;
}

// ── Document builder ─────────────────────────────────────────────────────────
function buildDoc(p: Parsed): Document {
  const estimatedLines = estimatePage1Lines(p);

  // STRICT USER SPECIFICATIONS:
  // - Fonts MUST NOT fall below 10pt for content. Set all 9pt/11pt to strictly 10pt.
  // - S14 headers MUST be strictly 12pt bold.
  // - Line spacing MUST be exactly 1.0 (240 twips single spacing in docx).
  const currentS14 = 24; // 12pt bold for section headers
  const currentS11 = 20; // 10pt content (strictly 10pt limit)
  const nameSize = 22;   // 11pt bold for candidate name
  const contactSize = 20; // 10pt not bold for contact remainder
  const lineSpacing = 240; // Strict single spacing 1.0 equivalent

  // Adjust whitespace margins and header spacings to fit page strictly
  let blankHeight = 160; // Default 8pt blank line spacer
  let headerSpacingBefore = 240; // Default 12pt space before section headers

  if (estimatedLines > 52) {
    blankHeight = 120; // Compress white-space to 6pt to fit (never below 10pt/6pt spacer)
    headerSpacingBefore = 140; // Compress headers space before to 7pt
  } else if (estimatedLines > 45) {
    blankHeight = 140; // Compress white-space to 7pt
    headerSpacingBefore = 180; // Compress headers space before to 9pt
  }

  const localSS = { line: lineSpacing, lineRule: LineRuleType.AUTO };

  // Helper functions with size safety locks (Math.max(size, 20) ensures no text falls below 10pt)
  const blank = () => new Paragraph({ spacing: { line: blankHeight, lineRule: LineRuleType.AUTO, before: 0, after: 0 }, children: [new TextRun({ text: '', font: FONT, size: currentS11 })] });
  const sectionHeader = (t: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...localSS, before: headerSpacingBefore, after: 0 }, children: [new TextRun({ text: t, bold: true, size: Math.max(currentS14, 20), font: FONT })] });
  const centeredBoldP = (t: string, size = currentS11) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...localSS, before: 0, after: 0 }, children: [new TextRun({ text: t, bold: true, size: Math.max(size, 20), font: FONT })] });
  const centeredP = (t: string, size = currentS11) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...localSS, before: 0, after: 0 }, children: [new TextRun({ text: t, size: Math.max(size, 20), font: FONT })] });
  const leftP = (t: string, size = currentS11, bold = false, italic = false) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { ...localSS, before: 0, after: 0 }, children: [new TextRun({ text: t, size: Math.max(size, 20), bold, italics: italic, font: FONT })] });

  const companyP = (company: string, location: string) => new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { ...localSS, before: 0, after: 0 },
    children: [
      new TextRun({ text: company, bold: true, size: currentS11, font: FONT }),
      ...(location ? [new TextRun({ text: '  ' + location, size: currentS11, font: FONT })] : []),
    ],
  });

  const jobTitleP = (title: string, dates: string, size = currentS11) => new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { ...localSS, before: 0, after: 0 },
    children: [
      new TextRun({ text: title, italics: true, size: Math.max(size, 20), font: FONT }),
      new TextRun({ text: '\t' + dates, size: Math.max(size, 20), font: FONT }),
    ],
  });

  const bulletP = (t: string, size = currentS11) => new Paragraph({
    bullet: { level: 0 }, spacing: { ...localSS, before: 0, after: 0 },
    children: [new TextRun({ text: t.replace(/^[•\-\*\+\▪\◦\■\•]\s*/, ''), size: Math.max(size, 20), font: FONT })],
  });

  const pageBreakP = () => new Paragraph({ children: [new PageBreak()] });

  const paras: Paragraph[] = [];

  // Return address - 1 item per line strictly
  // Candidate Name - 11pt bold
  paras.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...localSS, before: 0, after: 0 },
    children: [new TextRun({ text: p.name, bold: true, size: nameSize, font: FONT })]
  }));

  // Remainder contact lines - 10pt not bold strictly (excl Github, raw email, clean phone)
  if (p.contactInfo.cityState) {
    paras.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { ...localSS, before: 0, after: 0 },
      children: [new TextRun({ text: p.contactInfo.cityState, size: contactSize, font: FONT })]
    }));
  }
  if (p.contactInfo.phone) {
    paras.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { ...localSS, before: 0, after: 0 },
      children: [new TextRun({ text: p.contactInfo.phone, size: contactSize, font: FONT })]
    }));
  }
  if (p.contactInfo.email) {
    paras.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { ...localSS, before: 0, after: 0 },
      children: [new TextRun({ text: p.contactInfo.email, size: contactSize, font: FONT })]
    }));
  }
  if (p.contactInfo.linkedin) {
    paras.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { ...localSS, before: 0, after: 0 },
      children: [new TextRun({ text: p.contactInfo.linkedin, size: contactSize, font: FONT })]
    }));
  }

  paras.push(sectionHeader('PROFESSIONAL PROFILE'));
  if (p.profileJobTitle) paras.push(centeredBoldP(p.profileJobTitle));
  if (p.profileTraits) paras.push(centeredP(p.profileTraits));
  if (p.profileParagraph) { paras.push(blank()); paras.push(leftP(p.profileParagraph)); }

  paras.push(sectionHeader('SKILLS'));
  paras.push(blank());
  if (p.skillsContent) paras.push(leftP(p.skillsContent));

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

  if (p.achievements.length > 0) {
    paras.push(sectionHeader('ACHIEVEMENTS'));
    paras.push(blank());
    for (const a of p.achievements) paras.push(bulletP(a));
    paras.push(blank());
  }

  if (p.orgsContent) {
    paras.push(sectionHeader('PROFESSIONAL ORGANIZATIONS'));
    paras.push(blank());
    paras.push(leftP(p.orgsContent));
    paras.push(blank());
  }

  paras.push(sectionHeader('EDUCATION'));
  paras.push(blank());
  for (const ed of p.education) {
    paras.push(leftP(ed.school, currentS11, true));
    if (ed.major) paras.push(leftP(ed.major));
    paras.push(blank());
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

  // Page 2: Variations
  if (p.variationsRaw.length > 0 || p.finalNotesRaw.length > 0) {
    paras.push(pageBreakP());
    if (p.variationsRaw.length > 0) {
      paras.push(centeredBoldP('Additional Professional Profile Variations', currentS14));
      paras.push(blank());
      for (const line of p.variationsRaw) {
        paras.push(leftP(line, currentS11));
        paras.push(blank());
      }
    }
    // Page 3: Final Notes / Rationale (personal note from Glo to client)
    if (p.finalNotesRaw.length > 0) {
      paras.push(pageBreakP());
      paras.push(centeredBoldP('Final Notes / Rationale', currentS14));
      paras.push(blank());
      for (const rawLine of p.finalNotesRaw) {
        // Normalize LLM quirks: strip leading "Source:", "By:", "—", "–" prefixes
        const line = rawLine
          .replace(/^\s*(source|by|from|—|–|-)\s*:?\s*/i, '')
          .trimStart();
        const trimmed = line.trim();
        const isWishing = trimmed === 'Wishing you all the best,';
        const isGlo = /^glo\b/i.test(trimmed);
        const isSignature = isWishing || isGlo;
        // Always render "Glo" as exactly "Glo" (not "Glo AI", "Source: Glo", etc.)
        const displayLine = isGlo ? 'Glo' : line;
        paras.push(leftP(displayLine, currentS11, false, isSignature));
        // Keep signature lines tight — no blank line between "Wishing..." and "Glo"
        if (!isGlo) paras.push(blank());
      }
    }
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.75), bottom: convertInchesToTwip(0.75),
            left: convertInchesToTwip(0.75), right: convertInchesToTwip(0.75),
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
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="resume.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('Resume 360 format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
