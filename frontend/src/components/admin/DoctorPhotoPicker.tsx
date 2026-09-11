'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Camera, Upload, Trash2, X, RefreshCw, Check, Link as LinkIcon, User } from 'lucide-react';

interface DoctorPhotoPickerProps {
  value: string;
  onChange: (photoUrl: string) => void;
}

export default function DoctorPhotoPicker({ value, onChange }: DoctorPhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Helper to crop & compress any image source to 400x400 JPEG data URL (~25-40KB)
  const processImageToSquareDataUrl = (img: HTMLImageElement | HTMLVideoElement): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const sourceWidth = 'videoWidth' in img ? img.videoWidth : img.width;
    const sourceHeight = 'videoHeight' in img ? img.videoHeight : img.height;

    // Center crop to square
    const minDim = Math.min(sourceWidth, sourceHeight);
    const sx = (sourceWidth - minDim) / 2;
    const sy = (sourceHeight - minDim) / 2;

    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 400, 400);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Handle file input selection (from disk or gallery)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const compressed = processImageToSquareDataUrl(img);
        onChange(compressed);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Start webcam stream for live in-browser camera
  const startCamera = async () => {
    setCameraError(null);
    setCapturedSnapshot(null);
    setIsCameraModalOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.warn('Webcam stream failed:', err);
      setCameraError(
        err.message || 'Unable to access camera. Please check camera permissions or use file upload.'
      );
    }
  };

  // Attach stream to video tag when ready
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Clean up camera stream on close
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraModalOpen(false);
    setCapturedSnapshot(null);
    setCameraError(null);
  };

  // Capture frame from video element
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const snapshot = processImageToSquareDataUrl(videoRef.current);
    setCapturedSnapshot(snapshot);
  };

  // Confirm using captured snapshot
  const confirmSnapshot = () => {
    if (capturedSnapshot) {
      onChange(capturedSnapshot);
      stopCamera();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block font-bold text-slate-700 text-xs uppercase tracking-wider">
        Doctor Profile Photo
      </label>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={mobileCameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="user"
        className="hidden"
      />

      {/* Current Photo Preview or Empty State */}
      <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="relative w-20 h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
          {value ? (
            <img
              src={value}
              alt="Doctor preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <User className="w-8 h-8" />
              <span className="text-[10px] font-medium text-slate-400 mt-1">No Photo</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-brand-600" />
              Upload Photo
            </button>

            <button
              type="button"
              onClick={startCamera}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              Take Photo
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-slate-400 hover:text-brand-600 flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" />
            {showUrlInput ? 'Hide manual URL input' : 'Or enter photo URL directly'}
          </button>
        </div>
      </div>

      {/* Optional Manual URL Input */}
      {showUrlInput && (
        <div className="mt-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>
      )}

      {/* --- LIVE CAMERA MODAL --- */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-600" /> Take Doctor Photo
              </h4>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl space-y-3 text-center">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    mobileCameraInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" /> Use Native Device Camera
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Viewfinder Frame */}
                <div className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                  {capturedSnapshot ? (
                    <img
                      src={capturedSnapshot}
                      alt="Captured snapshot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  )}

                  {/* Circular Avatar Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-white/40 rounded-full m-4" />
                </div>

                {/* Camera Action Buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  {capturedSnapshot ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCapturedSnapshot(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retake
                      </button>

                      <button
                        type="button"
                        onClick={confirmSnapshot}
                        className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Use Photo
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-xs font-bold flex items-center gap-2 transition shadow-md shadow-brand-500/30 active:scale-95"
                    >
                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                      Capture Photo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
