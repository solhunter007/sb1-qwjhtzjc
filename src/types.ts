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

export interface Creation {
  id: string;
  title: string;
  imageUrl: string;
  userId: string;
  username: string;
  createdAt: string;
  votesCount: number;
  hasVoted?: boolean;
}

export interface Vote {
  id: string;
  creationId: string;
  userId: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  username: string;
  createdAt: string;
}