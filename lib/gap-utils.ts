'use server';

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function extractTextFromFile(file: File): Promise<string> {
    console.log(`[GAP_UTILS] Extracting text from ${file.name} (${file.type})...`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === 'application/pdf') {
        try {
            // Use standard require for problematic modules in Next.js build
            const pdf = require('pdf-parse');
            const data = await pdf(buffer);
            return data.text;
        } catch (err: any) {
            console.error('PDF extraction error:', err);
            throw new Error(`Text extraction failed: ${err.message}`);
        }
    } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
    ) {
        try {
            const mammoth = require('mammoth');
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
    const sections = analysis.split('\n').map(line => {
        if (line.trim() === '') return new Paragraph({ text: '' });

        // Handle Headers
        if (line.startsWith('# ')) {
            return new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } });
        } else if (line.startsWith('## ')) {
            return new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
        } else if (line.startsWith('### ')) {
            return new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });
        }

        // Simple Bold Parsing: **text**
        const children: TextRun[] = [];
        const parts = line.split(/(\*\*.*?\*\*)/);

        parts.forEach(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                children.push(new TextRun({
                    text: part.slice(2, -2),
                    bold: true
                }));
            } else {
                children.push(new TextRun(part));
            }
        });

        return new Paragraph({
            children,
            spacing: { after: 120 }
        });
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: `Suitability Study: ${companyName}`,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 400 }
                }),
                new Paragraph({
                    text: `Generated on ${new Date().toLocaleDateString()}`,
                    spacing: { after: 400 },
                }),
                ...sections
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}
