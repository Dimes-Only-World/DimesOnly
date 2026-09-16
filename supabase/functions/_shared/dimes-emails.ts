// Dimes Only World — luxury black & gold transactional emails.
// Sent via Mailtrap. Placeholders use the exact names the system expects:
// {{dime_name}} {{commission}} {{username}} {{rating}} {{event_details}} {{profile_photo}}

const MAILTRAP_ENDPOINT = "https://send.api.mailtrap.io/api/send";

export const EMAIL_BRAND = {
  siteUrl: "https://dimesonly.world",
  fromEmail: "Talent@DimesOnly.World",
  fromName: "Dimes Only World",
  header: "DIMES ONLY WORLD",
  footer: "Talent Team • Talent@DimesOnly.World • Sexy Starts Here",
  heroes: {
    tip: "https://dimesonly.world/__l5e/assets-v1/b4743414-b5d7-4dc0-b8ce-8213c0196ba2/tip-email-hero.jpg",
    rated: "https://dimesonly.world/__l5e/assets-v1/5b9a5d8e-022a-4735-b8cb-9fea7f277408/rated-email-hero.jpg",
    event: "https://dimesonly.world/__l5e/assets-v1/22013381-5086-41dd-809e-9a55d717d117/event-email-hero.jpg",
  },
  defaultPhoto:
    "https://dimesonly.world/__l5e/assets-v1/47bc3f1c-dc54-4068-8794-b8c468cbd2b1/default-avatar.png",
} as const;

export type DimeEmailType = "tip" | "rated" | "event";

export interface DimeEmailData {
  dime_name?: string;
  commission?: string;
  username?: string;
  rating?: string;
  event_details?: string;
  profile_photo?: string;
  button_url?: string;
}

interface TemplateDef {
  subject: string;
  preheader: string;
  hero: string;
  headline: string;
  // Body copy uses the exact placeholder tokens, replaced at send time.
  paragraphs: string[];
  showPhoto: boolean;
  buttonLabel: string;
}

const TEMPLATES: Record<DimeEmailType, TemplateDef> = {
  tip: {
    subject: "You received a tip",
    preheader: "You just received {{commission}} from {{username}}",
    hero: EMAIL_BRAND.heroes.tip,
    headline: "You Received a Tip",
    paragraphs: [
      "Hi {{dime_name}},",
      "Great news. You just received <strong style=\"color:#F5D76E;\">{{commission}}</strong> from <strong style=\"color:#F5D76E;\">{{username}}</strong>.",
      "Go in and thank them today. The Dimes who reply fast keep the money coming.",
    ],
    showPhoto: true,
    buttonLabel: "Thank {{username}}",
  },
  rated: {
    subject: "You've been rated!",
    preheader: "You are currently at {{rating}}",
    hero: EMAIL_BRAND.heroes.rated,
    headline: "You've Been Rated",
    paragraphs: [
      "Hi {{dime_name}},",
      "You've been rated. You are currently at <strong style=\"color:#F5D76E;\">{{rating}}</strong>.",
      "Add people to your money circle and get everyone to rate you at 100. Higher ratings mean more eyes, more tips, more opportunities.",
    ],
    showPhoto: false,
    buttonLabel: "Grow Your Money Circle",
  },
  event: {
    subject: "Someone wants to see you at an event!",
    preheader: "{{username}} is going to {{event_details}}",
    hero: EMAIL_BRAND.heroes.event,
    headline: "Someone Wants to See You",
    paragraphs: [
      "Hi {{dime_name}},",
      "<strong style=\"color:#F5D76E;\">{{username}}</strong> is going to <strong style=\"color:#F5D76E;\">{{event_details}}</strong>.",
      "Message {{username}} and let them know what time you are coming. This is a chance to turn interest into a real booking.",
    ],
    showPhoto: true,
    buttonLabel: "Message {{username}}",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Replace {{placeholder}} tokens with escaped values.
function fill(template: string, data: DimeEmailData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = (data as Record<string, string | undefined>)[key];
    return value == null ? "" : escapeHtml(String(value));
  });
}

function fillPlain(template: string, data: DimeEmailData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = (data as Record<string, string | undefined>)[key];
    return value == null ? "" : String(value);
  });
}

function goldCirclePhoto(photoUrl: string, alt: string): string {
  return `
    <tr>
      <td align="center" style="padding: 8px 24px 4px 24px;">
        <img src="${photoUrl}" alt="${escapeHtml(alt)}" width="110" height="110"
             style="width:110px;height:110px;border-radius:50%;border:4px solid #D4AF37;object-fit:cover;display:block;background:#1a1a1a;" />
      </td>
    </tr>`;
}

export function buildDimeEmail(
  type: DimeEmailType,
  data: DimeEmailData,
): { subject: string; html: string; text: string } {
  const t = TEMPLATES[type];
  const subject = fillPlain(t.subject, data);
  const preheader = fillPlain(t.preheader, data);
  const buttonLabel = fillPlain(t.buttonLabel, data);
  const buttonUrl = data.button_url ||
    `${EMAIL_BRAND.siteUrl}/dashboard/messages`;
  const photoUrl = data.profile_photo && data.profile_photo.startsWith("http")
    ? data.profile_photo
    : EMAIL_BRAND.defaultPhoto;

  const paragraphsHtml = t.paragraphs
    .map((p) => {
      const filled = fill(p, data);
      return `
        <tr>
          <td style="padding: 6px 40px; color:#EDEDED; font-family:Georgia,'Times New Roman',serif; font-size:16px; line-height:26px; text-align:center;">
            ${filled}
          </td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]><style>table,td{font-family:Georgia,serif !important;}</style><![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .hero { height: auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#000000;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0"
               style="width:600px;max-width:600px;background-color:#0A0A0A;border:1px solid #2A230F;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 28px 24px 18px 24px; border-bottom: 1px solid #2A230F;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:6px;color:#D4AF37;font-weight:bold;">${EMAIL_BRAND.header}</span>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td align="center" style="padding:0;">
              <img class="hero" src="${t.hero}" alt="${escapeHtml(t.headline)}" width="600"
                   style="width:100%;max-width:600px;height:auto;display:block;" />
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="padding: 28px 24px 6px 24px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;color:#F5D76E;font-weight:bold;">${escapeHtml(t.headline)}</span>
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td align="center" style="padding: 10px 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:64px;height:2px;background-color:#D4AF37;font-size:0;line-height:0;">&nbsp;</td>
              </tr></table>
            </td>
          </tr>

          ${t.showPhoto ? goldCirclePhoto(photoUrl, data.username || "Member") : ""}

          <!-- Body -->
          ${paragraphsHtml}

          <!-- Button -->
          <tr>
            <td align="center" style="padding: 26px 24px 34px 24px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${buttonUrl}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#D4AF37" stroke="f">
                <center style="color:#000000;font-family:Georgia,serif;font-size:16px;font-weight:bold;">${escapeHtml(buttonLabel)}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${buttonUrl}"
                 style="display:inline-block;background-color:#D4AF37;color:#000000;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;text-decoration:none;padding:15px 42px;border-radius:30px;letter-spacing:1px;">
                ${escapeHtml(buttonLabel)}
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 24px 26px 24px; border-top: 1px solid #2A230F;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;color:#8A8A8A;">${EMAIL_BRAND.footer}</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    EMAIL_BRAND.header,
    "",
    t.headline,
    "",
    ...t.paragraphs.map((p) => fillPlain(p.replace(/<[^>]+>/g, ""), data)),
    "",
    `${buttonLabel}: ${buttonUrl}`,
    "",
    EMAIL_BRAND.footer,
  ];

  return { subject, html, text: textLines.join("\n") };
}

export interface SendResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export async function sendDimesEmail(
  to: { email: string; name?: string },
  type: DimeEmailType,
  data: DimeEmailData,
): Promise<SendResult> {
  const token = Deno.env.get("MAILTRAP_API_TOKEN");
  if (!token) {
    console.error("MAILTRAP_API_TOKEN is not set");
    return { ok: false, error: "missing_mailtrap_token" };
  }

  const { subject, html, text } = buildDimeEmail(type, data);

  const res = await fetch(MAILTRAP_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: EMAIL_BRAND.fromEmail, name: EMAIL_BRAND.fromName },
      to: [{ email: to.email, name: to.name }],
      subject,
      text,
      html,
      category: `dime_${type}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Mailtrap send failed", res.status, body);
    return { ok: false, status: res.status, error: body };
  }
  return { ok: true, status: res.status };
}
