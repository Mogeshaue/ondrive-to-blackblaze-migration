export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface OneDriveItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string;
}

export interface MigrationJob {
  id: string;
  userId: string;
  userEmail: string;
  selectedItems: OneDriveItem[];
  status: 'starting' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  logs: string[];
  results?: any[];
}

export interface JobStatus {
  id: string;
  status: string;
  progress: number;
  startTime: Date;
  endTime?: Date;
  logs: string[];
}

export interface JobReport extends JobStatus {
  selectedItems: OneDriveItem[];
  results: any[];
}

export interface AuthResponse {
  authUrl: string;
}

export interface LoginResponse {
  jobId: string;
  message: string;
}
