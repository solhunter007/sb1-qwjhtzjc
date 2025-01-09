import React, { useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(Math.abs(img.width - img.height) < 2); // Allow 1px difference for rounding
      };
    });
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const isSquare = await validateImage(file);
    if (!isSquare) {
      alert('Please upload a square image (1:1 ratio).');
      return;
    }

    onImageSelect(file);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        await handleImageFile(file);
      }
    },
    [onImageSelect]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleImageFile(file);
      }
    },
    [onImageSelect]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer aspect-square max-w-md mx-auto"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700">
            Drop your square image here or click to upload
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports JPG, PNG and GIF files
          </p>
        </label>
      </div>
      
      <div className="flex items-center justify-center text-amber-600 bg-amber-50 p-4 rounded-lg">
        <AlertCircle className="w-5 h-5 mr-2" />
        <p className="text-sm">Only square images (1:1 ratio) are supported</p>
      </div>
    </div>
  );
}