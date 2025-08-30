import { io, Socket } from 'socket.io-client';

// Get backend URL from environment or default to relative URL in development
const getBackendUrl = () => {
  // In development with Docker Compose, use proxy via relative path
  if (import.meta.env.DEV) {
    return window.location.origin;  // Let the proxy handle it
  }
  
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // In production, use the same origin as the frontend
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Default for development
  return 'http://localhost:3000';
};

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(getBackendUrl(), {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinJob(jobId: string): void {
    if (this.socket) {
      console.log('Joining job room:', jobId);
      this.socket.emit('join-job', jobId);
    } else {
      console.error('Socket not connected, cannot join job');
    }
  }

  onProgress(callback: (data: { jobId: string; progress: number }) => void): void {
    if (this.socket) {
      this.socket.on('progress', callback);
    }
  }

  onLog(callback: (data: { jobId: string; message: string }) => void): void {
    if (this.socket) {
      this.socket.on('log', callback);
    }
  }

  onDone(callback: (data: { jobId: string; status: string; code?: number; error?: string }) => void): void {
    if (this.socket) {
      this.socket.on('done', callback);
    }
  }

  onUpdate(callback: (data: { jobId: string; message: string }) => void): void {
    if (this.socket) {
      this.socket.on('update', callback);
    }
  }

  offProgress(): void {
    if (this.socket) {
      this.socket.off('progress');
    }
  }

  offLog(): void {
    if (this.socket) {
      this.socket.off('log');
    }
  }

  offDone(): void {
    if (this.socket) {
      this.socket.off('done');
    }
  }

  offUpdate(): void {
    if (this.socket) {
      this.socket.off('update');
    }
  }
}

export const socketService = new SocketService();
export default socketService;
