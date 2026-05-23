import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Paragraph, TextRun, AlignmentType,
  Packer, LineRuleType,
  convertInchesToTwip,
  Table, TableRow, TableCell, WidthType, BorderStyle, IBorderOptions
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

// Markdown and horizontal lines cleaner
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

  // Strip standard horizontal lines (but NOT markdown table boundaries)
  if (/^[-\s_—–*~=]+$/.test(t) && !t.includes('|')) {
    return '';
  }

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
    if (!cleaned && !line.includes('|')) continue; // keep lines with | for table parsing
    cleanLines.push(cleaned || line.trim());
  }

  return cleanLines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { suitabilityText } = await req.json() as { suitabilityText: string };
    if (!suitabilityText?.trim()) return NextResponse.json({ error: 'No text provided.' }, { status: 400 });

    const text = preprocessLLMOutput(suitabilityText);
    const lines = text.split('\n').map(l => l.trimEnd());

    // Skip preamble
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

    // Build the Word document elements
    const FONT_SIZE_CONTENT = 20; // 10pt Arial
    const FONT_SIZE_HEADER = 24;  // 12pt bold Arial
    const FONT_SIZE_TITLE = 28;   // 14pt bold Arial for Report Title
    const lineSpacing = 240;      // 1.0 single spacing

    const localSS = { line: lineSpacing, lineRule: LineRuleType.AUTO };

    const blank = () => new Paragraph({ spacing: { line: 160, lineRule: LineRuleType.AUTO, before: 0, after: 0 }, children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE_CONTENT })] });
    const leftP = (t: string, size = FONT_SIZE_CONTENT, bold = false, italic = false) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { ...localSS, before: 0, after: 0 }, children: [new TextRun({ text: t, size: size, bold, italics: italic, font: FONT })] });

    const docElements: (Paragraph | Table)[] = [];

    // Parse loop variables
    let currentTableRows: string[][] = [];
    let inTable = false;

    // Helper to compile/flush accumulated markdown table rows into a docx.Table
    const flushTable = () => {
      if (currentTableRows.length === 0) return;

      const borderStyle: IBorderOptions = {
        style: BorderStyle.SINGLE,
        size: 4,
        color: "D3D3D3"
      };

      const tableRows: TableRow[] = currentTableRows.map((row, idx) => {
        const isHeader = idx === 0;
        return new TableRow({
          children: row.map(cellText => {
            const trimmedText = cellText.trim().replace(/\*\*/g, '');
            return new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { line: 180, lineRule: LineRuleType.AUTO, before: 60, after: 60 },
                  children: [
                    new TextRun({
                      text: trimmedText,
                      font: FONT,
                      size: isHeader ? 22 : FONT_SIZE_CONTENT,
                      bold: isHeader || trimmedText === "MISSING",
                      color: isHeader ? "FFFFFF" : (trimmedText === "MISSING" ? "DC2626" : "000000")
                    })
                  ]
                })
              ],
              shading: {
                fill: isHeader ? "002366" : "FFFFFF"
              },
              margins: {
                top: 100,
                bottom: 100,
                left: 140,
                right: 140
              },
              borders: {
                top: borderStyle,
                bottom: borderStyle,
                left: borderStyle,
                right: borderStyle
              }
            });
          })
        });
      });

      const docxTable = new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE
        },
        rows: tableRows
      });

      docElements.push(docxTable);
      docElements.push(blank());
      currentTableRows = [];
      inTable = false;
    };

    let isTitlePlaced = false;

    for (let i = 0; i < cleanLines.length; i++) {
      const rawLine = cleanLines[i];
      const trimmed = rawLine.trim();

      // Skip blank lines
      if (!trimmed) {
        if (inTable) flushTable();
        continue;
      }

      // Check if this line is part of a markdown table (contains |)
      if (trimmed.includes('|')) {
        inTable = true;
        // Strip markdown table divider borders like |---|---|
        if (/^[|:\-\s]+$/.test(trimmed)) {
          continue;
        }

        // Split the columns
        const cols = trimmed.split('|')
          .map(col => col.trim())
          .filter((_, idx, arr) => {
            // Remove empty cells created at the start/end by outer pipes
            if (idx === 0 && !arr[idx]) return false;
            if (idx === arr.length - 1 && !arr[idx]) return false;
            return true;
          });

        if (cols.length > 0) {
          currentTableRows.push(cols);
        }
        continue;
      }

      // If we were inside a table block and we hit a non-table line, flush it
      if (inTable) {
        flushTable();
      }

      const up = trimmed.toUpperCase().replace(/[:#\*]/g, '').trim();

      // Check for report title line
      if (!isTitlePlaced && (up.startsWith("APPLICANT SUITABILITY STUDY FOR") || up.includes("APPLICANT SUITABILITY STUDY"))) {
        docElements.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 300, before: 240, after: 120 },
          children: [new TextRun({ text: trimmed.replace(/#/g, ''), bold: true, size: FONT_SIZE_TITLE, font: FONT })]
        }));
        docElements.push(blank());
        isTitlePlaced = true;
        continue;
      }

      // Check for table titles or section headers
      if (
        up === "HARD AND SOFT SKILLS ANALYSIS" ||
        up.startsWith("JOB REQUIREMENTS FOR") ||
        up === "KEYWORDS" ||
        up === "PROBABLE ATS DIAGNOSIS" ||
        up === "A FINAL NOTE…" ||
        up === "A FINAL NOTE"
      ) {
        docElements.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 280, before: 240, after: 120 },
          children: [new TextRun({ text: trimmed.replace(/#/g, ''), bold: true, size: FONT_SIZE_HEADER, font: FONT })]
        }));
        docElements.push(blank());
        continue;
      }

      // Detect special warning blocks
      if (up.startsWith("WARNING")) {
        docElements.push(new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: 200, before: 60, after: 120 },
          children: [
            new TextRun({ text: "WARNING: ", bold: true, size: FONT_SIZE_CONTENT, font: FONT, color: "DC2626" }),
            new TextRun({ text: trimmed.replace(/^warning:?\s*/i, ''), italics: true, size: FONT_SIZE_CONTENT, font: FONT, color: "DC2626" })
          ]
        }));
        docElements.push(blank());
        continue;
      }

      // Detect "ATS and Your Resume" or similar inline bold prefix
      if (trimmed.startsWith("ATS and Your Resume.")) {
        docElements.push(new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: localSS,
          children: [
            new TextRun({ text: "ATS and Your Resume. ", bold: true, size: FONT_SIZE_CONTENT, font: FONT }),
            new TextRun({ text: trimmed.replace(/^ATS and Your Resume\.\s*/i, ''), size: FONT_SIZE_CONTENT, font: FONT })
          ]
        }));
        docElements.push(blank());
        continue;
      }

      // Detect signature lines
      const isWishing = trimmed === 'Wishing you the best,' || trimmed === 'Wishing you all the best,';
      const isGlo = /^glo\b/i.test(trimmed);
      const isSignature = isWishing || isGlo;
      const displayLine = isGlo ? 'Glo' : trimmed;

      docElements.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: localSS,
        children: [new TextRun({ text: displayLine, size: FONT_SIZE_CONTENT, font: FONT, italics: isSignature })]
      }));

      // Only push a blank line if it's not the final signature Glo
      if (!isGlo) {
        docElements.push(blank());
      }
    }

    // Flush any trailing table
    if (inTable) {
      flushTable();
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75), bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75), right: convertInchesToTwip(0.75),
            },
          },
        },
        children: docElements,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="suitability_study.docx"',
      },
    });

  } catch (err: unknown) {
    console.error('Suitability study formatting error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
