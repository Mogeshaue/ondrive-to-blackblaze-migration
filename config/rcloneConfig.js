const os = require('os');
const path = require('path');
const fs = require('fs');

class RcloneConfig {
    constructor() {
        this.isDocker = this.detectDockerEnvironment();
        this.isWindows = os.platform() === 'win32';
        this.isLinux = os.platform() === 'linux';
    }

    detectDockerEnvironment() {
        // Check if running inside Docker container
        try {
            return fs.existsSync('/.dockerenv') || 
                   process.env.DOCKER_CONTAINER === 'true' ||
                   (fs.existsSync('/proc/1/cgroup') && 
                    fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));
        } catch (error) {
            return false;
        }
    }

    getRclonePath() {
        // 1. Check if environment variable is set (manual override)
        if (process.env.RCLONE_PATH) {
            return process.env.RCLONE_PATH;
        }

        // 2. Auto-detect based on environment
        if (this.isDocker) {
            // Inside Docker container (Linux)
            return '/usr/local/bin/rclone';
        } else if (this.isWindows) {
            // Windows - try common installation paths
            const possiblePaths = [
                // WinGet installation (most common)
                this.findWinGetRclone(),
                // Chocolatey installation
                'C:\\ProgramData\\chocolatey\\bin\\rclone.exe',
                // Manual installation
                'C:\\Program Files\\rclone\\rclone.exe',
                // Portable installation
                path.join(process.cwd(), 'bin', 'rclone.exe'),
                // System PATH
                'rclone.exe'
            ].filter(Boolean); // Remove null/undefined values

            for (const rclonePath of possiblePaths) {
                try {
                    if (fs.existsSync(rclonePath)) {
                        return rclonePath;
                    }
                } catch (error) {
                    // Continue to next path
                }
            }

            return 'rclone.exe'; // Fallback to PATH
        } else {
            // Linux/Mac - try common paths
            const possiblePaths = [
                '/usr/local/bin/rclone',
                '/usr/bin/rclone',
                '/bin/rclone',
                'rclone'
            ];

            for (const rclonePath of possiblePaths) {
                try {
                    if (fs.existsSync(rclonePath)) {
                        return rclonePath;
                    }
                } catch (error) {
                    // Continue to next path
                }
            }

            return 'rclone'; // Fallback to PATH
        }
    }

    findWinGetRclone() {
        // Specifically look for WinGet rclone installations
        try {
            const wingetBase = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
            
            if (fs.existsSync(wingetBase)) {
                const packages = fs.readdirSync(wingetBase);
                const rclonePackage = packages.find(pkg => pkg.includes('Rclone.Rclone'));
                
                if (rclonePackage) {
                    const packagePath = path.join(wingetBase, rclonePackage);
                    const contents = fs.readdirSync(packagePath);
                    const rcloneDir = contents.find(dir => dir.startsWith('rclone-') && dir.includes('windows'));
                    
                    if (rcloneDir) {
                        const rclonePath = path.join(packagePath, rcloneDir, 'rclone.exe');
                        if (fs.existsSync(rclonePath)) {
                            return rclonePath;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Could not auto-detect WinGet rclone installation:', error.message);
        }

        return null;
    }

    getRcloneConfigPath() {
        // 1. Check if environment variable is set (manual override)
        if (process.env.RCLONE_CONFIG_PATH) {
            return process.env.RCLONE_CONFIG_PATH;
        }

        // 2. Auto-detect based on environment
        if (this.isDocker) {
            // Inside Docker container
            return '/app/.config/rclone/rclone.conf';
        } else {
            // Local environment - use project directory
            return path.join(process.cwd(), 'server', 'data', 'rclone.conf');
        }
    }

    getConfig() {
        const config = {
            rclonePath: this.getRclonePath(),
            rcloneConfigPath: this.getRcloneConfigPath(),
            environment: this.isDocker ? 'docker' : (this.isWindows ? 'windows' : 'linux'),
            isDocker: this.isDocker,
            isWindows: this.isWindows,
            isLinux: this.isLinux
        };

        console.log('🔧 Rclone Configuration Detected:');
        console.log(`   Environment: ${config.environment}`);
        console.log(`   Rclone Path: ${config.rclonePath}`);
        console.log(`   Config Path: ${config.rcloneConfigPath}`);
        
        return config;
    }

    validateRclone() {
        const config = this.getConfig();
        
        // Check if rclone executable exists and is accessible
        try {
            // For Docker, we trust that rclone is installed correctly
            if (!this.isDocker) {
                if (!fs.existsSync(config.rclonePath) && config.rclonePath !== 'rclone.exe' && config.rclonePath !== 'rclone') {
                    throw new Error(`Rclone executable not found at: ${config.rclonePath}`);
                }
            }
            
            // Ensure config directory exists
            const configDir = path.dirname(config.rcloneConfigPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
                console.log(`✅ Created rclone config directory: ${configDir}`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Rclone validation failed:', error.message);
            throw error;
        }
    }
}

module.exports = new RcloneConfig();
