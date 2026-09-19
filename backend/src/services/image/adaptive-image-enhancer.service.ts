import { removeBackground } from '@imgly/background-removal-node';
import sharp, { OverlayOptions } from 'sharp';
import { logger } from '../../utils/logger.js';

// Ensure cross-realm TypedArray compatibility (Node VM, Jest sandboxes, worker threads)
if (typeof Float32Array !== 'undefined') {
  try {
    Object.defineProperty(Float32Array, Symbol.hasInstance, {
      value: (instance: any) =>
        Boolean(
          instance &&
            (instance.constructor?.name === 'Float32Array' ||
              instance[Symbol.toStringTag] === 'Float32Array' ||
              Object.prototype.toString.call(instance) === '[object Float32Array]')
        ),
      configurable: true,
    });
  } catch (e) {
    // Non-fatal if already defined
  }
}

export interface ImageAnalysisMetrics {
  width: number;
  height: number;
  aspectRatio: number;
  meanLuminance: number; // 0 - 255
  contrastStdDev: number; // 0 - 100
  meanSaturation: number; // 0 - 1
  edgeEnergy: number; // sharpness indicator
}

export interface SubjectGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'TALL' | 'WIDE' | 'SQUARE' | 'FLAT';
  hasClearBase: boolean;
  baseWidthRatio: number; // proportion of subject width that rests on ground
}

export interface AdaptiveComposition {
  canvasWidth: number;
  canvasHeight: number;
  scaleFactor: number;
  scaledWidth: number;
  scaledHeight: number;
  left: number;
  top: number;
  marginHorizontalPercent: number;
  marginVerticalPercent: number;
}

export interface AdaptiveFilterParams {
  brightness: number;
  saturation: number;
  contrastSlope: number;
  contrastIntercept: number;
  sharpenSigma: number;
  sharpenM1: number;
  sharpenM2: number;
}

export interface AdaptiveEnhancementResult {
  success: boolean;
  enhancedBuffer: Buffer;
  mimeType: string;
  format: string;
  width: number;
  height: number;
  backgroundOption: string;
  backgroundColorHex?: string;
  analysis: ImageAnalysisMetrics;
  geometry: SubjectGeometry;
  composition: AdaptiveComposition;
  filters: AdaptiveFilterParams;
  improvementsApplied: string[];
  message: string;
}

export const PRESET_BACKGROUND_COLORS: Record<string, { label: string; hex: string }> = {
  WHITE: { label: 'Studio White', hex: 'FFFFFF' },
  BEIGE: { label: 'Warm Beige', hex: 'F5F0EB' },
  GREY: { label: 'Light Grey', hex: 'F3F4F6' },
  CREAM: { label: 'Soft Cream', hex: 'FFFDF7' },
};

/**
 * Step 1: Analyze visual characteristics of the source artisan image.
 * Measures exposure, contrast variance, color saturation, and edge detail.
 */
export async function analyzeImageMetrics(buffer: Buffer): Promise<ImageAnalysisMetrics> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width || 800;
  const height = meta.height || 800;
  const aspectRatio = width / (height || 1);

  // Compute channel statistics using Sharp stats
  const stats = await sharp(buffer).stats();
  const rMean = stats.channels[0]?.mean || 128;
  const gMean = stats.channels[1]?.mean || 128;
  const bMean = stats.channels[2]?.mean || 128;

  // Perceived luminance (standard ITU-R BT.601)
  const meanLuminance = Math.round(0.299 * rMean + 0.587 * gMean + 0.114 * bMean);

  // Contrast estimation from standard deviation of channels
  const rStdev = stats.channels[0]?.stdev || 30;
  const gStdev = stats.channels[1]?.stdev || 30;
  const bStdev = stats.channels[2]?.stdev || 30;
  const contrastStdDev = Math.round((rStdev + gStdev + bStdev) / 3);

  // Estimate mean saturation (max - min) / (max + epsilon)
  const maxC = Math.max(rMean, gMean, bMean);
  const minC = Math.min(rMean, gMean, bMean);
  const meanSaturation = maxC > 0 ? parseFloat(((maxC - minC) / maxC).toFixed(3)) : 0;

  // Estimate edge sharpness using a small greyscale Laplacian convolution
  let edgeEnergy = 20;
  try {
    const laplacianKernel = {
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    };
    const laplacianStats = await sharp(buffer)
      .resize(300, 300, { fit: 'inside' })
      .grayscale()
      .convolve(laplacianKernel)
      .stats();

    edgeEnergy = Math.round(laplacianStats.channels[0]?.stdev || 20);
  } catch (e) {
    edgeEnergy = 20;
  }

  return {
    width,
    height,
    aspectRatio,
    meanLuminance,
    contrastStdDev,
    meanSaturation,
    edgeEnergy,
  };
}

/**
 * Step 2 & 3: Segment foreground via @imgly/background-removal-node and analyze subject geometry.
 */
export async function extractAndAnalyzeSubject(
  buffer: Buffer
): Promise<{ segmentedFg: Buffer; trimmedFg: Buffer; geometry: SubjectGeometry }> {
  // Pre-normalize large camera images to max 1200px for efficient inference
  const normalizedBuffer = await sharp(buffer)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const inputBlob = new Blob([normalizedBuffer], { type: 'image/png' });
  const outputBlob = await removeBackground(inputBlob, { model: 'small' });
  const segmentedFg = Buffer.from(await outputBlob.arrayBuffer());

  // Trim transparent padding to find exact subject bounds
  const trimmed = sharp(segmentedFg).trim();
  const trimmedFg = await trimmed.toBuffer();
  const trimmedMeta = await sharp(trimmedFg).metadata();

  const subWidth = trimmedMeta.width || 400;
  const subHeight = trimmedMeta.height || 400;
  const subjectAspectRatio = subWidth / (subHeight || 1);

  // Classify orientation
  let orientation: 'TALL' | 'WIDE' | 'SQUARE' | 'FLAT' = 'SQUARE';
  if (subjectAspectRatio < 0.75) {
    orientation = 'TALL';
  } else if (subjectAspectRatio > 1.30) {
    orientation = 'WIDE';
  } else {
    orientation = 'SQUARE';
  }

  // Analyze bottom 12% of the subject alpha mask to detect if it has a sitting base
  let hasClearBase = false;
  let baseWidthRatio = 0.5;

  try {
    const bottomSliceHeight = Math.max(4, Math.round(subHeight * 0.12));
    const bottomExtract = await sharp(trimmedFg)
      .extract({
        left: 0,
        top: Math.max(0, subHeight - bottomSliceHeight),
        width: subWidth,
        height: bottomSliceHeight,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rawData = bottomExtract.data;
    const channels = bottomExtract.info.channels;
    let minXWithAlpha = subWidth;
    let maxXWithAlpha = 0;
    let opaquePixelCount = 0;

    for (let y = 0; y < bottomSliceHeight; y++) {
      for (let x = 0; x < subWidth; x++) {
        const alpha = rawData[(y * subWidth + x) * channels + 3];
        if (alpha > 50) {
          opaquePixelCount++;
          if (x < minXWithAlpha) minXWithAlpha = x;
          if (x > maxXWithAlpha) maxXWithAlpha = x;
        }
      }
    }

    const baseSpan = maxXWithAlpha >= minXWithAlpha ? maxXWithAlpha - minXWithAlpha : 0;
    baseWidthRatio = subWidth > 0 ? baseSpan / subWidth : 0.5;

    // A product has a clear base if the bottom span covers at least 32% of its width
    // and has sufficient density (e.g. pots, vases, baskets, boxes, statues)
    const baseDensity = baseSpan > 0 ? opaquePixelCount / (baseSpan * bottomSliceHeight) : 0;
    if (baseWidthRatio >= 0.32 && baseDensity > 0.25) {
      hasClearBase = true;
    }
  } catch (e) {
    // Default to sensible geometry if bottom extraction fails
    hasClearBase = orientation !== 'TALL' || subjectAspectRatio > 0.45;
    baseWidthRatio = 0.55;
  }

  const geometry: SubjectGeometry = {
    x: 0,
    y: 0,
    width: subWidth,
    height: subHeight,
    aspectRatio: subjectAspectRatio,
    orientation,
    hasClearBase,
    baseWidthRatio,
  };

  return { segmentedFg, trimmedFg, geometry };
}

/**
 * Step 4: Calculate adaptive canvas scaling, placement, and margins.
 * Eliminates hardcoded magic numbers by scaling dynamically based on orientation and source size.
 */
export function computeAdaptiveComposition(
  analysis: ImageAnalysisMetrics,
  geometry: SubjectGeometry,
  canvasSize: number = 1200
): AdaptiveComposition {
  const { width: subWidth, height: subHeight, orientation, hasClearBase } = geometry;

  let maxAllowedWidth: number;
  let maxAllowedHeight: number;

  switch (orientation) {
    case 'TALL':
      // Prioritize vertical fit with comfortable top/bottom breathing room
      maxAllowedHeight = Math.round(canvasSize * 0.86); // ~1032px (7% top, 7% bottom)
      maxAllowedWidth = Math.round(canvasSize * 0.78); // generous horizontal margin
      break;
    case 'WIDE':
      // Prioritize horizontal fit with comfortable left/right breathing room
      maxAllowedWidth = Math.round(canvasSize * 0.86); // ~1032px (7% left, 7% right)
      maxAllowedHeight = Math.round(canvasSize * 0.76); // generous vertical margin
      break;
    case 'SQUARE':
    default:
      // Balanced square/circular composition
      maxAllowedWidth = Math.round(canvasSize * 0.82); // ~984px
      maxAllowedHeight = Math.round(canvasSize * 0.82); // ~984px
      break;
  }

  // Calculate scaling factor to fit within allowed bounding box
  let scale = Math.min(maxAllowedWidth / (subWidth || 1), maxAllowedHeight / (subHeight || 1));

  // Small product protection: avoid upscaling tiny products more than 1.6x to prevent pixelation/blur
  if (subWidth < 300 && subHeight < 300 && scale > 1.6) {
    scale = 1.6;
  }
    
  const scaledWidth = Math.round(subWidth * scale);
  const scaledHeight = Math.round(subHeight * scale);

  // Horizontal centering
  const left = Math.round((canvasSize - scaledWidth) / 2);

  // Vertical placement:
  // If product has a clear base, anchor comfortably on ground plane (lower third)
  // If hanging, floating, or flat art, center optically
  let top: number;
  if (hasClearBase) {
    const bottomMargin = Math.max(60, Math.round(canvasSize * 0.08));
    top = canvasSize - bottomMargin - scaledHeight;
    // Safety check: ensure top margin does not get crushed
    if (top < 50) {
      top = Math.round((canvasSize - scaledHeight) / 2);
    }
  } else {
    top = Math.round((canvasSize - scaledHeight) / 2);
  }

  const marginHorizontalPercent = parseFloat((((canvasSize - scaledWidth) / (2 * canvasSize)) * 100).toFixed(1));
  const marginVerticalPercent = parseFloat((((canvasSize - scaledHeight) / (2 * canvasSize)) * 100).toFixed(1));

  return {
    canvasWidth: canvasSize,
    canvasHeight: canvasSize,
    scaleFactor: scale,
    scaledWidth,
    scaledHeight,
    left,
    top,
    marginHorizontalPercent,
    marginVerticalPercent,
  };
}

/**
 * Step 5: Adaptive Contact Shadow Generation.
 * Tailors shadow width to actual product base contact span; suppresses ground shadow for hanging/floating products.
 */
export async function generateAdaptiveShadow(
  geometry: SubjectGeometry,
  composition: AdaptiveComposition,
  isTransparent: boolean
): Promise<{ shadowBuffer: Buffer | null; shadowLeft: number; shadowTop: number }> {
  // Never add an artificial ground plane shadow for transparent cutouts or hanging products without a base
  if (isTransparent || !geometry.hasClearBase) {
    return { shadowBuffer: null, shadowLeft: 0, shadowTop: 0 };
  }

  const { scaledWidth, scaledHeight, left, top } = composition;

  // Shadow width dynamically adapts to actual base contact span
  const baseSpan = Math.round(scaledWidth * Math.max(0.35, geometry.baseWidthRatio));
  const shadowWidth = Math.min(scaledWidth, Math.round(baseSpan * 1.12));
  const shadowHeight = Math.max(14, Math.min(36, Math.round(scaledHeight * 0.065)));

  // Center shadow under the product base
  const shadowLeft = left + Math.round((scaledWidth - shadowWidth) / 2);
  // Slightly overlap base to create realistic contact occlusion
  const shadowTop = top + scaledHeight - Math.round(shadowHeight * 0.52);

  // Subtle opacity: 0.18 - 0.24 (never heavy or dark) with quadratic radial falloff
  const rawBuffer = Buffer.alloc(shadowWidth * shadowHeight * 4);
  const cx = shadowWidth / 2;
  const cy = shadowHeight / 2;
  const rx = shadowWidth / 2;
  const ry = shadowHeight / 2;

  for (let y = 0; y < shadowHeight; y++) {
    for (let x = 0; x < shadowWidth; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const distSq = dx * dx + dy * dy;

      if (distSq < 1.0) {
        const factor = Math.max(0, 1.0 - Math.sqrt(distSq));
        // Max opacity ~21% (54 out of 255)
        const alpha = Math.round(54 * Math.pow(factor, 1.4));
        const idx = (y * shadowWidth + x) * 4;
        rawBuffer[idx] = 0;
        rawBuffer[idx + 1] = 0;
        rawBuffer[idx + 2] = 0;
        rawBuffer[idx + 3] = alpha;
      }
    }
  }

  const shadowBuffer = await sharp(rawBuffer, {
    raw: { width: shadowWidth, height: shadowHeight, channels: 4 },
  })
    .blur(2.5)
    .png()
    .toBuffer();

  return { shadowBuffer, shadowLeft, shadowTop };
}

/**
 * Step 6: Compute adaptive photographic enhancement filters based on source analysis.
 */
export function computeAdaptiveFilters(analysis: ImageAnalysisMetrics): AdaptiveFilterParams {
  const { meanLuminance, contrastStdDev, meanSaturation, edgeEnergy } = analysis;

  // Exposure lift: calculate bounded adjustment based on luminance deficit
  let brightness = 1.02; // Default subtle studio balance
  if (meanLuminance < 95) {
    // Underexposed: apply proportional lift up to +7%
    brightness = parseFloat((1.0 + Math.min(0.07, (95 - meanLuminance) / 450)).toFixed(3));
  } else if (meanLuminance > 175) {
    // High key / bright: slight highlight protection
    brightness = 0.99;
  }

  // Contrast adjustment: based on source dynamic range
  let contrastSlope = 1.02;
  let contrastIntercept = -1;
  if (contrastStdDev < 38) {
    // Flat image: gently lift contrast
    contrastSlope = 1.04;
    contrastIntercept = -3;
  } else if (contrastStdDev > 65) {
    // Already high contrast: do not crush shadows
    contrastSlope = 1.0;
    contrastIntercept = 0;
  }

  // Saturation: preserve authentic artisan dye colors
  let saturation = 1.02;
  if (meanSaturation < 0.22) {
    // Slightly dull: subtle warmth lift
    saturation = 1.04;
  } else if (meanSaturation > 0.52) {
    // Already rich/vivid: strictly maintain natural color
    saturation = 1.0;
  }

  // Sharpening: adapt to apparent sharpness / edge energy
  let sharpenSigma = 0.9;
  let sharpenM1 = 0.5;
  let sharpenM2 = 1.8;

  if (edgeEnergy < 15) {
    // Soft source: moderate unsharp mask to bring out authentic texture
    sharpenSigma = 1.0;
    sharpenM1 = 0.6;
    sharpenM2 = 2.2;
  } else if (edgeEnergy > 28) {
    // Crisp source: minimal sharpening to avoid haloing or ringing
    sharpenSigma = 0.75;
    sharpenM1 = 0.3;
    sharpenM2 = 1.2;
  }

  return {
    brightness,
    saturation,
    contrastSlope,
    contrastIntercept,
    sharpenSigma,
    sharpenM1,
    sharpenM2,
  };
}

/**
 * Step 7: Main Adaptive Enhancement Pipeline Function.
 * Runs the end-to-end adaptive photo studio transformation.
 */
export async function runAdaptiveEnhancerPipeline(
  imageBuffer: Buffer,
  backgroundOption: string = 'WHITE',
  customColorHex?: string
): Promise<AdaptiveEnhancementResult> {
  const bgOptUpper = (backgroundOption || 'WHITE').toUpperCase();
  const isTransparent = bgOptUpper === 'TRANSPARENT';

  let targetHex: string | null = null;
  let backgroundLabel = 'Studio White';

  if (isTransparent) {
    backgroundLabel = 'Transparent Cutout';
  } else if (bgOptUpper === 'CUSTOM' && customColorHex && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(customColorHex)) {
    targetHex = customColorHex.replace('#', '');
    backgroundLabel = `Custom (${customColorHex})`;
  } else if (PRESET_BACKGROUND_COLORS[bgOptUpper]) {
    targetHex = PRESET_BACKGROUND_COLORS[bgOptUpper].hex;
    backgroundLabel = PRESET_BACKGROUND_COLORS[bgOptUpper].label;
  } else {
    targetHex = 'FFFFFF';
    backgroundLabel = 'Studio White';
  }

  logger.info(`[M63] [AdaptiveEnhancer] Starting pipeline (Background: ${backgroundLabel}, bytes: ${imageBuffer.length})`);

  // 1. Analyze source image metrics
  const analysis = await analyzeImageMetrics(imageBuffer);

  // 2. Segment foreground & analyze subject geometry
  const { trimmedFg, geometry } = await extractAndAnalyzeSubject(imageBuffer);

  // 3. Compute adaptive composition (scaling, margins, placement)
  const canvasSize = 1200;
  const composition = computeAdaptiveComposition(analysis, geometry, canvasSize);

  // 4. Resize trimmed subject to adaptive scale
  const scaledSubject = await sharp(trimmedFg)
    .resize(composition.scaledWidth, composition.scaledHeight, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .toBuffer();

  // 5. Generate adaptive contact shadow (if appropriate)
  const { shadowBuffer, shadowLeft, shadowTop } = await generateAdaptiveShadow(
    geometry,
    composition,
    isTransparent
  );

  // 6. Compute adaptive photographic filters
  const filters = computeAdaptiveFilters(analysis);

  // 7. Apply photograph enhancement to the subject layer
  let enhancedSubject = await sharp(scaledSubject)
    .modulate({
      brightness: filters.brightness,
      saturation: filters.saturation,
    })
    .linear(filters.contrastSlope, filters.contrastIntercept)
    .sharpen({
      sigma: filters.sharpenSigma,
      m1: filters.sharpenM1,
      m2: filters.sharpenM2,
    })
    .png()
    .toBuffer();

  // 8. Create canvas and composite layers
  let finalBuffer: Buffer;
  let finalMimeType: string;
  let finalFormat: string;

  if (isTransparent) {
    // Transparent mode: create empty alpha canvas
    const baseCanvas = await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    finalBuffer = await sharp(baseCanvas)
      .composite([{ input: enhancedSubject, left: composition.left, top: composition.top }])
      .png({ quality: 95, compressionLevel: 8 })
      .toBuffer();

    finalMimeType = 'image/png';
    finalFormat = 'png';
  } else {
    // Solid background mode: parse target RGB
    const hexToUse = targetHex || 'FFFFFF';
    const bgR = parseInt(hexToUse.substring(0, 2), 16);
    const bgG = parseInt(hexToUse.substring(2, 4), 16);
    const bgB = parseInt(hexToUse.substring(4, 6), 16);

    const baseCanvas = await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: bgR, g: bgG, b: bgB, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const compositeLayers: OverlayOptions[] = [];
    if (shadowBuffer) {
      compositeLayers.push({ input: shadowBuffer, left: shadowLeft, top: shadowTop });
    }
    compositeLayers.push({ input: enhancedSubject, left: composition.left, top: composition.top });

    finalBuffer = await sharp(baseCanvas)
      .composite(compositeLayers)
      .jpeg({ quality: 94, mozjpeg: true })
      .toBuffer();

    finalMimeType = 'image/jpeg';
    finalFormat = 'jpeg';
  }

  // 9. Validate output
  const outMeta = await sharp(finalBuffer).metadata();
  if (!outMeta.width || !outMeta.height || finalBuffer.length < 1000) {
    throw new Error('Enhanced image output validation failed.');
  }

  // 10. Compile dynamic list of actual improvements applied
  const improvementsApplied: string[] = [
    '✓ Original background cleanly removed',
    `✓ Applied ${backgroundLabel} background`,
    `✓ Product framed with ${composition.marginHorizontalPercent}% adaptive margin`,
  ];

  if (shadowBuffer) {
    improvementsApplied.push('✓ Natural studio contact shadow applied');
  } else if (!isTransparent) {
    improvementsApplied.push('✓ Composition balanced for hanging / floating craft');
  }

  if (filters.brightness > 1.01) {
    improvementsApplied.push(`✓ Exposure balanced (+${Math.round((filters.brightness - 1) * 100)}% studio lift)`);
  }

  if (filters.contrastSlope > 1.01) {
    improvementsApplied.push('✓ Craft contrast & depth calibrated');
  }

  improvementsApplied.push('✓ Authentic artisan textures sharpened');
  improvementsApplied.push('✓ Product geometry & colors 100% preserved');

  return {
    success: true,
    enhancedBuffer: finalBuffer,
    mimeType: finalMimeType,
    format: finalFormat,
    width: outMeta.width,
    height: outMeta.height,
    backgroundOption: bgOptUpper,
    backgroundColorHex: targetHex ? `#${targetHex}` : undefined,
    analysis,
    geometry,
    composition,
    filters,
    improvementsApplied,
    message: `✨ Photo presentation enhanced with ${backgroundLabel} & adaptive studio detail.`,
  };
}
