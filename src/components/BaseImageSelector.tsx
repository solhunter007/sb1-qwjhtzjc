import React, { useMemo } from 'react';
import { BaseImage } from '../types';
import { Upload } from 'lucide-react';

interface BaseImageSelectorProps {
  baseImages: BaseImage[];
  onBaseImageSelect: (imageUrl: string) => void;
  onCustomImageSelect: (file: File) => void;
}

export function BaseImageSelector({ baseImages, onBaseImageSelect, onCustomImageSelect }: BaseImageSelectorProps) {
  // Shuffle the base images using Fisher-Yates algorithm
  const shuffledImages = useMemo(() => {
    const shuffled = [...baseImages];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [baseImages]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isSquare = await validateImage(file);
      if (!isSquare) {
        alert('Please upload a square image (1:1 ratio).');
        return;
      }
      onCustomImageSelect(file);
    }
  };

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(Math.abs(img.width - img.height) < 2);
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-green-500 mb-6">CHOOSE YOUR MODEL OR UPLOAD YOUR OWN</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload custom image card */}
        <div className="relative group">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="customImageInput"
          />
          <label
            htmlFor="customImageInput"
            className="block aspect-square bg-black border-2 border-green-500 rounded-lg p-4 hover:bg-green-900 transition-colors cursor-pointer"
          >
            <div className="h-full flex flex-col items-center justify-center text-green-500">
              <Upload className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">UPLOAD YOUR OWN</p>
              <p className="text-sm mt-2">SQUARE IMAGES ONLY (1:1)</p>
            </div>
          </label>
        </div>

        {/* Existing base images */}
        {shuffledImages.map((image) => (
          <div
            key={image.id}
            onClick={() => onBaseImageSelect(image.imageUrl)}
            className="cursor-pointer group"
          >
            <div className="aspect-square rounded-lg overflow-hidden border-2 border-green-500 hover:border-green-400 transition-all">
              <img
                src={image.imageUrl}
                alt={image.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-2">
              <h3 className="font-medium text-green-500 group-hover:text-green-400 transition-colors">
                {image.name}
              </h3>
              <p className="text-sm text-green-600">{image.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}