const Activity = require('../models/Activity');
const Student = require('../models/Student');
const { createStudentNotification, sendEmail } = require('../services/notificationService');

// GET /api/approvals/pending?department=&type=&from=&to=&status=
async function getPending(req, res, next) {
    try {
        const { department, type, from, to, status } = req.query;
        const match = {};
        if (status) {
            match.status = { $in: String(status).split(',') };
        } else {
            match.status = 'pending';
        }
        if (type) match.type = { $in: String(type).split(',') };
        if (from || to) {
            match.date = {};
            if (from) match.date.$gte = new Date(from);
            if (to) match.date.$lte = new Date(to);
        }
        const pipeline = [
            { $match: match },
            { $sort: { createdAt: -1 } },
            { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
            { $unwind: '$student' }
        ];
        if (department) {
            pipeline.push({ $match: { 'student.department': { $in: String(department).split(',') } } });
        }
        const items = await Activity.aggregate(pipeline).limit(100);
        // Attach a short URL for preview (presigned) could be resolved at client via a separate call if desired
        return res.json({ items });
    } catch (e) { next(e); }
}

// POST /api/approvals/:activityId/approve
async function approve(req, res, next) {
    try {
        const { activityId } = req.params;
        const { note, creditsAwarded } = req.body || {};
        const facultyId = req.user?.id || req.user?._id || null; // replace with real auth
        const activity = await Activity.findById(activityId);
        if (!activity) return res.status(404).json({ message: 'Activity not found' });
        activity.status = 'approved';
        activity.facultyVerifier = facultyId;
        if (typeof creditsAwarded === 'number') activity.credits = creditsAwarded;
        activity.verificationNotes = note || activity.verificationNotes;
        activity.auditTrail.push({ action: 'approved', by: facultyId, note });
        await activity.save();

        // Update student's credits if awarded
        if (typeof creditsAwarded === 'number' && creditsAwarded > 0) {
            await Student.findByIdAndUpdate(activity.studentId, { $inc: { 'credentials.credits': creditsAwarded } });
        }

        // Notify student
        await createStudentNotification({
            studentId: activity.studentId,
            activityId: activity._id,
            type: 'approval',
            message: `Your activity "${activity.title}" was approved.`
        });
        // Optional email
        const student = await Student.findById(activity.studentId).lean();
        if (student?.email) {
            await sendEmail({ to: student.email, subject: 'Activity Approved', text: `Your activity "${activity.title}" was approved.` });
        }

        return res.json({ success: true, status: 'approved', id: activity._id });
    } catch (e) { next(e); }
}

// POST /api/approvals/:activityId/reject
async function reject(req, res, next) {
    try {
        const { activityId } = req.params;
        const { reason } = req.body || {};
        const facultyId = req.user?.id || req.user?._id || null;
        const activity = await Activity.findById(activityId);
        if (!activity) return res.status(404).json({ message: 'Activity not found' });
        activity.status = 'rejected';
        activity.facultyVerifier = facultyId;
        activity.verificationNotes = reason || activity.verificationNotes;
        activity.auditTrail.push({ action: 'rejected', by: facultyId, note: reason });
        await activity.save();

        await createStudentNotification({
            studentId: activity.studentId,
            activityId: activity._id,
            type: 'rejection',
            message: `Your activity "${activity.title}" was rejected. ${reason ? '(' + reason + ')' : ''}`
        });
        const student = await Student.findById(activity.studentId).lean();
        if (student?.email) {
            await sendEmail({ to: student.email, subject: 'Activity Rejected', text: `Your activity "${activity.title}" was rejected. ${reason || ''}` });
        }

        return res.json({ success: true, status: 'rejected', id: activity._id });
    } catch (e) { next(e); }
}

// POST /api/approvals/:activityId/request-changes
async function requestChanges(req, res, next) {
    try {
        const { activityId } = req.params;
        const { comments } = req.body || {};
        const facultyId = req.user?.id || req.user?._id || null;
        const activity = await Activity.findById(activityId);
        if (!activity) return res.status(404).json({ message: 'Activity not found' });
        activity.status = 'changes_requested';
        activity.facultyVerifier = facultyId;
        activity.verificationNotes = comments || activity.verificationNotes;
        activity.auditTrail.push({ action: 'request_changes', by: facultyId, note: comments });
        await activity.save();

        await createStudentNotification({
            studentId: activity.studentId,
            activityId: activity._id,
            type: 'request_changes',
            message: `Changes requested for "${activity.title}": ${comments || ''}`
        });
        const student = await Student.findById(activity.studentId).lean();
        if (student?.email) {
            await sendEmail({ to: student.email, subject: 'Changes Requested', text: `Changes requested for "${activity.title}": ${comments || ''}` });
        }

        return res.json({ success: true, status: 'changes_requested', id: activity._id });
    } catch (e) { next(e); }
}

module.exports = { getPending, approve, reject, requestChanges };

