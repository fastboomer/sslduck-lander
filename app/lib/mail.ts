import { Resend } from 'resend';

/**
 * Sends the Gap Analysis / Suitability Study as a Word document attachment.
 * The email body is minimal — the full report is in the .docx file.
 *
 * @param to          Recipient email address(es)
 * @param candidateName  Candidate's full name (for subject line)
 * @param docBuffer   Word document as a Buffer (from createGapDoc)
 * @param filename    Base filename without extension (e.g. "gap-john-smith-123456")
 * @param bcc         Optional BCC address(es)
 */
export async function sendGapReport(
    to: string | string[],
    candidateName: string,
    docBuffer: Buffer,
    filename: string,
    bcc?: string | string[]
) {
    try {
        const apiKey = process.env.RESEND_API_KEY || '';
        if (!apiKey) {
            console.error('[MAIL] Missing RESEND_API_KEY');
            return { success: false, error: 'Email configuration missing' };
        }
        const resend = new Resend(apiKey);
        const firstName = candidateName.split(' ')[0] || candidateName;
        console.log(`[MAIL] Sending Suitability Study Word doc for ${candidateName} to ${to}...`);

        const htmlBody = `
<div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.8; color: #1a1a1a; max-width: 680px; margin: 0 auto; padding: 32px 24px;">
  <p>Hi ${firstName},</p>
  <p>Your <strong>Suitability Study</strong> is attached as a PDF. It includes your Gap Analysis, ATS keyword review, personal summary from GLO, resume best practices checklist, and a set of probable interview questions.</p>
  <p>Review it alongside the conversation you just had with Glo — and check your screen for Glenn's special offer on a complete professional resume rewrite.</p>
  <p style="margin-top: 32px;">Best regards,<br><strong>Glenn &amp; the SSLDUCK Team</strong></p>
  <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p style="font-size: 12px; color: #6b7280;">Questions? Reply to this email or visit <a href="https://sslduck.net" style="color: #2563eb;">sslduck.net</a>.</p>
</div>`;


        const { data, error } = await resend.emails.send({
            from: 'SSLDUCK Reports <reports@sslduck.net>',
            to: Array.isArray(to) ? to : [to],
            ...(bcc ? { bcc: Array.isArray(bcc) ? bcc : [bcc] } : {}),
            subject: `Your Suitability Study — ${candidateName}`,
            html: htmlBody,
            attachments: [
                {
                    filename: `${filename}.pdf`,
                    content: docBuffer,
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
