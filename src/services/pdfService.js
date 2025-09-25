// Stub: generate a portfolio PDF and store it (S3 if configured, else local), returning a URL
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const storage = require('./storageService');

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region });

async function generatePortfolioPdfAndUpload({ student, activities }) {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks = [];
    doc.on('data', d => chunks.push(d));
    const done = new Promise(resolve => doc.on('end', resolve));

    doc.fontSize(18).text('Smart Student Hub - Portfolio', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Name: ${student.name}`);
    doc.text(`Roll: ${student.roll}`);
    doc.text(`Department: ${student.department}`);
    doc.text(`Year: ${student.year}`);
    doc.moveDown();
    doc.text(`GPA: ${student.credentials?.gpa ?? '-'}  Credits: ${student.credentials?.credits ?? '-'}`);
    doc.text(`Attendance: ${student.credentials?.attendancePct ?? '-'}%`);
    doc.moveDown();
    doc.fontSize(14).text('Recent Activities');
    doc.moveDown(0.5);
    activities.slice(0, 20).forEach(a => {
        doc.fontSize(12).text(`${a.title} [${a.type}] - ${new Date(a.date).toLocaleDateString()} (${a.status})`);
        if (a.description) doc.fontSize(10).fillColor('#666').text(a.description).fillColor('#000');
        doc.moveDown(0.25);
    });
    doc.end();
    await done;

    const buffer = Buffer.concat(chunks);
    const key = `portfolios/${student._id}/${Date.now()}-portfolio.pdf`;
    if (bucket) {
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: 'application/pdf', ACL: 'private' }));
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 900 });
        return { key, url };
    } else {
        const saved = await storage.saveBuffer({ buffer, contentType: 'application/pdf', keyPrefix: `portfolios/${student._id}` });
        const url = storage.getDownloadUrl({ fileKey: saved.key });
        return { key: saved.key, url };
    }
}

module.exports = { generatePortfolioPdfAndUpload };

