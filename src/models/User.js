const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    roll: { type: String, index: true },
    department: { type: String },
    year: { type: Number },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student','faculty','admin'], default: 'student', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }
}, { timestamps: true });

UserSchema.index({ department: 1, role: 1 });

module.exports = mongoose.model('User', UserSchema);

