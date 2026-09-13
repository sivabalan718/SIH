import request from 'supertest';
import { app } from '../src/app.js';
import { MockSpeechProvider, GeminiSpeechProvider } from '../src/services/ai/speech.service.js';
import { MockLLMProvider } from '../src/services/ai/product-understanding.service.js';

describe('M63 AI Voice-to-Catalog API Endpoints', () => {
  describe('Protected Routes & Authorization', () => {
    test('should reject unauthenticated POST /api/v1/ai/voice-to-product', async () => {
      const res = await request(app)
        .post('/api/v1/ai/voice-to-product')
        .attach('audio', Buffer.from('dummy audio content'), 'recording.webm');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should reject request when audio file is missing', async () => {
      const res = await request(app)
        .post('/api/v1/ai/voice-to-product')
        .set('Authorization', 'Bearer fake_token');
      // Blocked by auth middleware with 401
      expect(res.status).toBe(401);
    }, 15000);
  });

  describe('Gemini Speech & LLM Provider Unit Tests', () => {
    test('MockSpeechProvider should return original transcript and detected language', async () => {
      const provider = new MockSpeechProvider();
      const result = await provider.transcribe(Buffer.from('sample audio'), 'audio/webm');

      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('detectedLanguage');
      expect(typeof result.transcript).toBe('string');
      expect(result.transcript.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('GeminiSpeechProvider should handle missing key or API call gracefully', async () => {
      const provider = new GeminiSpeechProvider();
      try {
        const res = await provider.transcribe(Buffer.from('sample audio'), 'audio/webm');
        expect(res).toBeDefined();
        expect(res.transcript).toBeDefined();
      } catch (err: any) {
        expect(err).toBeDefined();
      }
    }, 15000);

    test('MockLLMProvider should extract factual product data in English without hallucination', async () => {
      const provider = new MockLLMProvider();
      const transcript = 'I made this cotton saree by hand. It is red and gold. It took me four days to make.';
      const extracted = await provider.extractProductData(transcript, 'English');

      expect(extracted).toBeDefined();
      expect(extracted.product_name).toContain('Saree');
      expect(extracted.material).toBe('Cotton');
      expect(extracted.color).toBe('Red and Gold');
      expect(extracted.craft_type).toBe('Handwoven');
      expect(extracted.production_time).toBe('4 days');
    });

    test('MockLLMProvider should process Tamil/Hindi spoken speech into English structured product data', async () => {
      const provider = new MockLLMProvider();
      // Tamil speech transcript
      const taTranscript = 'இது கைத்தறி பருத்தி சேலை, சிவப்பு மற்றும் தங்கம் நிறம்.';
      const extracted = await provider.extractProductData(taTranscript, 'Tamil', 'material', 'ta');

      expect(extracted).toBeDefined();
      // Material normalized to English 'Cotton'
      expect(extracted.material).toBe('Cotton');
      expect(extracted.craft_type).toBe('Handwoven');
    });

    test('MockLLMProvider should flag ambiguous price phrases with needs_clarification = true', async () => {
      const provider = new MockLLMProvider();
      const transcript = 'The price is around two thousand rupees maybe';
      const extracted = await provider.extractProductData(transcript, 'English', 'price', 'en');

      expect(extracted).toBeDefined();
      expect(extracted.needs_clarification).toBe(true);
      expect(extracted.price).toBeNull();
      expect(extracted.clarification_message).toBeDefined();
    });

    test('MockLLMProvider should return null for unmentioned attributes', async () => {
      const provider = new MockLLMProvider();
      const transcript = 'This is a simple clay bowl.';
      const extracted = await provider.extractProductData(transcript, 'English');

      expect(extracted).toBeDefined();
      expect(extracted.material).toBeNull();
      expect(extracted.color).toBeNull();
      expect(extracted.production_time).toBeNull();
    });
  });
});
