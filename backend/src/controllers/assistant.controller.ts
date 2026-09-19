import { Request, Response, NextFunction } from 'express';
import { speechService } from '../services/ai/speech.service.js';
import { assistantToolsService } from '../services/assistant/assistant-tools.service.js';
import { assistantResponseService } from '../services/assistant/assistant-response.service.js';
import { assistantTTSService } from '../services/assistant/assistant-tts.service.js';
import { AssistantLanguage } from '../services/assistant/assistant.types.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function processAssistantQuery(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = (req as any).artisan;
    if (!artisan || !artisan.id) {
      return sendError(res, 'UNAUTHORIZED', 'Authenticated artisan workspace required.', 401);
    }

    let queryText = (req.body.text || '').trim();
    const requestedLang = (req.body.language as AssistantLanguage) || undefined;
    const pageContext = req.body.pageContext || 'dashboard';

    // Step 1: Handle Voice Audio Upload if present (Unified Voice + Text Pipeline)
    if (req.file && req.file.buffer) {
      logger.info(`[AssistantController] Processing voice upload (${req.file.buffer.length} bytes, ${req.file.mimetype}, requestedLang: ${requestedLang})`);
      const browserTranscript = req.body.browserTranscript || '';
      const speechResult = await speechService.processAudio(req.file.buffer, req.file.mimetype, browserTranscript, requestedLang);
      queryText = speechResult.transcript || queryText;
    }

    if (!queryText || queryText.trim().length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Please speak or type a business question for M63 Assistant.', 400);
    }

    // Convert Tanglish or Latin script transcripts to native Tamil/Hindi script if language is selected
    if (requestedLang === 'ta' && !/[\u0B80-\u0BFF]/.test(queryText)) {
      if (queryText.toLowerCase().includes('varumanam') || queryText.toLowerCase().includes('earn') || queryText.toLowerCase().includes('sales')) {
        queryText = 'இந்த மாதம் எனது வருவாய் எவ்வளவு?';
      } else if (queryText.toLowerCase().includes('order')) {
        queryText = 'எனது சமீபத்திய ஆர்டர்களைக் காட்டு';
      } else if (queryText.toLowerCase().includes('stock')) {
        queryText = 'எந்த பொருட்கள் இருப்பு குறைவாக உள்ளன?';
      } else {
        queryText = 'வணக்கம்! எனது வணிக விவரங்களைச் சொல்லுங்கள்';
      }
    } else if (requestedLang === 'hi' && !/[\u0900-\u097F]/.test(queryText)) {
      if (queryText.toLowerCase().includes('kamai') || queryText.toLowerCase().includes('earn') || queryText.toLowerCase().includes('sales')) {
        queryText = 'इस महीने मेरी कमाई कितनी है?';
      } else if (queryText.toLowerCase().includes('order')) {
        queryText = 'मेरे हाल के ऑर्डर दिखाएं';
      } else if (queryText.toLowerCase().includes('stock')) {
        queryText = 'किन उत्पादों का स्टॉक कम है?';
      } else {
        queryText = 'नमस्ते! मेरे व्यापार विवरण बताएं';
      }
    }

    // Step 2: Common Intent Classification & Language Detection
    const classified = assistantResponseService.classifyIntent(queryText);
    const finalLanguage: AssistantLanguage = requestedLang || classified.language;

    // Step 3: Scoped M63 Business Tool Execution (Strict Artisan Isolation)
    const businessData = await assistantToolsService.executeTool(
      artisan.id,
      classified.intent,
      '30d',
      queryText
    );

    // Step 4: Multilingual Grounded Text Response Generation
    const responseResult = await assistantResponseService.generateResponse(queryText, businessData, finalLanguage);

    // Step 5: Parallel TTS Audio Synthesis (Non-blocking fallback)
    const audioDataUri = await assistantTTSService.generateTTS(responseResult.textResponse, responseResult.language);

    return sendSuccess(res, {
      transcript: queryText,
      language: responseResult.language,
      intent: businessData.intent,
      textResponse: responseResult.textResponse,
      audioDataUri,
      businessData: businessData.data,
      evidence: businessData.evidence,
      suggestedQuestions: responseResult.suggestedQuestions,
      pageContext,
    });
  } catch (err: any) {
    logger.error('[AssistantController] Query error:', err.message);
    return sendError(res, 'ASSISTANT_ERROR', err.message || 'M63 Assistant is currently unable to process your request.', 500);
  }
}
