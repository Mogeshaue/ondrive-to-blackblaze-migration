import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Checkbox,
  Typography,
  Breadcrumbs,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Folder,
  InsertDriveFile,
  Search,
  Refresh,
  NavigateNext,
} from '@mui/icons-material';
import { OneDriveItem } from '../types';
import api from '../services/api';

interface FileExplorerProps {
  selectedItems: OneDriveItem[];
  onSelectionChange: (items: OneDriveItem[]) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  selectedItems,
  onSelectionChange,
}) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OneDriveItem[]>([]);
  const [searching, setSearching] = useState(false);

  const loadItems = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listOneDriveItems(path);
      setItems(response.items);
    } catch (err) {
      setError('Failed to load items');
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchItems = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await api.searchOneDriveItems(query);
      setSearchResults(response.items);
    } catch (err) {
      setError('Failed to search items');
      console.error('Error searching items:', err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    loadItems(currentPath);
  }, [currentPath]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchItems(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleItemClick = (item: OneDriveItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
    }
  };

  const handleItemToggle = (item: OneDriveItem) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getBreadcrumbPaths = () => {
    const paths = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Root', path: '/' }];
    
    let currentPathBuilder = '';
    paths.forEach(path => {
      currentPathBuilder += `/${path}`;
      breadcrumbs.push({ name: path, path: currentPathBuilder });
    });
    
    return breadcrumbs;
  };

  const displayItems = searchQuery ? searchResults : items;

  return (
    <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          OneDrive Files
        </Typography>
        
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: searching && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Breadcrumbs */}
        {!searchQuery && (
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            {getBreadcrumbPaths().map((breadcrumb, index) => (
              <Typography
                key={index}
                color={index === getBreadcrumbPaths().length - 1 ? 'text.primary' : 'inherit'}
                sx={{
                  cursor: index === getBreadcrumbPaths().length - 1 ? 'default' : 'pointer',
                  '&:hover': {
                    textDecoration: index === getBreadcrumbPaths().length - 1 ? 'none' : 'underline',
                  },
                }}
                onClick={() => handleBreadcrumbClick(breadcrumb.path)}
              >
                {breadcrumb.name}
              </Typography>
            ))}
          </Breadcrumbs>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading && !searching && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && !searching && displayItems.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery ? 'No search results found' : 'No items in this folder'}
            </Typography>
          </Box>
        )}

        <List>
          {displayItems.map((item) => {
            const isSelected = selectedItems.some(selected => selected.id === item.id);
            
            return (
              <ListItem
                key={item.id}
                disablePadding
                secondaryAction={
                  <Checkbox
                    edge="end"
                    checked={isSelected}
                    onChange={() => handleItemToggle(item)}
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              >
                <ListItemButton
                  onClick={() => handleItemClick(item)}
                  sx={{ pl: 2 }}
                >
                  <ListItemIcon>
                    {item.type === 'folder' ? <Folder color="primary" /> : <InsertDriveFile />}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={
                      <>
                        {item.type === 'file' && item.size && (
                          <Typography variant="caption" display="block">
                            {formatFileSize(item.size)}
                          </Typography>
                        )}
                        {item.lastModified && (
                          <Typography variant="caption" display="block">
                            Modified: {formatDate(item.lastModified)}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {selectedItems.length} item(s) selected
          </Typography>
          <IconButton
            size="small"
            onClick={() => loadItems(currentPath)}
            disabled={loading}
          >
            <Refresh />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default FileExplorer;
