import axios from 'axios';
import { User, OneDriveItem, JobStatus, JobReport, AuthResponse } from '../types';
import { getApiPath } from './config';

// Configure axios defaults
axios.defaults.withCredentials = true;

export const api = {
  // Authentication
  getAuthUrl: async (): Promise<AuthResponse> => {
    const response = await axios.get(getApiPath('/auth/login'));
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await axios.get(getApiPath('/auth/me'));
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Don't follow redirects, just make the request
    await axios.get(getApiPath('/auth/logout'), {
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
  },

  // OneDrive operations
  listOneDriveItems: async (path: string = '/'): Promise<{ items: OneDriveItem[] }> => {
    const response = await axios.get(getApiPath('/onedrive/list'), {
      params: { path }
    });
    return response.data;
  },

  searchOneDriveItems: async (query: string): Promise<{ items: OneDriveItem[] }> => {
    const response = await axios.get(getApiPath('/onedrive/search'), {
      params: { query }
    });
    return response.data;
  },

  // Migration operations
  startMigration: async (selectedItems: OneDriveItem[]): Promise<{ manifestId: string; status: string; message: string }> => {
    const response = await axios.post(getApiPath('/migrate'), {
      selectedItems
    });
    return response.data;
  },

  getJobStatus: async (manifestId: string): Promise<JobStatus> => {
    const response = await axios.get(getApiPath(`/migrate/${manifestId}/status`));
    return response.data;
  },

  getJobLogs: async (manifestId: string): Promise<{ logs: string }> => {
    const response = await axios.get(getApiPath(`/migrate/${manifestId}/logs`));
    return response.data;
  },

  getJobReport: async (jobId: string): Promise<JobReport> => {
    const response = await axios.get(getApiPath(`/migrate/${jobId}/report`));
    return response.data;
  },

  verifyMigration: async (jobId: string): Promise<any> => {
    const response = await axios.post(getApiPath(`/migrate/${jobId}/verify`));
    return response.data;
  }
};

export default api;
