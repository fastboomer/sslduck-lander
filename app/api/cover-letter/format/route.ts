import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType, convertInchesToTwip, PageBreak,
} from 'docx';

// ── Constants ────────────────────────────────────────────────────────────────
const FONT = 'Arial';
const S12 = 24; // 12pt
const S11 = 22; // 11pt
const SS  = { line: 240, lineRule: LineRuleType.AUTO };

// Section headings we always promote to a centred divider
const KNOWN_DIVIDERS = new Set([
  'SPECIAL INSTRUCTIONS WARNING',
  'SPECIAL INSTRUCTIONS',
]);

// ── Paragraph builders ───────────────────────────────────────────────────────
// Tight body line — used for address blocks (no after-spacing)
const addressP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...SS, before: 0, after: 0 },
    children: [new TextRun({ text: t, size: S11, font: FONT })],
  });

// Normal body line — used for paragraphs (small after gap keeps paragraphs readable)
const bodyP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...SS, before: 0, after: 100 },
    children: [new TextRun({ text: t, size: S11, font: FONT })],
  });

// A true blank line (used between letter sections)
const blank = () =>
  new Paragraph({
    spacing: { ...SS, before: 0, after: 0 },
    children: [new TextRun({ text: '', font: FONT, size: S11 })],
  });

// Centred bold heading (Special Instructions Warning, etc.)
const dividerP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { ...SS, before: 360, after: 120 },
    children: [new TextRun({ text: t, bold: true, size: S12, font: FONT, underline: {} })],
  });

// Hard page break paragraph
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

// ── Address-block detector ────────────────────────────────────────────────────
// An "address block" is a run of consecutive short lines (≤ 60 chars) with
// possible blank lines in between, appearing before the first long paragraph.
// We collapse any blank lines within the block so every address line sits tight.
function collapseAddressBlanks(lines: string[]): string[] {
  // Find the first line that looks like a long paragraph (> 60 chars)
  const firstLongIdx = lines.findIndex((l) => l.trim().length > 60);
  if (firstLongIdx <= 0) return lines; // nothing to collapse

  const addressZone = lines.slice(0, firstLongIdx);
  const rest        = lines.slice(firstLongIdx);

  // Remove blank lines within the address zone
  const collapsed = addressZone.filter((l) => l.trim() !== '');

  return [...collapsed, ...rest];
}

// ── Document builder ─────────────────────────────────────────────────────────
function buildDoc(rawText: string): Document {
  const text  = preprocess(rawText);
  const allLines = text.split('\n').map((l) => l.trimEnd());

  // Split the full output into per-letter blocks on [PAGE BREAK] markers
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
  blocks.push(current); // push the last block

  const paras: Paragraph[] = [];

  blocks.forEach((blockLines, blockIdx) => {
    // Insert a real page break before every block except the very first
    if (blockIdx > 0) {
      paras.push(pageBreakP());
    }

    // Collapse blank lines within the address zone of this block
    const collapsed = collapseAddressBlanks(blockLines);

    // Track whether we are still in the "address zone" of this block
    // (before the first long paragraph line)
    let addressZoneDone = false;
    let prevWasBlank    = false;

    for (const line of collapsed) {
      const t  = line.trim();

      if (!t) {
        if (!prevWasBlank) paras.push(blank());
        prevWasBlank = true;
        continue;
      }
      prevWasBlank = false;

      const up = t.toUpperCase();

      // Hard page-break marker (safety — should already be split above)
      if (/^\[PAGE BREAK\]$/i.test(t)) {
        paras.push(pageBreakP());
        addressZoneDone = false; // reset for next letter
        continue;
      }

      // Known divider headings
      if (KNOWN_DIVIDERS.has(up) || /^special instructions/i.test(t)) {
        paras.push(dividerP(t));
        addressZoneDone = true;
        continue;
      }

      // Decide address vs body line
      if (!addressZoneDone && t.length <= 60) {
        // Still in address zone — use tight spacing
        paras.push(addressP(t));
      } else {
        // Long line means address zone is over
        addressZoneDone = true;
        paras.push(bodyP(t));
      }
    }
  });

  return new Document({
    sections: [
      {
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
    const doc    = buildDoc(letterText);
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
