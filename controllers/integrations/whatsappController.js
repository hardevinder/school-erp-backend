// controllers/integrations/whatsappController.js
const axios = require('axios');

const WABA_URL =
  process.env.WHATSAPP_WABA_URL || 'https://waba-sandbox.360dialog.io/v1/messages'; // sandbox base
const D360_API_KEY = process.env.D360_API_KEY;
const PAYMENT_LINK_BASE = process.env.PAYMENT_LINK_BASE || '';

const headers = {
  'Content-Type': 'application/json',
  'D360-API-KEY': D360_API_KEY,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// normalize to digits only and ensure country code (e.g., 91)
function normalizeMsisdn(raw, defaultCc = '91') {
  const digits = String(raw || '').replace(/\D+/g, '');
  if (!digits) return '';
  return digits.startsWith(defaultCc) ? digits : defaultCc + digits;
}

async function sendText(to, body) {
  // 360dialog sandbox expects these fields
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to),
    type: 'text',
    text: { body },
  };
  return axios.post(WABA_URL, payload, { headers });
}

// INR helper consistent with frontend
function inr(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN')}`;
}

// Build a message that ALWAYS includes Pending, Fine, and Total.
// Accepts multiple possible key names from the frontend (backward-compatible).
function composeMessageFromFields(s) {
  const name = s?.name || 'Parent';
  const feeHeading = s?.feeHeading || 'Fee';
  const className = s?.className || '';
  const admissionNumber = s?.admissionNumber ?? '';

  const remaining = s?.dueAmount ?? s?.remaining ?? 0;
  const fine = s?.fineAmount ?? s?.fine ?? 0;
  const total = s?.totalAmount ?? s?.totalDue ?? (Number(remaining) + Number(fine));

  const lines = [
    `Dear ${name},`,
    `This is a gentle reminder for the *${feeHeading}*.`,
    `Pending Amount: *${inr(remaining)}*`,
    `Fine: *${inr(fine)}*`,
    `Total Due: *${inr(total)}*`,
  ];
  if (className) lines.push(`Class: ${className}`);
  if (admissionNumber !== '' && admissionNumber !== null && admissionNumber !== undefined)
    lines.push(`Adm No: ${admissionNumber}`);

  // Add payment link if configured
  const payLink =
    PAYMENT_LINK_BASE && admissionNumber
      ? `${PAYMENT_LINK_BASE}${encodeURIComponent(admissionNumber)}`
      : '';
  if (payLink) lines.push(`Pay now: ${payLink}`);

  lines.push('');
  lines.push('If you have already paid, please ignore this message. Thank you.');

  return lines.join('\n');
}

exports.health = async (req, res) => {
  if (!D360_API_KEY) {
    return res.status(500).json({ ok: false, message: 'D360_API_KEY missing' });
  }
  return res.json({ ok: true, message: 'WhatsApp sender ready' });
};

exports.sendWhatsAppBatch = async (req, res) => {
  /**
   * Body expects:
   * {
   *   students: [
   *     {
   *       id, name, phone, admissionNumber, className, feeHeading,
   *       // amounts (any of these keys are ok)
   *       remaining | dueAmount,
   *       fine | fineAmount,
   *       totalDue | totalAmount,
   *       // optional prebuilt text
   *       message
   *     }
   *   ]
   * }
   */
  try {
    const { students = [] } = req.body || {};
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ ok: false, message: 'No students provided' });
    }
    if (!D360_API_KEY) {
      return res.status(500).json({ ok: false, message: 'D360_API_KEY missing' });
    }

    const results = [];
    for (const s of students) {
      const to = normalizeMsisdn(s?.phone); // ensures 91XXXXXXXXXX format
      if (!to) {
        results.push({ id: s?.id, ok: false, error: 'Missing/invalid phone' });
        continue;
      }

      // Prefer a prebuilt message from the frontend (already includes Fine & Total).
      // If not provided, compose here from fields.
      let body = (s?.message && String(s.message).trim()) ? String(s.message).trim() : composeMessageFromFields(s);

      // If frontend message exists but you still want to guarantee Total line,
      // you can append it when missing; kept simple for now.

      try {
        const resp = await sendText(to, body);
        results.push({ id: s.id, ok: true, wa_id: resp?.data?.messages?.[0]?.id || null, to });
      } catch (err) {
        results.push({
          id: s.id,
          ok: false,
          to,
          error: err?.response?.data || err?.message || 'Send failed',
        });
      }

      // sandbox-safe pacing
      await sleep(200);
    }

    const failed = results.filter(r => !r.ok).length;
    return res.json({ ok: failed === 0, sent: results });
  } catch (e) {
    console.error('send-batch error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
