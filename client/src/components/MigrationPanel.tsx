import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  PlayArrow,
  ExpandMore,
  ExpandLess,
  CloudUpload,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { OneDriveItem, JobStatus } from '../types';
import api from '../services/api';
import socketService from '../services/socket';

interface MigrationPanelProps {
  selectedItems: OneDriveItem[];
  onClearSelection: () => void;
}

const MigrationPanel: React.FC<MigrationPanelProps> = ({
  selectedItems,
  onClearSelection,
}) => {
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Set up event listeners
    socketService.onProgress((data) => {
      if (currentJob && data.jobId === currentJob.id) {
        setCurrentJob(prev => prev ? { ...prev, progress: data.progress } : null);
      }
    });

    socketService.onLog((data) => {
      if (currentJob && data.jobId === currentJob.id) {
        setLogs(prev => [...prev, data.message]);
      }
    });

    socketService.onDone((data) => {
      if (currentJob && data.jobId === currentJob.id) {
        setCurrentJob(prev => prev ? { ...prev, status: data.status } : null);
        if (data.status === 'completed') {
          onClearSelection();
        }
      }
    });

    return () => {
      socketService.offProgress();
      socketService.offLog();
      socketService.offDone();
    };
  }, [currentJob, onClearSelection]);

  const startMigration = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to migrate');
      return;
    }

    setError(null);
    setLogs([]);
    setLogsExpanded(true);

    try {
      const response = await api.startMigration(selectedItems);
      const jobId = response.jobId;

      // Join the job room for real-time updates
      socketService.joinJob(jobId);

      // Create initial job status
      const jobStatus: JobStatus = {
        id: jobId,
        status: 'starting',
        progress: 0,
        startTime: new Date(),
        logs: [],
      };

      setCurrentJob(jobStatus);
    } catch (err) {
      setError('Failed to start migration');
      console.error('Migration start error:', err);
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle />;
      case 'failed':
        return <Error />;
      case 'running':
        return <CloudUpload />;
      default:
        return <CloudUpload />;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const totalSize = selectedItems.reduce((sum, item) => sum + (item.size || 0), 0);

  return (
    <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Migration Control
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {selectedItems.length} item(s) selected
          </Typography>
          <Chip
            label={formatFileSize(totalSize)}
            size="small"
            variant="outlined"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {currentJob && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getStatusIcon(currentJob.status)}
              <Typography variant="body2" sx={{ ml: 1 }}>
                Status: {currentJob.status}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={currentJob.progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary">
              {currentJob.progress}% complete
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          startIcon={<PlayArrow />}
          onClick={startMigration}
          disabled={selectedItems.length === 0 || (currentJob?.status === 'running')}
          sx={{ mb: 1 }}
        >
          Start Migration
        </Button>

        <Button
          variant="outlined"
          fullWidth
          onClick={onClearSelection}
          disabled={selectedItems.length === 0}
        >
          Clear Selection
        </Button>
      </Box>

      {/* Selected Items */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Items:
          </Typography>
          
          {selectedItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items selected
            </Typography>
          ) : (
            <List dense>
              {selectedItems.slice(0, 10).map((item) => (
                <ListItem key={item.id} sx={{ px: 0 }}>
                  <ListItemText
                    primary={item.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {item.type === 'file' ? 'File' : 'Folder'}
                        </Typography>
                        {item.size && (
                          <Typography variant="caption" display="block">
                            {formatFileSize(item.size)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {selectedItems.length > 10 && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={`... and ${selectedItems.length - 10} more items`}
                    sx={{ fontStyle: 'italic' }}
                  />
                </ListItem>
              )}
            </List>
          )}
        </Box>

        {/* Logs */}
        {currentJob && (
          <>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: 1,
                }}
                onClick={() => setLogsExpanded(!logsExpanded)}
              >
                <Typography variant="subtitle2">
                  Migration Logs
                </Typography>
                <IconButton size="small">
                  {logsExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={logsExpanded}>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    backgroundColor: 'grey.50',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  {logs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No logs yet...
                    </Typography>
                  ) : (
                    logs.map((log, index) => (
                      <Typography
                        key={index}
                        variant="caption"
                        component="div"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          mb: 0.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        {log}
                      </Typography>
                    ))
                  )}
                </Box>
              </Collapse>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default MigrationPanel;
