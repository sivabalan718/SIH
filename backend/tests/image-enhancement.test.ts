import request from 'supertest';
import { app } from '../src/app.js';
import sharp from 'sharp';

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
  } catch (e) {}
}

import {
  analyzeImageMetrics,
  computeAdaptiveComposition,
  generateAdaptiveShadow,
  computeAdaptiveFilters,
  runAdaptiveEnhancerPipeline,
  SubjectGeometry,
  ImageAnalysisMetrics,
} from '../src/services/image/adaptive-image-enhancer.service.js';

describe('M63 Adaptive Free AI Image Enhancer Test Suite', () => {
  // Helper to generate synthetic test artisan product images with distinct geometries
  async function createTestImage(
    type: 'TALL_VASE' | 'WIDE_BASKET' | 'SQUARE_PLATE' | 'HANGING_EARRING' | 'DARK_CRAFT' | 'BRIGHT_CRAFT'
  ): Promise<Buffer> {
    let svgContent = '';
    const size = 600;

    switch (type) {
      case 'TALL_VASE':
        // Tall aspect ratio with clear flat sitting base
        svgContent = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#7fa8d8"/>
            <path d="M 240 520 L 220 300 L 260 160 L 340 160 L 380 300 L 360 520 Z" fill="#b45309" stroke="#78350f" stroke-width="4"/>
            <ellipse cx="300" cy="160" rx="40" ry="12" fill="#d97706"/>
          </svg>
        `;
        break;

      case 'WIDE_BASKET':
        // Wide aspect ratio with broad sitting base
        svgContent = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#94a3b8"/>
            <path d="M 100 360 L 140 480 L 460 480 L 500 360 Z" fill="#ca8a04" stroke="#854d0e" stroke-width="6"/>
            <ellipse cx="300" cy="360" rx="200" ry="35" fill="#eab308" stroke="#854d0e" stroke-width="4"/>
          </svg>
        `;
        break;

      case 'HANGING_EARRING':
        // Suspended craft without a ground base
        svgContent = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#cbd5e1"/>
            <circle cx="300" cy="150" r="12" fill="#d97706"/>
            <line x1="300" y1="162" x2="300" y2="260" stroke="#b45309" stroke-width="4"/>
            <polygon points="300,260 250,380 350,380" fill="#f59e0b" stroke="#78350f" stroke-width="4"/>
            <circle cx="300" cy="400" r="6" fill="#d97706"/>
          </svg>
        `;
        break;

      case 'DARK_CRAFT':
        // Underexposed handcrafted item (low luminance)
        svgContent = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1e293b"/>
            <circle cx="300" cy="300" rx="140" ry="140" fill="#292524" stroke="#0c0a09" stroke-width="6"/>
          </svg>
        `;
        break;

      case 'BRIGHT_CRAFT':
        // High-key well-exposed craft item
        svgContent = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f1f5f9"/>
            <circle cx="300" cy="300" rx="140" ry="140" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="4"/>
          </svg>
        `;
        break;

      case 'SQUARE_PLATE':
      default:
        svgContent = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#93c5fd"/>
            <circle cx="300" cy="300" r="160" fill="#ea580c" stroke="#9a3412" stroke-width="6"/>
            <circle cx="300" cy="300" r="100" fill="#f97316"/>
          </svg>
        `;
        break;
    }

    return await sharp(Buffer.from(svgContent)).jpeg({ quality: 90 }).toBuffer();
  }

  describe('1. Image Metrics & Exposure Analysis', () => {
    test('should analyze luminance, contrast, and saturation accurately for dark vs bright images', async () => {
      const darkBuffer = await createTestImage('DARK_CRAFT');
      const brightBuffer = await createTestImage('BRIGHT_CRAFT');

      const darkMetrics = await analyzeImageMetrics(darkBuffer);
      const brightMetrics = await analyzeImageMetrics(brightBuffer);

      expect(darkMetrics.meanLuminance).toBeLessThan(brightMetrics.meanLuminance);
      expect(darkMetrics.meanLuminance).toBeLessThan(95); // detected as underexposed
      expect(brightMetrics.meanLuminance).toBeGreaterThan(160); // detected as high-key
    });

    test('should adapt filter parameters based on exposure deficit', () => {
      const underexposedAnalysis: ImageAnalysisMetrics = {
        width: 800,
        height: 800,
        aspectRatio: 1.0,
        meanLuminance: 65, // dark
        contrastStdDev: 30, // flat
        meanSaturation: 0.18, // dull
        edgeEnergy: 10, // soft
      };

      const wellExposedAnalysis: ImageAnalysisMetrics = {
        width: 800,
        height: 800,
        aspectRatio: 1.0,
        meanLuminance: 190, // bright
        contrastStdDev: 70, // already high contrast
        meanSaturation: 0.60, // already vivid
        edgeEnergy: 35, // crisp
      };

      const darkFilters = computeAdaptiveFilters(underexposedAnalysis);
      const brightFilters = computeAdaptiveFilters(wellExposedAnalysis);

      // Underexposed gets a noticeable brightness lift
      expect(darkFilters.brightness).toBeGreaterThan(1.04);
      // Well-exposed protects highlights without lifting brightness
      expect(brightFilters.brightness).toBeLessThanOrEqual(1.0);

      // Flat gets contrast improvement
      expect(darkFilters.contrastSlope).toBeGreaterThan(brightFilters.contrastSlope);

      // Soft gets higher sharpening than already crisp
      expect(darkFilters.sharpenM2).toBeGreaterThan(brightFilters.sharpenM2);
    });
  });

  describe('2. Adaptive Composition & Geometry Awareness', () => {
    test('should prioritize vertical fit and bottom margin for tall products', () => {
      const tallGeometry: SubjectGeometry = {
        x: 0,
        y: 0,
        width: 300,
        height: 800,
        aspectRatio: 0.375,
        orientation: 'TALL',
        hasClearBase: true,
        baseWidthRatio: 0.6,
      };

      const analysis: ImageAnalysisMetrics = {
        width: 800,
        height: 800,
        aspectRatio: 1.0,
        meanLuminance: 128,
        contrastStdDev: 40,
        meanSaturation: 0.35,
        edgeEnergy: 20,
      };

      const comp = computeAdaptiveComposition(analysis, tallGeometry, 1200);

      // Verify product fits safely inside 1200px canvas with comfortable margins
      expect(comp.scaledHeight).toBeLessThanOrEqual(1040);
      expect(comp.scaledWidth).toBeLessThanOrEqual(comp.canvasWidth);
      expect(comp.marginVerticalPercent).toBeGreaterThanOrEqual(6.0);
      expect(comp.left).toBeGreaterThan(0);
      expect(comp.top).toBeGreaterThan(0);
    });

    test('should prioritize horizontal fit for wide products', () => {
      const wideGeometry: SubjectGeometry = {
        x: 0,
        y: 0,
        width: 900,
        height: 350,
        aspectRatio: 2.57,
        orientation: 'WIDE',
        hasClearBase: true,
        baseWidthRatio: 0.7,
      };

      const analysis: ImageAnalysisMetrics = {
        width: 800,
        height: 800,
        aspectRatio: 1.0,
        meanLuminance: 128,
        contrastStdDev: 40,
        meanSaturation: 0.35,
        edgeEnergy: 20,
      };

      const comp = computeAdaptiveComposition(analysis, wideGeometry, 1200);

      expect(comp.scaledWidth).toBeLessThanOrEqual(1040);
      expect(comp.marginHorizontalPercent).toBeGreaterThanOrEqual(6.0);
    });

    test('should cap scaling for small products to avoid pixelation', () => {
      const tinyGeometry: SubjectGeometry = {
        x: 0,
        y: 0,
        width: 150,
        height: 150,
        aspectRatio: 1.0,
        orientation: 'SQUARE',
        hasClearBase: false,
        baseWidthRatio: 0.2,
      };

      const analysis: ImageAnalysisMetrics = {
        width: 800,
        height: 800,
        aspectRatio: 1.0,
        meanLuminance: 128,
        contrastStdDev: 40,
        meanSaturation: 0.35,
        edgeEnergy: 20,
      };

      const comp = computeAdaptiveComposition(analysis, tinyGeometry, 1200);

      // Capped at max 1.6x scale factor
      expect(comp.scaleFactor).toBeLessThanOrEqual(1.61);
      expect(comp.scaledWidth).toBeLessThanOrEqual(250);
    });
  });

  describe('3. Adaptive Shadow Generation', () => {
    test('should generate contact shadow for product with sitting base', async () => {
      const sittingGeometry: SubjectGeometry = {
        x: 0,
        y: 0,
        width: 400,
        height: 600,
        aspectRatio: 0.66,
        orientation: 'TALL',
        hasClearBase: true,
        baseWidthRatio: 0.65,
      };

      const comp = {
        canvasWidth: 1200,
        canvasHeight: 1200,
        scaleFactor: 1.5,
        scaledWidth: 600,
        scaledHeight: 900,
        left: 300,
        top: 200,
        marginHorizontalPercent: 25,
        marginVerticalPercent: 8,
      };

      const { shadowBuffer, shadowLeft, shadowTop } = await generateAdaptiveShadow(sittingGeometry, comp, false);

      expect(shadowBuffer).not.toBeNull();
      expect(shadowLeft).toBeGreaterThan(0);
      expect(shadowTop).toBeGreaterThan(comp.top);
    });

    test('should suppress ground shadow for hanging items or transparent cutouts', async () => {
      const hangingGeometry: SubjectGeometry = {
        x: 0,
        y: 0,
        width: 200,
        height: 500,
        aspectRatio: 0.4,
        orientation: 'TALL',
        hasClearBase: false, // suspended earring / mobile
        baseWidthRatio: 0.1,
      };

      const comp = {
        canvasWidth: 1200,
        canvasHeight: 1200,
        scaleFactor: 1.5,
        scaledWidth: 300,
        scaledHeight: 750,
        left: 450,
        top: 225,
        marginHorizontalPercent: 37.5,
        marginVerticalPercent: 18.7,
      };

      // Hanging item on solid background: no ground shadow
      const resHanging = await generateAdaptiveShadow(hangingGeometry, comp, false);
      expect(resHanging.shadowBuffer).toBeNull();

      // Sitting item in transparent mode: no ground shadow
      const sittingGeometry: SubjectGeometry = { ...hangingGeometry, hasClearBase: true };
      const resTransparent = await generateAdaptiveShadow(sittingGeometry, comp, true);
      expect(resTransparent.shadowBuffer).toBeNull();
    });
  });

  describe('4. End-to-End Adaptive Enhancer Pipeline', () => {
    test('should successfully enhance tall vase on Warm Beige background', async () => {
      const vaseBuffer = await createTestImage('TALL_VASE');
      const res = await runAdaptiveEnhancerPipeline(vaseBuffer, 'BEIGE');

      expect(res.success).toBe(true);
      expect(res.format).toBe('jpeg');
      expect(res.width).toBe(1200);
      expect(res.height).toBe(1200);
      expect(res.backgroundColorHex).toBe('#F5F0EB');
      expect(res.improvementsApplied.length).toBeGreaterThan(0);
      expect(res.enhancedBuffer.length).toBeGreaterThan(1000);
    }, 45000);

    test('should output transparent 4-channel PNG when TRANSPARENT is chosen', async () => {
      const plateBuffer = await createTestImage('SQUARE_PLATE');
      const res = await runAdaptiveEnhancerPipeline(plateBuffer, 'TRANSPARENT');

      expect(res.success).toBe(true);
      expect(res.format).toBe('png');
      expect(res.mimeType).toBe('image/png');

      const meta = await sharp(res.enhancedBuffer).metadata();
      expect(meta.hasAlpha).toBe(true);
      expect(meta.channels).toBe(4);
    }, 45000);
  });

  describe('5. Product Image Variant & Ownership Endpoints', () => {
    test('should reject unauthenticated POST /api/v1/products/:id/enhance-image', async () => {
      const res = await request(app)
        .post('/api/v1/products/550e8400-e29b-41d4-a716-446655440000/enhance-image')
        .send({ backgroundOption: 'WHITE' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should reject unauthenticated POST /api/v1/products/:id/select-image-variant', async () => {
      const res = await request(app)
        .post('/api/v1/products/550e8400-e29b-41d4-a716-446655440000/select-image-variant')
        .send({ variant: 'enhanced' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
