const nodemailer = require('nodemailer');

/**
 * Institutional Email & Notification Transport Service
 * Reads SMTP credentials from environment variables.
 * Dispatches live emails via Nodemailer when configured.
 * Falls back to terminal logging with [DEV RESET CODE] in local/dev environments.
 */

let cachedConfigKey = null;
let cachedTransporter = null;

function isSmtpConfigured() {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  return Boolean(host && user && pass);
}

function getTransporter() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = (process.env.SMTP_USER || '').trim();
  // Strip spaces if user pasted formatted Gmail app password e.g. "pyqw uoji jkqg tsjw"
  const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    const configKey = `${host}:${port}:${secure}:${user}:${pass}`;
    if (!cachedTransporter || cachedConfigKey !== configKey) {
      cachedConfigKey = configKey;
      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Ensures compatibility across local development and production
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 5000,
      });
    }
    return cachedTransporter;
  }

  cachedTransporter = null;
  cachedConfigKey = null;
  return null;
}

/**
 * Verify SMTP transport connection on server boot and log clear diagnostics
 */
async function verifyEmailTransport() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const hasPass = Boolean((process.env.SMTP_PASS || '').trim());
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  console.log('\n--------------------------------------------------------------------------------');
  console.log('📬 [EMAIL SERVICE] Verifying Nodemailer SMTP Configuration...');

  if (!isSmtpConfigured()) {
    console.log('⚠️  [SMTP STATUS]: NOT CONFIGURED (Dev Fallback Mode Active)');
    console.log('   Missing: ' + [!host && 'SMTP_HOST', !user && 'SMTP_USER', !hasPass && 'SMTP_PASS'].filter(Boolean).join(', '));
    console.log('   👉 OTPs will be printed to stdout: console.log(`[PASSWORD RESET OTP for ${email}]: ${otpCode}`)');
    console.log('');
    console.log('📖 TO RECEIVE LIVE EMAILS IN YOUR GMAIL INBOX:');
    console.log('   1. Turn on 2-Step Verification: https://myaccount.google.com/security');
    console.log('   2. Generate an App Password: https://myaccount.google.com/apppasswords');
    console.log('      (Select App: Mail / Device: Other -> "Zenora LMS")');
    console.log('   3. Set SMTP_USER=your_email@gmail.com and SMTP_PASS=16characterapppass in backend/.env');
    console.log('   4. Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_SECURE=true');
    console.log('   5. Restart backend server.');
    console.log('--------------------------------------------------------------------------------\n');
    return { configured: false, verified: false };
  }

  const transporter = getTransporter();
  try {
    await transporter.verify();
    console.log('✅ [SMTP STATUS]: CONNECTION VERIFIED SUCCESSFULLY');
    console.log(`   Host:     ${host}:${port} (secure: ${secure})`);
    console.log(`   User:     ${user}`);
    console.log(`   From:     ${process.env.SMTP_FROM || `"Zenora LMS" <${user}>`}`);
    console.log('   Status:   Ready to deliver live verification emails to user inboxes.');
    console.log('--------------------------------------------------------------------------------\n');
    return { configured: true, verified: true };
  } catch (err) {
    console.error('❌ [SMTP ERROR]: CONNECTION VERIFICATION FAILED');
    console.error(`   Host:     ${host}:${port}`);
    console.error(`   User:     ${user}`);
    console.error(`   Error:    ${err.message}`);

    const isAuth = err.code === 'EAUTH' || err.responseCode === 535 || err.message.toLowerCase().includes('badcredentials') || err.message.toLowerCase().includes('invalid login');
    if (isAuth) {
      console.error('\n   ⚠️  AUTHENTICATION ERROR (Bad Credentials):');
      console.error('   Google rejected your credentials. You CANNOT use your regular Gmail password.');
      console.error('   👉 FIX: Generate a 16-character App Password at:');
      console.error('      https://myaccount.google.com/apppasswords');
      console.error('      Then paste it into SMTP_PASS in backend/.env.\n');
    } else {
      console.error(`   Code:     ${err.code || 'UNKNOWN'}`);
      console.error('   👉 Check your internet connection, firewall, port (465 vs 587), or host settings.\n');
    }

    console.error('   [DEV FALLBACK] OTPs will be output to terminal stdout when requested:');
    console.error('   console.log(`[PASSWORD RESET OTP for ${email}]: ${otpCode}`)');
    console.error('--------------------------------------------------------------------------------\n');
    return { configured: true, verified: false, error: err.message, isAuthError: isAuth };
  }
}

/**
 * Send 6-digit password reset verification email
 * @param {Object} options
 * @param {string} options.toEmail
 * @param {string} options.userName
 * @param {string} options.resetCode
 * @param {number} options.expiresInMinutes
 */
async function sendPasswordResetEmail({ toEmail, userName, resetCode, expiresInMinutes = 15 }) {
  const configuredFrom = (process.env.SMTP_FROM || '"Zenora LMS" <no-reply@zenora.com>').trim();
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const user = (process.env.SMTP_USER || '').trim();

  // If using Gmail, ensure the sender uses the authenticated account to guarantee SPF/DKIM deliverability
  let senderAddress = configuredFrom;
  if (host.includes('gmail.com') && user) {
    const match = configuredFrom.match(/^"?([^"<]+)"?\s*(<.*>)?$/);
    const displayName = match && match[1] ? match[1].trim() : 'Zenora LMS';
    senderAddress = `"${displayName}" <${user}>`;
  }

  const transporter = getTransporter();

  // If SMTP credentials are not configured in environment (fallback mode)
  if (!transporter) {
    // Print OTP clearly in terminal stdout
    console.log(`[PASSWORD RESET OTP for ${toEmail}]: ${resetCode}`);
    console.log('\n================================================================');
    console.log(`🔐 [DEV RESET CODE]: ${resetCode}`);
    console.log(`👤 Recipient: ${userName || 'User'} <${toEmail}>`);
    console.log(`⏰ Expiration: Valid for ${expiresInMinutes} minutes`);
    console.log(`📡 Transport: Local Console Emulation (SMTP_USER/SMTP_PASS not set in .env)`);
    console.log(`👉 To deliver real emails, add Gmail App Password to backend/.env`);
    console.log('================================================================\n');

    return {
      success: true,
      delivered: false,
      isDevFallback: true,
      isConfigured: false,
    };
  }

  // Attempt real email dispatch via Nodemailer
  try {
    const info = await transporter.sendMail({
      from: senderAddress,
      to: toEmail,
      subject: `[Zenora LMS] Your Password Reset Verification Code: ${resetCode}`,
      text: `Hello ${userName || 'User'},\n\nYou requested a password reset for your Zenora LMS institutional account.\n\nYour 6-digit verification code is: ${resetCode}\n\nThis verification code is valid for ${expiresInMinutes} minutes. If you did not make this request, please disregard this email or notify IT administration immediately.\n\nBest regards,\nZenora LMS Academic Administration`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zenora LMS - Password Reset Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <!-- Preheader text for inbox preview -->
          <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
            Your Zenora LMS verification code is: ${resetCode}. Valid for ${expiresInMinutes} minutes.
          </div>

          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 15px;">
            <tr>
              <td align="center">
                <!-- Main Card Container -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);">
                  
                  <!-- Institutional Header Banner -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #4338ca 0%, #2563eb 50%, #06b6d4 100%); padding: 36px 30px; text-align: center;">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; padding: 6px 16px; margin-bottom: 12px;">
                              <span style="color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Institutional Academic Portal</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">ZENORA LMS</h1>
                            <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">Academic Identity & Single Sign-On Authority</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Body -->
                  <tr>
                    <td style="padding: 36px 32px 28px 32px; background: #111827;">
                      <h2 style="margin: 0 0 16px 0; color: #f9fafb; font-size: 20px; font-weight: 700;">Password Reset Verification</h2>
                      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                        Hello <strong style="color: #f3f4f6;">${userName || 'Academic User'}</strong>,<br/>
                        We received an authorization request to reset the password for your Zenora LMS institutional account. Use the single-use 6-digit verification code below to authorize this credential change:
                      </p>

                      <!-- Prominent OTP Code Container -->
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                        <tr>
                          <td align="center" style="background: #0b1120; border: 2px dashed #4f46e5; border-radius: 12px; padding: 26px 20px;">
                            <div style="font-size: 12px; color: #818cf8; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 8px;">Single-Use Security Code</div>
                            <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, Consolas, monospace; margin-left: 10px;">${resetCode}</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Expiration Notice Badge -->
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0;">
                        <tr>
                          <td align="center">
                            <div style="display: inline-block; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 8px 16px;">
                              <span style="color: #fbbf24; font-size: 13px; font-weight: 600;">⏱️ Code expires in ${expiresInMinutes} minutes</span>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Security Information -->
                      <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #1e293b; border-radius: 10px; padding: 16px 18px; margin: 0 0 20px 0;">
                        <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                          <strong style="color: #e2e8f0;">🔒 Security Advisory:</strong> Never share this verification code with anyone. Zenora LMS administrators and instructors will never contact you asking for your verification code or account password.
                        </p>
                      </div>

                      <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">
                        If you did not request this password reset, please ignore this email or contact the campus IT security desk. Your account password remains unchanged.
                      </p>
                    </td>
                  </tr>

                  <!-- Official Institutional Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background: #0b1120; border-top: 1px solid #1f2937; text-align: center;">
                      <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 12px; font-weight: 600;">
                        Zenora LMS • Office of Academic Technology & Security Services
                      </p>
                      <p style="margin: 0; color: #4b5563; font-size: 11px;">
                        Automated security dispatch. Please do not reply directly to this email.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log(`[SMTP SUCCESS] Verification email delivered to ${toEmail}. Message ID: ${info.messageId}`);
    return {
      success: true,
      delivered: true,
      messageId: info.messageId,
      isConfigured: true,
    };
  } catch (err) {
    console.error(`\n[SMTP ERROR] Failed to dispatch email to ${toEmail}:`, err.message);

    // Print fallback OTP in terminal stdout
    console.log(`[PASSWORD RESET OTP for ${toEmail}]: ${resetCode}`);

    const isAuth = err.code === 'EAUTH' || err.responseCode === 535 || err.message.toLowerCase().includes('badcredentials') || err.message.toLowerCase().includes('invalid login');
    if (isAuth) {
      console.error('[SMTP AUTH GUIDANCE] Invalid login credentials. For Gmail, you must use a 16-character App Password (https://myaccount.google.com/apppasswords), NOT your regular password.');
    }

    return {
      success: false,
      delivered: false,
      error: err.message,
      code: err.code || 'SMTP_ERROR',
      isAuthError: isAuth,
      isConfigured: true,
    };
  }
}

/**
 * Send System Notification Email
 * @param {Object} options
 * @param {string} options.toEmail
 * @param {string} options.userName
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.actionUrl]
 */
async function sendNotificationEmail({ toEmail, userName, title, message, actionUrl }) {
  const configuredFrom = (process.env.SMTP_FROM || '"Zenora LMS" <no-reply@zenora.com>').trim();
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const user = (process.env.SMTP_USER || '').trim();

  let senderAddress = configuredFrom;
  if (host.includes('gmail.com') && user) {
    const match = configuredFrom.match(/^"?([^"<]+)"?\s*(<.*>)?$/);
    const displayName = match && match[1] ? match[1].trim() : 'Zenora LMS';
    senderAddress = `"${displayName}" <${user}>`;
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[SYSTEM NOTIFICATION to ${toEmail}]: ${title} - ${message}`);
    return { success: true, delivered: false, isDevFallback: true, isConfigured: false };
  }

  try {
    const info = await transporter.sendMail({
      from: senderAddress,
      to: toEmail,
      subject: `[Zenora LMS] Notification: ${title}`,
      text: `Hello ${userName || 'User'},\n\n${title}\n\n${message}\n\nBest regards,\nZenora LMS Administration`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zenora LMS - ${title}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #4338ca 0%, #2563eb 100%); padding: 28px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">🏛️ ZENORA LMS</h1>
                      <p style="margin: 4px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">Academic Management Notification</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px; background: #111827;">
                      <h2 style="margin: 0 0 12px 0; color: #f9fafb; font-size: 18px;">${title}</h2>
                      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                        Hello <strong style="color: #f3f4f6;">${userName || 'User'}</strong>,<br/><br/>
                        ${message}
                      </p>
                      ${actionUrl ? `
                      <div style="text-align: center; margin: 28px 0 16px 0;">
                        <a href="${actionUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">View in Zenora LMS →</a>
                      </div>
                      ` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; background: #0b1120; border-top: 1px solid #1f2937; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 11px;">
                        Zenora LMS Academic Workspace • Automated System Notification
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log(`[SMTP SUCCESS] Notification email delivered to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId, isConfigured: true };
  } catch (err) {
    console.error(`[SMTP ERROR] Failed to dispatch notification to ${toEmail}:`, err.message);
    return { success: false, delivered: false, error: err.message, isConfigured: true };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendNotificationEmail,
  getTransporter,
  verifyEmailTransport,
  isSmtpConfigured,
};
