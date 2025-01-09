import React, { useEffect, useRef } from 'react';
import { OverlayOption } from '../types';
import { Download } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  overlayId: string | null;
  overlays: OverlayOption[];
}

export function ImageEditor({ imageUrl, overlayId, overlays }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CANVAS_SIZE = 400;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const baseImage = new Image();
    baseImage.crossOrigin = 'anonymous';
    baseImage.src = imageUrl;
    baseImage.onload = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (overlayId) {
        const overlay = overlays.find((o) => o.id === overlayId);
        if (overlay) {
          const overlayImage = new Image();
          overlayImage.crossOrigin = 'anonymous';
          overlayImage.src = overlay.imageUrl;
          overlayImage.onload = () => {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(overlayImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            ctx.globalAlpha = 1.0;
          };
        }
      }
    };
  }, [imageUrl, overlayId, overlays]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Unable to download the image. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2 py-2">
      <div className="w-[400px] h-[400px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-lg shadow-lg"
        />
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Download className="w-5 h-5" />
        Download Image
      </button>
    </div>
  );
}