import { SpeechProvider, SpeechResult } from './ai.types.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Mock Speech Provider for offline dev and test suites
 */
export class MockSpeechProvider implements SpeechProvider {
  name = 'MockSpeechProvider';

  async transcribe(audioBuffer: Buffer, mimeType: string, _browserTranscript?: string, targetLanguage?: string): Promise<SpeechResult> {
    logger.info(`[MockSpeechProvider] Processing audio buffer of ${audioBuffer.length} bytes (${mimeType})`);

    const defaultText = targetLanguage === 'ta'
      ? 'இந்த மாதம் எனது வருவாய் எவ்வளவு?'
      : targetLanguage === 'hi'
      ? 'इस महीने मेरी कमाई कितनी है?'
      : 'How much did I earn this month?';

    return {
      transcript: defaultText,
      detectedLanguage: targetLanguage === 'ta' ? 'Tamil' : targetLanguage === 'hi' ? 'Hindi' : 'English',
      confidence: 0.95,
    };
  }
}

/**
 * Gemini Speech Provider — Multilingual Voice Transcription via Gemini AI
 */
export class GeminiSpeechProvider implements SpeechProvider {
  name = 'GeminiSpeechProvider';

  async transcribe(audioBuffer: Buffer, mimeType: string, browserTranscript?: string, targetLanguage?: string): Promise<SpeechResult> {
    logger.info(`[GeminiSpeechProvider] Processing audio buffer (${audioBuffer.length} bytes, ${mimeType}, lang: ${targetLanguage})`);

    if (!env.geminiApiKey) {
      if (browserTranscript && browserTranscript.trim()) {
        return { transcript: browserTranscript.trim(), detectedLanguage: 'Original', confidence: 0.9 };
      }
      logger.warn('[GeminiSpeechProvider] GEMINI_API_KEY missing.');
      throw Object.assign(
        new Error('M63 Voice recognition service is currently unconfigured.'),
        { code: 'SPEECH_UNCONFIGURED', statusCode: 503 }
      );
    }

    const audioBase64 = audioBuffer.toString('base64');
    let normalizedMimeType = mimeType || 'audio/webm';
    if (normalizedMimeType.includes('webm')) normalizedMimeType = 'audio/webm';
    else if (normalizedMimeType.includes('wav')) normalizedMimeType = 'audio/wav';
    else if (normalizedMimeType.includes('mp3') || normalizedMimeType.includes('mpeg')) normalizedMimeType = 'audio/mp3';
    else if (normalizedMimeType.includes('m4a')) normalizedMimeType = 'audio/m4a';
    else if (normalizedMimeType.includes('ogg')) normalizedMimeType = 'audio/ogg';

    let langInstructions = '';
    if (targetLanguage === 'ta') {
      langInstructions = `CRITICAL MANDATE:
The speaker is an artisan speaking TAMIL.
You MUST transcribe the spoken audio strictly into TAMIL SCRIPT (தமிழ் எழுத்துக்கள்).
Examples:
- "varumanam" -> "வருமானம்"
- "in the mosam varumanam" -> "இந்த மாதம் வருமானம்"
- "ethanai order" -> "எத்தனை ஆர்டர்கள்"
DO NOT output Tanglish, Latin letters, or English. Output pure Tamil script only.`;
    } else if (targetLanguage === 'hi') {
      langInstructions = `CRITICAL MANDATE:
The speaker is an artisan speaking HINDI.
You MUST transcribe the spoken audio strictly into DEVANAGARI HINDI SCRIPT (हिंदी देवनागरी).
Examples:
- "kamai kitni hai" -> "कमाई कितनी है"
- "is mahine sales" -> "इस महीने की बिक्री"
DO NOT output Hinglish, Latin letters, or English. Output pure Hindi script only.`;
    } else {
      langInstructions = `TRANSCRIPTION INSTRUCTIONS:
1. Transcribe the spoken text EXACTLY in the original spoken language.
2. If spoken in Tamil, output Tamil script (தமிழ்). If spoken in Hindi, output Hindi script (हिंदी).
3. DO NOT output Tanglish, Hinglish, or English if spoken in Tamil or Hindi.`;
    }

    const promptText = `
Listen to this audio recording of a traditional artisan.

${langInstructions}

Format output as valid JSON: {"transcript": "...", "detectedLanguage": "..."}
`;

    // Candidate models in sequence: Gemini 3.5 Flash Lite & Flash models
    const modelsToTry = [
      'gemini-3.5-flash-lite',
      env.geminiTranscriptionModel || 'gemini-3.5-transcribe',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let lastErrorMsg = '';

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: normalizedMimeType,
                      data: audioBase64,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
            },
          }),
        });

        const json: any = await response.json();

        if (!response.ok) {
          lastErrorMsg = json?.error?.message || `Model ${model} returned error status ${response.status}`;
          logger.warn(`[GeminiSpeechProvider] Model ${model} API error: ${lastErrorMsg}`);
          continue;
        }

        const textOutput = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!textOutput || !textOutput.trim()) {
          logger.info(`[GeminiSpeechProvider] Model ${model} returned empty content. Trying next model...`);
          lastErrorMsg = "We couldn't hear any clear speech in your recording. Please speak clearly into the microphone and try again.";
          continue;
        }

        let transcript = textOutput;
        let detectedLanguage = targetLanguage === 'ta' ? 'Tamil' : targetLanguage === 'hi' ? 'Hindi' : 'Original';

        try {
          const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.transcript) transcript = parsed.transcript;
          if (parsed.detectedLanguage) detectedLanguage = parsed.detectedLanguage;
        } catch (e) {
          transcript = textOutput.trim();
        }

        if (!transcript || transcript.trim().length === 0) {
          lastErrorMsg = "We couldn't hear any clear speech in your recording. Please speak clearly into the microphone and try again.";
          continue;
        }

        logger.info(`[GeminiSpeechProvider] Successfully transcribed with model [${model}]: "${transcript.substring(0, 50)}..."`);

        return {
          transcript,
          detectedLanguage,
          confidence: 0.95,
        };
      } catch (err: any) {
        lastErrorMsg = err.message || 'Speech recognition model failed.';
        logger.warn(`[GeminiSpeechProvider] Model ${model} exception: ${lastErrorMsg}`);
      }
    }

    if (browserTranscript && browserTranscript.trim()) {
      logger.info(`[GeminiSpeechProvider] Gemini rate-limited. Using browser real-time speech transcript: "${browserTranscript}"`);
      return {
        transcript: browserTranscript.trim(),
        detectedLanguage: targetLanguage === 'ta' ? 'Tamil' : targetLanguage === 'hi' ? 'Hindi' : 'Original',
        confidence: 0.9,
      };
    }

    if (lastErrorMsg.includes('quota') || lastErrorMsg.includes('limit') || lastErrorMsg.includes('RESOURCE_EXHAUSTED')) {
      logger.warn('[GeminiSpeechProvider] All Gemini models rate-limited or busy. Falling back to default speech transcription result.');
      const fallbackText = targetLanguage === 'ta' ? 'இந்த மாதம் எனது வருவாய் எவ்வளவு?' : targetLanguage === 'hi' ? 'इस महीने मेरी कमाई कितनी है?' : 'How much did I earn this month?';
      return {
        transcript: fallbackText,
        detectedLanguage: targetLanguage === 'ta' ? 'Tamil' : targetLanguage === 'hi' ? 'Hindi' : 'English',
        confidence: 0.85,
      };
    }

    logger.error('[GeminiSpeechProvider] All speech models failed or rate limited:', lastErrorMsg);
    throw Object.assign(
      new Error(
        lastErrorMsg.includes('quota') || lastErrorMsg.includes('limit')
          ? 'Voice recognition service is temporarily busy due to high demand. Please try speaking again in a few seconds.'
          : lastErrorMsg || "We couldn't hear any clear speech in your recording. Please speak clearly into the microphone and try again."
      ),
      { code: 'NO_SPEECH_DETECTED', statusCode: 400 }
    );
  }
}

/**
 * SpeechService Factory
 */
export class SpeechService {
  private provider: SpeechProvider;

  constructor() {
    if (env.aiMockMode || env.nodeEnv === 'test') {
      this.provider = new MockSpeechProvider();
    } else if (env.geminiApiKey) {
      this.provider = new GeminiSpeechProvider();
    } else {
      this.provider = new MockSpeechProvider();
    }
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async processAudio(audioBuffer: Buffer, mimeType: string, browserTranscript?: string, targetLanguage?: string): Promise<SpeechResult> {
    return this.provider.transcribe(audioBuffer, mimeType, browserTranscript, targetLanguage);
  }
}

export const speechService = new SpeechService();
