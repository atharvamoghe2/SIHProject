const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true, required: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
    type: { type: String, enum: ['approval','rejection','request_changes'], required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);

