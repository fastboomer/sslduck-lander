import { Resend } from 'resend';

export async function sendGapReport(to: string, candidateName: string, content: string | Buffer, filename: string) {
    try {
        const apiKey = process.env.RESEND_API_KEY || "";
        if (!apiKey) {
            console.error('[MAIL] Missing RESEND_API_KEY');
            return { success: false, error: 'Email configuration missing' };
        }
        const resend = new Resend(apiKey);
        console.log(`[MAIL] Sending GAP Report for ${candidateName} to ${to}...`);

        const isBuffer = Buffer.isBuffer(content);
        const attachmentName = isBuffer ? `${filename}.docx` : `${filename}.md`;

        // Ensure CRLF newlines so plain text editors (like Notepad) display the markdown cleanly
        const parsedContent = isBuffer
            ? content
            : Buffer.from((content as string).replace(/(?<!\r)\n/g, '\r\n'), 'utf-8');

        const { data, error } = await resend.emails.send({
            from: 'SSLDUCK Reports <reports@sslduck.net>', // Replaced with a placeholder/proper domain if verified
            to: [to],
            subject: `GAP Analysis Report: ${candidateName}`,
            text: `Please find attached the GAP Analysis report for ${candidateName}.`,
            attachments: [
                {
                    filename: attachmentName,
                    content: parsedContent,
                },
            ],
        });

        if (error) {
            console.error('[MAIL] Resend error:', error);
            return { success: false, error };
        }

        console.log('[MAIL] Email sent successfully:', data?.id);
        return { success: true, id: data?.id };
    } catch (err: any) {
        console.error('[MAIL] Critical error sending mail:', err);
        return { success: false, error: err.message };
    }
}
