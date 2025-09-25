const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region });

function buildKey({ studentId, filename }) {
    const ts = Date.now();
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `students/${studentId}/${ts}-${safe}`;
}

async function getPresignedUploadUrl({ studentId, filename, fileType, expiresIn = 900 }) {
    const Key = buildKey({ studentId, filename });
    const cmd = new PutObjectCommand({ Bucket: bucket, Key, ContentType: fileType, ACL: 'private' });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn });
    return { uploadUrl, fileKey: Key };
}

async function getPresignedDownloadUrl({ fileKey, expiresIn = 900 }) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: fileKey });
    const url = await getSignedUrl(s3, cmd, { expiresIn });
    return url;
}

async function deleteObject({ fileKey }) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: fileKey }));
}

module.exports = {
    getPresignedUploadUrl,
    getPresignedDownloadUrl,
    deleteObject
};

