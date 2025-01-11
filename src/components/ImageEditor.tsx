import React, { useEffect, useRef, useState } from 'react';
import { OverlayOption } from '../types';
import { Download, Upload, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthModal } from './AuthModal';

interface ImageEditorProps {
  imageUrl: string;
  overlayId: string | null;
  overlays: OverlayOption[];
}

export function ImageEditor({ imageUrl, overlayId, overlays }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [error, setError] = useState('');
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
      link.download = 'shadow-creation.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Unable to download the image. Please try again.');
    }
  };

  const handleUploadToGallery = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setError('');

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      setError('Profile not found. Please try signing in again.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for your creation');
      return;
    }

    try {
      setIsUploading(true);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Create a File object from the blob
      const file = new File([blob], 'creation.png', { type: 'image/png' });

      // Upload to Supabase Storage
      const fileExt = 'png';
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('creations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('creations')
        .getPublicUrl(fileName);

      // Create creation record
      const { error: creationError } = await supabase
        .from('creations')
        .insert({
          title: title.trim(),
          image_url: publicUrl,
          user_id: user.id
        });

      if (creationError) throw creationError;

      alert('Creation shared successfully!');
      setTitle('');
      setShowUploadForm(false);
    } catch (error: any) {
      console.error('Error uploading creation:', error);
      setError(error.message || 'Failed to share creation. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 py-2">
      <div className="w-[400px] h-[400px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-lg shadow-lg"
        />
      </div>
      <div className="flex space-x-4">
        <button
          onClick={handleDownload}
          className="dos-button flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          DOWNLOAD
        </button>
        <button
          onClick={() => setShowUploadForm(true)}
          className="dos-button flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          SHARE TO GALLERY
        </button>
      </div>

      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="dos-card max-w-md w-full">
            <h2 className="text-xl text-green-500 mb-4">SHARE TO GALLERY</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-green-500 mb-1">
                  TITLE
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="dos-input w-full"
                  placeholder="Enter a title for your creation"
                  maxLength={50}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center text-red-500 text-sm bg-red-100 p-2 rounded">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setError('');
                  }}
                  className="dos-button"
                  disabled={isUploading}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleUploadToGallery}
                  className="dos-button flex items-center gap-2"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      SHARING...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      SHARE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}