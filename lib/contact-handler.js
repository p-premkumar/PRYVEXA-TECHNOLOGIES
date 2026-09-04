const nodemailer = require('nodemailer');

const contactEmail = process.env.CONTACT_EMAIL || 'p.premkumar7578@gmail.com';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createMailTransport() {
  const requiredSettings = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingSettings = requiredSettings.filter((setting) => !process.env[setting]);

  if (missingSettings.length > 0) {
    console.error(`Contact form email is not configured. Missing: ${missingSettings.join(', ')}`);
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function handleContact(req, res) {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !emailPattern.test(email) || !message) {
    return res.status(400).json({
      error: 'Please provide a name, valid email, and project details.'
    });
  }

  const mailTransport = createMailTransport();
  if (!mailTransport) {
    console.error('Contact form email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
    return res.status(503).json({
      error: 'Email delivery is not configured yet. Please email us directly.'
    });
  }

  try {
    await mailTransport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: contactEmail,
      replyTo: email,
      subject: `New enquiry from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || 'Not provided'}`,
        `Company: ${company || 'Not provided'}`,
        '',
        'Project details:',
        message
      ].join('\n')
    });
  } catch (error) {
    console.error('Contact form email failed:', error.message);
    return res.status(502).json({
      error: 'We could not deliver your enquiry. Please email us directly.'
    });
  } finally {
    mailTransport.close();
  }

  return res.status(201).json({
    message: 'Thanks. Your project details are in, and we will be in touch shortly.'
  });
}

module.exports = handleContact;
