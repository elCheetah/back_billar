import { ENV } from './env';

export async function enviarCorreoHTML(to: string, subject: string, html: string) {
  // 1) Resend si está configurado
  if (ENV.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: ENV.MAIL_FROM, to, subject, html })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Fallo al enviar email (Resend): ${msg}`);
    }
    return;
  }

  // 2) Fallback SMTP con Nodemailer
  if (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASS) {
    throw new Error('No hay proveedor de correo configurado. Define RESEND_API_KEY o SMTP_* en el .env');
  }

  // Import dinámico para no requerir tipos en build
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer: any = (await import('nodemailer')).default ?? (await import('nodemailer'));

  const transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_PORT === 465,
    auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS }
  });

  await transporter.sendMail({ from: ENV.MAIL_FROM, to, subject, html });
}
