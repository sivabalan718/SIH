import { assistantResponseService } from '../src/services/assistant/assistant-response.service.js';
import { assistantToolsService } from '../src/services/assistant/assistant-tools.service.js';

describe('M63 Assistant Unit & Domain Tests', () => {
  jest.setTimeout(20000);

  describe('Intent Classification & Language Detection', () => {
    test('Classifies English sales query correctly', () => {
      const result = assistantResponseService.classifyIntent('How much did I earn this month?');
      expect(result.intent).toBe('SALES_SUMMARY');
      expect(result.language).toBe('en');
    });

    test('Classifies Tamil best-seller query correctly', () => {
      const result = assistantResponseService.classifyIntent('இந்த மாதம் என்னுடைய எந்த பொருள் அதிகமாக விற்றிருக்கிறது?');
      expect(result.intent).toBe('TOP_PRODUCTS');
      expect(result.language).toBe('ta');
    });

    test('Classifies Hindi low stock query correctly', () => {
      const result = assistantResponseService.classifyIntent('मेरे कम स्टॉक वाले उत्पाद कौन से हैं?');
      expect(result.intent).toBe('LOW_STOCK');
      expect(result.language).toBe('hi');
    });

    test('Classifies order query correctly', () => {
      const result = assistantResponseService.classifyIntent('Show me my recent orders');
      expect(result.intent).toBe('RECENT_ORDERS');
    });
  });

  describe('Scoped Artisan Business Tools', () => {
    test('Executes sales summary tool for artisan', async () => {
      const toolResult = await assistantToolsService.executeTool('artisan-test-id-123', 'SALES_SUMMARY', '30d');
      expect(toolResult.intent).toBe('SALES_SUMMARY');
      expect(toolResult.data).toHaveProperty('total_revenue');
      expect(toolResult.data).toHaveProperty('total_orders');
      expect(toolResult.evidence.length).toBeGreaterThan(0);
    });

    test('Executes low stock tool for artisan', async () => {
      const toolResult = await assistantToolsService.executeTool('artisan-test-id-123', 'LOW_STOCK', '30d');
      expect(toolResult.intent).toBe('LOW_STOCK');
      expect(toolResult.data).toHaveProperty('low_stock_products');
      expect(Array.isArray(toolResult.data.low_stock_products)).toBe(true);
    });
  });

  describe('Deterministic Multilingual Response Engine', () => {
    test('Generates grounded Tamil response', async () => {
      const businessData = await assistantToolsService.executeTool('artisan-test-id-123', 'SALES_SUMMARY', '30d');
      const response = await assistantResponseService.generateResponse(
        'இந்த மாதம் எனது விற்பனை எவ்வாறு உள்ளது?',
        businessData,
        'ta'
      );

      expect(response.language).toBe('ta');
      expect(response.textResponse).toBeDefined();
      expect(response.textResponse.length).toBeGreaterThan(5);
      expect(response.suggestedQuestions.length).toBeGreaterThan(0);
    });

    test('Generates grounded Hindi response', async () => {
      const businessData = await assistantToolsService.executeTool('artisan-test-id-123', 'LOW_STOCK', '30d');
      const response = await assistantResponseService.generateResponse(
        'मेरे कम स्टॉक वाले उत्पाद कौन से हैं?',
        businessData,
        'hi'
      );

      expect(response.language).toBe('hi');
      expect(response.textResponse).toBeDefined();
      expect(response.textResponse.length).toBeGreaterThan(5);
    });
  });
});
