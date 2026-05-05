import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class MailService {
  static async sendPasswordResetCode(email: string, code: string) {
    const mailOptions = {
      from: `"ESST Portal" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Verification Code",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">ESST Portal</h2>
          <p>Hello,</p>
          <p>You requested to reset your password. Please use the verification code below to proceed:</p>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2024 ESST — École Supérieure des Sciences et Technologies</p>
        </div>
      `,
    };

    return transporter.sendMail(mailOptions);
  }

  static async sendNotification(email: string, title: string, message: string, link?: string) {
    const mailOptions = {
      from: `"ESST Portal" <${process.env.SMTP_USER}>`,
      to: email,
      subject: title,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">ESST Portal</h2>
          <h3 style="color: #1e293b;">${title}</h3>
          <p style="line-height: 1.6; color: #334155;">${message}</p>
          ${link ? `
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Details</a>
            </div>
          ` : ""}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2024 ESST — École Supérieure des Sciences et Technologies</p>
        </div>
      `,
    };

    return transporter.sendMail(mailOptions);
  }

  static async sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
    const mailOptions = {
      from: `"ESST Portal" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    };

    return transporter.sendMail(mailOptions);
  }

  static async sendStatusUpdate(email: string, name: string, status: string, comment?: string | null) {
    const isApproved = status === 'APPROVED';
    const subject = `Registration ${isApproved ? 'Approved' : 'Rejected'} - ESST Portal`;

    const mailOptions = {
      from: `"ESST Portal" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">ESST Portal</h2>
          <p>Hello ${name},</p>
          <p>Your registration request has been <strong>${status.toLowerCase()}</strong> by the administration.</p>
          ${comment ? `
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'}; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Admin Comment:</strong> ${comment}</p>
            </div>
          ` : ""}
          ${isApproved ? `
            <p>You can now log in to the portal using your credentials.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Portal</a>
            </div>
          ` : `
            <p>If you have any questions, please contact the administration.</p>
          `}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2024 ESST — École Supérieure des Sciences et Technologies</p>
        </div>
      `,
    };

    return transporter.sendMail(mailOptions);
  }
}
