// API Configuration
export const getApiBaseUrl = (): string => {
  // In development with Docker Compose, use proxy
  if (import.meta.env.DEV) {
    return '';  // Use relative URLs, Vite will proxy to backend
  }
  
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // In production, use the same origin as the frontend
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Fallback for development
  return 'http://localhost:3000';
};

// Get the full API path
export const getApiPath = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  
  if (baseUrl === '') {
    // Use relative URLs for proxy
    return `/api${apiPath}`;
  }
  
  return `${baseUrl}/api${apiPath}`;
};
