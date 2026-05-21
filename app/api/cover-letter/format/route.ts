import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType, convertInchesToTwip, PageBreak,
} from 'docx';

const FONT = 'Arial';
const S12  = 24;
const S11  = 22;
// Single spacing, zero before/after — used for EVERY paragraph so
// addresses and body are visually identical in Word.
const UNIFORM = { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 };

const KNOWN_DIVIDERS = new Set([
  'SPECIAL INSTRUCTIONS WARNING',
  'SPECIAL INSTRUCTIONS',
]);

// ── Paragraph builders ───────────────────────────────────────────────────────
const textP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: UNIFORM,
    children: [new TextRun({ text: t, size: S11, font: FONT })],
  });

const blankP = () =>
  new Paragraph({
    spacing: UNIFORM,
    children: [new TextRun({ text: '', size: S11, font: FONT })],
  });

const dividerP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { ...UNIFORM, before: 360, after: 120 },
    children: [new TextRun({ text: t, bold: true, size: S12, font: FONT, underline: {} })],
  });

const pageBreakP = () =>
  new Paragraph({ children: [new PageBreak()] });

// ── Pre-processor ─────────────────────────────────────────────────────────────
function preprocess(raw: string): string {
  return raw
    .replace(/<(div|p|br|h[1-6]|section)[^>]*>/gi, '\n')
    .replace(/<\/?(div|p|h[1-6]|section)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// ── Document builder ─────────────────────────────────────────────────────────
function buildDoc(rawText: string): Document {
  const text  = preprocess(rawText);
  const allLines = text.split('\n').map((l) => l.trimEnd());

  // Split into letter blocks on [PAGE BREAK]
  const blocks: string[][] = [];
  let current: string[]   = [];
  for (const line of allLines) {
    if (/^\s*\[PAGE BREAK\]\s*$/i.test(line)) {
      blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  blocks.push(current);

  const paras: Paragraph[] = [];

  blocks.forEach((blockLines, blockIdx) => {
    if (blockIdx > 0) paras.push(pageBreakP());

    // Collapse consecutive blank lines to max 1 across the whole block
    let prevBlank = false;
    for (const line of blockLines) {
      const t = line.trim();

      if (!t) {
        if (!prevBlank) paras.push(blankP());
        prevBlank = true;
        continue;
      }
      prevBlank = false;

      if (/^\[PAGE BREAK\]$/i.test(t)) {
        paras.push(pageBreakP());
        continue;
      }

      if (KNOWN_DIVIDERS.has(t.toUpperCase()) || /^special instructions/i.test(t)) {
        paras.push(dividerP(t));
        continue;
      }

      paras.push(textP(t));
    }
  });

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.25),
            right:  convertInchesToTwip(1.25),
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
    const { letterText } = (await req.json()) as { letterText: string };
    if (!letterText?.trim())
      return NextResponse.json({ error: 'No letter text provided.' }, { status: 400 });
    const doc    = buildDoc(letterText);
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="cover-letter.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('Cover letter format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
