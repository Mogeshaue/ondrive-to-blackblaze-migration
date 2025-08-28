import axios from 'axios';
import { User, OneDriveItem, JobStatus, JobReport, AuthResponse, LoginResponse } from '../types';

// Configure axios defaults
axios.defaults.withCredentials = true;

const API_BASE = '/api';

export const api = {
  // Authentication
  getAuthUrl: async (): Promise<AuthResponse> => {
    const response = await axios.get(`${API_BASE}/auth/login`);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await axios.get(`${API_BASE}/auth/me`);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Don't follow redirects, just make the request
    await axios.get(`${API_BASE}/auth/logout`, {
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
  },

  // OneDrive operations
  listOneDriveItems: async (path: string = '/'): Promise<{ items: OneDriveItem[] }> => {
    const response = await axios.get(`${API_BASE}/onedrive/list`, {
      params: { path }
    });
    return response.data;
  },

  searchOneDriveItems: async (query: string): Promise<{ items: OneDriveItem[] }> => {
    const response = await axios.get(`${API_BASE}/onedrive/search`, {
      params: { query }
    });
    return response.data;
  },

  // Migration operations
  startMigration: async (selectedItems: OneDriveItem[]): Promise<{ manifestId: string; status: string; message: string }> => {
    const response = await axios.post(`${API_BASE}/migrate`, {
      selectedItems
    });
    return response.data;
  },

  getJobStatus: async (manifestId: string): Promise<JobStatus> => {
    const response = await axios.get(`${API_BASE}/migrate/${manifestId}/status`);
    return response.data;
  },

  getJobLogs: async (manifestId: string): Promise<{ logs: string }> => {
    const response = await axios.get(`${API_BASE}/migrate/${manifestId}/logs`);
    return response.data;
  },

  getJobReport: async (jobId: string): Promise<JobReport> => {
    const response = await axios.get(`${API_BASE}/migrate/${jobId}/report`);
    return response.data;
  },

  verifyMigration: async (jobId: string): Promise<any> => {
    const response = await axios.post(`${API_BASE}/migrate/${jobId}/verify`);
    return response.data;
  }
};

export default api;
