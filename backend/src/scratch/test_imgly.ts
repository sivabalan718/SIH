import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';

export async function removeProductBackground(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 1. Pass image buffer to @imgly/background-removal-node AI engine
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    const resultBlob = await removeBackground(blob);

    const arrayBuffer = await resultBlob.arrayBuffer();
    const transparentPngBuffer = Buffer.from(arrayBuffer);

    return transparentPngBuffer;
  } catch (err: any) {
    throw new Error(`Background removal failed: ${err.message}`);
  }
}
