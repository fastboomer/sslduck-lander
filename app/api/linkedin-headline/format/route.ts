import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType,
  convertInchesToTwip,
} from 'docx';

const FONT = 'Arial';

// Conversational preamble cleaner
function isConversationalPreamble(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return false;
  
  return (
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
  );
}

// Markdown and HTML cleaner
function cleanMarkdown(line: string): string {
  let t = line.replace(/[\xa0\u200b\u200c\u200d\ufeff\t]+/g, ' ').trim();
  if (/^```[a-zA-Z0-9]*\s*$/.test(t)) return '';

  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const lower = t.toLowerCase();
  if (
    lower.includes('page break') ||
    lower.includes('page breaks') ||
    /^[-*_\s—–|*~=\[\]]*page\s*(\d+|break|breaks)[-*_\s—–|*~=\[\]]*$/i.test(t)
  ) {
    return '';
  }

  if (/^[-\s_—–|*~=]+$/.test(t)) return '';

  t = t.replace(/^#+\s+/, '');
  t = t.replace(/\*\*|__/g, '');
  t = t.replace(/\*(?!\s)([^*]+)\*/g, '$1');
  t = t.replace(/_(?!\s)([^_]+)_/g, '$1');

  if (t.startsWith('*') && !t.startsWith('* ')) t = t.slice(1);
  if (t.endsWith('*') && !t.endsWith(' *')) t = t.slice(0, -1);
  if (t.startsWith('_') && !t.startsWith('_ ')) t = t.slice(1);
  if (t.endsWith('_') && !t.endsWith(' _')) t = t.slice(0, -1);

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

interface Parsed {
  name: string;
  headlines: string[];
  finalNotesRaw: string[];
}

function parseHeadlineProfiles(raw: string): Parsed {
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
  // Try to find name from a title line like "LinkedIn Headlines for Jane Doe"
  for (const line of cleanLines) {
    const match = line.match(/LinkedIn Headlines for\s+(.+)/i);
    if (match) {
      name = match[1].replace(/[\*\[\]_#]/g, '').trim();
      break;
    }
  }

  // Fallback for name
  if (!name && cleanLines.length > 0) {
    const firstLine = cleanLines[0].trim();
    if (firstLine.toLowerCase().includes('linkedin headlines for')) {
      name = firstLine.replace(/linkedin headlines for/gi, '').trim();
    } else {
      if (firstLine.length < 35 && !firstLine.includes(':')) {
        name = firstLine;
      }
    }
  }

  const headlines: string[] = ['', '', '', '', ''];
  const notesLines: string[] = [];
  let inNotes = false;
  let currentVersion = 0;

  for (const line of cleanLines) {
    const t = line.trim();
    if (!t) continue;

    // Transition to final notes
    if (/^(hi|hello|dear)\b/i.test(t)) {
      inNotes = true;
    }

    if (inNotes) {
      notesLines.push(line);
      continue;
    }

    // Skip the title line
    if (t.toLowerCase().includes('linkedin headlines for')) {
      continue;
    }

    // Check for VERSION boundaries
    const versionMatch = t.match(/^(version|headline|alternative|variation|profile)\s*(\d+)/i);
    const fallbackMatch = !versionMatch ? t.match(/^(\d+)[\.\)]\s*$/) : null;

    if (versionMatch) {
      const num = parseInt(versionMatch[2] || versionMatch[1], 10);
      if (num >= 1 && num <= 5) {
        currentVersion = num;
      }
      continue;
    } else if (fallbackMatch && t.length < 5) {
      const num = parseInt(fallbackMatch[1], 10);
      if (num >= 1 && num <= 5) {
        currentVersion = num;
      }
      continue;
    }

    // Add content to the current version headline
    if (currentVersion >= 1 && currentVersion <= 5) {
      const cleanedText = t.replace(/^[\s\-\*—–_:]+/g, '').trim();
      if (cleanedText) {
        headlines[currentVersion - 1] += (headlines[currentVersion - 1] ? ' ' : '') + cleanedText;
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
    headlines: headlines.map(h => h.trim()),
    finalNotesRaw: finalNotesLines.map(l => l.trim()).filter(Boolean),
  };
}

function buildDoc(p: Parsed): Document {
  const currentS11 = 20; // 10pt content
  const nameSize = 22;   // 11pt bold for candidate name
  const lineSpacing = 240; // Strict single spacing 1.0

  const localSS = { line: lineSpacing, lineRule: LineRuleType.AUTO };

  const blank = () => new Paragraph({ spacing: { line: 160, lineRule: LineRuleType.AUTO, before: 0, after: 0 }, children: [new TextRun({ text: '', font: FONT, size: currentS11 })] });
  const leftP = (t: string, size = currentS11, bold = false, italic = false) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { ...localSS, before: 0, after: 0 }, children: [new TextRun({ text: t, size: size, bold, italics: italic, font: FONT })] });

  const paras: Paragraph[] = [];

  // Title at the top
  paras.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...localSS, before: 120, after: 0 },
    children: [new TextRun({ text: `LinkedIn Headlines for ${p.name || '[Candidate Name]'}`, bold: true, size: nameSize, font: FONT })]
  }));
  paras.push(blank());

  // Headlines
  for (let i = 0; i < p.headlines.length; i++) {
    const hText = p.headlines[i];
    
    // Add VERSION X heading
    paras.push(leftP(`VERSION ${i + 1}`, currentS11, true));
    paras.push(blank());
    
    // Headline Text
    if (hText) {
      paras.push(leftP(hText, currentS11, false, false));
    } else {
      paras.push(leftP('[Headline content not found]', currentS11, false, true));
    }
    paras.push(blank());
  }

  // Final Notes
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

export async function POST(req: NextRequest) {
  try {
    const { headlineText } = await req.json() as { headlineText: string };
    if (!headlineText?.trim()) return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
    const parsed = parseHeadlineProfiles(headlineText);
    const doc = buildDoc(parsed);
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="linkedin_headlines.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('LinkedIn Headline format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
