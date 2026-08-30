import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/aac',
];

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid audio file type. Only WebM, WAV, MP3, and M4A audio files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_AUDIO_SIZE,
    files: 1,
  },
});

export function handleAudioUpload(req: Request, res: Response, next: NextFunction) {
  const singleUpload = upload.single('audio');

  singleUpload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'FILE_TOO_LARGE', 'Audio recording must be smaller than 10 MB.', 400);
      }
      return sendError(res, 'UPLOAD_ERROR', 'There was a problem uploading your audio recording.', 400);
    }

    if (err) {
      return sendError(res, 'INVALID_FILE', err.message || 'Invalid audio file provided.', 400);
    }

    next();
  });
}
