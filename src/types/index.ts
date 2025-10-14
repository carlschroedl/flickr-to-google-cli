export interface FlickrPhoto {
  id: string;
  title: string;
  description: string;
  url: string;
  dateTaken: string;
  dateUpload: string;
  tags: string[];
  latitude?: number;
  longitude?: number;
  width: number;
  height: number;
  secret: string;
  server: string;
  farm: number;
}

export interface FlickrAlbum {
  id: string;
  title: string;
  description: string;
  photoCount: number;
  photos: FlickrPhoto[];
  dateCreated: string;
  dateUpdated: string;
}

export interface GooglePhoto {
  id: string;
  filename: string;
  mimeType: string;
  description?: string;
  creationTime: string;
  width: number;
  height: number;
  latitude?: number;
  longitude?: number;
}

export interface GoogleAlbum {
  id: string;
  title: string;
  description?: string;
  mediaItemsCount: number;
  coverPhotoBaseUrl?: string;
  isWriteable: boolean;
}

export interface TransferOptions {
  albumId?: string;
  dryRun?: boolean;
  batchSize?: number;
  dataDirectory?: string;
}

export interface TransferJob {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  albumId: string;
  albumTitle: string;
  totalPhotos: number;
  processedPhotos: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export interface ApiCredentials {
  google: {
    clientId: string;
    clientSecret: string;
    refreshToken?: string;
    accessToken?: string;
    tokenExpiry?: number;
  };
}

export interface Config {
  credentials: ApiCredentials;
  defaultBatchSize: number;
  maxRetries: number;
  retryDelay: number;
}
