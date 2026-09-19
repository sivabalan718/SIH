import { apiRequest } from './api.js';

export type AssistantLanguage = 'en' | 'ta' | 'hi';

export interface AssistantResponse {
  transcript?: string;
  language: AssistantLanguage;
  intent: string;
  textResponse: string;
  audioDataUri?: string | null;
  businessData?: Record<string, any>;
  evidence?: Array<{ metric: string; value: string }>;
  suggestedQuestions?: string[];
  pageContext?: string;
}

export async function queryAssistant(
  textOrAudio: { text?: string; audioBlob?: Blob; browserTranscript?: string; language?: AssistantLanguage; pageContext?: string }
): Promise<AssistantResponse> {
  const token = localStorage.getItem('m63_access_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (textOrAudio.audioBlob) {
    const formData = new FormData();
    formData.append('audio', textOrAudio.audioBlob, 'recording.webm');
    if (textOrAudio.text) formData.append('text', textOrAudio.text);
    if (textOrAudio.browserTranscript) formData.append('browserTranscript', textOrAudio.browserTranscript);
    if (textOrAudio.language) formData.append('language', textOrAudio.language);
    if (textOrAudio.pageContext) formData.append('pageContext', textOrAudio.pageContext);

    const res = await fetch('/api/v1/assistant/query', {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || 'Voice assistant request failed.');
    }
    return json.data;
  }

  return apiRequest<AssistantResponse>('/assistant/query', {
    method: 'POST',
    body: JSON.stringify({
      text: textOrAudio.text,
      language: textOrAudio.language,
      pageContext: textOrAudio.pageContext,
    }),
  });
}

