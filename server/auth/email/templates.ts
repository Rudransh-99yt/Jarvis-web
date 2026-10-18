// Professional Jarvis Branded OTP Email Template (Milestone 2.2)

export interface RenderOtpEmailOptions {
  code: string;
  intent: 'login' | 'register';
  recipientEmail: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderOtpEmail(options: RenderOtpEmailOptions): RenderedEmail {
  const { code, intent, recipientEmail } = options;
  const isLogin = intent === 'login';

  const subject = isLogin
    ? `Your J.A.R.V.I.S. Login Verification Code: ${code}`
    : `Welcome to J.A.R.V.I.S. — Your Verification Code: ${code}`;

  const headerTitle = isLogin ? 'Sign In to J.A.R.V.I.S.' : 'Welcome to J.A.R.V.I.S.';
  const introText = isLogin
    ? 'A request was made to sign in to your J.A.R.V.I.S. account. Use the verification code below to complete your authentication.'
    : 'Thank you for registering with J.A.R.V.I.S. Use the verification code below to complete your account setup.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6);"></td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #06b6d4; text-transform: uppercase; margin-bottom: 12px;">J.A.R.V.I.S. OS</div>
                    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #f8fafc; line-height: 1.3;">${headerTitle}</h1>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">${introText}</p>
                  </td>
                </tr>
                <!-- Code Box -->
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <div style="background-color: #020617; border: 1px solid #06b6d4; border-radius: 12px; padding: 20px 24px; display: inline-block; text-align: center; box-shadow: 0 0 20px rgba(6, 182, 212, 0.15);">
                      <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px;">Single-Use Security Code</div>
                      <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; padding: 4px 0 4px 8px;">${code}</div>
                      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Expires in 10 minutes</div>
                    </div>
                  </td>
                </tr>
                <!-- Security Warning -->
                <tr>
                  <td style="border-top: 1px solid #1e293b; padding-top: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      <strong>Security Advisory:</strong> If you did not request this verification code, please ignore this email. Never share this code with anyone; J.A.R.V.I.S. operators will never ask for your code.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #475569;">
                      Recipient: <span style="color: #64748b;">${recipientEmail}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${headerTitle}

${introText}

YOUR VERIFICATION CODE: ${code}
(Expires in 10 minutes)

Security Advisory: If you did not request this verification code, please ignore this email. Never share this code with anyone.

Recipient: ${recipientEmail}
J.A.R.V.I.S. Authentication Engine
`;

  return { subject, html, text };
}
