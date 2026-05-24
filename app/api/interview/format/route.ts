import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType, convertInchesToTwip,
} from 'docx';

// ── Constants ────────────────────────────────────────────────────────────────
const FONT    = 'Arial';
const S12     = 24; // 12pt — section headers
const S11     = 22; // 11pt — title
const S10     = 20; // 10pt — body
const UNIFORM = { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 };

// ── Paragraph builders ───────────────────────────────────────────────────────
const titleP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { ...UNIFORM, after: 160 },
    children: [new TextRun({ text: t, bold: true, size: S11, font: FONT })],
  });

const sectionHeaderP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...UNIFORM, before: 200, after: 80 },
    children: [new TextRun({ text: t, bold: true, size: S12, font: FONT })],
  });

const questionP = (num: string, text: string) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...UNIFORM, before: 160, after: 40 },
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: S10, font: FONT }),
      new TextRun({ text, bold: true, size: S10, font: FONT }),
    ],
  });

const answerLabelP = () =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...UNIFORM, before: 40, after: 20 },
    children: [new TextRun({ text: 'Example Answer:', bold: true, size: S10, font: FONT, italics: true })],
  });

const bodyP = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: UNIFORM,
    children: [new TextRun({ text: t, size: S10, font: FONT })],
  });

const blankP = () =>
  new Paragraph({ spacing: { line: 120, lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [] });

// ── Pre-processor ─────────────────────────────────────────────────────────────
function preprocess(raw: string): string {
  return raw
    .replace(/<(div|p|br|h[1-6]|section)[^>]*>/gi, '\n')
    .replace(/<\/?(div|p|h[1-6]|section)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[\xa0\u200b\u200c\u200d\ufeff\t]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function cleanLine(t: string): string {
  // Strip markdown decorators
  t = t.replace(/^#+\s+/, '');
  t = t.replace(/\*\*|__/g, '');
  t = t.replace(/\*(?!\s)([^*]+)\*/g, '$1');
  t = t.replace(/_(?!\s)([^_]+)_/g, '$1');
  // Strip horizontal rules
  if (/^[-\s_—–|*~=]+$/.test(t)) return '';
  // Strip page break labels
  if (/page\s*(break|\d+)/i.test(t)) return '';
  return t.trim();
}

function isConversationalPreamble(t: string): boolean {
  return (
    /system\s*prompt/i.test(t) ||
    /plain\s*text/i.test(t) ||
    /formatting\s*rule/i.test(t) ||
    /directive/i.test(t) ||
    /let\s*me\s*proceed/i.test(t) ||
    /produce\s*the\s*output/i.test(t) ||
    /strict output rule/i.test(t) ||
    /meta.?comment/i.test(t)
  );
}

// ── Section detector ─────────────────────────────────────────────────────────
const STAR_HEADERS = new Set([
  'STAR STANDS FOR', 'S — SITUATION', 'T — TASK', 'A — ACTION', 'R — RESULT',
  'WHY STAR WORKS', 'QUICK FORMULA', 'FULL STAR ANSWER EXAMPLE',
]);

function isSectionHeader(t: string): boolean {
  const up = t.toUpperCase();
  return (
    STAR_HEADERS.has(up) ||
    /^(for maximum benefit|the star system|employers use|star stands)/i.test(t) ||
    /^(s\s*—|t\s*—|a\s*—|r\s*—)/i.test(t) ||
    /^(why star|quick formula|full star)/i.test(t)
  );
}

// ── Document builder ─────────────────────────────────────────────────────────
function buildDoc(rawText: string): Document {
  const text  = preprocess(rawText);
  const lines = text.split('\n');

  const paras: Paragraph[] = [];
  let titleDone    = false;
  let prevBlank    = false;
  let preambleScan = true;
  let preambleCount = 0;

  for (const rawLine of lines) {
    let t = cleanLine(rawLine);
    if (!t) {
      if (!prevBlank) paras.push(blankP());
      prevBlank = true;
      continue;
    }
    prevBlank = false;

    // Preamble scan: skip the first 30 non-blank lines if they look like AI meta-commentary
    if (preambleScan) {
      if (isConversationalPreamble(t)) { preambleCount++; continue; }
      if (preambleCount > 0 && preambleCount < 5) preambleScan = false;
      if (preambleCount >= 5) { preambleScan = false; continue; }
      preambleScan = false;
    }

    // Title line — first substantive line that contains "Interview Strategy"
    if (!titleDone && /interview strategy/i.test(t)) {
      paras.push(titleP(t));
      titleDone = true;
      continue;
    }

    // Numbered question lines: "1. Question text" or "Question 1: ..."
    const qMatch = t.match(/^(\d{1,2})[.)]\s+(.+)/);
    if (qMatch) {
      const num  = qMatch[1];
      const body = qMatch[2];
      paras.push(questionP(num, body));
      continue;
    }

    // "Example Answer:" label
    if (/^example\s+answer[:\-]?\s*$/i.test(t)) {
      paras.push(answerLabelP());
      continue;
    }
    // Answer starting on same line as label
    const ansInline = t.match(/^example\s+answer[:\-]\s*(.+)/i);
    if (ansInline) {
      paras.push(answerLabelP());
      paras.push(bodyP(ansInline[1]));
      continue;
    }

    // STAR intro / section headings
    if (isSectionHeader(t)) {
      paras.push(sectionHeaderP(t));
      continue;
    }

    // Default body
    paras.push(bodyP(t));
  }

  // Auto-compactor: count paragraphs and tighten spacing if very long
  const estimatedLines = paras.length;
  const spacingBefore  = estimatedLines > 80 ? 100 : 160;

  // Re-apply spacing on question paragraphs only if needed
  if (estimatedLines > 80) {
    for (const p of paras) {
      if (p.properties?.spacing?.before === 160) {
        // @ts-expect-error — direct mutation of spacing for compaction
        p.properties.spacing.before = spacingBefore;
      }
    }
  }

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
    const { reportText } = (await req.json()) as { reportText: string };
    if (!reportText?.trim())
      return NextResponse.json({ error: 'No report text provided.' }, { status: 400 });
    const doc    = buildDoc(reportText);
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="interview-prep.docx"',
      },
    });
  } catch (err: unknown) {
    console.error('Interview format error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
