import nodemailer from 'nodemailer';

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendDashboardReportEmail({ to, pdfBase64, fileName }) {
  if (!to?.trim()) throw new Error('Recipient email is required');
  if (!pdfBase64) throw new Error('PDF attachment is required');

  const attachment = {
    filename: fileName || 'wms-dashboard-report.pdf',
    content: Buffer.from(pdfBase64, 'base64'),
    contentType: 'application/pdf',
  };

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[demo-email] Dashboard report → ${to} (${attachment.filename}, ${attachment.content.length} bytes)`);
    return {
      sent: true,
      mode: 'demo',
      message: `Report prepared for ${to}. Configure SMTP in backend .env to deliver real emails.`,
    };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to.trim(),
    subject: 'Workforce Management System — Dashboard Report',
    text: 'Please find your Workforce Management System dashboard report attached.',
    html: '<p>Please find your <strong>Workforce Management System dashboard report</strong> attached.</p>',
    attachments: [attachment],
  });

  return { sent: true, mode: 'smtp', message: `Report sent to ${to}` };
}
