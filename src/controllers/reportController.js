const Student = require('../models/Student');
const Activity = require('../models/Activity');

// Helpers
function parseFilters(query) {
    const { department, year, from, to, type, status } = query;
    const activityMatch = {};
    if (type) activityMatch.type = { $in: String(type).split(',') };
    if (status) activityMatch.status = { $in: String(status).split(',') };
    if (from || to) {
        activityMatch.date = {};
        if (from) activityMatch.date.$gte = new Date(from);
        if (to) activityMatch.date.$lte = new Date(to);
    }
    const studentMatch = {};
    if (department) studentMatch.department = { $in: String(department).split(',') };
    if (year) studentMatch.year = { $in: String(year).split(',').map(n => Number(n)) };
    return { activityMatch, studentMatch };
}

// GET /api/reports/overview
// Returns: totalStudents, activitiesByType, verifiedCounts, participationByDeptYear
async function getOverview(req, res, next) {
    try {
        const { activityMatch, studentMatch } = parseFilters(req.query);

        const totalStudentsPromise = Student.countDocuments(studentMatch);

        // Activities by type
        const activitiesByTypePromise = Activity.aggregate([
            { $match: activityMatch },
            { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'stu' } },
            { $unwind: '$stu' },
            { $match: Object.keys(studentMatch).length ? { 'stu.department': studentMatch.department, 'stu.year': studentMatch.year } : {} },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $project: { _id: 0, type: '$_id', count: 1 } },
            { $sort: { count: -1 } }
        ]);

        // Verified counts
        const verifiedCountsPromise = Activity.aggregate([
            { $match: { ...activityMatch, status: 'approved' } },
            { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'stu' } },
            { $unwind: '$stu' },
            { $match: Object.keys(studentMatch).length ? { 'stu.department': studentMatch.department, 'stu.year': studentMatch.year } : {} },
            { $group: { _id: null, count: { $sum: 1 } } },
            { $project: { _id: 0, count: 1 } }
        ]);

        // Participation by dept/year: unique students with >=1 activity
        const participationPromise = Activity.aggregate([
            { $match: activityMatch },
            { $group: { _id: '$studentId' } },
            { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'stu' } },
            { $unwind: '$stu' },
            { $match: studentMatch },
            { $group: { _id: { department: '$stu.department', year: '$stu.year' }, participants: { $sum: 1 } } },
            { $project: { _id: 0, department: '$_id.department', year: '$_id.year', participants: 1 } },
            { $sort: { department: 1, year: 1 } }
        ]);

        const [totalStudents, activitiesByType, verifiedCountsArr, participation] = await Promise.all([
            totalStudentsPromise,
            activitiesByTypePromise,
            verifiedCountsPromise,
            participationPromise
        ]);

        const verifiedCount = verifiedCountsArr[0]?.count || 0;
        return res.json({ totalStudents, activitiesByType, verifiedCount, participation });
    } catch (e) { next(e); }
}

// GET /api/reports/naac
// Returns a payload aligning with typical NAAC metrics; mapping suggestions in comments
async function getNaac(req, res, next) {
    try {
        const { activityMatch, studentMatch } = parseFilters(req.query);
        const totalStudents = await Student.countDocuments(studentMatch);
        const approvedActivities = await Activity.aggregate([
            { $match: { ...activityMatch, status: 'approved' } },
            { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'stu' } },
            { $unwind: '$stu' },
            { $match: studentMatch },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $project: { _id: 0, type: '$_id', count: 1 } }
        ]);
        // Suggestion mapping (example):
        // - Criteria 5.3.1: Number of awards/recognitions (use type=competition/leadership counts approved)
        // - Criteria 5.1.3: Capacity building and skills enhancement (type=certification/workshops)
        // - Criteria 3.x: Extension and outreach (type=service/community)
        const payload = {
            meta: { generatedAt: new Date(), filters: req.query },
            totals: { students: totalStudents, approvedActivities: approvedActivities.reduce((a,b)=>a+b.count,0) },
            breakdownByType: approvedActivities,
            mappings: {
                '5.3.1_awards_recognitions': approvedActivities.filter(r => ['competition','leadership'].includes(r.type)).reduce((a,b)=>a+b.count,0),
                '5.1.3_capacity_building': approvedActivities.filter(r => ['certification','conference'].includes(r.type)).reduce((a,b)=>a+b.count,0),
                '3.x_extension_outreach': approvedActivities.filter(r => ['service'].includes(r.type)).reduce((a,b)=>a+b.count,0)
            }
        };
        return res.json(payload);
    } catch (e) { next(e); }
}

// GET /api/reports/export?format=csv|json&scope=activities|overview
async function exportReports(req, res, next) {
    try {
        const { format = 'json', scope = 'activities' } = req.query;
        const { activityMatch, studentMatch } = parseFilters(req.query);
        if (scope === 'overview') {
            // reuse overview
            req.query; // no-op
            const data = await (async () => {
                const totalStudents = await Student.countDocuments(studentMatch);
                const activitiesByType = await Activity.aggregate([
                    { $match: activityMatch },
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                    { $project: { _id: 0, type: '$_id', count: 1 } }
                ]);
                return { totalStudents, activitiesByType };
            })();
            if (format === 'csv') {
                const rows = ['metric,value', `totalStudents,${data.totalStudents}`].concat(
                    data.activitiesByType.map(r => `activitiesByType_${r.type},${r.count}`)
                );
                const csv = rows.join('\n');
                res.setHeader('Content-Type', 'text/csv');
                return res.send(csv);
            }
            return res.json(data);
        }
        // default: activities export with student details
        const records = await Activity.aggregate([
            { $match: activityMatch },
            { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
            { $unwind: '$student' },
            { $match: studentMatch },
            { $project: { _id: 0, title: 1, type: 1, date: 1, status: 1, credits: 1, 'student.name': 1, 'student.roll': 1, 'student.department': 1, 'student.year': 1 } }
        ]);
        if (format === 'csv') {
            const header = ['title','type','date','status','credits','studentName','roll','department','year'];
            const lines = [header.join(',')];
            for (const r of records) {
                const row = [r.title, r.type, new Date(r.date).toISOString().slice(0,10), r.status, r.credits, r.student.name, r.student.roll, r.student.department, r.student.year]
                    .map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v);
                lines.push(row.join(','));
            }
            res.setHeader('Content-Type', 'text/csv');
            return res.send(lines.join('\n'));
        }
        return res.json({ records });
    } catch (e) { next(e); }
}

// GET /api/reports/student/:id
async function getStudentSummary(req, res, next) {
    try {
        const { id } = req.params;
        const student = await Student.findById(id).lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const counts = await Activity.aggregate([
            { $match: { studentId: student._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const byType = await Activity.aggregate([
            { $match: { studentId: student._id } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $project: { _id: 0, type: '$_id', count: 1 } }
        ]);
        const statusCounts = counts.reduce((acc, r) => (acc[r._id] = r.count, acc), {});
        return res.json({
            student: {
                id: student._id, name: student.name, roll: student.roll,
                department: student.department, year: student.year,
                gpa: student.credentials?.gpa ?? null, credits: student.credentials?.credits ?? null, attendancePct: student.credentials?.attendancePct ?? null
            },
            statusCounts,
            byType
        });
    } catch (e) { next(e); }
}

module.exports = { getOverview, getNaac, exportReports, getStudentSummary };

