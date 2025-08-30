import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Chip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Error,
  Info,
  Refresh,
  Stop,
  CloudDone,
} from '@mui/icons-material';
import { OneDriveItem, JobStatus } from '../types';
import api from '../services/api';

interface MigrationPanelProps {
  selectedItems: OneDriveItem[];
  onClearSelection: () => void;
}

interface MigratedFile {
  name: string;
  size: number;
  status: 'success' | 'failed';
  transferTime?: number;
}

const MigrationPanel: React.FC<MigrationPanelProps> = ({
  selectedItems,
  onClearSelection,
}) => {
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [migratedFiles, setMigratedFiles] = useState<MigratedFile[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Poll for job status updates
    let pollInterval: ReturnType<typeof setInterval>;
    
    if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'failed') {
      pollInterval = setInterval(async () => {
        try {
          const status = await api.getJobStatus(currentJob.id);
          setCurrentJob(prev => prev ? { ...prev, ...status } : null);
          
          // Get logs
          const logsResponse = await api.getJobLogs(currentJob.id);
          if (logsResponse.logs) {
            const newLogs = logsResponse.logs.split('\n').filter(line => line.trim());
            setLogs(newLogs);
            
            // Parse migrated files from logs
            parseMigratedFiles(newLogs);
          }
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Failed to poll job status:', error);
        }
      }, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentJob, onClearSelection]);

  const parseMigratedFiles = (logLines: string[]) => {
    const files: MigratedFile[] = [];
    
    logLines.forEach(line => {
      // Look for successful file transfers in rclone output
      if (line.includes('Transferred:') && line.includes('100%')) {
        // Extract filename from the line
        const filenameMatch = line.match(/\*\s+(.+?):\s+\d+%\/[\d.]+[KMGT]?iB/);
        if (filenameMatch) {
          const filename = filenameMatch[1].trim();
          // Find the original file size from selectedItems
          const originalFile = selectedItems.find(item => item.name === filename);
          
          files.push({
            name: filename,
            size: originalFile?.size || 0,
            status: 'success',
            transferTime: Date.now(), // Approximate transfer time
          });
        }
      }
    });
    
    if (files.length > 0) {
      setMigratedFiles(prev => {
        // Merge with existing files, avoiding duplicates
        const existingNames = new Set(prev.map(f => f.name));
        const newFiles = files.filter(f => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });
    }
  };

  const startMigration = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to migrate');
      return;
    }

    if (isStarting) {
      return; // Prevent double-clicking
    }

    setIsStarting(true);
    setError(null);
    setLogs([]);
    setMigratedFiles([]);
    setLogsExpanded(true);

    try {
      console.log('Starting migration with items:', selectedItems);
      const response = await api.startMigration(selectedItems);
      const manifestId = response.manifestId;
      console.log('Migration started with manifest ID:', manifestId);

      // Create initial job status
      const jobStatus: JobStatus = {
        id: manifestId,
        status: response.status || 'starting',
        progress: 0,
        startTime: new Date(),
        logs: [],
      };

      setCurrentJob(jobStatus);
    } catch (err: any) {
      console.error('Migration start error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to start migration';
      setError(errorMessage);
    } finally {
      setIsStarting(false);
    }
  };

  const verifyMigration = async () => {
    if (!currentJob) return;
    
    try {
      await api.verifyMigration(currentJob.id);
      setLogs(prev => [...prev, 'Verification started...']);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to start verification';
      setError(errorMessage);
    }
  };

  const retryMigration = () => {
    setShowRetryDialog(false);
    setCurrentJob(null);
    setLogs([]);
    setMigratedFiles([]);
    setError(null);
    startMigration();
  };

  const stopMigration = () => {
    // TODO: Implement stop functionality
    setLogs(prev => [...prev, 'Stop requested (not implemented yet)']);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'failed': return <Error color="error" />;
      case 'running': return <CircularProgress size={20} />;
      default: return <Info color="info" />;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" component="h2">
          Migration Control
        </Typography>
        <Chip 
          label={`${selectedItems.length} items selected`} 
          color="primary" 
          variant="outlined" 
        />
      </Box>

      {/* Migration Status */}
      {currentJob && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {getStatusIcon(currentJob.status)}
              <Typography variant="h6">
                Migration {currentJob.status === 'running' ? 'In Progress' : currentJob.status}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Job ID: {currentJob.id}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Files Migrated Section */}
      {migratedFiles.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CloudDone color="success" />
              <Typography variant="h6">
                Files Migrated ({migratedFiles.length})
              </Typography>
            </Box>
            
            <List dense>
              {migratedFiles.map((file, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {file.name}
                          </Typography>
                          <Chip 
                            label={file.status} 
                            color={file.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Size: {formatBytes(file.size)}
                          </Typography>
                          {file.transferTime && (
                            <Typography variant="body2" color="text.secondary">
                              Completed: {new Date(file.transferTime).toLocaleTimeString()}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < migratedFiles.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        {!currentJob && (
          <Button
            variant="contained"
            startIcon={isStarting ? <CircularProgress size={16} /> : <PlayArrow />}
            onClick={startMigration}
            disabled={selectedItems.length === 0 || isStarting}
          >
            {isStarting ? 'Starting...' : 'Start Migration'}
          </Button>
        )}
        
        {currentJob && currentJob.status === 'running' && (
          <>
            <Button
              variant="outlined"
              startIcon={<Stop />}
              onClick={stopMigration}
              color="warning"
            >
              Stop
            </Button>
          </>
        )}
        
        {currentJob && currentJob.status === 'completed' && (
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={verifyMigration}
          >
            Verify Migration
          </Button>
        )}
        
        {currentJob && currentJob.status === 'failed' && (
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => setShowRetryDialog(true)}
            color="error"
          >
            Retry
          </Button>
        )}
        
        <Button
          variant="outlined"
          onClick={onClearSelection}
        >
          Clear Selection
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6">Migration Logs</Typography>
              <IconButton onClick={() => setLogsExpanded(!logsExpanded)}>
                {logsExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={logsExpanded}>
              <Box 
                sx={{ 
                  maxHeight: 300, 
                  overflow: 'auto', 
                  bgcolor: 'grey.50', 
                  p: 1, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                {logs.map((log, index) => (
                  <Box key={index} sx={{ mb: 0.5 }}>
                    <Typography 
                      variant="body2" 
                      color={log.includes('ERROR') ? 'error' : log.includes('✅') ? 'success' : 'text.primary'}
                    >
                      {log}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Retry Dialog */}
      <Dialog open={showRetryDialog} onClose={() => setShowRetryDialog(false)}>
        <DialogTitle>Retry Migration?</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to retry the migration with the same files?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRetryDialog(false)}>Cancel</Button>
          <Button onClick={retryMigration} variant="contained">Retry</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default MigrationPanel;
