import { speechService } from './speech.service.js';
import { productUnderstandingService } from './product-understanding.service.js';
import { VoiceToProductProcessResult } from './ai.types.js';
import { logger } from '../../utils/logger.js';

export class AIProviderService {
  async processVoiceToProduct(
    audioBuffer: Buffer,
    mimeType: string,
    targetField?: string,
    questionLanguage?: string,
    browserTranscript?: string
  ): Promise<VoiceToProductProcessResult> {
    logger.info(
      `[AIProviderService] Initiating Voice-to-Catalog pipeline (${audioBuffer.length} bytes, field: ${targetField || 'all'}, lang: ${questionLanguage || 'en'})`
    );

    // Step 1: Speech-to-Text & Language Detection
    const speechResult = await speechService.processAudio(audioBuffer, mimeType, browserTranscript);

    if (!speechResult.transcript || speechResult.transcript.trim().length === 0) {
      throw Object.assign(
        new Error("We couldn't hear any speech in the recording. Please try recording again."),
        { code: 'NO_SPEECH_DETECTED', statusCode: 400 }
      );
    }

    logger.info(
      `[AIProviderService] Speech transcribed (${speechResult.detectedLanguage}): "${speechResult.transcript.substring(0, 50)}..."`
    );

    // Step 2: LLM Product Understanding & Structured Extraction
    const extractedData = await productUnderstandingService.extract(
      speechResult.transcript,
      speechResult.detectedLanguage,
      targetField,
      questionLanguage
    );

    logger.info('[AIProviderService] Product extraction completed successfully.');

    return {
      transcript: speechResult.transcript,
      detectedLanguage: speechResult.detectedLanguage,
      confidence: speechResult.confidence,
      extractedData,
      targetField,
      questionLanguage,
    };
  }
}

export const aiProviderService = new AIProviderService();
