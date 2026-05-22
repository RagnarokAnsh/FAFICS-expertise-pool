export function buildEmailHtml(title: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6; color: #1a2540;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f5f7; padding: 20px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <tr>
                <td align="center" style="background-color: #0D2240; padding: 24px;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #C8973A; letter-spacing: 2px;">FAFICS</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 32px 40px;">
                  <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #0D2240; font-weight: bold;">${title}</h2>
                  <div style="font-size: 16px; color: #4a5578;">
                    ${body}
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #dde3ef;">
                  <p style="margin: 0; font-size: 14px; color: #8892aa;">
                    &copy; 2026 FAFICS &mdash; <a href="https://fafics.org" style="color: #0D2240; text-decoration: none;">fafics.org</a> &middot; <a href="mailto:secretary@fafics.org" style="color: #0D2240; text-decoration: none;">secretary@fafics.org</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `.trim();
}
