// Shared transactional-email template — dark/purple to match the site. Table + inline
// styles for mail-client compatibility, and a SOLID-colour button (CSS gradients get
// stripped by many clients, which is why the old amber button rendered invisible).

interface EmailOpts {
  heading: string                 // may contain <br/>
  intro: string
  rows?: [string, string][]       // [label, description]
  ctaText?: string
  ctaUrl?: string
  footerNote?: string
  unsubscribeEmail?: string
}

export function renderEmail(o: EmailOpts): string {
  const rows = (o.rows ?? []).map(([t, d]) => `
            <tr><td style="padding:10px 0;border-bottom:1px solid #241f38;">
              <span style="color:#a78bfa;font-weight:700;font-size:13px;">${t}</span>
              <span style="color:#9a93b0;font-size:13px;"> — ${d}</span>
            </td></tr>`).join('')

  const cta = o.ctaText && o.ctaUrl ? `
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 0;"><tr>
            <td bgcolor="#7c3aed" style="border-radius:100px;">
              <a href="${o.ctaUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;padding:14px 34px;border-radius:100px;">${o.ctaText}</a>
            </td></tr></table>` : ''

  const unsub = o.unsubscribeEmail
    ? `<br/><a href="https://novelcodex.org/unsubscribe?email=${encodeURIComponent(o.unsubscribeEmail)}" style="color:#6b6580;text-decoration:underline;">Unsubscribe</a>`
    : ''

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07060d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#b3aec6;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#07060d;padding:40px 20px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 28px;text-align:center;">
        <span style="font-size:22px;font-weight:800;color:#a78bfa;letter-spacing:-0.5px;">NovelCodex</span>
      </td></tr>
      <tr><td style="background:#141021;border:1px solid #2a2440;border-radius:16px;padding:38px 34px;">
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.25;">${o.heading}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#b3aec6;">${o.intro}</p>
        ${o.rows?.length ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:22px 0 0;">${rows}</table>` : ''}
        ${cta}
      </td></tr>
      <tr><td style="padding:22px 0 0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#6b6580;line-height:1.6;">${o.footerNote ?? 'You received this because you have a NovelCodex account.'}${unsub}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
