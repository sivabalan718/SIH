import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

/**
 * Middleware that handles single image upload with error handling.
 * Attaches the file to req.file if valid.
 */
export function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  const singleUpload = upload.single('image');

  singleUpload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'FILE_TOO_LARGE', 'Image must be smaller than 5 MB.', 400);
      }
      return sendError(res, 'UPLOAD_ERROR', 'There was a problem uploading your image.', 400);
    }

    if (err) {
      return sendError(res, 'INVALID_FILE', err.message || 'Invalid file provided.', 400);
    }

    next();
  });
}
