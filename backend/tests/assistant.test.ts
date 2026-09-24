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

    test('Classifies General Conversation queries correctly', () => {
      expect(assistantResponseService.classifyIntent('Tell me a joke').intent).toBe('GENERAL_CONVERSATION');
      expect(assistantResponseService.classifyIntent('ஒரு ஜோக் சொல்லு').intent).toBe('GENERAL_CONVERSATION');
      expect(assistantResponseService.classifyIntent('एक मज़ेदार चुटकुला सुनाओ').intent).toBe('GENERAL_CONVERSATION');
      expect(assistantResponseService.classifyIntent('Explain AI simply').intent).toBe('GENERAL_CONVERSATION');
    });

    test('Classifies Web Research queries correctly', () => {
      expect(assistantResponseService.classifyIntent('Find terracotta products online').intent).toBe('WEB_RESEARCH');
      expect(assistantResponseService.classifyIntent('ஆன்லைனில் கைவினைப் பொருட்கள் தேடு').intent).toBe('WEB_RESEARCH');
      expect(assistantResponseService.classifyIntent('ऑनलाइन हस्तनिर्मित उत्पाद खोजो').intent).toBe('WEB_RESEARCH');
    });

    test('Classifies Mixed Comparison queries correctly', () => {
      expect(assistantResponseService.classifyIntent('Compare my terracotta pot price with similar products online').intent).toBe('MIXED_COMPARISON');
      expect(assistantResponseService.classifyIntent('எனது பொருளின் விலையை ஆன்லைனுடன் ஒப்பிடு').intent).toBe('MIXED_COMPARISON');
      expect(assistantResponseService.classifyIntent('मेरी कीमत की तुलना ऑनलाइन से करो').intent).toBe('MIXED_COMPARISON');
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

    test('Executes mixed comparison tool for artisan', async () => {
      const toolResult = await assistantToolsService.executeTool('artisan-test-id-123', 'MIXED_COMPARISON', '30d', 'terracotta pot');
      expect(toolResult.intent).toBe('MIXED_COMPARISON');
      expect(toolResult.data).toHaveProperty('m63_product');
    });
  });

  describe('Multilingual Response Engine & Safety Rules', () => {
    test('Generates grounded Tamil business response', async () => {
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

    test('Generates grounded Hindi business response', async () => {
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

    test('Generates General Conversation response in detected language', async () => {
      const businessData = await assistantToolsService.executeTool('artisan-test-id-123', 'GENERAL_CONVERSATION', '30d');

      const responseEn = await assistantResponseService.generateResponse('Tell me a joke', businessData, 'en');
      expect(responseEn.language).toBe('en');
      expect(responseEn.textResponse).toBeDefined();

      const responseTa = await assistantResponseService.generateResponse('ஒரு ஜோக் சொல்லு', businessData, 'ta');
      expect(responseTa.language).toBe('ta');
      expect(responseTa.textResponse).toBeDefined();
    });

    test('Enforces strict web failure rule when API or Search is unavailable', async () => {
      const businessData = await assistantToolsService.executeTool('artisan-test-id-123', 'WEB_RESEARCH', '30d');
      const response = await assistantResponseService.generateResponse('Find terracotta products online', businessData, 'en');

      expect(response.textResponse).toBeDefined();
      expect(Array.isArray(response.sources)).toBe(true);
    });
  });
});
