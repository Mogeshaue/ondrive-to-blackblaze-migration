import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Grid,
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
} from '@mui/icons-material';
import { OneDriveItem, JobStatus } from '../types';
import api from '../services/api';

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
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [migrationStats, setMigrationStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    transferredFiles: 0,
    transferredSize: 0,
    failedFiles: 0,
    speed: '0 MB/s',
    eta: '--',
    startTime: null as Date | null,
  });

  useEffect(() => {
    // Poll for job status updates
    let pollInterval: NodeJS.Timeout;
    
    if (currentJob && currentJob.status !== 'completed' && currentJob.status !== 'failed') {
      pollInterval = setInterval(async () => {
        try {
          const status = await api.getJobStatus(currentJob.id);
          setCurrentJob(prev => prev ? { ...prev, ...status } : null);
          
          // Get logs
          const logsResponse = await api.getJobLogs(currentJob.id);
          if (logsResponse.logs) {
            setLogs(logsResponse.logs.split('\n').filter(line => line.trim()));
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



  const startMigration = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to migrate');
      return;
    }

    setError(null);
    setLogs([]);
    setLogsExpanded(true);
    setMigrationStats(prev => ({
      ...prev,
      totalFiles: selectedItems.length,
      totalSize: selectedItems.reduce((sum, item) => sum + (item.size || 0), 0),
      transferredFiles: 0,
      transferredSize: 0,
      startTime: new Date(),
    }));

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
            
            <LinearProgress 
              variant="determinate" 
              value={currentJob.progress} 
              sx={{ mb: 2 }}
            />
            
            <Typography variant="body2" color="text.secondary">
              Progress: {currentJob.progress}%
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Migration Statistics */}
      {currentJob && currentJob.status === 'running' && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Speed</Typography>
                <Typography variant="h6">{migrationStats.speed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">ETA</Typography>
                <Typography variant="h6">{migrationStats.eta}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Transferred</Typography>
                <Typography variant="h6">{formatBytes(migrationStats.transferredSize)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Duration</Typography>
                <Typography variant="h6">
                  {migrationStats.startTime ? 
                    Math.floor((Date.now() - migrationStats.startTime.getTime()) / 1000) + 's' : 
                    '--'
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        {!currentJob && (
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={startMigration}
            disabled={selectedItems.length === 0}
          >
            Start Migration
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
