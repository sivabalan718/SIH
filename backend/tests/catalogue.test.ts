import { jest } from '@jest/globals';
import { generateCatalogueContent } from '../src/services/ai/catalogue-generation.service.js';
import { saveCatalogueContent, getCatalogueContent } from '../src/services/catalogue.service.js';

jest.setTimeout(30000);

describe('M63 Phase 5 - AI Smart Catalogue Generation Unit Tests', () => {
  const sampleInput = {
    name: 'Handwoven Cotton Saree',
    description: 'Beautiful handwoven cotton saree made by local artisans.',
    category: 'Saree',
    material: 'Cotton',
    craft_type: 'Handloom',
    color: 'Blue',
    features: ['Handwoven', 'Lightweight', 'Breathable'],
    price: 3499,
    production_time: '4 days',
  };

  test('should generate factual English catalogue without hallucinations', async () => {
    const res = await generateCatalogueContent(sampleInput, 'en', 'PROFESSIONAL');

    expect(res).toBeDefined();
    expect(res.title).toBeTruthy();
    expect(res.shortDescription).toBeTruthy();
    expect(res.description).toBeTruthy();
    expect(Array.isArray(res.highlights)).toBe(true);
    expect(res.highlights.length).toBeGreaterThan(0);
    expect(res.specifications).toBeDefined();

    // Zero Hallucination check
    expect(res.description.toLowerCase()).not.toContain('organic');
    expect(res.description.toLowerCase()).not.toContain('silk');
  });

  test('should generate natural Tamil catalogue maintaining exact product meaning', async () => {
    const res = await generateCatalogueContent(sampleInput, 'ta', 'TRADITIONAL');

    expect(res).toBeDefined();
    expect(res.title).toBeTruthy();
    expect(res.shortDescription).toBeTruthy();
    expect(res.description).toBeTruthy();
  });

  test('should generate natural Hindi catalogue maintaining exact product meaning', async () => {
    const res = await generateCatalogueContent(sampleInput, 'hi', 'SIMPLE');

    expect(res).toBeDefined();
    expect(res.title).toBeTruthy();
    expect(res.shortDescription).toBeTruthy();
    expect(res.description).toBeTruthy();
  });

  test('should handle incomplete product input gracefully without fabricating facts', async () => {
    const incompleteInput = {
      name: 'Blue Saree',
    };

    const res = await generateCatalogueContent(incompleteInput, 'en', 'PROFESSIONAL');

    expect(res).toBeDefined();
    expect(res.title).toBeTruthy();
    expect(res.description.toLowerCase()).not.toContain('silk');
    expect(res.description.toLowerCase()).not.toContain('handloom');
    expect(res.description.toLowerCase()).not.toContain('organic');
  });

  test('should produce strongly contrasted outputs for PROFESSIONAL, SIMPLE, and TRADITIONAL styles', async () => {
    const prof = await generateCatalogueContent(sampleInput, 'en', 'PROFESSIONAL');
    const simple = await generateCatalogueContent(sampleInput, 'en', 'SIMPLE');
    const trad = await generateCatalogueContent(sampleInput, 'en', 'TRADITIONAL');

    expect(prof.description).not.toEqual(simple.description);
    expect(prof.description).not.toEqual(trad.description);
    expect(simple.description).not.toEqual(trad.description);
  });

  test('should enforce strict account isolation for catalogue data', async () => {
    const productId = `prod-isolation-${Date.now()}`;
    const artisanA = 'artisan-account-A';
    const artisanB = 'artisan-account-B';

    const catData = {
      title: 'Blue Saree',
      shortDescription: 'Short summary for A',
      description: 'Account A description',
      highlights: ['A item'],
      specifications: { Material: 'Cotton' },
      careInstructions: 'Care info',
      tags: ['saree'],
    };

    await saveCatalogueContent(productId, artisanA, 'en', catData, 'PROFESSIONAL', 'artisan');

    const fetchedForA = await getCatalogueContent(productId, 'en', artisanA);
    const fetchedForB = await getCatalogueContent(productId, 'en', artisanB);

    expect(fetchedForA).toBeDefined();
    expect(fetchedForA?.title).toBe('Blue Saree');
    expect(fetchedForB).toBeNull();
  });
});
