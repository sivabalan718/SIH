import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button.js';
import { Mic, Square, RotateCcw, Sparkles, AlertCircle, Play, Pause } from 'lucide-react';

export interface VoiceRecorderProps {
  onAudioCaptured: (blob: Blob) => void;
  onManualFallback: () => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioCaptured,
  onManualFallback,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const MAX_RECORDING_SECONDS = 60;

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    setRecordedBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError('Your browser does not support voice recording. Please use manual entry.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission was denied. Please allow microphone access or enter details manually.');
      } else {
        setPermissionError('Unable to access microphone. Please try again or enter details manually.');
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleReRecord = () => {
    setRecordedBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingSeconds(0);
    startRecording();
  };

  const handleUseRecording = () => {
    if (recordedBlob) {
      onAudioCaptured(recordedBlob);
    }
  };

  const togglePlayback = () => {
    if (!audioElemRef.current && audioUrl) {
      audioElemRef.current = new Audio(audioUrl);
      audioElemRef.current.onended = () => setIsPlaying(false);
    }

    if (audioElemRef.current) {
      if (isPlaying) {
        audioElemRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElemRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="m63-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        backgroundColor: 'var(--m63-bg-surface)',
        borderRadius: 'var(--m63-radius-xl)',
        border: '1px solid var(--m63-border)',
        boxShadow: 'var(--m63-shadow-md)',
      }}
    >
      {permissionError && (
        <div className="m63-alert m63-alert-error" style={{ width: '100%', marginBottom: '20px', textAlign: 'left' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600 }}>{permissionError}</p>
            <button
              onClick={onManualFallback}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--m63-error)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                marginTop: '4px',
              }}
            >
              Enter details manually →
            </button>
          </div>
        </div>
      )}

      {/* Hero Icon Header */}
      {!isRecording && !recordedBlob && (
        <>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: 'var(--m63-primary-light)',
              color: 'var(--m63-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: 'var(--m63-shadow-primary)',
            }}
          >
            <Mic size={36} />
          </div>

          <span className="m63-badge m63-badge-primary" style={{ marginBottom: '8px' }}>
            <Sparkles size={14} /> M63 Voice Assistant
          </span>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
            Tell M63 about your product
          </h2>

          <p style={{ fontSize: '0.92rem', color: 'var(--m63-slate-subtle)', maxWidth: '440px', marginTop: '6px', lineHeight: 1.5, marginBottom: '24px' }}>
            Speak naturally in Tamil, Hindi, or English. Describe what it is, how you made it, colors, and materials.
          </p>

          {/* Big Tap-to-Record Button */}
          <Button
            variant="primary"
            size="lg"
            icon={<Mic size={22} />}
            onClick={startRecording}
            disabled={disabled}
            aria-label="Start recording product description"
            style={{ minWidth: '220px', minHeight: '54px', fontSize: '1.05rem' }}
          >
            Start Recording
          </Button>
        </>
      )}

      {/* Active Recording State */}
      {isRecording && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* Animated Pulsing Recording Sphere */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: 'var(--m63-error-bg)',
                border: '2px solid var(--m63-error)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--m63-error)',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <Mic size={40} />
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: '1.8rem',
                fontFamily: 'monospace',
                fontWeight: 800,
                color: 'var(--m63-error)',
                letterSpacing: '0.05em',
              }}
            >
              {formatTimer(recordingSeconds)}
            </span>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--m63-slate)', marginTop: '4px' }}>
              Listening to you...
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--m63-slate-subtle)' }}>
              Speak naturally about your product
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            icon={<Square size={18} style={{ color: 'var(--m63-error)' }} />}
            onClick={stopRecording}
            style={{ borderColor: 'var(--m63-error-border)', minWidth: '180px' }}
          >
            Stop Recording
          </Button>

          <style>{`
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
              70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(220, 38, 38, 0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
            }
          `}</style>
        </div>
      )}

      {/* Captured Audio Playback State */}
      {!isRecording && recordedBlob && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '380px' }}>
          <div
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 'var(--m63-radius-lg)',
              backgroundColor: 'var(--m63-bg-canvas)',
              border: '1px solid var(--m63-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={togglePlayback}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--m63-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
              </button>

              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                  Your Voice Recording
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--m63-slate-subtle)' }}>
                  Duration: {formatTimer(recordingSeconds)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReRecord}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--m63-slate-subtle)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <RotateCcw size={14} /> Re-record
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <Button
              variant="secondary"
              onClick={handleReRecord}
              style={{ flex: 1 }}
              disabled={disabled}
            >
              Re-record
            </Button>
            <Button
              variant="primary"
              onClick={handleUseRecording}
              style={{ flex: 1.5 }}
              disabled={disabled}
              icon={<Sparkles size={18} />}
            >
              Create Product
            </Button>
          </div>
        </div>
      )}

      {/* Manual Fallback Link */}
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--m63-border)', paddingTop: '16px', width: '100%' }}>
        <button
          type="button"
          onClick={onManualFallback}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--m63-slate-subtle)',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Prefer typing? Enter details manually →
        </button>
      </div>
    </div>
  );
};
