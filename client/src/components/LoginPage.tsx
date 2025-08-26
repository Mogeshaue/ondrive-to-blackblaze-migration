import React from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
} from '@mui/material';
import { Microsoft } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Check for error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const logoutParam = urlParams.get('logout');
    
    if (logoutParam === 'success') {
      setSuccess('Successfully logged out. You can now sign in with a different account.');
      setError(null);
    } else if (errorParam) {
      switch (errorParam) {
        case 'oauth_error':
          setError('OAuth authentication error. Please try again.');
          break;
        case 'no_code':
          setError('Authentication code not received. Please try again.');
          break;
        case 'auth_failed':
          setError('Authentication failed. Please check your credentials and try again.');
          break;
        default:
          setError('Authentication failed. Please try again.');
      }
    }
  }, []);

  const handleLogin = () => {
    setError(null);
    login();
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            width: '100%',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            OneDrive to B2 Migration
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Securely migrate your files from Microsoft OneDrive to Backblaze B2
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<Microsoft />}
            onClick={handleLogin}
            sx={{
              backgroundColor: '#2f2f2f',
              '&:hover': {
                backgroundColor: '#1f1f1f',
              },
              px: 4,
              py: 1.5,
            }}
          >
            Sign in with Microsoft
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            You will be redirected to Microsoft to sign in securely
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
