import nodemailer from "nodemailer";

const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

export const transporter = nodemailer.createTransport(smtpConfig);

// Verify connection configuration
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Connection Error:", error);
    } else {
      // SMTP ready
    }
  });
} else {
  console.warn("SMTP credentials not provided. Emails will not be sent.");
}
