import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { QuestionLocalization } from '../../data/questionLocalizations.js';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (file: File) => void;
  loc: QuestionLocalization;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  loc,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage]);

  const startCamera = async () => {
    try {
      setIsInitializing(true);
      setCameraError(null);

      // Attempt to access environment (rear) camera on mobile, or primary webcam on desktop
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError('Camera access unavailable. You can upload a photo from your device.');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUsePhoto = () => {
    if (!capturedImage) return;

    // Convert dataUrl to File object
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onPhotoCaptured(file);
        onClose();
      });
  };

  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoCaptured(file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--m63-radius-xl)',
          width: '100%',
          maxWidth: '540px',
          overflow: 'hidden',
          boxShadow: 'var(--m63-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--m63-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} style={{ color: 'var(--m63-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
              {loc.actions.takePhoto}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m63-slate-subtle)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Viewport / Preview */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#0F172A',
            width: '100%',
            height: '320px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured Product"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : cameraError ? (
            <div style={{ color: '#FFFFFF', textAlign: 'center', padding: '20px' }}>
              <AlertCircle size={36} style={{ color: '#F87171', marginBottom: '8px' }} />
              <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>{cameraError}</p>
              <Button
                variant="secondary"
                size="sm"
                icon={<ImageIcon size={16} />}
                onClick={() => fallbackFileInputRef.current?.click()}
              >
                {loc.actions.uploadPhoto}
              </Button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Photo Tips Banner */}
        <div style={{ backgroundColor: 'var(--m63-bg-canvas)', padding: '12px 20px', borderTop: '1px solid var(--m63-border)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '4px' }}>
            📸 {loc.actions.photoTipsTitle}
          </p>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--m63-slate-subtle)' }}>
            {loc.actions.photoTips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--m63-border)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <input
            type="file"
            ref={fallbackFileInputRef}
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFallbackFileSelect}
          />

          {!capturedImage ? (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Camera size={18} />}
                onClick={handleCapture}
                disabled={Boolean(cameraError) || isInitializing}
              >
                Capture Photo
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={handleRetake}>
                Retake
              </Button>
              <Button variant="primary" icon={<Check size={18} />} onClick={handleUsePhoto}>
                Use Photo
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
