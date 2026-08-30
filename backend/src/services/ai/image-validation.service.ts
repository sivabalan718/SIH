import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface ImageValidationResult {
  isValidProductImage: boolean;
  qualityRating: 'GOOD' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT';
  feedbackMessage: string;
  isAiValidated: boolean;
}

export class ImageValidationService {
  public async validateImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<ImageValidationResult> {
    // 1. Technical file checks
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return {
        isValidProductImage: false,
        qualityRating: 'NEEDS_IMPROVEMENT',
        feedbackMessage: 'Unsupported image format. Please upload a JPEG, PNG, or WebP photo.',
        isAiValidated: false,
      };
    }

    // Check size limit: max 10MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (imageBuffer.length > maxSizeBytes) {
      return {
        isValidProductImage: false,
        qualityRating: 'NEEDS_IMPROVEMENT',
        feedbackMessage: 'Photo size is too large (over 10MB). Please select a smaller photo.',
        isAiValidated: false,
      };
    }

    if (imageBuffer.length < 100) {
      return {
        isValidProductImage: false,
        qualityRating: 'NEEDS_IMPROVEMENT',
        feedbackMessage: 'Invalid or empty image file.',
        isAiValidated: false,
      };
    }

    // 2. Query Gemini Vision if API key is present
    if (!env.geminiApiKey || env.aiMockMode) {
      return {
        isValidProductImage: true,
        qualityRating: 'GOOD',
        feedbackMessage: 'Photo captured cleanly and ready for product catalogue.',
        isAiValidated: false,
      };
    }

    const modelsToTry = [
      env.geminiLlmModel || 'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ];

    const base64Data = imageBuffer.toString('base64');
    const promptText = `
You are an expert artisan product catalogue inspector for M63.
Analyze this image and determine:
1. Does this image contain a genuine physical craft/artisan product (e.g. saree, pottery, jewellery, textile, wood craft, handicraft, basket, home decor)?
2. If it is a person-only photo/selfie, document, blank photo, screenshot, or completely unrelated object, set "isValidProductImage": false.
3. Determine qualityRating ("GOOD", "ACCEPTABLE", or "NEEDS_IMPROVEMENT").
4. Provide a short, friendly 1-sentence feedbackMessage for the artisan.

Return ONLY valid JSON matching this schema:
{
  "isValidProductImage": boolean,
  "qualityRating": "GOOD" | "ACCEPTABLE" | "NEEDS_IMPROVEMENT",
  "feedbackMessage": "string"
}
`;

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
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.1 },
          }),
        });

        const json: any = await response.json();
        if (!response.ok) {
          logger.warn(`[ImageValidationService] Model ${model} returned HTTP ${response.status}`);
          continue;
        }

        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          isValidProductImage: Boolean(parsed.isValidProductImage),
          qualityRating: ['GOOD', 'ACCEPTABLE', 'NEEDS_IMPROVEMENT'].includes(parsed.qualityRating)
            ? parsed.qualityRating
            : 'GOOD',
          feedbackMessage:
            parsed.feedbackMessage ||
            (parsed.isValidProductImage
              ? 'Your photo is suitable for your catalogue.'
              : "This photo doesn't appear to show your craft product. Please upload or capture a clear product photo."),
          isAiValidated: true,
        };
      } catch (err: any) {
        logger.warn(`[ImageValidationService] Model ${model} exception: ${err.message}`);
      }
    }

    // Safe fallback if Gemini Vision is rate-limited or unready
    return {
      isValidProductImage: true,
      qualityRating: 'GOOD',
      feedbackMessage: 'Photo captured cleanly and ready for product catalogue.',
      isAiValidated: false,
    };
  }
}

export const imageValidationService = new ImageValidationService();
