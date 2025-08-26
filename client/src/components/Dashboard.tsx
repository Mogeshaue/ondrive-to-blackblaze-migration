import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Alert,
} from '@mui/material';
import { Logout, Person } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import FileExplorer from './FileExplorer';
import MigrationPanel from './MigrationPanel';
import { OneDriveItem } from '../types';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedItems, setSelectedItems] = useState<OneDriveItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSelectionChange = (items: OneDriveItem[]) => {
    setSelectedItems(items);
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      setError('Failed to logout');
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            OneDrive to B2 Migration
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" />
              <Typography variant="body2">
                {user?.displayName || user?.email}
              </Typography>
            </Box>
            
            <Button
              color="inherit"
              startIcon={<Logout />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth={false} sx={{ flex: 1, py: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
          {/* File Explorer - 80% width */}
          <Grid item xs={12} md={10}>
            <FileExplorer
              selectedItems={selectedItems}
              onSelectionChange={handleSelectionChange}
            />
          </Grid>

          {/* Migration Panel - 20% width */}
          <Grid item xs={12} md={2}>
            <MigrationPanel
              selectedItems={selectedItems}
              onClearSelection={handleClearSelection}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
