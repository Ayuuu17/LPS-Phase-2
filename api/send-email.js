// Vercel Serverless Function for optional real email sending.
// Configure RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel Project Settings > Environment Variables.
// Without those variables, the app still works in simulation mode and saves messages in the LPS Mail Center.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ ok: false, message: 'Missing to, subject, or body' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return res.status(200).json({
      ok: true,
      simulated: true,
      message: 'Email API is not configured. Message was stored in the app mail queue for demo purposes.'
    });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: body
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        simulated: false,
        message: data.message || 'Email provider rejected the request.'
      });
    }

    return res.status(200).json({
      ok: true,
      simulated: false,
      message: 'Email sent through Resend.',
      providerId: data.id
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      simulated: false,
      message: error.message || 'Email send failed.'
    });
  }
};
