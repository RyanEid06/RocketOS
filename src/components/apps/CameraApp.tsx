import React, { useState, useEffect, useRef } from 'react';
import {
  Camera as CameraIcon,
  Video,
  RefreshCw,
  Sparkles,
  Download,
  Trash2,
  AlertCircle,
  Timer,
  Sliders,
  Check,
  Film,
  ZoomIn,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { rocketFS } from '../../core/filesystem/RocketFS';
import { binaryBlobStore } from '../../core/filesystem/BinaryBlobStore';
import { notificationService } from '../../core/notifications/NotificationService';

type FilterMode = 'none' | 'mono' | 'cyberpunk' | 'vintage' | 'high-contrast';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  path: string;
}

export const CameraApp: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'simulated'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('none');
  const [mirror, setMirror] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(0);
  const [timerSetting, setTimerSetting] = useState<0 | 3 | 5 | 10>(0);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);

  // Initialize camera immediately when app opens
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    stopCamera();
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('denied');
      setErrorMessage('Camera API is not supported in this environment. You can use Simulated Sensor mode.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStreamActive(true);
      setPermissionState('granted');
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Camera permission was denied by the browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('denied');
        setErrorMessage('No physical camera device detected on this system.');
      } else {
        setPermissionState('denied');
        setErrorMessage(err?.message || 'Failed to initialize video capture stream.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  // Fallback simulated camera canvas generator for environments without webcams
  const startSimulatedCamera = () => {
    stopCamera();
    setPermissionState('simulated');
    setStreamActive(true);
    setErrorMessage(null);
  };

  const getFilterStyle = (): React.CSSProperties => {
    switch (filter) {
      case 'mono':
        return { filter: 'grayscale(100%) contrast(120%)' };
      case 'cyberpunk':
        return { filter: 'hue-rotate(180deg) saturate(220%) contrast(120%)' };
      case 'vintage':
        return { filter: 'sepia(70%) contrast(110%) brightness(95%)' };
      case 'high-contrast':
        return { filter: 'contrast(180%) brightness(105%)' };
      default:
        return {};
    }
  };

  const handleCaptureClick = () => {
    if (countdown > 0) return;

    if (timerSetting > 0) {
      setCountdown(timerSetting);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            executeCapture();
            return 0;
          }
          soundEngine.play('click');
          return prev - 1;
        });
      }, 1000);
    } else {
      executeCapture();
    }
  };

  const executeCapture = async () => {
    // Flash visual & audio shutter sound
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);
    soundEngine.playSuccess();

    const canvas = document.createElement('canvas');
    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply mirror if enabled
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    if (permissionState === 'granted' && videoRef.current && videoRef.current.videoWidth > 0) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      // Simulated camera frame
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#0284c7');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw cyber grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw simulated camera overlay text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ROCKET-OS CAM SIMULATION', width / 2, height / 2 - 20);
      ctx.font = '20px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(new Date().toLocaleString(), width / 2, height / 2 + 25);
    }

    // Apply filter on canvas
    if (filter === 'mono') {
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (filter === 'vintage') {
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        d[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        d[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        d[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const timestamp = Date.now();
    const filename = `photo_${timestamp}.png`;
    const fullPath = `/home/ryan/Pictures/${filename}`;

    // Ensure Pictures directory exists in RocketFS
    try {
      if (!rocketFS.exists('/home/ryan/Pictures')) {
        rocketFS.createFolder('/home/ryan', 'Pictures');
      }
      // Save file entry
      rocketFS.createFile('/home/ryan/Pictures', filename, dataUrl);
      // Store in binary blob store
      const binData = new TextEncoder().encode(dataUrl);
      await binaryBlobStore.putBlob(`cam_${timestamp}`, binData, 'image/png');
    } catch (e) {
      console.error('Failed to save photo into RocketFS:', e);
    }

    const newPhoto: CapturedPhoto = {
      id: `photo-${timestamp}`,
      dataUrl,
      timestamp,
      path: fullPath,
    };

    setPhotos((prev) => [newPhoto, ...prev]);

    notificationService.sendNotification({
      title: 'Photo Captured',
      body: `Saved to ${fullPath}`,
      severity: 'info',
      sourceAppId: 'camera',
    });
  };

  const handleDownload = (photo: CapturedPhoto) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = photo.path.split('/').pop() || 'photo.png';
    a.click();
  };

  const handleDeletePhoto = (id: string) => {
    soundEngine.playTrash();
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden font-sans">
      {/* Viewport Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Flash Effect Overlay */}
        {flashEffect && <div className="absolute inset-0 bg-white z-40 transition-opacity duration-150" />}

        {/* Countdown Overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 backdrop-blur-xs">
            <span className="text-8xl font-black text-white drop-shadow-2xl animate-ping">{countdown}</span>
          </div>
        )}

        {/* Camera Feed or Simulated Feed */}
        {permissionState === 'granted' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              ...getFilterStyle(),
              transform: mirror ? 'scaleX(-1)' : 'none',
            }}
            className="w-full h-full object-cover"
          />
        )}

        {permissionState === 'simulated' && (
          <div
            style={getFilterStyle()}
            className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1)_0,transparent_70%)] animate-pulse" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <CameraIcon className="w-16 h-16 text-sky-400 animate-bounce" />
              <span className="font-mono text-sm tracking-widest text-sky-300 font-bold">VIRTUAL SENSOR STREAM</span>
              <span className="text-xs text-slate-400">1280x720 • 60 FPS • Ready to Capture</span>
            </div>
          </div>
        )}

        {/* Permission Request / Fallback UI */}
        {(permissionState === 'denied' || permissionState === 'prompt') && (
          <div className="p-6 max-w-md text-center bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl z-20 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <CameraIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Camera Access</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {errorMessage || 'RocketOS needs access to your camera to take photos and record video.'}
              </p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 py-2 px-3 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Hardware Camera</span>
              </button>
              <button
                type="button"
                onClick={startSimulatedCamera}
                className="flex-1 py-2 px-3 text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Use Virtual Stream</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Controls Overlay */}
        {streamActive && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
            {/* Filter Selector */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
              {(['none', 'mono', 'cyberpunk', 'vintage', 'high-contrast'] as FilterMode[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setFilter(f);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer capitalize ${
                    filter === f ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'none' ? 'Natural' : f}
                </button>
              ))}
            </div>

            {/* Timer & Mirror */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  soundEngine.play('click');
                  setTimerSetting((prev) => (prev === 0 ? 3 : prev === 3 ? 5 : prev === 5 ? 10 : 0));
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  timerSetting > 0 ? 'bg-amber-500/30 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
                title="Countdown Timer"
              >
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">{timerSetting === 0 ? 'Off' : `${timerSetting}s`}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.play('click');
                  setMirror(!mirror);
                }}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[10px] font-semibold ${
                  mirror ? 'bg-sky-500/30 text-sky-300' : 'text-slate-400 hover:text-white'
                }`}
                title="Flip Horizontal Mirror"
              >
                Mirror
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shutter Bar */}
      <div className="p-3 bg-slate-900/90 border-t border-white/10 flex items-center justify-between shrink-0">
        <div className="w-24 text-[11px] text-slate-400">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </div>

        {/* Shutter Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!streamActive}
            onClick={handleCaptureClick}
            className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center p-1 bg-transparent hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-sky-500/20"
            title="Take Photo"
          >
            <div className="w-full h-full rounded-full bg-white hover:bg-sky-400 transition-colors" />
          </button>
        </div>

        <div className="w-24 flex justify-end">
          {photos.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedPhoto(photos[0])}
              className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 hover:scale-105 transition-transform cursor-pointer relative"
              title="Recent photo"
            >
              <img src={photos[0].dataUrl} alt="Recent" className="w-full h-full object-cover" />
            </button>
          )}
        </div>
      </div>

      {/* Filmstrip Gallery */}
      {photos.length > 0 && (
        <div className="p-2 bg-slate-950 border-t border-white/5 flex gap-2 overflow-x-auto shrink-0 max-h-24">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group shrink-0 w-20 h-14 rounded-lg overflow-hidden border border-white/10 hover:border-sky-500 transition-all cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img src={photo.dataUrl} alt="Capture" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(photo);
                  }}
                  className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id);
                  }}
                  className="p-1 rounded bg-rose-500/40 hover:bg-rose-500 text-white"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
            <span className="font-mono text-slate-300">{selectedPhoto.path}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(selectedPhoto)}
                className="flex items-center gap-1 px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Disk</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img src={selectedPhoto.dataUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
