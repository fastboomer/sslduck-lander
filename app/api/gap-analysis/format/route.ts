import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType, convertInchesToTwip, PageBreak,
} from 'docx';

const FONT = 'Arial';
const S12 = 24; // 12pt
const S11 = 22; // 11pt
const S10 = 20; // 10pt

// Uniform spacing
const UNIFORM = { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 };

const KNOWN_HEADERS = new Set([
  'GAP ANALYSIS',
  'GOALS AND PROBLEMS PROFILE',
  'GOALS AND PROBLEMS PROFILE FOR',
  'RESUME ALIGNMENT WITH GAP PROFILE',
  'ANALYSIS FOR',
  'RESUME ENHANCEMENTS',
  'INTERVIEW PREPARATION',
  'FINAL NOTES',
  'FINAL NOTES / RATIONALE',
]);

// Helper to pre-process LLM output
function preprocess(raw: string): string {
  let text = raw
    .replace(/<(div|p|br|h[1-6]|section|article|header)[^>]*>/gi, '\n')
    .replace(/<\/(div|p|h[1-6]|section|article|header)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Normalize other special spacing chars
  return text.replace(/[\xa0\u200b\u200c\u200d\ufeff\t]+/g, ' ');
}

// Helper to sanitize markdown syntax
function cleanMarkdown(line: string): string {
  let t = line.trim();
  if (/^```[a-zA-Z0-9]*\s*$/.test(t)) return '';

  // Replace markdown links
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Strip page indicators case-insensitively
  const lower = t.toLowerCase();
  if (
    lower.includes('page break') ||
    lower.includes('page breaks') ||
    /^[-*_\s—–|*~=\[\]]*page\s*(\d+|break|breaks)[-*_\s—–|*~=\[\]]*$/i.test(t)
  ) {
    return '';
  }

  // Discard divider lines
  if (/^[-\s_—–|*~=]+$/.test(t)) {
    return '';
  }

  // Remove bold/italic markdown symbols
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

function isConversationalPreamble(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return false;

  return (
    /system\s*prompt/i.test(t) ||
    /plain\s*text/i.test(t) ||
    /formatting\s*instruction/i.test(t) ||
    /conflict/i.test(t) ||
    /formatting\s*rule/i.test(t) ||
    /directive/i.test(t) ||
    /here\s*is\s*the\s*completed/i.test(t) ||
    /sure!\s*here\s*is/i.test(t) ||
    /certainly!\s*here\s*is/i.test(t) ||
    /work\s*through\s*the\s*analysis/i.test(t) ||
    /produce\s*the\s*output/i.test(t)
  );
}

// docx builders
const textP = (t: string, size = S10, bold = false) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: UNIFORM,
    children: [new TextRun({ text: t, size, font: FONT, bold })],
  });

const bulletP = (t: string, size = S10, isNested = false) => {
  const clean = t.replace(/^[•\-\*\+\▪\◦\■\•]\s*/, '').trim();
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: UNIFORM,
    indent: { left: isNested ? 720 : 360 }, // left indentation
    children: [
      new TextRun({ text: '•  ', size, font: FONT, bold: true }),
      new TextRun({ text: clean, size, font: FONT }),
    ],
  });
};

const numberP = (t: string, size = S10) => {
  // Matches a numbered list start, e.g. "1. " or "10) "
  const match = t.match(/^(\d+[\.\)]\s+)(.*)$/);
  const numPart = match ? match[1] : '';
  const textPart = match ? match[2] : t;
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: UNIFORM,
    indent: { left: 360 },
    children: [
      new TextRun({ text: numPart, size, font: FONT, bold: true }),
      new TextRun({ text: textPart, size, font: FONT }),
    ],
  });
};

const blankP = () =>
  new Paragraph({
    spacing: UNIFORM,
    children: [new TextRun({ text: '', size: S10, font: FONT })],
  });

const headerP = (t: string, size = S12) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { ...UNIFORM, before: 360, after: 120 },
    children: [new TextRun({ text: t.toUpperCase(), bold: true, size, font: FONT, underline: {} })],
  });

const pageBreakP = () =>
  new Paragraph({ children: [new PageBreak()] });

function buildDoc(rawText: string): Document {
  const text = preprocess(rawText);
  const allLines = text.split('\n');

  // Filter conversational preamble
  let startIndex = 0;
  while (startIndex < Math.min(allLines.length, 30)) {
    if (isConversationalPreamble(allLines[startIndex])) {
      startIndex++;
    } else {
      break;
    }
  }

  const cleanLines: string[] = [];
  let foundGloSignature = false;

  for (let i = startIndex; i < allLines.length; i++) {
    if (foundGloSignature) continue;

    const cleaned = cleanMarkdown(allLines[i]);
    if (!cleaned) {
      cleanLines.push('');
      continue;
    }

    cleanLines.push(cleaned);

    // Stop parsing after Glo's signature at the bottom
    const checkUpper = cleaned.toUpperCase();
    if (checkUpper === 'GLO' && i > allLines.length - 15) {
      foundGloSignature = true;
    }
  }

  const paras: Paragraph[] = [];
  let prevBlank = false;

  for (const line of cleanLines) {
    const t = line.trim();

    if (!t) {
      if (!prevBlank) {
        paras.push(blankP());
        prevBlank = true;
      }
      continue;
    }
    prevBlank = false;

    // Check if it's a known header
    const checkHeader = t.toUpperCase().replace(/[:#\*]/g, '').trim();
    const isKnownHeader = KNOWN_HEADERS.has(checkHeader) ||
      (t.length < 60 && /^(GAP ANALYSIS|GOALS AND PROBLEMS PROFILE FOR|RESUME ALIGNMENT WITH GAP PROFILE|ANALYSIS FOR|RESUME ENHANCEMENTS|INTERVIEW PREPARATION|FINAL NOTES|FINAL NOTES \/ RATIONALE)/i.test(t));

    if (isKnownHeader) {
      paras.push(headerP(t));
      continue;
    }

    // Check if it's a page break directive
    if (/^\[PAGE BREAK\]$/i.test(t) || /^PAGE[\s_-]*BREAK$/i.test(t)) {
      paras.push(pageBreakP());
      continue;
    }

    // Check if it is a list bullet
    if (/^[•\-\*\+\▪\◦\■\•]/.test(t)) {
      paras.push(bulletP(t));
      continue;
    }

    // Check if it is a nested/indented list bullet (represented by space-prefix or similar)
    if (line.startsWith('  ') && /^[•\-\*\+\▪\◦\■\•]/.test(line.trim())) {
      paras.push(bulletP(line, S10, true));
      continue;
    }

    // Check if it is a numbered list item
    if (/^\d+[\.\)]\s+/.test(t)) {
      paras.push(numberP(t));
      continue;
    }

    // Regular text paragraph
    // If it is candidate name or similar title, make it bold/larger
    if (t.startsWith('Hi ') && t.endsWith('!')) {
      paras.push(textP(t, S11, true));
      continue;
    }

    paras.push(textP(t, S10));
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.75),
            left: convertInchesToTwip(0.75),
            right: convertInchesToTwip(0.75),
          },
        },
      },
      children: paras,
    }],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { reportText } = (await req.json()) as { reportText: string };
    if (!reportText?.trim()) {
      return NextResponse.json({ error: 'No report text provided.' }, { status: 400 });
    }

    const doc = buildDoc(reportText);
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="gap_analysis_study.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('GAP Analysis format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
