/* ============================================
   LifeDrop — EmailJS configuration
   ============================================
   This is the ONLY file you need to edit to make real emails send —
   both the password-reset OTP and the Contact page use it.

   1. Create a free account at https://www.emailjs.com
   2. Add an Email Service (e.g. connect your Gmail) → copy its Service ID
   3. Create an Email Template for OTP codes with these variables:
        {{to_email}}        - the recipient's address
        {{otp_code}}        - the 6-digit code
        {{expires_minutes}} - how many minutes the code is valid for
      → copy the Template ID into templateId below

   4. (Optional) Create a second template for the Contact page with:
        {{from_name}}   {{from_phone}}   {{from_email}}
        {{subject}}     {{message}}
      → copy its Template ID into contactTemplateId below.
      If you skip this, the Contact form reuses templateId above —
      just note the OTP template's variables won't be filled in, so
      your contact emails may show blank fields unless the template
      only references the shared {{}} names both forms provide.

   5. Go to Account → General → copy your Public Key

   SECURITY: only ever put your PUBLIC key here. EmailJS also has a
   "Private Key" / access token in Account → Security — that one must
   NEVER go in this file or anywhere else in browser-visible code, since
   anyone can view this file's source. The public key is safe to expose;
   EmailJS is specifically designed for that.

   If these are left blank, OTP emails fall back to showing the code
   on-screen, and the Contact form will honestly tell the visitor their
   message wasn't sent rather than pretending it worked.
   ============================================ */

window.LifeDropEmailConfig = {
  publicKey: '',   // e.g. 'AbCdEfGhIjKlMnOp'
  serviceId: '',   // e.g. 'service_abc1234'
  templateId: '',  // e.g. 'template_xyz9876'  -- used for OTP emails

  // Optional second template for the Contact page, so its message can look
  // different from the OTP email (e.g. include name/subject/message fields).
  // If left blank, contactTemplateId falls back to templateId above, using
  // whatever variables that template defines.
  contactTemplateId: '', // e.g. 'template_contact123'
};

/* ============================================
   Shared send helper — used by both the OTP flow (js/auth.js) and the
   Contact page. Centralized here so there's exactly one place that talks
   to EmailJS, one security note, and one fallback behavior to maintain.
   ============================================ */
window.LifeDropSendEmail = async function (templateId, templateParams) {
  const cfg = window.LifeDropEmailConfig;
  if (!cfg || !cfg.publicKey || !cfg.serviceId || !templateId) {
    return { sent: false, reason: 'EmailJS is not configured (see js/email-config.js).' };
  }
  if (typeof emailjs === 'undefined') {
    return { sent: false, reason: 'EmailJS SDK failed to load (check network/ad-blockers).' };
  }
  try {
    await emailjs.send(cfg.serviceId, templateId, templateParams, { publicKey: cfg.publicKey });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: (err && err.text) || 'EmailJS request failed.' };
  }
};
