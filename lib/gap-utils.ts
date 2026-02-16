'use server';

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function extractTextFromFile(file: File): Promise<string> {
    console.log(`[GAP_UTILS] Extracting text from ${file.name} (${file.type})...`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === 'application/pdf') {
        try {
            // Try the new PDFParse class API (pdf-parse 2.x)
            const pdfParseModule = await import('pdf-parse');
            const PDFParse = pdfParseModule.PDFParse || (pdfParseModule as any).default?.PDFParse;

            if (typeof PDFParse === 'function') {
                const parser = new PDFParse({ data: buffer });
                const result = await parser.getText();
                return result.text;
            }

            // Fallback to the classic function API (pdf-parse 1.x)
            const pdfClassic = (typeof pdfParseModule === 'function') ? pdfParseModule : (pdfParseModule as any).default;
            if (typeof pdfClassic === 'function') {
                const data = await pdfClassic(buffer);
                return data.text;
            }

            throw new Error('Could not find a valid PDF parser in the pdf-parse module.');
        } catch (err: any) {
            console.error('PDF extraction error:', err);
            throw new Error(`Text extraction failed: ${err.message}`);
        }
    } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
    ) {
        try {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (err: any) {
            console.error('Docx extraction error:', err);
            throw new Error(`Docx extraction failed: ${err.message}`);
        }
    } else {
        return new TextDecoder().decode(arrayBuffer);
    }
}

export async function createGapDoc(analysis: string, companyName: string): Promise<Buffer> {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: `GAP Analysis: ${companyName}`,
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: `Generated on ${new Date().toLocaleDateString()}`,
                    spacing: { after: 400 },
                }),
                ...analysis.split('\n').map(line => {
                    if (line.trim() === '') return new Paragraph({ text: '' });

                    if (line.startsWith('### ')) {
                        return new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_3 });
                    } else if (line.startsWith('## ')) {
                        return new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_2 });
                    }

                    return new Paragraph({
                        children: [new TextRun(line)],
                        spacing: { after: 200 }
                    });
                })
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}
