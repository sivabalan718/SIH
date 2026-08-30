import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Check } from 'lucide-react';
import { QuestionLocalization } from '../../data/questionLocalizations.js';

interface FieldVoiceRecorderProps {
  fieldName: string;
  fieldLabel: string;
  onAudioCaptured: (audioBlob: Blob, targetField: string, browserTranscript?: string) => Promise<void>;
  loc: QuestionLocalization;
  activeField: string | null;
  setActiveField: (field: string | null) => void;
}

export const FieldVoiceRecorder: React.FC<FieldVoiceRecorderProps> = ({
  fieldName,
  fieldLabel,
  onAudioCaptured,
  loc,
  activeField,
  setActiveField,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any | null>(null);
  const browserTranscriptRef = useRef<string>('');
  const timerRef = useRef<any | null>(null);

  const isCurrentFieldActive = activeField === fieldName;

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    if (activeField && activeField !== fieldName) {
      return;
    }

    try {
      setSeconds(0);
      audioChunksRef.current = [];
      browserTranscriptRef.current = '';
      setActiveField(fieldName);

      // Initialize Web Speech Recognition if available in browser
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = (loc as any).code === 'ta' ? 'ta-IN' : (loc as any).code === 'hi' ? 'hi-IN' : 'en-IN';

          recognition.onresult = (event: any) => {
            let finalStr = '';
            for (let i = 0; i < event.results.length; i++) {
              finalStr += event.results[i][0].transcript;
            }
            if (finalStr.trim()) {
              browserTranscriptRef.current = finalStr.trim();
            }
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          // Ignore SpeechRecognition init errors (falls back to Gemini)
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (e) {}
        }

        setIsRecording(false);
        setIsProcessing(true);

        try {
          await onAudioCaptured(audioBlob, fieldName, browserTranscriptRef.current);
          setJustCompleted(true);
          setHasError(false);
          setTimeout(() => setJustCompleted(false), 2500);
        } catch (err) {
          setHasError(true);
        } finally {
          setIsProcessing(false);
          setActiveField(null);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setHasError(false);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setActiveField(null);
      setIsRecording(false);
      setHasError(true);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {isProcessing ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: 'var(--m63-primary-light)',
            color: 'var(--m63-primary)',
            borderRadius: 'var(--m63-radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <Loader2 size={13} className="animate-spin" />
          <span>{loc.actions.processing}</span>
        </span>
      ) : isRecording ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: 'var(--m63-radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#DC2626',
                animation: 'pulse 1s infinite',
              }}
            />
            <span>{formatSeconds(seconds)}</span>
          </span>
          <button
            type="button"
            onClick={stopRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--m63-radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title={loc.actions.stop}
          >
            <Square size={11} fill="#FFFFFF" />
            <span>{loc.actions.stop}</span>
          </button>
        </div>
      ) : justCompleted ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            borderRadius: 'var(--m63-radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <Check size={13} />
          <span>Added</span>
        </span>
      ) : hasError ? (
        <button
          type="button"
          onClick={startRecording}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            borderRadius: 'var(--m63-radius-md)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Voice input issue. Click to try again."
        >
          <Mic size={14} />
          <span>Try Again</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          disabled={Boolean(activeField && !isCurrentFieldActive)}
          aria-label={`Speak into ${fieldLabel}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            backgroundColor: 'var(--m63-bg-surface)',
            border: '1px solid var(--m63-border)',
            color: activeField && !isCurrentFieldActive ? 'var(--m63-slate-subtle)' : 'var(--m63-primary)',
            borderRadius: 'var(--m63-radius-md)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: activeField && !isCurrentFieldActive ? 'not-allowed' : 'pointer',
            opacity: activeField && !isCurrentFieldActive ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <Mic size={14} />
          <span>{loc.actions.speak}</span>
        </button>
      )}
    </div>
  );
};
