const express = require('express');
const { Resend } = require('resend');

const router = express.Router();

const CLINIC_EMAIL = 'kcareclinic777@gmail.com';

const formatField = (label, value) => `${label}: ${value || 'Not provided'}`;

router.post('/', async (req, res) => {
  try {
    const {
      type = 'enquiry',
      name,
      phone,
      email,
      subject,
      message,
      service,
      condition,
      preferredDate,
      preferredTime,
      timeSlot,
      source,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'K Care Clinic <onboarding@resend.dev>';
    const toEmail = process.env.CONTACT_TO_EMAIL || CLINIC_EMAIL;

    const normalizedType = String(type).toLowerCase();
    const titleMap = {
      appointment: 'New Appointment Request',
      enquiry: 'New Enquiry',
      contact: 'New Contact Form Submission',
      message: 'New Website Message',
    };
    const mailTitle = titleMap[normalizedType] || 'New Website Lead';

    const textLines = [
      formatField('Type', normalizedType),
      formatField('Name', name),
      formatField('Phone', phone),
      formatField('Email', email),
      formatField('Service', service),
      formatField('Condition', condition),
      formatField('Preferred Date', preferredDate),
      formatField('Preferred Time', preferredTime),
      formatField('Time Slot', timeSlot),
      formatField('Source', source),
      '',
      'Message:',
      message || 'No additional message',
    ];

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 16px; color: #0f766e;">${mailTitle}</h2>
        <p><strong>Type:</strong> ${normalizedType}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>Service:</strong> ${service || 'Not provided'}</p>
        <p><strong>Condition:</strong> ${condition || 'Not provided'}</p>
        <p><strong>Preferred Date:</strong> ${preferredDate || 'Not provided'}</p>
        <p><strong>Preferred Time:</strong> ${preferredTime || 'Not provided'}</p>
        <p><strong>Time Slot:</strong> ${timeSlot || 'Not provided'}</p>
        <p><strong>Source:</strong> ${source || 'Website'}</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message || 'No additional message'}</p>
      </div>
    `;

    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email || undefined,
      subject: subject || `${mailTitle} - ${name}`,
      text: textLines.join('\n'),
      html,
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Contact email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

module.exports = router;

