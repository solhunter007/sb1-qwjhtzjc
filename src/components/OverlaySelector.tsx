import React, { useRef } from 'react';
import { OverlayOption } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OverlaySelectorProps {
  overlays: OverlayOption[];
  selectedOverlay: string | null;
  onOverlaySelect: (overlayId: string) => void;
}

export function OverlaySelector({ overlays, selectedOverlay, onOverlaySelect }: OverlaySelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const targetScroll = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  if (overlays.length === 0) {
    return (
      <div className="text-center mt-4 p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No overlays available. Please add some overlays in the admin panel.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 relative flex items-center">
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 z-10 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition-colors"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-6 h-6 text-gray-700" />
      </button>

      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden scrollbar-hide mx-12"
      >
        <div className="flex gap-4 min-w-min px-2">
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              className={`flex-none w-40 p-2 border rounded-lg cursor-pointer transition-all ${
                selectedOverlay === overlay.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-white'
              }`}
              onClick={() => onOverlaySelect(overlay.id)}
            >
              <div className="aspect-square mb-2 overflow-hidden rounded-md">
                <img
                  src={overlay.imageUrl}
                  alt={overlay.name}
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <h3 className="font-medium text-gray-800 truncate text-sm">{overlay.name}</h3>
              <p className="text-xs text-gray-500 truncate">{overlay.description}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 z-10 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition-colors"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-6 h-6 text-gray-700" />
      </button>
    </div>
  );
}