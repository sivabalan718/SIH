import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
  },
});

export function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  const singleUpload = upload.single('image');

  singleUpload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'FILE_TOO_LARGE', 'Product photo must be smaller than 10 MB.', 400);
      }
      return sendError(res, 'UPLOAD_ERROR', 'There was a problem uploading your photo.', 400);
    }

    if (err) {
      return sendError(res, 'INVALID_FILE', err.message || 'Invalid image file provided.', 400);
    }

    next();
  });
}
