import axios from 'axios';

export interface EmailAttachment {
  name: string;
  content: string; // Base64 encoded string
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: EmailAttachment[];
}

/**
 * Centralized Brevo Transactional Email Dispatcher
 */
export const sendBrevoEmail = async (options: SendEmailOptions): Promise<boolean> => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'youboardapp@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Youboard';

  if (!brevoApiKey || brevoApiKey.includes('your-brevo-api-key')) {
    console.warn('[EMAIL SERVICE] BREVO_API_KEY is missing or invalid.');
    return false;
  }

  const payload: any = {
    sender: { name: senderName, email: senderEmail },
    replyTo: { name: senderName, email: senderEmail },
    to: [{ email: options.to.trim() }],
    subject: options.subject,
    htmlContent: options.htmlContent,
    textContent: options.textContent || ''
  };

  if (options.attachments && options.attachments.length > 0) {
    payload.attachment = options.attachments.map(att => ({
      name: att.name,
      content: att.content
    }));
  }

  await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  return true;
};

/**
 * Send Password Reset OTP Email
 */
export const sendOtpEmail = async (toEmail: string, otp: string): Promise<boolean> => {
  const senderName = process.env.BREVO_SENDER_NAME || 'Youboard';
  const subject = `Your Password Reset OTP Code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 24px 28px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">INVENTORY MANAGEMENT SYSTEM</h1>
          <p style="color: #38bdf8; margin: 6px 0 0 0; font-size: 13px;">Password Reset Verification</p>
        </div>
        <div style="padding: 28px; text-align: center;">
          <p style="font-size: 14px; color: #475569; margin-top: 0;">
            We received a request to reset your password. Use the following 6-digit OTP code to complete your password reset:
          </p>
          <div style="background-color: #f1f5f9; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #64748b;">
            This OTP code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          Sent securely by ${senderName} • ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    to: toEmail,
    subject,
    htmlContent,
    textContent: `Your Password Reset OTP Code is: ${otp}. It is valid for 10 minutes.`
  });
};

/**
 * Send Exported Document Email Report
 */
export const sendReportDocumentEmail = async (
  toEmail: string,
  subject: string,
  message: string,
  attachmentName: string,
  base64Content: string
): Promise<boolean> => {
  const senderName = process.env.BREVO_SENDER_NAME || 'Youboard';
  const emailSubject = subject || `Your Document from ${senderName}`;
  const plainTextMessage = message || `Please find attached the requested report generated from our Inventory Management System.`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 24px 28px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; tracking-wide: uppercase;">INVENTORY HUB</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Official Business Document Notification</p>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Hello,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            ${plainTextMessage.replace(/\n/g, '<br/>')}
          </p>
          <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin: 24px 0; font-size: 13px; color: #334155;">
            📎 <strong>Attached Document:</strong> <span style="font-family: monospace; color: #0f766e;">${attachmentName}</span>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            If you have any questions regarding this document, please reply directly to this email.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          Sent automatically by Inventory Management System • ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    to: toEmail,
    subject: emailSubject,
    htmlContent,
    textContent: plainTextMessage,
    attachments: [
      {
        name: attachmentName,
        content: base64Content
      }
    ]
  });
};
