import sharp from 'sharp';

export async function processCleanBackgroundSwap(
  buffer: Buffer,
  targetHex: string
): Promise<Buffer> {
  const targetR = parseInt(targetHex.substring(0, 2), 16);
  const targetG = parseInt(targetHex.substring(2, 4), 16);
  const targetB = parseInt(targetHex.substring(4, 6), 16);

  // 1. Resize & ensure alpha
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels; // 4 (RGBA)

  // 2. Sample outer border pixels (top, bottom, left, right 5% margins)
  let sumR = 0, sumG = 0, sumB = 0, sampleCount = 0;

  const samplePixel = (x: number, y: number) => {
    const idx = (y * width + x) * channels;
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
    sampleCount++;
  };

  const marginX = Math.floor(width * 0.05);
  const marginY = Math.floor(height * 0.05);

  for (let x = 0; x < width; x += 4) {
    for (let y = 0; y < marginY; y += 4) samplePixel(x, y);
    for (let y = height - marginY; y < height; y += 4) samplePixel(x, y);
  }
  for (let y = marginY; y < height - marginY; y += 4) {
    for (let x = 0; x < marginX; x += 4) samplePixel(x, y);
    for (let x = width - marginX; x < width; x += 4) samplePixel(x, y);
  }

  const bgR = sampleCount > 0 ? sumR / sampleCount : 255;
  const bgG = sampleCount > 0 ? sumG / sampleCount : 255;
  const bgB = sampleCount > 0 ? sumB / sampleCount : 255;

  const outBuffer = Buffer.alloc(data.length);

  const innerMarginX = Math.floor(width * 0.12);
  const innerMarginY = Math.floor(height * 0.12);
  const centerMinX = innerMarginX;
  const centerMaxX = width - innerMarginX;
  const centerMinY = innerMarginY;
  const centerMaxY = height - innerMarginY;

  const distThresholdLow = 55;
  const distThresholdHigh = 85;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      const isCenterCore = x > centerMinX && x < centerMaxX && y > centerMinY && y < centerMaxY;
      const dist = Math.sqrt(
        (r - bgR) * (r - bgR) + (g - bgG) * (g - bgG) + (b - bgB) * (b - bgB)
      );

      let alpha = a / 255;

      if (!isCenterCore) {
        if (dist < distThresholdLow) {
          alpha = 0; // Pure background
        } else if (dist < distThresholdHigh) {
          alpha = (dist - distThresholdLow) / (distThresholdHigh - distThresholdLow);
        }
      }

      // Blend foreground product with target background
      const finalR = Math.round(r * alpha + targetR * (1 - alpha));
      const finalG = Math.round(g * alpha + targetG * (1 - alpha));
      const finalB = Math.round(b * alpha + targetB * (1 - alpha));

      outBuffer[idx] = finalR;
      outBuffer[idx + 1] = finalG;
      outBuffer[idx + 2] = finalB;
      outBuffer[idx + 3] = 255;
    }
  }

  return sharp(outBuffer, { raw: { width, height, channels: 4 } })
    .modulate({
      brightness: 1.04,
      saturation: 1.07,
    })
    .sharpen({ sigma: 1.1, m1: 0.5, m2: 2.0 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}
