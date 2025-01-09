export interface OverlayOption {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

export interface BaseImage {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

export interface ImageState {
  file: File | null;
  preview: string | null;
  overlayId: string | null;
}