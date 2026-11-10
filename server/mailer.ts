import nodemailer from 'nodemailer';

interface MailOptions { to: string; subject: string; text: string; html: string; }

function setting(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ortam değişkeni tanımlı değil.`);
  return value;
}

export async function sendMail(options: MailOptions) {
  const host = setting('CRM_SMTP_HOST');
  const port = Number(process.env.CRM_SMTP_PORT || 587);
  const user = setting('CRM_SMTP_USER');
  const password = setting('CRM_SMTP_PASSWORD');
  const from = setting('CRM_MAIL_FROM');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  await transporter.sendMail({
    from: `ISSD CRM <${from}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export function verificationMail(code: string, purpose: 'register' | 'reset-password') {
  const action = purpose === 'register' ? 'ISSD CRM hesap doğrulama' : 'ISSD CRM parola sıfırlama';
  const intro = purpose === 'register'
    ? 'ISSD CRM hesabınızı etkinleştirmek için doğrulama kodunuz:'
    : 'Parolanızı yenilemek için doğrulama kodunuz:';
  const preview = purpose === 'register' ? 'Hesabınızı etkinleştirmek için doğrulama kodunuz hazır.' : 'Parola yenileme doğrulama kodunuz hazır.';
  const html = `
    <!doctype html>
    <html lang="tr">
      <body style="margin:0;background:#f3f6f8;color:#173042;font-family:Arial,Helvetica,sans-serif">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preview}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:40px 16px">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dce5e9;border-radius:12px;overflow:hidden">
                <tr>
                  <td style="height:6px;background:#16a085;font-size:0;line-height:0">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:32px 40px 12px">
                    <div style="font-size:13px;line-height:20px;letter-spacing:1.8px;color:#16a085;font-weight:bold">ISSD CRM</div>
                    <h1 style="margin:22px 0 12px;font-size:25px;line-height:34px;color:#173042;font-weight:700">${action}</h1>
                    <p style="margin:0;color:#607582;font-size:15px;line-height:24px">${intro}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px 24px">
                    <div style="background:#edf8f5;border:1px solid #c8ebe1;border-radius:10px;padding:18px;text-align:center">
                      <div style="font-size:12px;line-height:18px;letter-spacing:1.5px;color:#55726f;text-transform:uppercase">Doğrulama kodu</div>
                      <div style="margin-top:8px;color:#117c69;font-size:32px;line-height:40px;letter-spacing:8px;font-weight:bold">${code}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 32px">
                    <p style="margin:0;color:#607582;font-size:14px;line-height:22px">Bu kod <strong style="color:#173042">10 dakika</strong> boyunca geçerlidir.</p>
                    <p style="margin:18px 0 0;color:#8798a1;font-size:13px;line-height:21px">Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayın. Hesabınız güvendedir.</p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #edf1f3;padding:18px 40px 22px;color:#9aa8ae;font-size:12px;line-height:18px">
                    Bu e-posta ISSD CRM tarafından otomatik olarak gönderilmiştir.<br />Lütfen bu e-postayı yanıtlamayın.
                  </td>
                </tr>
              </table>
              <div style="padding:18px 16px 0;color:#9aa8ae;font-size:12px;line-height:18px">ISSD Akıllı Ulaşım Sistemleri</div>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  return { subject: action, text: `${action}\n\n${intro}\n\nKodunuz: ${code}\n\nBu kod 10 dakika geçerlidir. Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayın.`, html };
}