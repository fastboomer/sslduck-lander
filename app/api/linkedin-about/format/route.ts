import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType,
  convertInchesToTwip,
} from 'docx';

// ── Constants ────────────────────────────────────────────────────────────────
const FONT = 'Arial';

// ── Conversational preamble cleaner helper ──────────────────────────────────
function isConversationalPreamble(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return false;
  
  if (
    /system\s*instructions/i.test(t) ||
    /plain\s*text/i.test(t) ||
    /conflict/i.test(t) ||
    /formatting\s*rule/i.test(t) ||
    /directive/i.test(t) ||
    /background\s*:/i.test(t) ||
    /task\s*:/i.test(t) ||
    /format\s*:/i.test(t) ||
    /example\s*:/i.test(t) ||
    /closing\s*:/i.test(t) ||
    /below is/i.test(t) ||
    /^(certainly|sure|absolutely|here is|here's|below is|i have|based on|congratulations|happy to help|here are|sure!)/i.test(t)
  ) {
    return true;
  }
  
  return false;
}

// ── Pre-processor: cleans ChatGPT/other LLM quirks ──────────────────────────
function cleanMarkdown(line: string): string {
  // Normalize all unicode space-like characters to regular spaces first
  let t = line.replace(/[\xa0\u200b\u200c\u200d\ufeff\t]+/g, ' ').trim();
  if (/^```[a-zA-Z0-9]*\s*$/.test(t)) {
    return '';
  }
  
  // Replace markdown links [Text](URL) with just Text
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Strip page indicators completely
  const lower = t.toLowerCase();
  if (
    lower.includes('page break') ||
    lower.includes('page breaks') ||
    /^[-*_\s—–|*~=\[\]]*page\s*(\d+|break|breaks)[-*_\s—–|*~=\[\]]*$/i.test(t)
  ) {
    return '';
  }

  // Discard lines consisting purely of horizontal dividing characters
  if (/^[-\s_—–|*~=]+$/.test(t)) {
    return '';
  }
  
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
  const cleanLines: string[] = [];

  for (const line of rawLines) {
    const cleaned = cleanMarkdown(line);
    if (!cleaned) continue;
    cleanLines.push(cleaned);
  }

  return cleanLines.join('\n');
}

// ── Parser ───────────────────────────────────────────────────────────────────
interface ProfileBlock {
  version: string;
  headline: string;
  about: string;
}

interface Parsed {
  name: string;
  profiles: ProfileBlock[];
  finalNotesRaw: string[];
}

function parseAboutProfiles(raw: string): Parsed {
  const text = preprocessLLMOutput(raw);
  const lines = text.split('\n').map(l => l.trimEnd());

  let startIndex = 0;
  while (startIndex < Math.min(lines.length, 30)) {
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

  let name = '';
  // Try to find name from a title line like "LinkedIn About Profiles for John Doe"
  for (const line of cleanLines) {
    const match = line.match(/LinkedIn About Profiles for\s+(.+)/i);
    if (match) {
      name = match[1].replace(/[\*\[\]_#]/g, '').trim();
      break;
    }
  }

  // Fallback for name
  if (!name && cleanLines.length > 0) {
    const firstLine = cleanLines[0].trim();
    if (firstLine.toLowerCase().includes('linkedin about profiles for')) {
      name = firstLine.replace(/linkedin about profiles for/gi, '').trim();
    } else {
      if (firstLine.length < 35 && !firstLine.includes(':')) {
        name = firstLine;
      }
    }
  }

  // Pre-initialize exactly 3 profiles as requested
  const profiles: ProfileBlock[] = [
    { version: 'Version 1', headline: '', about: '' },
    { version: 'Version 2', headline: '', about: '' },
    { version: 'Version 3', headline: '', about: '' }
  ];
  
  let currentSection: 'HEADLINE' | 'ABOUT' | 'NONE' = 'NONE';
  const notesLines: string[] = [];
  let inNotes = false;

  let headlineCount = 0;
  let aboutCount = 0;

  for (const line of cleanLines) {
    const t = line.trim();
    if (!t) continue;

    const up = t.toUpperCase().replace(/[:#\*]/g, '').trim();

    // Transition to notes
    if (/^(hi|hello|dear)\b/i.test(t)) {
      inNotes = true;
      currentSection = 'NONE';
    }

    if (inNotes) {
      notesLines.push(line);
      continue;
    }

    // Skip the title line
    if (t.toLowerCase().includes('linkedin about profiles for')) {
      continue;
    }

    // Skip explicit Profile X / Version X boundary headers
    const profMatch = 
      t.match(/^(profile|version|alternative|variation)\s*(\d+)/i) || 
      (t.match(/^(\d+)[\.\)]\s*$/) && t.length < 5);
      
    if (profMatch) {
      currentSection = 'NONE';
      continue;
    }

    // Detect section headers
    if (up.includes('PROFESSIONAL HEADLINE') || up === 'HEADLINE') {
      currentSection = 'HEADLINE';
      
      // Match same-line content
      const match = t.match(/^professional\s+headline[:\-\s]*(.*)/i) || t.match(/^headline[:\-\s]*(.*)/i);
      const sameLineContent = match ? match[1].trim() : '';
      if (sameLineContent) {
        const cleanedText = sameLineContent.replace(/^[\s\-\*—–_:]+/g, '').trim();
        if (cleanedText) {
          profiles[0].headline = cleanedText;
          headlineCount = 1;
        }
      }
      continue;
    }

    if (up.includes('ABOUT SECTION') || up === 'ABOUT') {
      currentSection = 'ABOUT';
      
      // Match same-line content
      const match = t.match(/^about\s+section[:\-\s]*(.*)/i) || t.match(/^about[:\-\s]*(.*)/i);
      const sameLineContent = match ? match[1].trim() : '';
      if (sameLineContent) {
        const cleanedText = sameLineContent.replace(/^[\s\-\*—–_:]+/g, '').trim();
        if (cleanedText) {
          profiles[0].about = cleanedText;
          aboutCount = 1;
        }
      }
      continue;
    }

    // Collect content to the active profile block
    if (currentSection === 'HEADLINE') {
      const listMatch = t.match(/^(\d+)[\.\)]\s*(.*)/);
      const cleanedText = t.replace(/^[\s\-\*—–_:]+/g, '').trim();
      
      if (listMatch) {
        // Explicit list numbers like "1. Headline text"
        const num = parseInt(listMatch[1], 10);
        if (num >= 1 && num <= 3) {
          profiles[num - 1].headline = listMatch[2].replace(/^[\s\-\*—–_:]+/g, '').trim();
        }
      } else if (cleanedText) {
        // Flat grouped lines under a single header
        if (headlineCount < 3) {
          profiles[headlineCount].headline = cleanedText;
          headlineCount++;
        } else {
          // Fallback append to last
          profiles[2].headline += (profiles[2].headline ? ' ' : '') + cleanedText;
        }
      }
    } else if (currentSection === 'ABOUT') {
      const listMatch = t.match(/^(\d+)[\.\)]\s*(.*)/);
      const cleanedText = t.replace(/^[\s\-\*—–_:]+/g, '').trim();
      
      if (listMatch) {
        // Explicit list numbers like "1. About text"
        const num = parseInt(listMatch[1], 10);
        if (num >= 1 && num <= 3) {
          profiles[num - 1].about = listMatch[2].replace(/^[\s\-\*—–_:]+/g, '').trim();
        }
      } else if (cleanedText) {
        // Flat grouped paragraphs under a single header
        if (aboutCount < 3) {
          profiles[aboutCount].about = cleanedText;
          aboutCount++;
        } else {
          // Fallback append to last
          profiles[2].about += (profiles[2].about ? '\n' : '') + cleanedText;
        }
      }
    }
  }

  // Clean notes
  let noteIdx = notesLines.findIndex(l => {
    const cleaned = l.trim().replace(/^[\s\-\*—–_:]+/g, '');
    return /^(hi|hello|dear)\b/i.test(cleaned);
  });
  let cleanNotes = notesLines;
  if (noteIdx !== -1) {
    cleanNotes = notesLines.slice(noteIdx);
  }

  const finalNotesLines: string[] = [];
  let foundGlo = false;
  for (const rawLine of cleanNotes) {
    if (foundGlo) continue;
    finalNotesLines.push(rawLine);
    const cleaned = rawLine.trim().replace(/^[\s\-\*—–_:]+/g, '');
    if (/^glo\b/i.test(cleaned) && cleaned.length < 15) {
      foundGlo = true;
    }
  }

  return {
    name,
    profiles,
    finalNotesRaw: finalNotesLines.map(l => l.trim()).filter(Boolean),
  };
}

// ── Document builder ─────────────────────────────────────────────────────────
function buildDoc(p: Parsed): Document {
  // STRICT USER SPECIFICATIONS:
  // - Fonts MUST NOT fall below 10pt for content. Set all content strictly to 10pt (size: 20).
  // - Section headers MUST be strictly 12pt bold (size: 24).
  // - Line spacing MUST be exactly 1.0 (240 twips single spacing in docx).
  const currentS14 = 24; // 12pt bold for section headers
  const currentS11 = 20; // 10pt content
  const nameSize = 22;   // 11pt bold for candidate name
  const lineSpacing = 240; // Strict single spacing 1.0 equivalent

  const localSS = { line: lineSpacing, lineRule: LineRuleType.AUTO };

  const blank = () => new Paragraph({ spacing: { line: 160, lineRule: LineRuleType.AUTO, before: 0, after: 0 }, children: [new TextRun({ text: '', font: FONT, size: currentS11 })] });
  const leftP = (t: string, size = currentS11, bold = false, italic = false) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { ...localSS, before: 0, after: 0 }, children: [new TextRun({ text: t, size: size, bold, italics: italic, font: FONT })] });

  const paras: Paragraph[] = [];

  // Title at the very top: "LinkedIn About Profiles for John Doe"
  paras.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...localSS, before: 120, after: 0 },
    children: [new TextRun({ text: `LinkedIn About Profiles for ${p.name || '[Candidate Name]'}`, bold: true, size: nameSize, font: FONT })]
  }));
  paras.push(blank());

  // Profiles Block
  for (let i = 0; i < p.profiles.length; i++) {
    const prof = p.profiles[i];
    
    // Add VERSION heading
    paras.push(leftP(`VERSION ${i + 1}`, currentS11, true));
    paras.push(blank());
    
    // Headline header: "PROFESSIONAL HEADLINE"
    paras.push(leftP('PROFESSIONAL HEADLINE', currentS11, true));
    paras.push(blank());
    
    // Headline content
    if (prof.headline) {
      paras.push(leftP(prof.headline, currentS11, false, true)); // italic
    } else {
      paras.push(leftP('[Headline content not found]', currentS11, false, true));
    }
    paras.push(blank());
    
    // About Section header: "ABOUT SECTION"
    paras.push(leftP('ABOUT SECTION', currentS11, true));
    paras.push(blank());
    
    // About content
    if (prof.about) {
      paras.push(leftP(prof.about, currentS11, false, false));
    } else {
      paras.push(leftP('[About content not found]', currentS11, false, false));
    }
    
    // Blank line after each profile
    paras.push(blank());
  }

  // Final Notes / Rationale (Glo's note)
  if (p.finalNotesRaw.length > 0) {
    paras.push(blank());
    
    for (const rawLine of p.finalNotesRaw) {
      const line = rawLine
        .replace(/^\s*(source|by|from|—|–|-)\s*:?\s*/i, '')
        .trimStart();
      const trimmed = line.trim();
      
      const isWishing = trimmed === 'Wishing you all the best,';
      const isGlo = /^glo\b/i.test(trimmed);
      const isSignature = isWishing || isGlo;
      const displayLine = isGlo ? 'Glo' : line;
      
      paras.push(leftP(displayLine, currentS11, false, isSignature));
      
      if (!isGlo) paras.push(blank());
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
    const { aboutText } = await req.json() as { aboutText: string };
    if (!aboutText?.trim()) return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
    const parsed = parseAboutProfiles(aboutText);
    const doc = buildDoc(parsed);
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="linkedin_about_profiles.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('LinkedIn About format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
