require('dotenv').config();

function getEnv() {
    const env = {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: Number(process.env.PORT || 4000),
        mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-student-hub',
        jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        s3Bucket: process.env.S3_BUCKET || ''
    };
    return env;
}

module.exports = { getEnv };

