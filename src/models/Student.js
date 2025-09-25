const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    roll: { type: String, required: true, index: true, unique: true },
    email: { type: String, required: true, index: true, unique: true, lowercase: true },
    department: { type: String, required: true },
    year: { type: Number, required: true, min: 1 },
    credentials: {
        gpa: { type: Number, default: 0 },
        credits: { type: Number, default: 0 },
        attendancePct: { type: Number, default: 0 }
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }]
}, { timestamps: true });

StudentSchema.index({ department: 1, year: 1 });

module.exports = mongoose.model('Student', StudentSchema);

