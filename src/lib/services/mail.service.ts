import { transporter } from "../mail-transport";

const APP_NAME = "ESST Internship portal";
const NAVY = "#1e293b";    // Slate 800
const ACCENT = "#4f46e5";  // Indigo 600
const TEXT_GRAY = "#475569"; // Slate 600

export class MailService {
  private static getEmailLayout(content: string) {
    return `
      <div style="margin: 0; padding: 0; width: 100%; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <!-- Classic Academic Header -->
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
          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 60px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${TEXT_GRAY}; line-height: 1.5;">
                © ${new Date().getFullYear()} ESST — Internship Management Portal<br>
                <span style="font-size: 11px; color: #94a3b8;">This is an official communication from the administration.</span>
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  static async sendPasswordResetCode(email: string, code: string) {
    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Authorization Code</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 16px; margin: 0 0 32px;">
        A request has been made to reset your portal password. Please use the following code to verify your identity:
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 10px; color: ${ACCENT}; font-family: monospace;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 14px; margin: 0; text-align: center;">
        This code is valid for 5 minutes. If you did not initiate this request, please secure your account immediately.
      </p>
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Verification Code: ${code}`,
      html,
    });
  }

  static async sendNotification(email: string, title: string, message: string, link?: string) {
    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 24px; font-weight: 600;">${title}</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 16px; margin: 0 0 40px;">
        ${message}
      </p>
      ${link ? `
        <div style="text-align: left;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" 
             style="display: inline-block; background-color: ${ACCENT}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            Open Portal Application
          </a>
        </div>
      ` : ""}
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: title,
      html,
    });
  }

  static async sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
    const styledHtml = this.getEmailLayout(html);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: styledHtml,
      text,
    });
  }

  static async sendStatusUpdate(email: string, name: string, status: string, comment?: string | null, updatedData?: Record<string, any>, fullData?: any) {
    const isApproved = status === 'APPROVED';
    const statusColor = isApproved ? '#059669' : '#dc2626';
    
    // Format modifications or summary
    let infoHtml = '';
    const hasModifs = updatedData && Object.keys(updatedData).length > 0;

    if (fullData) {
      const isCompany = fullData.role === 'COMPANY';
      const label1 = isCompany ? 'Sector' : 'Speciality';
      const value1 = isCompany ? fullData.sector : fullData.speciality;
      const label2 = isCompany ? 'Wilaya' : 'Promotion';
      const value2 = isCompany ? fullData.wilaya : fullData.promotion;
      const label3 = isCompany ? 'Company Name' : 'Academic Year';
      const value3 = isCompany ? fullData.companyName : fullData.academicYear;

      infoHtml = `
        <div style="margin-top: 24px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
          <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
            ${hasModifs ? 'Administrative Modifications Applied' : 'Your Profile Information'}
          </p>
          <p style="color: ${TEXT_GRAY}; font-size: 14px; margin-bottom: 12px;">
            ${hasModifs 
              ? 'The administration has adjusted your profile data during the review process. Please review your final details below:' 
              : 'Here is a summary of your registration details for your records:'}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${TEXT_GRAY}; font-size: 13px; font-weight: 600; width: 40%;">${label1}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${NAVY}; font-size: 13px; text-align: right;">${value1 || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${TEXT_GRAY}; font-size: 13px; font-weight: 600;">${label2}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${NAVY}; font-size: 13px; text-align: right;">${value2 || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${TEXT_GRAY}; font-size: 13px; font-weight: 600;">${label3}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${NAVY}; font-size: 13px; text-align: right;">${value3 || "N/A"}</td>
            </tr>
            ${hasModifs ? `
              <tr>
                <td colspan="2" style="padding-top: 12px; color: ${TEXT_GRAY}; font-size: 11px; font-style: italic;">
                  * Fields updated by admin: ${Object.keys(updatedData).map(k => k.replace(/([A-Z])/g, ' $1').trim()).join(', ')}
                </td>
              </tr>
            ` : ''}
          </table>
        </div>
      `;
    }

    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 8px; font-size: 22px; font-weight: 600;">Dear ${name},</h2>
      <p style="color: ${TEXT_GRAY}; font-size: 16px; margin: 0 0 32px;">This is an update regarding your registration request.</p>
      
      <div style="border-radius: 8px; background-color: ${isApproved ? '#f0fdf4' : '#fef2f2'}; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${statusColor};">
        <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
          Registration Status: <span style="color: ${statusColor};">${status}</span>
        </p>
        <p style="color: ${TEXT_GRAY}; line-height: 1.6; margin: 0; font-size: 15px;">
          ${isApproved 
            ? "We are pleased to inform you that your registration has been approved. You may now access the full features of the portal." 
            : "We regret to inform you that your registration was not approved at this time."}
        </p>
        ${comment ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${isApproved ? '#dcfce7' : '#fee2e2'};">
            <p style="margin: 0; font-size: 14px; color: ${NAVY};">
              <strong>Official Remark:</strong><br>
              <span style="color: ${TEXT_GRAY}; font-style: italic;">"${comment}"</span>
            </p>
          </div>
        ` : ""}
      </div>

      ${infoHtml}
      
      ${isApproved ? `
      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" 
           style="display: inline-block; background-color: ${NAVY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
          Sign In to Portal
        </a>
      </div>
      ` : ""}
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Portal Update: Registration ${status}`,
      html,
    });
  }
  static async sendAdminInvitation(email: string, name: string, password: string, isSuperAdmin: boolean) {
    const roleText = isSuperAdmin ? "Administrator" : "Department Administrator";
    
    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Welcome to ESST Portal</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 16px; margin: 0 0 24px;">
        Dear ${name},<br><br>
        You have been invited to join the ESST Internship Management Portal as an <strong>${roleText}</strong>.
      </p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
        <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
          Your Access Credentials
        </p>
        <p style="margin: 0 0 8px; font-size: 15px; color: ${TEXT_GRAY};">
          <strong>Email:</strong> ${email}
        </p>
        <p style="margin: 0; font-size: 15px; color: ${TEXT_GRAY};">
          <strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</span>
        </p>
      </div>

      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 15px; margin: 0 0 32px;">
        For security reasons, you will be required to change this temporary password immediately upon your first login.
      </p>
      
      <div style="text-align: left;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" 
           style="display: inline-block; background-color: ${ACCENT}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          Sign In to Portal
        </a>
      </div>
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Invitation: ESST Portal ${roleText} Access`,
      html,
    });
  }

  static async sendRegistrationReceived(email: string, name: string) {
    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Registration Received</h2>
      <p style="color: ${TEXT_GRAY}; line-height: 1.6; font-size: 16px; margin: 0 0 24px;">
        Dear ${name},<br><br>
        Thank you for registering with the ESST Internship Management Portal. We have successfully received your request.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
        <p style="color: ${TEXT_GRAY}; line-height: 1.6; margin: 0; font-size: 15px;">
          Your request is currently being reviewed by the administration. You will receive another email once your account has been activated.
        </p>
      </div>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        If you have any questions, please contact the department administration.
      </p>
    `);

    try {
      return await transporter.sendMail({
        from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Registration Received - ESST Portal",
        html,
      });
    } catch (error) {
      console.error("Failed to send registration confirmation email:", error);
    }
  }

  static async sendProfileModified(
    email: string,
    name: string,
    modifications: string[],
    role: string,
  ) {
    const changesHtml = modifications.length > 0
      ? modifications.map(m => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: ${TEXT_GRAY}; font-size: 14px;">
              ${m.replace(/^• /, "").replace(/: (.+)$/, `: <strong style="color:${NAVY};">$1</strong>`)}
            </td>
          </tr>
        `).join("")
      : `<tr><td style="padding: 8px 0; color: ${TEXT_GRAY}; font-size: 14px;">Your account details were reviewed and updated by the administration.</td></tr>`;

    const html = this.getEmailLayout(`
      <h2 style="color: ${NAVY}; margin: 0 0 8px; font-size: 22px; font-weight: 600;">Dear ${name},</h2>
      <p style="color: ${TEXT_GRAY}; font-size: 15px; margin: 0 0 28px;">
        An administrator has made changes to your <strong>${role}</strong> account. Please review the modifications below.
      </p>

      <div style="border-radius: 8px; background-color: #eff6ff; padding: 24px; margin-bottom: 28px; border-left: 4px solid #3b82f6;">
        <p style="color: ${NAVY}; font-weight: 700; margin: 0 0 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
          Account Modifications Applied
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${changesHtml}
        </table>
      </div>

      <p style="color: ${TEXT_GRAY}; font-size: 14px; margin: 0 0 28px; line-height: 1.6;">
        If you believe these changes were made in error or you have any questions, please contact the administration.
      </p>

      <div style="text-align: left;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile"
           style="display: inline-block; background-color: ${NAVY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
          Review My Profile
        </a>
      </div>
    `);

    return transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Account Has Been Updated — ESST Portal",
      html,
    });
  }
}
