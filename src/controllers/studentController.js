const Student = require('../models/Student');
const Activity = require('../models/Activity');
const s3Service = require('../services/s3Service');
const storageService = require('../services/storageService');
const pdfService = require('../services/pdfService');

async function getProfile(req, res, next) {
    try {
        const { id } = req.params;
        const student = await Student.findById(id).populate('achievements').lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const verifiedCount = await Activity.countDocuments({ studentId: id, status: 'approved' });
        const pendingCount = await Activity.countDocuments({ studentId: id, status: 'pending' });
        return res.json({
            id: student._id,
            name: student.name,
            roll: student.roll,
            department: student.department,
            year: student.year,
            gpa: student.credentials?.gpa ?? null,
            credits: student.credentials?.credits ?? null,
            attendancePct: student.credentials?.attendancePct ?? null,
            verifiedCount,
            pendingCount
        });
    } catch (e) { next(e); }
}

async function getActivities(req, res, next) {
    try {
        const { id } = req.params;
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            Activity.find({ studentId: id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Activity.countDocuments({ studentId: id })
        ]);
        // attach proof urls (S3 presigned or local file URL)
        const itemsWithUrls = await Promise.all(items.map(async it => {
            let proofUrl = null;
            try {
                if (it.fileKey && it.fileKey.startsWith('students/')) {
                    // local storage path
                    proofUrl = storageService.getDownloadUrl({ fileKey: it.fileKey });
                } else if (it.fileKey) {
                    proofUrl = await s3Service.getPresignedDownloadUrl({ fileKey: it.fileKey });
                }
            } catch (_) {}
            return { ...it, proofUrl };
        }));
        return res.json({ items: itemsWithUrls, total, page, limit });
    } catch (e) { next(e); }
}

async function postActivity(req, res, next) {
    try {
        const { id } = req.params;
        const { action } = req.body || {};
        // If multipart upload present, save locally (Render-friendly path)
        if (req.file && !action) {
            const buffer = req.file.buffer;
            const fileType = req.file.mimetype;
            const title = req.body.title;
            const type = req.body.type;
            const date = req.body.date;
            const description = req.body.description;
            const credits = req.body.credits ? Number(req.body.credits) : 0;
            if (!title || !type || !date) return res.status(400).json({ message: 'missing fields' });
            const { key: fileKey } = await storageService.saveBuffer({ buffer, contentType: fileType, keyPrefix: `students/${id}` });
            const activity = await Activity.create({ title, type, date, description, credits, fileKey, fileType, studentId: id, status: 'pending' });
            await Student.findByIdAndUpdate(id, { $addToSet: { achievements: activity._id } });
            return res.status(201).json({ id: activity._id });
        }
        if (action === 'presign') {
            const { filename, fileType } = req.body;
            if (!filename || !fileType) return res.status(400).json({ message: 'filename and fileType required' });
            const { uploadUrl, fileKey } = await s3Service.getPresignedUploadUrl({ studentId: id, filename, fileType });
            return res.json({ uploadUrl, fileKey });
        }
        if (action === 'finalize') {
            const { title, type, date, description, credits, fileKey, fileType } = req.body;
            if (!title || !type || !date || !fileKey || !fileType) return res.status(400).json({ message: 'missing fields' });
            const activity = await Activity.create({
                title, type, date, description, credits, fileKey, fileType,
                studentId: id, status: 'pending'
            });
            await Student.findByIdAndUpdate(id, { $addToSet: { achievements: activity._id } });
            return res.status(201).json({ id: activity._id });
        }
        return res.status(400).json({ message: 'invalid action' });
    } catch (e) { next(e); }
}

async function postPortfolio(req, res, next) {
    try {
        const { id } = req.params;
        const [student, activities] = await Promise.all([
            Student.findById(id).lean(),
            Activity.find({ studentId: id, status: 'approved' }).sort({ date: -1 }).lean()
        ]);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const { url, key } = await pdfService.generatePortfolioPdfAndUpload({ student, activities });
        return res.json({ url, key });
    } catch (e) { next(e); }
}

module.exports = {
    getProfile,
    getActivities,
    postActivity,
    postPortfolio
};

