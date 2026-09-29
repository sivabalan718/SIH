import { removeBackground } from '@imgly/background-removal-node';
import sharp, { OverlayOptions } from 'sharp';

/**
 * M63 Image Enhancer
 *
 * Original → Analyze → Adaptive Enhancement → Background Processing → Quality Validation → Enhanced Image
 *
 * Controlled, measurement-driven enhancement: every correction is derived from statistics of the
 * input photo (foreground-aware when a reliable product mask exists) and bounded so the product's
 * shape, colour, texture and identity are never altered. Any failed gate falls back to a
 * conservative enhancement of the original photo. The original buffer is never modified.
 */

// Jest runs imgly inside a VM realm where cross-realm `instanceof Float32Array` fails.
if (process.env.JEST_WORKER_ID && typeof Float32Array !== 'undefined') {
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

// ==========================================
// 1. INTERFACES & TYPES
// ==========================================
export interface ImageAnalysisMetrics {
  width: number;
  height: number;
  aspectRatio: number;
  meanLuminance: number;
  contrastStdDev: number;
  meanSaturation: number;
  edgeEnergy: number;
  // Extended measurements (optional so callers can supply partial analyses)
  lumaP2?: number;
  lumaP50?: number;
  lumaP98?: number;
  sceneP98?: number;
  clippedHighlights?: number;
  noiseLevel?: number;
  wbGains?: [number, number, number];
}

export interface SubjectGeometry {
  x?: number;
  y?: number;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'TALL' | 'WIDE' | 'SQUARE' | 'FLAT';
  hasClearBase: boolean;
  baseWidthRatio: number;
}

export interface AdaptiveComposition {
  canvasWidth: number;
  canvasHeight: number;
  scaleFactor: number;
  scaledWidth: number;
  scaledHeight: number;
  left: number;
  top: number;
  marginHorizontalPercent?: number;
  marginVerticalPercent?: number;
}

export interface AdaptiveFilterParams {
  brightness: number;
  saturation: number;
  contrastSlope: number;
  contrastIntercept: number;
  sharpenSigma: number;
  sharpenM1: number;
  sharpenM2: number;
  gamma: number;
  blackPoint: number;
  whitePoint: number;
  wbGains: [number, number, number];
  denoise: boolean;
}

export interface QualityReport {
  maskChecks?: Record<string, number | boolean>;
  fidelityStrength?: number;
  notes: string[];
}

export interface AdaptiveEnhancementResult {
  success: boolean;
  qualityGatePassed: boolean;
  fallbackTriggered: boolean;
  enhancedBuffer: Buffer;
  mimeType: string;
  format?: string;
  width: number;
  height: number;
  backgroundOption?: string;
  backgroundColorHex?: string;
  analysis?: ImageAnalysisMetrics;
  geometry?: SubjectGeometry;
  composition?: AdaptiveComposition;
  improvementsApplied: string[];
  message: string;
  processingMode?: 'STUDIO' | 'ORIGINAL_BACKGROUND' | 'FALLBACK';
  inputUnusable?: boolean;
  qualityReport?: QualityReport;
}

export const PRESET_BACKGROUND_COLORS: Record<string, { label: string; hex: string }> = {
  WHITE: { label: 'Studio White', hex: 'FFFFFF' },
  BEIGE: { label: 'Warm Beige', hex: 'F5F0EB' },
  GREY: { label: 'Light Grey', hex: 'F3F4F6' },
  CREAM: { label: 'Soft Cream', hex: 'FFFDF7' },
};

const CANVAS_SIZE = 1200;
const WORK_MAX_SIDE = 1200;
const SEGMENTATION_MODELS: Array<'medium' | 'small'> = ['medium', 'small'];

interface RawRgb {
  data: Buffer;
  width: number;
  height: number;
}

interface PixelStats {
  meanLuminance: number;
  contrastStdDev: number;
  meanSaturation: number;
  edgeEnergy: number;
  p2: number;
  p50: number;
  p98: number;
  clippedHighlights: number;
  noiseLevel: number;
  meanRgb: [number, number, number];
  wbGains: [number, number, number];
  count: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const round2 = (v: number) => Math.round(v * 100) / 100;

// ==========================================
// 2. BACKGROUND RESOLUTION
// ==========================================
interface ResolvedBackground {
  option: string;
  mode: 'SOLID' | 'TRANSPARENT' | 'ORIGINAL';
  r: number;
  g: number;
  b: number;
  hex: string;
}

function resolveBackground(backgroundOption?: string, customColorHex?: string): ResolvedBackground {
  const option = (backgroundOption || 'WHITE').toUpperCase();
  if (option === 'TRANSPARENT') return { option, mode: 'TRANSPARENT', r: 0, g: 0, b: 0, hex: 'TRANSPARENT' };
  if (option === 'ORIGINAL') return { option, mode: 'ORIGINAL', r: 255, g: 255, b: 255, hex: 'ORIGINAL' };

  let hex = PRESET_BACKGROUND_COLORS[option]?.hex || 'FFFFFF';
  if (option === 'CUSTOM' && customColorHex) {
    const cleaned = customColorHex.replace('#', '').trim();
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) hex = cleaned.toUpperCase();
  }
  return {
    option: PRESET_BACKGROUND_COLORS[option] || option === 'CUSTOM' ? option : 'WHITE',
    mode: 'SOLID',
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
    hex,
  };
}

// ==========================================
// 3. DECODING & MEASUREMENT
// ==========================================
export function validateImageInput(buffer: Buffer): { valid: boolean; reason?: string } {
  if (!buffer || buffer.length < 500) {
    return { valid: false, reason: 'Image buffer is missing or corrupt.' };
  }
  if (buffer.length > 25 * 1024 * 1024) {
    return { valid: false, reason: 'Image file size exceeds the 25MB limit.' };
  }
  return { valid: true };
}

/** Decode with EXIF auto-orientation (phone photos), sRGB, flattened to 3-channel RGB. */
async function decodeToRgb(buffer: Buffer, maxSide = WORK_MAX_SIDE): Promise<RawRgb> {
  const { data, info } = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) {
    const rgb = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer();
    return { data: rgb, width: info.width, height: info.height };
  }
  return { data, width: info.width, height: info.height };
}

/**
 * Measure exposure, contrast, saturation, sharpness, noise, clipping and colour cast.
 * When a mask is supplied, only confident foreground pixels (alpha ≥ 200) are measured so
 * the background cannot distort product statistics.
 */
function computeStats(img: RawRgb, mask?: Uint8Array | null): PixelStats {
  const { data, width, height } = img;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 250000)));
  const hist = new Uint32Array(256);
  const histMax = new Uint32Array(256);
  const grads = new Float32Array(Math.ceil(width / step) * Math.ceil(height / step));
  let gCount = 0;
  let n = 0, sumL = 0, sumL2 = 0, sumSat = 0, sumR = 0, sumG = 0, sumB = 0;
  let nN = 0, nR = 0, nG = 0, nB = 0, clipHi = 0, noiseSum = 0, noiseN = 0;

  const lumaAt = (p: number) => 0.299 * data[p * 3] + 0.587 * data[p * 3 + 1] + 0.114 * data[p * 3 + 2];

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const p = y * width + x;
      if (mask && mask[p] < 200) continue;
      const i = p * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      hist[L | 0]++;
      n++;
      sumL += L;
      sumL2 += L * L;
      sumR += r; sumG += g; sumB += b;
      const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
      const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
      const sat = mx > 0 ? (mx - mn) / mx : 0;
      sumSat += sat;
      histMax[mx]++;
      if (mx >= 250) clipHi++;
      if (sat < 0.15 && L > 35 && L < 225) {
        nN++; nR += r; nG += g; nB += b;
      }
      const Ll = lumaAt(p - 1), Lr = lumaAt(p + 1), Lu = lumaAt(p - width), Ld = lumaAt(p + width);
      const gm = Math.abs(Lr - Ll) + Math.abs(Ld - Lu);
      grads[gCount++] = gm;
      if (gm < 6) {
        noiseSum += Math.abs(4 * L - Ll - Lr - Lu - Ld) / 4;
        noiseN++;
      }
    }
  }

  if (n === 0) {
    return {
      meanLuminance: 128, contrastStdDev: 40, meanSaturation: 0.3, edgeEnergy: 20, p2: 0, p50: 128, p98: 255,
      clippedHighlights: 0, noiseLevel: 1, meanRgb: [128, 128, 128], wbGains: [1, 1, 1], count: 0,
    };
  }

  const percentile = (q: number, h: Uint32Array = hist) => {
    const target = n * q;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += h[v];
      if (acc >= target) return v;
    }
    return 255;
  };

  // Sharpness: mean gradient of the strongest 10% of edges (texture/outline crispness).
  const g = grads.subarray(0, gCount).sort();
  const topStart = Math.floor(gCount * 0.9);
  let topSum = 0;
  for (let k = topStart; k < gCount; k++) topSum += g[k];
  const edgeEnergy = gCount > topStart ? topSum / (gCount - topStart) : 20;

  // Colour cast from genuinely neutral pixels only; partial, bounded correction.
  let wbGains: [number, number, number] = [1, 1, 1];
  if (nN / n >= 0.05) {
    const mr = nR / nN, mg = nG / nN, mb = nB / nN;
    const grey = (mr + mg + mb) / 3;
    const raw = [grey / mr, grey / mg, grey / mb];
    const deviation = Math.max(...raw.map((v) => Math.abs(v - 1)));
    if (deviation > 0.025) {
      wbGains = raw.map((v) => round2(clamp(1 + (v - 1) * 0.6, 0.92, 1.08))) as [number, number, number];
    }
  }

  const mean = sumL / n;
  return {
    meanLuminance: Math.round(mean),
    contrastStdDev: Math.round(Math.sqrt(Math.max(0, sumL2 / n - mean * mean))),
    meanSaturation: round2(sumSat / n),
    edgeEnergy: Math.round(edgeEnergy * 10) / 10,
    p2: percentile(0.005),
    p50: percentile(0.5),
    p98: percentile(0.995, histMax),
    clippedHighlights: round2(clipHi / n),
    noiseLevel: noiseN > 0 ? Math.round((noiseSum / noiseN) * 100) / 100 : 1,
    meanRgb: [sumR / n, sumG / n, sumB / n],
    wbGains,
    count: n,
  };
}

function statsToMetrics(img: RawRgb, s: PixelStats, scene?: PixelStats): ImageAnalysisMetrics {
  return {
    width: img.width,
    height: img.height,
    aspectRatio: img.width / (img.height || 1),
    meanLuminance: s.meanLuminance,
    contrastStdDev: s.contrastStdDev,
    meanSaturation: s.meanSaturation,
    edgeEnergy: s.edgeEnergy,
    lumaP2: s.p2,
    lumaP50: s.p50,
    lumaP98: s.p98,
    sceneP98: (scene || s).p98,
    clippedHighlights: s.clippedHighlights,
    noiseLevel: s.noiseLevel,
    // Colour cast is estimated from the whole scene: neutral surroundings are a far more
    // reliable white reference than a (possibly intentionally coloured) product.
    wbGains: (scene || s).wbGains,
  };
}

export async function analyzeImageMetrics(buffer: Buffer): Promise<ImageAnalysisMetrics> {
  const img = await decodeToRgb(buffer, 800);
  return statsToMetrics(img, computeStats(img));
}

// ==========================================
// 4. ADAPTIVE PARAMETERS (derived per image)
// ==========================================
export function computeAdaptiveFilters(analysis: ImageAnalysisMetrics): AdaptiveFilterParams {
  const mid = analysis.lumaP50 ?? analysis.meanLuminance;
  const lo = analysis.lumaP2 ?? Math.max(0, analysis.meanLuminance - 2 * analysis.contrastStdDev);
  const hi = analysis.lumaP98 ?? Math.min(255, analysis.meanLuminance + 2 * analysis.contrastStdDev);
  const clippedHi = analysis.clippedHighlights ?? 0;
  const noise = analysis.noiseLevel ?? 1.5;

  // Levels: only stretch a compressed tonal range, bounded slope, never on already-contrasty photos.
  let black = 0;
  let white = 255;
  if (analysis.contrastStdDev < 58) {
    // lo/hi are the 0.5% / 99.5% luminance tails, so at most ~0.5% of pixels can clip.
    if (lo > 8) black = Math.min(lo * 0.8, 28);
    if (hi < 245) white = Math.max(hi + (255 - hi) * 0.15, 215);
  }
  let slope = 255 / (white - black);
  if (slope > 1.18) {
    const range = 255 / 1.18;
    const center = (black + white) / 2;
    black = Math.max(0, center - range / 2);
    white = Math.min(255, black + range);
    slope = 255 / (white - black);
  }

  // Exposure: midtone gamma toward a natural product midtone. A dark subject in a scene that
  // already has proper highlights is treated as an intrinsically dark product (minimal lift).
  const midAfter = clamp((mid - black) * slope, 1, 254);
  let gamma = 1;
  const target = 128;
  if (Math.abs(midAfter - target) > 18) {
    if (midAfter < target) {
      const intrinsicallyDark = (analysis.sceneP98 ?? 0) >= 210 && analysis.lumaP50 !== undefined;
      const pull = intrinsicallyDark ? 0.25 : 0.6;
      const t = midAfter + (target - midAfter) * pull;
      gamma = Math.log(t / 255) / Math.log(midAfter / 255);
      gamma = clamp(gamma, clippedHi > 0.06 ? 0.88 : 0.75, 1);
    } else if (midAfter > 150 && clippedHi > 0.03) {
      // Overexposed: gentle highlight recovery only when clipping is measured.
      gamma = clamp(1 + (midAfter - 150) / 400, 1, 1.1);
    }
  }
  const midOut = 255 * Math.pow(midAfter / 255, gamma);
  const brightness = round2(midOut / Math.max(1, mid));

  // Saturation: neutral products stay neutral; only dull colour gets a mild lift.
  const s = analysis.meanSaturation;
  let saturation = s < 0.12 ? 1 : s < 0.3 ? 1.06 : s < 0.45 ? 1.03 : 1;
  if (gamma < 0.9 && s >= 0.12) saturation += 0.02;

  // Sharpening scaled to measured softness, damped on noisy photos.
  let sharpenM2 = analysis.edgeEnergy < 15 ? 1.8 : analysis.edgeEnergy < 30 ? 1.3 : 0.8;
  if (noise > 3.5) sharpenM2 *= 0.65;

  return {
    brightness,
    saturation: round2(saturation),
    contrastSlope: round2(slope),
    contrastIntercept: round2(-black * slope),
    sharpenSigma: 0.8,
    sharpenM1: noise > 3.5 ? 0.15 : 0.35,
    sharpenM2: round2(sharpenM2),
    gamma: round2(gamma),
    blackPoint: round2(black),
    whitePoint: round2(white),
    wbGains: analysis.wbGains ?? [1, 1, 1],
    denoise: noise > 5.5,
  };
}

/** Tone + colour applied to RGB only (alpha is never touched here). */
function applyToneAndColor(img: RawRgb, p: AdaptiveFilterParams, strength: number): Buffer {
  const out = Buffer.allocUnsafe(img.data.length);
  const luts = [0, 1, 2].map((c) => {
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      let x = v * p.wbGains[c];
      x = clamp((x - p.blackPoint) * p.contrastSlope, 0, 255);
      x = 255 * Math.pow(x / 255, p.gamma);
      lut[v] = clamp(Math.round(v + (x - v) * strength), 0, 255);
    }
    return lut;
  });
  const sat = 1 + (p.saturation - 1) * strength;
  const d = img.data;
  for (let i = 0; i < d.length; i += 3) {
    let r = luts[0][d[i]], g = luts[1][d[i + 1]], b = luts[2][d[i + 2]];
    if (sat !== 1) {
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(Y + (r - Y) * sat, 0, 255);
      g = clamp(Y + (g - Y) * sat, 0, 255);
      b = clamp(Y + (b - Y) * sat, 0, 255);
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  return out;
}

async function denoiseRgb(img: RawRgb): Promise<Buffer> {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: 3 } }).median(3).raw().toBuffer();
}

function describeAdjustments(p: AdaptiveFilterParams, strength: number): string[] {
  const list: string[] = [];
  if (strength <= 0) return list;
  if (p.gamma < 0.97) list.push('✓ Exposure balanced (shadows lifted)');
  else if (p.gamma > 1.03) list.push('✓ Highlights recovered');
  if (p.contrastSlope > 1.03) list.push('✓ Contrast refined from tonal range');
  if (p.wbGains.some((g) => Math.abs(g - 1) >= 0.02)) list.push('✓ Colour cast neutralised');
  if (p.saturation > 1.01) list.push('✓ Natural colour vibrancy restored');
  if (p.denoise) list.push('✓ Sensor noise reduced');
  list.push(p.sharpenM2 >= 1.3 ? '✓ Clarity sharpened (adaptive)' : '✓ Light detail sharpening');
  return list;
}

// ==========================================
// 5. SEGMENTATION + MASK REFINEMENT
// ==========================================
async function segmentAlpha(img: RawRgb): Promise<Uint8Array | null> {
  const png = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 3 } }).png().toBuffer();
  for (const model of SEGMENTATION_MODELS) {
    try {
      const blob = await removeBackground(new Blob([png], { type: 'image/png' }), { model });
      const cut = Buffer.from(await blob.arrayBuffer());
      const { data, info } = await sharp(cut)
        .ensureAlpha()
        .extractChannel(3)
        .resize(img.width, img.height, { fit: 'fill' })
        .toColourspace('b-w')
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (info.width === img.width && info.height === img.height && info.channels === 1) return new Uint8Array(data);
    } catch {
      // try next model
    }
  }
  return null;
}

/** Separable box blur of a float map using running sums (O(n), radius r). */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / (2 * r + 1);
      acc += src[row + clamp(x + r + 1, 0, w - 1)] - src[row + clamp(x - r, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
    }
  }
  return out;
}

/**
 * Colour-model segmentation for flat-lay / busy-background photos (e.g. a garment on a printed
 * bedsheet) where the saliency model fails. Background = colours present along ≥3 image borders
 * and rare in the centre; product = the smoothed, connected non-background region. The result
 * must still pass the same mask quality gates as the model output.
 */
function segmentByBorderColours(img: RawRgb): Uint8Array {
  const { data, width: w, height: h } = img;
  // 4 bits per channel: coarse enough to be robust, fine enough to keep dark colours apart.
  const NB = 4096;
  const bins = new Uint16Array(w * h);
  for (let p = 0; p < w * h; p++) bins[p] = ((data[p * 3] >> 4) << 8) | ((data[p * 3 + 1] >> 4) << 4) | (data[p * 3 + 2] >> 4);

  const band = Math.max(3, Math.round(Math.min(w, h) * 0.04));
  const side = [0, 1, 2, 3].map(() => new Float32Array(NB));
  const sideN = [0, 0, 0, 0];
  const centre = new Float32Array(NB);
  let centreN = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const b = bins[y * w + x];
      if (y < band) { side[0][b]++; sideN[0]++; }
      if (y >= h - band) { side[1][b]++; sideN[1]++; }
      if (x < band) { side[2][b]++; sideN[2]++; }
      if (x >= w - band) { side[3][b]++; sideN[3]++; }
      if (x > w * 0.3 && x < w * 0.7 && y > h * 0.3 && y < h * 0.7) { centre[b]++; centreN++; }
    }
  }

  // Tolerate lighting variation: a bin inherits half the frequency of its colour neighbours.
  const spread = (hist: Float32Array, n: number) => {
    const out = new Float32Array(NB);
    for (let b = 0; b < NB; b++) {
      const r = b >> 8, g = (b >> 4) & 15, bl = b & 15;
      let v = hist[b];
      for (let dr = -1; dr <= 1; dr++) for (let dg = -1; dg <= 1; dg++) for (let db = -1; db <= 1; db++) {
        const R = r + dr, G = g + dg, B = bl + db;
        if ((dr || dg || db) && R >= 0 && R < 16 && G >= 0 && G < 16 && B >= 0 && B < 16) v = Math.max(v, hist[(R << 8) | (G << 4) | B] * 0.5);
      }
      out[b] = v / Math.max(1, n);
    }
    return out;
  };
  const sides = side.map((hist, i) => spread(hist, sideN[i]));
  const centreFreq = spread(centre, centreN);

  const bgWeight = new Float32Array(NB);
  for (let b = 0; b < NB; b++) {
    const presence = sides.filter((s) => s[b] >= 0.006).length;
    // Two sides only usually means the product itself touches the frame edges (e.g. sleeves).
    let wgt = presence >= 3 ? 1 : presence === 2 ? 0.35 : 0;
    if (centreFreq[b] >= 0.004) wgt -= 0.5; // colour is part of whatever sits in the middle
    bgWeight[b] = clamp(wgt, 0, 1);
  }

  const r = Math.max(2, Math.round(Math.min(w, h) * 0.015));

  // Pass 1: border/centre colour prior.
  const raw = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) raw[p] = 1 - bgWeight[bins[p]];
  const first = maskFromScores(raw, w, h, r);

  // Pass 2: learn the product's own colour distribution from pass 1 (so product colours that
  // touch the frame stay, and background colours that merely sit next to the product go).
  const fgHist = new Float32Array(NB);
  const bgHist = new Float32Array(NB);
  let nf = 0, nb = 0;
  for (let p = 0; p < w * h; p++) {
    if (first[p]) { fgHist[bins[p]]++; nf++; } else { bgHist[bins[p]]++; nb++; }
  }
  if (nf === 0 || nb === 0) return Uint8Array.from(first, (v) => v * 255);
  const fgF = spread(fgHist, nf);
  const bgF = spread(bgHist, nb);
  for (let p = 0; p < w * h; p++) {
    const f = fgF[bins[p]], b = bgF[bins[p]];
    raw[p] = f + b > 0 ? f / (f + b) : 0.5;
  }
  const second = maskFromScores(raw, w, h, r);
  // Anti-aliased outline (1px soft ramp) instead of hard stair-steps.
  const soft = boxBlur(Float32Array.from(second), w, h, 1);
  return Uint8Array.from(soft, (v) => Math.round(v * 255));
}

/** Score map → smoothed, connected, hole-filled binary product mask with detailed edges. */
function maskFromScores(raw: Float32Array, w: number, h: number, r: number): Uint8Array {
  // Spatial smoothing removes print/texture noise on both product and background.
  const smooth = boxBlur(raw, w, h, r);
  const binary = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) binary[p] = smooth[p] > 0.5 ? 1 : 0;

  // Keep the main product region(s), then fill enclosed prints/holes.
  const fg = labelComponents(w, h, (p) => binary[p] === 1);
  const largest = Math.max(0, ...fg.areas.slice(1));
  let area = 0;
  for (let p = 0; p < w * h; p++) {
    const keep = fg.labels[p] > 0 && fg.areas[fg.labels[p]] >= largest * 0.2;
    binary[p] = keep ? 1 : 0;
    area += binary[p];
  }
  const holes = labelComponents(w, h, (p) => binary[p] === 0);
  for (let p = 0; p < w * h; p++) {
    const l = holes.labels[p];
    if (l > 0 && !holes.touchesBorder[l] && holes.areas[l] < area * 0.05) binary[p] = 1;
  }

  // Opening: erode, keep the main body, grow back inside the original mask. This detaches other
  // objects joined to the product only by a thin bridge (e.g. another garment in the corner).
  const ro = Math.max(3, Math.round(Math.min(w, h) * 0.03));
  const eroded = boxBlur(Float32Array.from(binary), w, h, ro);
  const core = labelComponents(w, h, (p) => eroded[p] > 0.97);
  const coreLargest = Math.max(0, ...core.areas.slice(1));
  if (coreLargest > 0) {
    const kept = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) kept[p] = core.labels[p] > 0 && core.areas[core.labels[p]] >= coreLargest * 0.2 ? 1 : 0;
    const grown = boxBlur(kept, w, h, ro + 1);
    for (let p = 0; p < w * h; p++) if (grown[p] < 0.02) binary[p] = 0;
  }

  // Closing-style smoothing of the outline (no pixel-level texture noise at the edge).
  const closed = boxBlur(Float32Array.from(binary), w, h, Math.max(1, Math.round(r * 0.75)));
  const out = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) out[p] = closed[p] >= 0.5 ? 1 : 0;
  return out;
}

/** 4-connected component labelling over a binary predicate. */
function labelComponents(width: number, height: number, isOn: (p: number) => boolean) {
  const labels = new Int32Array(width * height);
  const areas: number[] = [0];
  const touchesBorder: boolean[] = [false];
  const stack = new Int32Array(width * height);
  let next = 1;
  for (let start = 0; start < width * height; start++) {
    if (labels[start] !== 0 || !isOn(start)) continue;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = next;
    let area = 0;
    let border = false;
    while (sp > 0) {
      const p = stack[--sp];
      area++;
      const x = p % width;
      const y = (p - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) border = true;
      if (x > 0 && labels[p - 1] === 0 && isOn(p - 1)) { labels[p - 1] = next; stack[sp++] = p - 1; }
      if (x < width - 1 && labels[p + 1] === 0 && isOn(p + 1)) { labels[p + 1] = next; stack[sp++] = p + 1; }
      if (y > 0 && labels[p - width] === 0 && isOn(p - width)) { labels[p - width] = next; stack[sp++] = p - width; }
      if (y < height - 1 && labels[p + width] === 0 && isOn(p + width)) { labels[p + width] = next; stack[sp++] = p + width; }
    }
    areas.push(area);
    touchesBorder.push(border);
    next++;
  }
  return { labels, areas, touchesBorder };
}

interface MaskEvaluation {
  status: 'PASS' | 'FAIL';
  reasons: string[];
  metrics: Record<string, number | boolean>;
  bbox: { x: number; y: number; width: number; height: number };
}

/**
 * Clean the raw segmentation: drop stray blobs, fill pinholes, remove faint haze and
 * slightly soften the edge. Returns the refined alpha plus a quality evaluation.
 */
async function refineMask(alpha: Uint8Array, width: number, height: number): Promise<{ alpha: Uint8Array; evaluation: MaskEvaluation }> {
  const total = width * height;
  const fg = labelComponents(width, height, (p) => alpha[p] >= 128);
  const largest = Math.max(0, ...fg.areas.slice(1));
  const originalFgArea = fg.areas.reduce((a, b) => a + b, 0);
  const keepMin = Math.max(largest * 0.04, total * 0.0008);
  const keep = fg.areas.map((a, i) => i > 0 && a >= keepMin);
  const keptCount = keep.filter(Boolean).length;

  const binary = new Uint8Array(total);
  let keptArea = 0;
  for (let p = 0; p < total; p++) {
    if (fg.labels[p] > 0 && keep[fg.labels[p]]) {
      binary[p] = 1;
      keptArea++;
    }
  }

  // Fill small enclosed holes (pinholes/specular dropouts); keep real openings (handles, rings).
  const bg = labelComponents(width, height, (p) => binary[p] === 0);
  const holeMax = keptArea * 0.004;
  for (let p = 0; p < total; p++) {
    const l = bg.labels[p];
    if (l > 0 && !bg.touchesBorder[l] && bg.areas[l] <= holeMax) binary[p] = 1;
  }

  // Integral image → "near kept subject" test (radius 3px) to discard haze around removed blobs.
  const W = width + 1;
  const integral = new Int32Array(W * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += binary[y * width + x];
      integral[(y + 1) * W + x + 1] = integral[y * W + x + 1] + row;
    }
  }
  const R = 3;
  const near = (x: number, y: number) => {
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R);
    const x1 = Math.min(width, x + R + 1), y1 = Math.min(height, y + R + 1);
    return integral[y1 * W + x1] - integral[y0 * W + x1] - integral[y1 * W + x0] + integral[y0 * W + x0] > 0;
  };

  const cleaned = new Uint8Array(total);
  let minX = width, minY = height, maxX = -1, maxY = -1, soft = 0, opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      let a = binary[p] ? Math.max(alpha[p], 128) : alpha[p];
      if (binary[p] && alpha[p] < 128) a = 255; // filled hole
      if (!binary[p] && (a < 12 || !near(x, y))) a = 0;
      if (a > 243) a = 255;
      cleaned[p] = a;
      if (a >= 128) {
        opaque++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (a > 20 && a < 235) soft++;
    }
  }

  // Gentle edge feather (sub-pixel) to avoid jaggies without eroding thin parts.
  const feathered = await sharp(Buffer.from(cleaned), { raw: { width, height, channels: 1 } }).blur(0.6).toColourspace('b-w').raw().toBuffer();
  const finalAlpha = new Uint8Array(total);
  for (let p = 0; p < total; p++) {
    finalAlpha[p] = cleaned[p] === 255 && feathered[p] > 200 ? 255 : feathered[p] < 8 ? 0 : feathered[p];
  }

  const bw = maxX >= minX ? maxX - minX + 1 : 0;
  const bh = maxY >= minY ? maxY - minY + 1 : 0;
  const sidesTouched =
    (minX <= 2 ? 1 : 0) + (minY <= 2 ? 1 : 0) + (maxX >= width - 3 ? 1 : 0) + (maxY >= height - 3 ? 1 : 0);
  const coverage = opaque / total;
  const fillRatio = bw * bh > 0 ? opaque / (bw * bh) : 0;
  const softFraction = opaque > 0 ? soft / opaque : 1;
  const removedFraction = originalFgArea > 0 ? 1 - Math.min(1, keptArea / originalFgArea) : 1;

  const reasons: string[] = [];
  if (coverage < 0.015) reasons.push('product not detected');
  if (coverage > 0.92) reasons.push('background could not be separated');
  if (softFraction > 0.45) reasons.push('product edges too uncertain');
  if (keptCount > 8) reasons.push('fragmented segmentation');
  if (fillRatio < 0.06) reasons.push('product outline too sparse');
  if (sidesTouched >= 3) reasons.push('product fills or exceeds the frame');
  if (removedFraction > 0.35) reasons.push('large parts of the detection were unreliable');

  return {
    alpha: finalAlpha,
    evaluation: {
      status: reasons.length ? 'FAIL' : 'PASS',
      reasons,
      metrics: {
        coverage: round2(coverage),
        fillRatio: round2(fillRatio),
        softFraction: round2(softFraction),
        components: keptCount,
        sidesTouched,
        removedFraction: round2(removedFraction),
      },
      bbox: { x: Math.max(0, minX), y: Math.max(0, minY), width: bw, height: bh },
    },
  };
}

/**
 * Remove background colour spill from semi-transparent edge pixels:
 * C = aF + (1-a)B  →  F = C + (C - B)(1-a)/a, bounded. Prevents halos on new backgrounds.
 */
function decontaminateEdges(rgb: Buffer, alpha: Uint8Array, width: number, height: number, bbox: MaskEvaluation['bbox']) {
  const padX = Math.round(bbox.width * 0.08) + 4;
  const padY = Math.round(bbox.height * 0.08) + 4;
  const x0 = Math.max(0, bbox.x - padX), x1 = Math.min(width, bbox.x + bbox.width + padX);
  const y0 = Math.max(0, bbox.y - padY), y1 = Math.min(height, bbox.y + bbox.height + padY);
  let n = 0, br = 0, bgc = 0, bb = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = y * width + x;
      if (alpha[p] < 10) { br += rgb[p * 3]; bgc += rgb[p * 3 + 1]; bb += rgb[p * 3 + 2]; n++; }
    }
  }
  if (n < 50) return;
  const B = [br / n, bgc / n, bb / n];
  for (let p = 0; p < width * height; p++) {
    const a = alpha[p];
    if (a <= 25 || a >= 245) continue;
    const af = a / 255;
    const k = (1 - af) / af;
    for (let c = 0; c < 3; c++) {
      const C = rgb[p * 3 + c];
      const delta = clamp((C - B[c]) * k, -60, 60);
      rgb[p * 3 + c] = clamp(Math.round(C + delta), 0, 255);
    }
  }
}

function computeGeometry(alpha: Uint8Array, width: number, bbox: MaskEvaluation['bbox']): SubjectGeometry {
  const aspectRatio = bbox.width / (bbox.height || 1);
  let orientation: SubjectGeometry['orientation'] = 'SQUARE';
  if (aspectRatio < 0.75) orientation = 'TALL';
  else if (aspectRatio > 1.3) orientation = 'WIDE';

  // Measured base: opaque width across the bottom 4% of the subject. Hanging/pointed items have none.
  const band = Math.max(2, Math.round(bbox.height * 0.04));
  let baseMin = Infinity, baseMax = -Infinity;
  for (let y = bbox.y + bbox.height - band; y < bbox.y + bbox.height; y++) {
    for (let x = bbox.x; x < bbox.x + bbox.width; x++) {
      if (alpha[y * width + x] >= 128) {
        if (x < baseMin) baseMin = x;
        if (x > baseMax) baseMax = x;
      }
    }
  }
  const baseWidthRatio = baseMax >= baseMin ? round2((baseMax - baseMin + 1) / (bbox.width || 1)) : 0;
  return {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height,
    aspectRatio: round2(aspectRatio),
    orientation,
    hasClearBase: baseWidthRatio >= 0.18,
    baseWidthRatio,
  };
}

/** Interleave RGB + alpha into one RGBA buffer (sharp's joinChannel runs after resize/extract). */
function toRgba(rgb: Buffer, alpha: Uint8Array, width: number, height: number): Buffer {
  const out = Buffer.allocUnsafe(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    out[p * 4] = rgb[p * 3];
    out[p * 4 + 1] = rgb[p * 3 + 1];
    out[p * 4 + 2] = rgb[p * 3 + 2];
    out[p * 4 + 3] = alpha[p];
  }
  return out;
}

/** Kept for API compatibility: segment + refine, returning the cropped RGBA subject. */
export async function extractAndAnalyzeSubject(buffer: Buffer): Promise<{ trimmedFg: Buffer; geometry: SubjectGeometry }> {
  const img = await decodeToRgb(buffer);
  const rawAlpha = await segmentAlpha(img);
  if (!rawAlpha) throw new Error('Segmentation unavailable');
  const { alpha, evaluation } = await refineMask(rawAlpha, img.width, img.height);
  const geometry = computeGeometry(alpha, img.width, evaluation.bbox);
  const trimmedFg = await sharp(toRgba(img.data, alpha, img.width, img.height), { raw: { width: img.width, height: img.height, channels: 4 } })
    .extract({ left: evaluation.bbox.x, top: evaluation.bbox.y, width: Math.max(1, evaluation.bbox.width), height: Math.max(1, evaluation.bbox.height) })
    .png()
    .toBuffer();
  return { trimmedFg, geometry };
}

export async function checkMaskQuality(trimmedFg: Buffer): Promise<{ status: 'PASS' | 'FAIL'; message: string }> {
  const meta = await sharp(trimmedFg).metadata();
  if (!meta.width || !meta.height) return { status: 'FAIL', message: 'Invalid mask' };
  const { data, info } = await sharp(trimmedFg).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let opaque = 0, soft = 0;
  for (let p = 0; p < info.width * info.height; p++) {
    if (data[p] >= 128) opaque++;
    if (data[p] > 20 && data[p] < 235) soft++;
  }
  const fill = opaque / (info.width * info.height);
  if (opaque === 0 || fill < 0.06) return { status: 'FAIL', message: 'Product outline too sparse. Triggering Fallback.' };
  if (soft / opaque > 0.45) return { status: 'FAIL', message: 'Product edges too uncertain. Triggering Fallback.' };
  return { status: 'PASS', message: 'Mask quality good.' };
}

// ==========================================
// 6. COMPOSITION & SHADOW
// ==========================================
export function computeAdaptiveComposition(
  arg1: SubjectGeometry | ImageAnalysisMetrics,
  arg2?: number | SubjectGeometry,
  arg3: number = CANVAS_SIZE
): AdaptiveComposition {
  let geometry: SubjectGeometry;
  let canvasSize = CANVAS_SIZE;

  if ('orientation' in arg1) {
    geometry = arg1 as SubjectGeometry;
    if (typeof arg2 === 'number') canvasSize = arg2;
  } else {
    geometry = arg2 as SubjectGeometry;
    if (typeof arg3 === 'number') canvasSize = arg3;
  }

  const maxW = geometry.orientation === 'TALL' ? canvasSize * 0.78 : canvasSize * 0.86;
  const maxH = geometry.orientation === 'WIDE' ? canvasSize * 0.76 : canvasSize * 0.86;

  let scale = Math.min(maxW / (geometry.width || 1), maxH / (geometry.height || 1));
  // Avoid visibly soft upscaling of small subjects.
  if (geometry.width < 300 && geometry.height < 300 && scale > 1.6) scale = 1.6;
  if (scale > 2.2) scale = 2.2;

  const scaledWidth = Math.max(1, Math.round(geometry.width * scale));
  const scaledHeight = Math.max(1, Math.round(geometry.height * scale));
  // Products with a base sit slightly low (optical centre); hanging items stay centred.
  const verticalBias = geometry.hasClearBase ? Math.round((canvasSize - scaledHeight) * 0.06) : 0;

  return {
    canvasWidth: canvasSize,
    canvasHeight: canvasSize,
    scaleFactor: scale,
    scaledWidth,
    scaledHeight,
    left: Math.round((canvasSize - scaledWidth) / 2),
    top: Math.round((canvasSize - scaledHeight) / 2) + verticalBias,
    marginHorizontalPercent: parseFloat((((canvasSize - scaledWidth) / (2 * canvasSize)) * 100).toFixed(1)),
    marginVerticalPercent: parseFloat((((canvasSize - scaledHeight) / (2 * canvasSize)) * 100).toFixed(1)),
  };
}

export async function generateAdaptiveShadow(
  compositionOrGeometry: AdaptiveComposition | SubjectGeometry,
  compositionArg?: AdaptiveComposition,
  isTransparent: boolean = false
): Promise<{ shadowBuffer: Buffer | null; shadowLeft: number; shadowTop: number; left?: number; top?: number }> {
  const none = { shadowBuffer: null, shadowLeft: 0, shadowTop: 0, left: 0, top: 0 };
  const geometry = 'hasClearBase' in compositionOrGeometry ? (compositionOrGeometry as SubjectGeometry) : null;
  if (isTransparent || (geometry && !geometry.hasClearBase)) return none;

  let comp: AdaptiveComposition;
  if ('scaledWidth' in compositionOrGeometry) comp = compositionOrGeometry as AdaptiveComposition;
  else if (compositionArg) comp = compositionArg;
  else return none;

  // Shadow footprint follows the measured base width, not the full silhouette.
  const baseRatio = geometry ? clamp(geometry.baseWidthRatio * 1.15, 0.3, 0.95) : 0.8;
  const shadowWidth = Math.round(comp.scaledWidth * baseRatio);
  const shadowHeight = Math.max(6, Math.round(Math.min(comp.scaledHeight * 0.06, shadowWidth * 0.12)));
  if (shadowWidth <= 0 || shadowHeight <= 0) return none;

  const pad = Math.max(4, Math.round(shadowHeight * 0.6));
  const w = shadowWidth + pad * 2;
  const h = shadowHeight + pad * 2;
  const raw = Buffer.alloc(w * h * 4);
  const cx = w / 2, cy = h / 2, rx = shadowWidth / 2, ry = shadowHeight / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const distSq = dx * dx + dy * dy;
      if (distSq < 1) raw[(y * w + x) * 4 + 3] = Math.round(52 * Math.pow(1 - Math.sqrt(distSq), 1.6));
    }
  }
  const shadowBuffer = await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
    .blur(Math.max(1.5, shadowHeight * 0.3))
    .png()
    .toBuffer();
  const left = comp.left + Math.round((comp.scaledWidth - w) / 2);
  const top = comp.top + comp.scaledHeight - Math.round(h / 2);
  return { shadowBuffer, shadowLeft: left, shadowTop: top, left, top };
}

// ==========================================
// 7. OUTPUT HELPERS & QUALITY GATES
// ==========================================

/** Extend edge colours into transparent pixels so sharpening cannot create dark/light halos. */
function bleedColorsIntoTransparent(rgba: Buffer, width: number, height: number, passes = 4) {
  const valid = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) valid[p] = rgba[p * 4 + 3] >= 16 ? 1 : 0;
  for (let pass = 0; pass < passes; pass++) {
    const newly: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (valid[p]) continue;
        let r = 0, g = 0, b = 0, c = 0;
        const nbs = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
        for (const q of nbs) {
          if (q >= 0 && valid[q]) { r += rgba[q * 4]; g += rgba[q * 4 + 1]; b += rgba[q * 4 + 2]; c++; }
        }
        if (c > 0) {
          rgba[p * 4] = r / c; rgba[p * 4 + 1] = g / c; rgba[p * 4 + 2] = b / c;
          newly.push(p);
        }
      }
    }
    if (newly.length === 0) break;
    for (const p of newly) valid[p] = 1;
  }
}

/**
 * Product fidelity gate: enhancement may improve exposure and clarity but must not visibly
 * change the product's colour identity or blow out its detail.
 */
function fidelityCheck(before: PixelStats, after: PixelStats): { ok: boolean; reason?: string } {
  if (Math.abs(after.meanLuminance - before.meanLuminance) > 45) return { ok: false, reason: 'exposure shift too large' };
  // Hue identity in opponent space (contrast stretching may scale chroma, but must not rotate hue).
  const opp = (m: [number, number, number]) => [m[0] - m[1], (m[0] + m[1]) / 2 - m[2]];
  const [ab, bb] = opp(before.meanRgb), [aa, ba] = opp(after.meanRgb);
  const chromaBefore = Math.hypot(ab, bb);
  if (chromaBefore > 6) {
    let dHue = Math.abs(Math.atan2(ba, aa) - Math.atan2(bb, ab)) * (180 / Math.PI);
    if (dHue > 180) dHue = 360 - dHue;
    if (dHue > 10) return { ok: false, reason: 'product hue shifted' };
  } else if (Math.hypot(aa, ba) > 10) {
    return { ok: false, reason: 'neutral product became tinted' };
  }
  if (before.meanSaturation > 0.05) {
    const ratio = after.meanSaturation / before.meanSaturation;
    if (ratio > 1.3 || ratio < 0.75) return { ok: false, reason: 'saturation change too large' };
  }
  if (after.clippedHighlights - before.clippedHighlights > 0.04) return { ok: false, reason: 'highlight detail lost' };
  return { ok: true };
}

/** Try full strength, then half, then none — the first result that preserves the product wins. */
function enhanceWithFidelity(img: RawRgb, params: AdaptiveFilterParams, mask: Uint8Array | null, notes: string[]) {
  const before = computeStats(img, mask);
  for (const strength of [1, 0.5]) {
    const data = applyToneAndColor(img, params, strength);
    const check = fidelityCheck(before, computeStats({ ...img, data }, mask));
    if (check.ok) return { data, strength };
    notes.push(`Enhancement strength ${strength} rejected: ${check.reason}`);
  }
  return { data: Buffer.from(img.data), strength: 0 };
}

/** Clarity amount from measured contrast: flat photos get more local contrast, punchy ones little. */
function clarityAmount(analysis: ImageAnalysisMetrics): number {
  return round2(clamp((62 - analysis.contrastStdDev) / 110, 0.08, 0.32));
}

/**
 * Local contrast ("clarity"): large-radius unsharp mask on luminance only, so texture and form
 * read better without shifting hue or saturation. Bounded per pixel to avoid halos/HDR look.
 */
async function enhanceClarity(rgb: Buffer, width: number, height: number, amount: number): Promise<Buffer> {
  if (amount <= 0) return rgb;
  const sigma = Math.max(4, Math.min(width, height) * 0.02);
  const blurred = await sharp(rgb, { raw: { width, height, channels: 3 } }).blur(sigma).raw().toBuffer();
  const out = Buffer.allocUnsafe(rgb.length);
  for (let i = 0; i < rgb.length; i += 3) {
    const Y = 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2];
    const Yb = 0.299 * blurred[i] + 0.587 * blurred[i + 1] + 0.114 * blurred[i + 2];
    const d = clamp((Y - Yb) * amount, -16, 16);
    out[i] = clamp(Math.round(rgb[i] + d), 0, 255);
    out[i + 1] = clamp(Math.round(rgb[i + 1] + d), 0, 255);
    out[i + 2] = clamp(Math.round(rgb[i + 2] + d), 0, 255);
  }
  return out;
}

async function sharpenRgb(
  rgb: Buffer,
  width: number,
  height: number,
  p: AdaptiveFilterParams,
  strength: number,
  upscale = 1
): Promise<Buffer> {
  if (strength <= 0) return rgb;
  // Upscaled low-resolution photos lose micro-contrast: widen and strengthen detail recovery.
  const up = clamp(upscale - 1, 0, 1.5);
  return sharp(rgb, { raw: { width, height, channels: 3 } })
    .sharpen({ sigma: p.sharpenSigma + up * 0.4, m1: p.sharpenM1 * strength, m2: (p.sharpenM2 + up * 0.6) * strength })
    .raw()
    .toBuffer();
}

async function validateFinalOutput(buffer: Buffer, width: number, height: number, channels: number): Promise<string | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (meta.width !== width || meta.height !== height) return 'unexpected output dimensions';
    if ((meta.channels || 0) < channels) return 'unexpected colour format';
    const stats = await sharp(buffer).stats();
    const spread = stats.channels.slice(0, 3).reduce((acc, c) => acc + c.stdev, 0);
    if (spread < 1.5) return 'output image is blank';
    return null;
  } catch {
    return 'output could not be decoded';
  }
}

// ==========================================
// 8. FALLBACK & ORIGINAL-BACKGROUND MODES
// ==========================================
async function enhanceWholePhoto(imageBuffer: Buffer, strengthCap: number, notes: string[]) {
  const img = await decodeToRgb(imageBuffer);
  const stats = computeStats(img);
  const metrics = statsToMetrics(img, stats);
  const params = computeAdaptiveFilters(metrics);
  const scaled: AdaptiveFilterParams = strengthCap < 1 ? { ...params, sharpenM2: params.sharpenM2 * strengthCap } : params;
  const { data, strength } = enhanceWithFidelity(img, scaled, null, notes);
  const effective = Math.min(strength, strengthCap);
  const toned = effective < strength ? applyToneAndColor(img, scaled, effective) : data;
  let rgb = toned;
  if (params.denoise && effective > 0) rgb = await denoiseRgb({ ...img, data: rgb });
  rgb = await enhanceClarity(rgb, img.width, img.height, clarityAmount(metrics) * effective);
  rgb = await sharpenRgb(rgb, img.width, img.height, scaled, effective);
  return { img, rgb, metrics, params: scaled, strength: effective };
}

export async function buildSafeFallbackResult(
  imageBuffer: Buffer,
  message: string,
  backgroundOption: string = 'WHITE',
  customColorHex?: string
): Promise<AdaptiveEnhancementResult> {
  const requested = resolveBackground(backgroundOption, customColorHex);
  // Background could not be replaced reliably: frame the whole photo on the chosen solid colour.
  const bg = requested.mode === 'SOLID' ? requested : resolveBackground('WHITE');
  const notes = [message];

  try {
    const { img, rgb, metrics, params, strength } = await enhanceWholePhoto(imageBuffer, 0.7, notes);
    const productLayer = await sharp(rgb, { raw: { width: img.width, height: img.height, channels: 3 } })
      .resize(CANVAS_SIZE - 80, CANVAS_SIZE - 80, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();
    const fallbackBuffer = await sharp({
      create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 3, background: { r: bg.r, g: bg.g, b: bg.b } },
    })
      .composite([{ input: productLayer, gravity: 'center' }])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    return {
      success: true,
      qualityGatePassed: false,
      fallbackTriggered: true,
      enhancedBuffer: fallbackBuffer,
      mimeType: 'image/jpeg',
      format: 'jpeg',
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundOption: bg.option,
      backgroundColorHex: `#${bg.hex}`,
      analysis: metrics,
      geometry: {
        x: 0, y: 0, width: img.width, height: img.height, aspectRatio: round2(img.width / (img.height || 1)),
        orientation: 'SQUARE', hasClearBase: false, baseWidthRatio: 0,
      },
      composition: {
        canvasWidth: CANVAS_SIZE, canvasHeight: CANVAS_SIZE, scaleFactor: 1, scaledWidth: CANVAS_SIZE,
        scaledHeight: CANVAS_SIZE, left: 0, top: 0, marginHorizontalPercent: 3.3, marginVerticalPercent: 3.3,
      },
      improvementsApplied: [
        '✓ Product photo framed safely in Smart Studio',
        ...(requested.mode !== 'ORIGINAL'
          ? ['✓ Background kept — it could not be cleanly separated from the product in this photo (try a plain surface for best results)']
          : []),
        ...describeAdjustments(params, strength),
      ],
      message,
      processingMode: 'FALLBACK',
      qualityReport: { fidelityStrength: strength, notes },
    };
  } catch {
    // Undecodable input: return a neutral placeholder flagged as unusable so callers never store it.
    const placeholder = await sharp({
      create: { width: 800, height: 800, channels: 3, background: { r: 230, g: 230, b: 230 } },
    }).jpeg({ quality: 80 }).toBuffer();
    return {
      success: true,
      qualityGatePassed: false,
      fallbackTriggered: true,
      enhancedBuffer: placeholder,
      mimeType: 'image/jpeg',
      format: 'jpeg',
      width: 800,
      height: 800,
      backgroundOption: bg.option,
      backgroundColorHex: `#${bg.hex}`,
      improvementsApplied: ['✓ Product photo framed safely in Smart Studio'],
      message,
      processingMode: 'FALLBACK',
      inputUnusable: true,
      qualityReport: { notes: [...notes, 'input image could not be decoded'] },
    };
  }
}

async function processKeepingBackground(imageBuffer: Buffer): Promise<AdaptiveEnhancementResult> {
  const notes: string[] = [];
  const { img, rgb, metrics, params, strength } = await enhanceWholePhoto(imageBuffer, 1, notes);
  const out = await sharp(rgb, { raw: { width: img.width, height: img.height, channels: 3 } })
    .jpeg({ quality: 93, mozjpeg: true })
    .toBuffer();
  const invalid = await validateFinalOutput(out, img.width, img.height, 3);
  if (invalid) return buildSafeFallbackResult(imageBuffer, `Output validation failed (${invalid}). Fallback used.`, 'WHITE');
  const adjustments = describeAdjustments(params, strength);
  return {
    success: true,
    qualityGatePassed: true,
    fallbackTriggered: false,
    enhancedBuffer: out,
    mimeType: 'image/jpeg',
    format: 'jpeg',
    width: img.width,
    height: img.height,
    backgroundOption: 'ORIGINAL',
    backgroundColorHex: 'ORIGINAL',
    analysis: metrics,
    improvementsApplied: adjustments.length ? ['✓ Natural background preserved', ...adjustments] : ['✓ Photo already well exposed — minimal adjustments'],
    message: 'Photo enhanced with the original background preserved.',
    processingMode: 'ORIGINAL_BACKGROUND',
    qualityReport: { fidelityStrength: strength, notes },
  };
}

// ==========================================
// 9. MAIN ORCHESTRATOR
// ==========================================
export async function processProductImage(
  imageBuffer: Buffer,
  backgroundOption: string = 'WHITE',
  customColorHex?: string
): Promise<AdaptiveEnhancementResult> {
  const validation = validateImageInput(imageBuffer);
  if (!validation.valid) {
    return buildSafeFallbackResult(imageBuffer, validation.reason || 'Invalid image input', backgroundOption, customColorHex);
  }

  const bg = resolveBackground(backgroundOption, customColorHex);
  if (bg.mode === 'ORIGINAL') {
    try {
      return await processKeepingBackground(imageBuffer);
    } catch {
      return buildSafeFallbackResult(imageBuffer, 'Enhancement error. Fallback used.', 'WHITE');
    }
  }

  const isTransparent = bg.mode === 'TRANSPARENT';
  const notes: string[] = [];

  try {
    // 1. Analyze
    const img = await decodeToRgb(imageBuffer);
    const sceneStats = computeStats(img);

    // 2. Segment + refine + gate
    // Model segmentation first; if its mask fails the gates, try the colour-model segmenter
    // (flat-lay products on busy backgrounds). Whichever mask passes is used.
    const modelAlpha = await segmentAlpha(img);
    let refined = modelAlpha ? await refineMask(modelAlpha, img.width, img.height) : null;
    if (!refined || refined.evaluation.status === 'FAIL') {
      const colourRefined = await refineMask(segmentByBorderColours(img), img.width, img.height);
      if (colourRefined.evaluation.status === 'PASS' || !refined) {
        if (refined) notes.push(`Model mask rejected (${refined.evaluation.reasons.join(', ')}); colour-model segmentation used.`);
        refined = colourRefined;
      }
    }
    const { alpha, evaluation } = refined;
    if (evaluation.status === 'FAIL') {
      const res = await buildSafeFallbackResult(
        imageBuffer,
        `Background separation not reliable (${evaluation.reasons.join(', ')}). Fallback used.`,
        backgroundOption,
        customColorHex
      );
      res.qualityReport = { ...res.qualityReport, maskChecks: evaluation.metrics, notes: res.qualityReport?.notes || [] };
      return res;
    }

    // 3. Foreground-aware adaptive enhancement (RGB only) with fidelity gate
    const fgStats = computeStats(img, alpha);
    const metrics = statsToMetrics(img, fgStats, sceneStats);
    const params = computeAdaptiveFilters(metrics);
    const toned = enhanceWithFidelity(img, params, alpha, notes);
    let rgb = toned.data;
    if (params.denoise && toned.strength > 0) rgb = await denoiseRgb({ ...img, data: rgb });
    decontaminateEdges(rgb, alpha, img.width, img.height, evaluation.bbox);

    // 4. Composition: crop subject, resize with premultiplied alpha, sharpen RGB, restore alpha
    const geometry = computeGeometry(alpha, img.width, evaluation.bbox);
    const composition = computeAdaptiveComposition(geometry);
    const { data: layer } = await sharp(toRgba(rgb, alpha, img.width, img.height), { raw: { width: img.width, height: img.height, channels: 4 } })
      .extract({ left: evaluation.bbox.x, top: evaluation.bbox.y, width: evaluation.bbox.width, height: evaluation.bbox.height })
      .resize(composition.scaledWidth, composition.scaledHeight, { fit: 'fill', kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sw = composition.scaledWidth, sh = composition.scaledHeight;
    bleedColorsIntoTransparent(layer, sw, sh);
    const layerRgb = Buffer.allocUnsafe(sw * sh * 3);
    const layerAlpha = Buffer.allocUnsafe(sw * sh);
    for (let p = 0; p < sw * sh; p++) {
      layerRgb[p * 3] = layer[p * 4];
      layerRgb[p * 3 + 1] = layer[p * 4 + 1];
      layerRgb[p * 3 + 2] = layer[p * 4 + 2];
      layerAlpha[p] = layer[p * 4 + 3];
    }
    const clarity = toned.strength > 0 ? clarityAmount(metrics) * toned.strength : 0;
    const clarified = await enhanceClarity(layerRgb, sw, sh, clarity);
    const sharpened = await sharpenRgb(clarified, sw, sh, params, Math.max(toned.strength, 0.5), composition.scaleFactor);
    const productLayer = await sharp(toRgba(sharpened, layerAlpha, sw, sh), { raw: { width: sw, height: sh, channels: 4 } })
      .png()
      .toBuffer();

    // 5. Background + shadow
    const shadow = await generateAdaptiveShadow(geometry, composition, isTransparent);
    const composites: OverlayOptions[] = [];
    if (shadow.shadowBuffer) composites.push({ input: shadow.shadowBuffer, left: shadow.shadowLeft, top: shadow.shadowTop });
    composites.push({ input: productLayer, left: composition.left, top: composition.top });

    const canvas = sharp({
      create: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        channels: 4,
        background: isTransparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: bg.r, g: bg.g, b: bg.b, alpha: 1 },
      },
    }).composite(composites);
    const finalBuffer = isTransparent
      ? await canvas.png().toBuffer()
      : await canvas.flatten({ background: { r: bg.r, g: bg.g, b: bg.b } }).jpeg({ quality: 93, mozjpeg: true }).toBuffer();

    // 6. Output quality gate
    const invalid = await validateFinalOutput(finalBuffer, CANVAS_SIZE, CANVAS_SIZE, isTransparent ? 4 : 3);
    if (invalid) {
      return buildSafeFallbackResult(imageBuffer, `Output validation failed (${invalid}). Fallback used.`, backgroundOption, customColorHex);
    }

    const improvements = [
      isTransparent ? '✓ Product isolated on a clean transparent cutout' : '✓ Background replaced with clean studio colour',
      '✓ Edges cleaned (stray fragments removed, colour spill corrected)',
      ...describeAdjustments(params, toned.strength),
    ];
    if (clarity >= 0.1) improvements.push('✓ Texture clarity enhanced (local contrast)');
    if (composition.scaleFactor > 1.25) improvements.push('✓ Low-resolution detail recovery applied');
    if (shadow.shadowBuffer) improvements.push('✓ Natural contact shadow added');
    if (toned.strength === 0) improvements.push('✓ Original colours kept — product already well captured');
    if (Number(evaluation.metrics.sidesTouched) >= 1) {
      improvements.push('Tip: the product touches the photo edge — keep the whole product inside the frame for a complete catalogue image');
    }

    return {
      success: true,
      qualityGatePassed: true,
      fallbackTriggered: false,
      enhancedBuffer: finalBuffer,
      mimeType: isTransparent ? 'image/png' : 'image/jpeg',
      format: isTransparent ? 'png' : 'jpeg',
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundOption: bg.option,
      backgroundColorHex: isTransparent ? 'TRANSPARENT' : `#${bg.hex}`,
      analysis: metrics,
      geometry,
      composition,
      improvementsApplied: improvements,
      message: isTransparent ? 'Product isolated on transparent background.' : 'Product isolated and enhanced for marketplace.',
      processingMode: 'STUDIO',
      qualityReport: { maskChecks: evaluation.metrics, fidelityStrength: toned.strength, notes },
    };
  } catch (error: any) {
    return buildSafeFallbackResult(imageBuffer, 'Enhancement error. Fallback used.', backgroundOption, customColorHex);
  }
}

// Direct alias for backward compatibility across services
export const runAdaptiveEnhancerPipeline = processProductImage;
