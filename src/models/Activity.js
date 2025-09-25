const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: [
        'conference','certification','club','competition','leadership','internship','service','credit','attendance','other'
    ] },
    date: { type: Date, required: true },
    description: { type: String },
    fileKey: { type: String, required: true },
    fileType: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    status: { type: String, enum: ['pending','approved','rejected','changes_requested'], default: 'pending', index: true },
    facultyVerifier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: { type: String },
    credits: { type: Number, default: 0 },
    tags: [{ type: String }],
    auditTrail: [{
        action: { type: String, enum: ['created','submitted','approved','rejected','request_changes'], required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

ActivitySchema.index({ studentId: 1, type: 1, status: 1, date: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);

