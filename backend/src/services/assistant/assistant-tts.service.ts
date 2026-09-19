import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AssistantLanguage } from './assistant.types.js';

export class AssistantTTSService {
  /**
   * Generates audio for text response if Gemini TTS is available.
   * Returns base64 audio data URI or null (allowing client-side WebSpeech fallback).
   */
  async generateTTS(text: string, language: AssistantLanguage): Promise<string | null> {
    // Delegate Tamil and Hindi speech synthesis to client-side WebSpeech API for 100% native word-by-word voice reading
    if (language === 'ta' || language === 'hi' || /[\u0B80-\u0BFF\u0900-\u097F]/.test(text)) {
      logger.info(`[AssistantTTSService] Delegating ${language} speech synthesis to native client WebSpeech engine for complete word reading.`);
      return null;
    }

    if (!env.geminiApiKey || env.aiMockMode) {
      return null;
    }

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `Read this text aloud naturally in English: "${text}"` }],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck',
                  },
                },
              },
            },
          }),
        });

        if (response.ok) {
          const resJson: any = await response.json();
          const parts = resJson?.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData && p.inlineData.data) {
              const mime = p.inlineData.mimeType || 'audio/mp3';
              logger.info(`[AssistantTTSService] Generated audio via Gemini model ${model} (${p.inlineData.data.length} bytes)`);
              return `data:${mime};base64,${p.inlineData.data}`;
            }
          }
        }
      } catch (err: any) {
        logger.warn(`[AssistantTTSService] Gemini TTS model ${model} skipped:`, err.message);
      }
    }

    return null;
  }
}

export const assistantTTSService = new AssistantTTSService();
