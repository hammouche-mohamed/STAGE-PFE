import { transporter } from "../mail-transport";

export class MailService {
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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("Emails not sent: SMTP credentials missing.");
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'ESST Management'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        text: text || "This email requires an HTML compatible viewer.",
        html,
      });

      return info;
    } catch (error) {
      console.error("MailService Error:", error);
      throw error;
    }
  }

  static async sendPasswordResetCode(email: string, code: string) {
    const subject = "Password Reset Verification Code";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; rounded-lg">
        <h2 style="color: #4f46e5; text-align: center;">Account Security</h2>
        <p>You have requested to reset your password for the ESST PFE Management System.</p>
        <p>Please use the following verification code to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b; background: #f3f4f6; padding: 15px 25px; border-radius: 8px; border: 1px solid #d1d5db;">
            ${code}
          </span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e1e1e1;" />
        <p style="text-align: center; color: #9ca3af; font-size: 12px;">Official ESST Alger Administrative Portal</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html });
  }

  static async sendStatusUpdate(email: string, name: string, status: "APPROVED" | "REJECTED", comment?: string) {
    const isApproved = status === "APPROVED";
    const subject = isApproved ? "Registration Approved" : "Registration Update";
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1;">
        <h2 style="color: ${isApproved ? '#16a34a' : '#dc2626'}; text-align: center;">
          Registration ${status}
        </h2>
        <p>Hello ${name},</p>
        <p>
          ${isApproved 
            ? "Congratulations! Your registration request for the PFE Management System has been approved. You can now login using the credentials you set during registration." 
            : "We regret to inform you that your registration request has been rejected."}
        </p>
        ${comment ? `<p><strong>Admin Comment:</strong> ${comment}</p>` : ''}
        ${isApproved ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login" 
               style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Login to Portal
            </a>
          </div>
        ` : ''}
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e1e1e1;" />
        <p style="text-align: center; color: #9ca3af; font-size: 12px;">Official ESST Alger Administrative Portal</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, html });
  }
}
