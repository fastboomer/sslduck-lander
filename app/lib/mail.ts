import { Resend } from 'resend';
import { marked } from 'marked';

export async function sendGapReport(
    to: string | string[], 
    candidateName: string, 
    content: string | Buffer, 
    filename: string,
    bcc?: string | string[]
) {
    try {
        const apiKey = process.env.RESEND_API_KEY || "";
        if (!apiKey) {
            console.error('[MAIL] Missing RESEND_API_KEY');
            return { success: false, error: 'Email configuration missing' };
        }
        const resend = new Resend(apiKey);
        console.log(`[MAIL] Sending Suitability Study for ${candidateName} to ${to}...`);

        const isBuffer = Buffer.isBuffer(content);

        // Open wrapper div — no greeting, the cover letter already opens with "Dear [name]"
        let htmlBody = `<div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.7; color: #1a1a1a; max-width: 860px; margin: 0 auto; padding: 20px;">`;
        
        if (!isBuffer) {
            // Strip any XML marker tags the LLM outputs literally (e.g. <cover>, </cover>)
            const cleanedContent = (content as string).replace(/<\/?cover>/gi, '').trim();
            const reportHtml = await marked.parse(cleanedContent, { breaks: true });
            htmlBody += reportHtml;
        } else {
            htmlBody += `<p>Please find the attached formatted report.</p>`;
        }

        htmlBody += `<br><hr style="margin: 20px 0;"/><p style="font-size:14px;">Best regards,<br><b>The SSLDUCK Team</b></p></div>`;

        const { data, error } = await resend.emails.send({
            from: 'SSLDUCK Reports <reports@sslduck.net>',
            to: Array.isArray(to) ? to : [to],
            ...(bcc ? { bcc: Array.isArray(bcc) ? bcc : [bcc] } : {}),
            subject: `Suitability Study: ${candidateName}`,
            html: htmlBody,
            ...(isBuffer ? {
                attachments: [
                    {
                        filename: `${filename}.docx`,
                        content: content,
                    },
                ]
            } : {})
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
