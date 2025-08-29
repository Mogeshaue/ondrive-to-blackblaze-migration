const fs = require('fs');
const path = require('path');

// Path to the rclone config file
const configPath = path.join(__dirname, 'server', 'data', 'rclone.conf');

try {
  // Read the current config
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Parse the config to find the working token
  const lines = configContent.split('\n');
  let workingToken = null;
  let workingDriveType = null;
  let workingDriveId = null;
  
  // Find the working token from the specific OneDrive remote
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '[onedrive-e1c943b6-11ac-4425-a9f2-f24ee05854f5]') {
      // Found the working remote, extract its token
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().startsWith('[') && lines[j].trim().endsWith(']')) {
          break; // Next section
        }
        if (lines[j].trim().startsWith('token = ')) {
          workingToken = lines[j].trim();
        }
        if (lines[j].trim().startsWith('drive_type = ')) {
          workingDriveType = lines[j].trim();
        }
        if (lines[j].trim().startsWith('drive_id = ')) {
          workingDriveId = lines[j].trim();
        }
      }
      break;
    }
  }
  
  if (!workingToken) {
    console.error('No working token found in the config file');
    process.exit(1);
  }
  
  console.log('Found working token from onedrive-e1c943b6-11ac-4425-a9f2-f24ee05854f5');
  console.log('Token:', workingToken.substring(0, 50) + '...');
  
  // Update the main [onedrive] section
  let updatedConfig = '';
  let inOnedriveSection = false;
  let skipUntilNextSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '[onedrive]') {
      inOnedriveSection = true;
      skipUntilNextSection = false;
      updatedConfig += lines[i] + '\n';
      continue;
    }
    
    if (inOnedriveSection) {
      if (line.startsWith('[') && line.endsWith(']')) {
        // Next section reached
        inOnedriveSection = false;
        updatedConfig += lines[i] + '\n';
        continue;
      }
      
      if (line.startsWith('token = ')) {
        // Replace the expired token with the working one
        updatedConfig += workingToken + '\n';
        console.log('Updated token in [onedrive] section');
        continue;
      }
      
      if (line.startsWith('drive_type = ')) {
        // Update drive_type if needed
        updatedConfig += workingDriveType + '\n';
        console.log('Updated drive_type in [onedrive] section');
        continue;
      }
      
      if (line.startsWith('drive_id = ')) {
        // Update drive_id if needed
        updatedConfig += workingDriveId + '\n';
        console.log('Updated drive_id in [onedrive] section');
        continue;
      }
      
      // Keep other lines as they are
      updatedConfig += lines[i] + '\n';
    } else {
      updatedConfig += lines[i] + '\n';
    }
  }
  
  // Write the updated config back
  fs.writeFileSync(configPath, updatedConfig);
  console.log('Successfully updated rclone config with working token');
  
  // Also update the global rclone config
  const globalConfigPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'rclone', 'rclone.conf');
  if (fs.existsSync(globalConfigPath)) {
    fs.writeFileSync(globalConfigPath, updatedConfig);
    console.log('Also updated global rclone config');
  }
  
} catch (error) {
  console.error('Error updating rclone config:', error);
  process.exit(1);
}







