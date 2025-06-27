export interface DocumentPickerResult {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface GeminiPDFResponse {
  extractedText: string;
  normalizedData: any;
  confidence: number;
}

export interface UploadProgress {
  percentage: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}