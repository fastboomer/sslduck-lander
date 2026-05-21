import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType, convertInchesToTwip,
} from 'docx';

// ── Constants ────────────────────────────────────────────────────────────────
const FONT = 'Arial';
const S12 = 24; // 12pt
const S11 = 22; // 11pt
const S10 = 20; // 10pt (unused but available)
const SS = { line: 240, lineRule: LineRuleType.AUTO };

// Section headings we recognise in the AI output
const KNOWN_DIVIDERS = new Set([
  'COVER LETTER 1', 'COVER LETTER 2', 'COVER LETTER 3',
  'VERSION 1', 'VERSION 2', 'VERSION 3',
  'LETTER 1', 'LETTER 2', 'LETTER 3',
  'SPECIAL INSTRUCTIONS WARNING',
  'SPECIAL INSTRUCTIONS',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────
const blank = () =>
  new Paragraph({
    spacing: { ...SS, before: 0, after: 0 },
    children: [new TextRun({ text: '', font: FONT, size: S11 })],
  });

const dividerP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { ...SS, before: 360, after: 120 },
    children: [new TextRun({ text: t, bold: true, size: S12, font: FONT, underline: {} })],
  });

const bodyP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...SS, before: 0, after: 120 },
    children: [new TextRun({ text: t, size: S11, font: FONT })],
  });

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
  const text = preprocess(rawText);
  const lines = text.split('\n').map((l) => l.trimEnd());
  const paras: Paragraph[] = [];

  let prevBlank = false;

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      if (!prevBlank) paras.push(blank());
      prevBlank = true;
      continue;
    }
    prevBlank = false;

    const up = t.toUpperCase();

    // Detect divider headings
    if (
      KNOWN_DIVIDERS.has(up) ||
      /^(cover letter|version|letter)\s+\d+$/i.test(t) ||
      /^special instructions/i.test(t)
    ) {
      paras.push(dividerP(t));
      continue;
    }

    // Everything else is body text
    paras.push(bodyP(t));
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        children: paras,
      },
    ],
  });
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { letterText } = (await req.json()) as { letterText: string };
    if (!letterText?.trim()) {
      return NextResponse.json({ error: 'No letter text provided.' }, { status: 400 });
    }
    const doc = buildDoc(letterText);
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="cover-letter.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('Cover letter format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
