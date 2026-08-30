import { env } from './env.js';
import { logger } from '../utils/logger.js';

export interface AIProviderStatus {
  hasGeminiKey: boolean;
  isMockMode: boolean;
  isAvailable: boolean;
}

export function getAIProviderStatus(): AIProviderStatus {
  const hasGeminiKey = Boolean(env.geminiApiKey && env.geminiApiKey.trim().length > 0);
  const isMockMode = env.aiMockMode;

  const isAvailable = isMockMode || hasGeminiKey;

  return {
    hasGeminiKey,
    isMockMode,
    isAvailable,
  };
}

export function logAIConfigStatus(): void {
  const status = getAIProviderStatus();
  if (status.isMockMode) {
    logger.info('[M63 AI] Development Mock Mode is active.');
  } else if (!status.hasGeminiKey) {
    logger.warn('[M63 AI] GEMINI_API_KEY is not set. Real AI voice & product understanding will return configuration fallback.');
  } else {
    logger.info(`[M63 AI] Gemini API Key configured successfully. Models: Transcription (${env.geminiTranscriptionModel}), LLM (${env.geminiLlmModel})`);
  }
}
