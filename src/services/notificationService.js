const Notification = require('../models/Notification');

async function createStudentNotification({ studentId, activityId, type, message }) {
    return Notification.create({ studentId, activityId, type, message });
}

// Stub email sender; replace with real integration later
async function sendEmail({ to, subject, text }) {
    // Integrate with SES/SendGrid/etc. For now, log.
    console.log('Email stub:', { to, subject, text });
    return true;
}

module.exports = { createStudentNotification, sendEmail };

