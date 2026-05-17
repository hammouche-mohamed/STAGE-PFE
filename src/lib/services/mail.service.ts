import { transporter } from "../mail-transport";

const APP_NAME = "ESST Internship Portal";
const NAVY = "#1e293b";
const ACCENT = "#4f46e5";
const TEXT_GRAY = "#475569";

/**
 * Escape user-controlled strings before injecting into an HTML email.
 * Prevents stored-XSS via names, comments, message text, etc.
 */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Convert a plain-text body to safe HTML: escape, then turn newlines into <br>.
 */
function escapeAndBr(value: unknown): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

/**
 * Absolute base URL for links in emails. A localhost/empty value is a dead
 * link in a recipient's inbox, so ignore it and fall back to production.
 */
const APP_URL = (() => {
  const candidate =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const isLocal = candidate && /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(candidate);
  return (candidate && !isLocal ? candidate : "https://esst-internship.vercel.app").replace(
    /\/+$/,
    "",
  );
})();

export class MailService {
  /** Public so other services (e.g. NotificationService) can sanitize input. */
  static escape = escapeHtml;
  static escapeAndBr = escapeAndBr;

  private static getEmailLayout(content: string) {
    return `
      <div style="margin: 0; padding: 0; width: 100%; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 60px 40px 45px; border-bottom: 2px solid #f1f5f9; text-align: center;">
              <h1 style="color: ${NAVY}; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.02em; font-family: 'Times New Roman', Times, serif; text-transform: none;">
                ${APP_NAME}
              </h1>
              <div style="height: 1px; width: 60px; background-color: ${ACCENT}; margin: 15px auto;"></div>
              <p style="color: ${TEXT_GRAY}; margin: 0; font-size: 14px; letter-spacing: 0.05em; font-weight: 400; font-family: 'Times New Roman', Times, serif; text-transform: uppercase;">
                École Supérieure des Sciences et Technologies
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px 60px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${TEXT_GRAY}; line-height: 1.5;">
                © ${new Date().getFullYear()} ESST — Internship Management Portal<br>
                <span style="font-size: 11px; color: #94a3b8;">This is an automated message — please do not reply directly.</span>
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // ── Password reset ────────────────────────────────────────────────────────
  static async sendPasswordResetCode(email: string, code: string, name?: string) {
    const safeCode = escapeHtml(code);
    const greeting = name ? `Hello ${escapeHtml(name)},` : "Hello,";
    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Password reset request</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 16px; margin: 0 0 12px;">${greeting}</p>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 15px; margin: 0 0 28px;">
        We received a request to reset the password on your ESST Portal account.
        <strong>Your password is about to be changed.</strong>
        Use the verification code below to continue. This code expires in <strong>5 minutes</strong>.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 28px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 10px; color: ${ACCENT}; font-family: monospace;">${safeCode}</span>
      </div>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.6;">
        If you did not request a password reset, you can safely ignore this email — your password will not change.
        If you suspect your account is being targeted, please contact the administration.
      </p>
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      // Security: do NOT put the code in the subject — it's visible in inbox previews and server logs.
      subject: "ESST Portal — Password reset code",
      html,
      text: `Your password is about to be changed.\nYour ESST Portal password reset code is: ${code}\nThis code is valid for 5 minutes.\nIf you did not request this, you can ignore this email — your password will not change.`,
    });
  }

  // ── Generic notification (used by NotificationService) ────────────────────
  static async sendNotification(email: string, title: string, message: string, link?: string) {
    const safeTitle = escapeHtml(title);
    const safeMessage = escapeAndBr(message);
    const safeLink = link ? `${APP_URL}${link}` : null;

    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 22px; font-weight: 600;">${safeTitle}</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 15px; margin: 0 0 32px;">
        ${safeMessage}
      </p>
      ${safeLink ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
          <tr>
            <td style="border-radius:6px;background-color:${NAVY};">
              <a href="${escapeHtml(safeLink)}"
                 style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:.2px;border-radius:6px;">
                Open in portal &rarr;
              </a>
            </td>
          </tr>
        </table>
      ` : ""}
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `${safeTitle} — ESST Portal`,
      html,
      text: `${title}\n\n${message}${link ? `\n\nOpen the portal: ${APP_URL}${link}` : ""}`,
    });
  }

  // ── Raw send (the body is wrapped in the layout) ──────────────────────────
  static async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    const styledHtml = this.getEmailLayout(html);
    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: styledHtml,
      text,
    });
  }

  // ── Registration approval / rejection ─────────────────────────────────────
  static async sendStatusUpdate(
    email: string,
    name: string,
    status: string,
    comment?: string | null,
    updatedData?: Record<string, any>,
    fullData?: any,
  ) {
    const isApproved = status === "APPROVED";
    const statusColor = isApproved ? "#059669" : "#dc2626";
    const safeName = escapeHtml(name);
    const safeStatus = escapeHtml(status);
    const safeComment = comment ? escapeHtml(comment) : null;
    const role = (fullData?.role as string | undefined)?.toUpperCase();

    // Role-aware messaging
    const approvedMessage =
      role === "STUDENT"
        ? "Your student account is now active. You can sign in to browse company-proposed internship topics, propose your own, and form a binôme."
        : role === "TEACHER"
        ? "Your teacher account is now active. You can sign in to review proposals assigned to you and supervise approved internships."
        : role === "COMPANY"
        ? "Your company account is now active. You can sign in to publish internship topics and follow their validation by the administration."
        : "Your account is now active. You can sign in to access your dashboard.";

    const rejectedMessage =
      "After review, the administration was unable to approve your registration request at this time. " +
      (comment
        ? "See the reviewer's note below."
        : "If you believe this was a mistake, please contact the department administration.");

    let infoHtml = "";
    const hasModifs = updatedData && Object.keys(updatedData).length > 0;

    if (fullData) {
      const isCompany = role === "COMPANY";
      const fields = isCompany
        ? [
            { label: "Sector", value: fullData.sector },
            { label: "Wilaya", value: fullData.wilaya },
            { label: "Company name", value: fullData.companyName },
          ]
        : [
            { label: "Speciality", value: fullData.speciality },
            { label: "Promotion / Level", value: fullData.promotion || fullData.level },
            { label: "Academic year", value: fullData.academicYear },
          ];

      const rowsHtml = fields
        .map(
          (f) => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${TEXT_GRAY}; font-size: 13px; font-weight: 600; width: 40%;">${escapeHtml(f.label)}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${NAVY}; font-size: 13px; text-align: right;">${escapeHtml(f.value || "—")}</td>
            </tr>`,
        )
        .join("");

      infoHtml = `
        <div style="margin-top: 24px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
          <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
            ${hasModifs ? "Information adjusted by the administration" : "Your registration details"}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            ${rowsHtml}
            ${
              hasModifs
                ? `<tr><td colspan="2" style="padding-top: 12px; color: ${TEXT_GRAY}; font-size: 11px; font-style: italic;">
                    * Fields updated: ${escapeHtml(
                      Object.keys(updatedData!).map((k) => k.replace(/([A-Z])/g, " $1").trim()).join(", "),
                    )}
                  </td></tr>`
                : ""
            }
          </table>
        </div>
      `;
    }

    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 8px; font-size: 22px; font-weight: 600;">Dear ${safeName},</h2>
      <p style="color: ${TEXT_GRAY}; font-size: 15px; margin: 0 0 28px;">
        Here is an update regarding your registration on the ESST Internship Portal.
      </p>

      <div style="border-radius: 8px; background-color: ${isApproved ? "#f0fdf4" : "#fef2f2"}; padding: 24px; margin-bottom: 28px; border-left: 4px solid ${statusColor};">
        <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
          Registration: <span style="color: ${statusColor};">${safeStatus}</span>
        </p>
        <p style="color: ${TEXT_GRAY}; line-height: 1.6; margin: 0; font-size: 15px;">
          ${isApproved ? escapeHtml(approvedMessage) : escapeHtml(rejectedMessage)}
        </p>
        ${
          safeComment
            ? `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${isApproved ? "#dcfce7" : "#fee2e2"};">
                <p style="margin: 0; font-size: 14px; color: ${NAVY};">
                  <strong>Reviewer's note:</strong><br>
                  <span style="color: ${TEXT_GRAY}; font-style: italic;">"${safeComment}"</span>
                </p>
              </div>`
            : ""
        }
      </div>

      ${isApproved ? infoHtml : ""}

      ${
        isApproved
          ? `<div style="text-align: center; margin-top: 32px;">
              <a href="${escapeHtml(APP_URL)}/login"
                 style="display: inline-block; background-color: ${NAVY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                Sign in to the portal
              </a>
            </div>`
          : ""
      }
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: isApproved
        ? "ESST Portal — Your registration has been approved"
        : "ESST Portal — Update on your registration",
      html,
      text: `Dear ${name},\n\nRegistration status: ${status}\n\n${isApproved ? approvedMessage : rejectedMessage}${comment ? `\n\nReviewer's note: "${comment}"` : ""}\n\nESST Internship Portal`,
    });
  }

  // ── Admin invitation ──────────────────────────────────────────────────────
  static async sendAdminInvitation(email: string, name: string, password: string, isSuperAdmin: boolean) {
    const roleText = isSuperAdmin ? "Super Administrator" : "Department Administrator";
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePassword = escapeHtml(password);
    const safeRole = escapeHtml(roleText);

    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Welcome to the ESST Portal</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 15px; margin: 0 0 24px;">
        Dear ${safeName},<br><br>
        You have been granted <strong>${safeRole}</strong> access to the ESST Internship Management Portal.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
          Your access credentials
        </p>
        <p style="margin: 0 0 8px; font-size: 15px; color: ${TEXT_GRAY};">
          <strong>Email:</strong> ${safeEmail}
        </p>
        <p style="margin: 0; font-size: 15px; color: ${TEXT_GRAY};">
          <strong>Temporary password:</strong>
          <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${safePassword}</span>
        </p>
      </div>

      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin-bottom: 28px;">
        <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
          <strong>Security notice:</strong> change this temporary password immediately on your first sign-in.
          Never share these credentials. Delete this email once you have signed in successfully.
        </p>
      </div>

      <div style="text-align: left;">
        <a href="${escapeHtml(APP_URL)}/login"
           style="display: inline-block; background-color: ${ACCENT}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
          Sign in to the portal
        </a>
      </div>
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `ESST Portal — ${roleText} access granted`,
      html,
      text: `Dear ${name},\n\nYou have been granted ${roleText} access to the ESST Portal.\n\nEmail: ${email}\nTemporary password: ${password}\n\nChange your password on first login. Sign in: ${APP_URL}/login`,
    });
  }

  // ── Registration received (acknowledgement) ───────────────────────────────
  static async sendRegistrationReceived(email: string, name: string, role?: string) {
    const safeName = escapeHtml(name);
    const reviewWindow = "within the next few working days";
    const roleSpecific =
      role === "STUDENT"
        ? "Your student registration has been received and is awaiting administrative review."
        : role === "TEACHER"
        ? "Your teacher registration has been received and is awaiting administrative review. You will be assigned to a department once approved."
        : role === "COMPANY"
        ? "Your company registration has been received and is awaiting administrative review."
        : "Your registration request has been received and is awaiting administrative review.";

    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Registration received</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 15px; margin: 0 0 20px;">
        Dear ${safeName},<br><br>
        ${escapeHtml(roleSpecific)}
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="color: ${TEXT_GRAY}; line-height: 1.6; margin: 0; font-size: 14px;">
          You will receive a follow-up email <strong>${reviewWindow}</strong> with the outcome of the review.
          No further action is required from you at this stage.
        </p>
      </div>
      <p style="color: #64748b; font-size: 13px; margin: 0;">
        For any urgent question, please contact the department administration.
      </p>
    `);

    try {
      return await transporter.sendMail({
        from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "ESST Portal — Registration received, pending review",
        html,
        text: `Dear ${name},\n\n${roleSpecific}\n\nYou will receive a follow-up email ${reviewWindow}.`,
      });
    } catch (error) {
      console.error("Failed to send registration confirmation email:", error);
    }
  }

  // ── Profile modified by admin ─────────────────────────────────────────────
  static async sendProfileModified(
    email: string,
    name: string,
    modifications: string[],
    role: string,
  ) {
    const safeName = escapeHtml(name);
    const safeRole = escapeHtml(role);

    const changesHtml =
      modifications.length > 0
        ? modifications
            .map((m) => {
              const safe = escapeHtml(m).replace(/^•\s*/, "").replace(/: (.+)$/, `: <strong style="color:${NAVY};">$1</strong>`);
              return `<tr><td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${TEXT_GRAY}; font-size: 14px;">${safe}</td></tr>`;
            })
            .join("")
        : `<tr><td style="padding: 8px 0; color: ${TEXT_GRAY}; font-size: 14px;">Your account details were reviewed and updated by the administration.</td></tr>`;

    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 8px; font-size: 22px; font-weight: 600;">Dear ${safeName},</h2>
      <p style="color: ${TEXT_GRAY}; font-size: 15px; margin: 0 0 28px;">
        An administrator has updated your <strong>${safeRole}</strong> account on the ESST Portal.
        Please review the changes below.
      </p>

      <div style="border-radius: 8px; background-color: #eff6ff; padding: 24px; margin-bottom: 28px; border-left: 4px solid #3b82f6;">
        <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
          Changes applied
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${changesHtml}
        </table>
      </div>

      <p style="color: ${TEXT_GRAY}; font-size: 14px; margin: 0 0 28px; line-height: 1.6;">
        If any of these changes look unexpected, contact the administration immediately so they can be reviewed.
      </p>

      <div style="text-align: left;">
        <a href="${escapeHtml(APP_URL)}/profile"
           style="display: inline-block; background-color: ${NAVY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
          Review my profile
        </a>
      </div>
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "ESST Portal — Your account was updated by the administration",
      html,
      text: `Dear ${name},\n\nAn administrator updated your ${role} account.\n\nChanges:\n${modifications.join("\n")}\n\nReview your profile: ${APP_URL}/profile`,
    });
  }
}
