import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Configure Cloudinary SDK with backend environment credentials
if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
  logger.info('[M63] [CloudinaryService] Cloudinary SDK configured successfully.');
} else {
  logger.warn('[M63] [CloudinaryService] Cloudinary credentials missing in backend environment.');
}

export interface CloudinaryUploadResult {
  publicId: string;
  assetId?: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  folderPath: string
): Promise<CloudinaryUploadResult> {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error('Cloudinary backend credentials are unconfigured.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          logger.error('[M63] [CloudinaryService] Upload failed:', error?.message);
          return reject(new Error('Cloudinary image upload failed.'));
        }
        resolve({
          publicId: result.public_id,
          assetId: result.asset_id,
          secureUrl: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export { cloudinary };
