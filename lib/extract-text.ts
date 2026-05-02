/**
 * extract-text.ts
 * Client-side text extraction from PDF, DOCX, and TXT files.
 * Everything runs in the browser — no files are uploaded to any server.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    return await file.text();
  }

  if (ext === 'pdf') {
    return await extractFromPdf(file);
  }

  if (ext === 'doc' || ext === 'docx') {
    return await extractFromDocx(file);
  }

  throw new Error(
    `Unsupported file type: .${ext}. Please upload a PDF, Word document (.docx), or plain text file.`
  );
}

async function extractFromPdf(file: File): Promise<string> {
  // Dynamically import pdf.js to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');

  // Use CDN-hosted worker to avoid bundling issues in Next.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n\n').replace(/\s{3,}/g, ' ').trim();
}

async function extractFromDocx(file: File): Promise<string> {
  // Dynamically import mammoth to avoid SSR issues
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}
