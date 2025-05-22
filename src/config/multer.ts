import { S3Client } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-provider-env';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';

export const MAX_UPLOAD_FILE_SIZE = 1024 * 1024 * 5; // 5 MB

const s3Client = new S3Client({
  credentials: fromEnv(),
  region: process.env.AWS_REGION,
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/rtf',
];

const uploadedFileStorage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_BUCKET_NAME!,
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE, // Sets the content type on S3 based on the file mimetype
  key: function (req, file, cb) {
    const fileDirectory = 'new/uploads/';
    const filename = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
    const fullPath = fileDirectory + filename;
    cb(null, fullPath);
  },
});

export const uploadUploadedFiles = multer({
  storage: uploadedFileStorage,
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE,
  },
  fileFilter: function (req, file, cb) {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});
