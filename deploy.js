#!/usr/bin/env node

/**
 * Secure Deployment Script
 *
 * This script helps prepare the project for secure customer deployment/testing.
 * It implements several security measures:
 * 1. Code obfuscation
 * 2. Trial license setup
 * 3. Security hardening
 * 4. Container deployment preparation
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

// Configuration
const config = {
  projectName: 'Scheduling System',
  trialDays: 14,
  obfuscateJs: true,
  minifyCss: true,
  buildDocker: true,
  generateLicenseKey: true,
  copyNodeModules: false,
};

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

/**
 * Check if Docker is available and running
 */
function isDockerAvailable() {
  try {
    // Try running a simple Docker command
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  printHeader();

  try {
    // Install required tools
    installTools();

    removeDist();

    // Generate trial license key if requested
    if (config.generateLicenseKey) {
      generateLicenseKey();
    }

    // Obfuscate JavaScript code if requested
    if (config.obfuscateJs) {
      obfuscateJsFiles();
    }

    // Minify CSS files if requested
    if (config.minifyCss) {
      minifyCssFiles();
    }

    // // Build Docker image if requested (but don't fail if it doesn't work)
    // if (config.buildDocker) {
    //   buildDockerImage();
    //   // Note: We're not checking the return value since we want to continue even if Docker build fails
    // }

    // Generate deployment instructions
    generateInstructions();

    console.log(
      `${colors.green}${colors.bright}✅ Deployment preparation completed successfully!${colors.reset}`
    );
    console.log(
      `${colors.green}The project is now ready to be deployed to your customer.${colors.reset}`
    );
    console.log(
      `${colors.green}Obfuscated code is available in the 'dist' directory.${colors.reset}`
    );

    // Pack all files in dist directory to dist.rar
    await packDistToRar();
  } catch (error) {
    console.error(
      `${colors.red}${colors.bright}❌ Error: ${error.message}${colors.reset}`
    );
    process.exit(1);
  }
}

/**
 * Print header
 */
function printHeader() {
  console.log(
    `${colors.blue}${colors.bright}========================================${colors.reset}`
  );
  console.log(
    `${colors.blue}${colors.bright}    SECURE CUSTOMER DEPLOYMENT TOOL    ${colors.reset}`
  );
  console.log(
    `${colors.blue}${colors.bright}========================================${colors.reset}`
  );
  console.log(`${colors.yellow}Project: ${config.projectName}${colors.reset}`);
  console.log(
    `${colors.yellow}Trial Period: ${config.trialDays} days${colors.reset}`
  );
  console.log(
    `${colors.blue}${colors.bright}----------------------------------------${colors.reset}\n`
  );
}

/**
 * Install required tools
 */
function installTools() {
  console.log(
    `${colors.magenta}📦 Installing required tools...${colors.reset}`
  );

  try {
    // Check for required tools and install if needed
    const tools = [
      {
        name: 'javascript-obfuscator',
        command: 'npm install -g javascript-obfuscator',
      },
      { name: 'terser', command: 'npm install -g terser' },
      { name: 'csso', command: 'npm install -g csso-cli' }, // switched from clean-css-cli to csso-cli
    ];

    for (const tool of tools) {
      try {
        // Try to execute the tool to check if it's installed
        let checkCommand;

        if (process.platform === 'win32') {
          // On Windows
          checkCommand = `where ${tool.name}`;
        } else {
          // On Unix-like OS
          checkCommand = `which ${tool.name}`;
        }

        execSync(checkCommand, { stdio: 'ignore' });
        console.log(`  - ${tool.name} is already installed`);
      } catch (error) {
        console.log(`  - Installing ${tool.name}...`);
        execSync(tool.command, { stdio: 'inherit' });
      }
    }

    console.log(
      `${colors.green}✅ Tools installation completed${colors.reset}\n`
    );
  } catch (error) {
    throw new Error(`Failed to install required tools: ${error.message}`);
  }
}

function removeDist() {
  console.log(`${colors.magenta}🧹 Removing dist directory...${colors.reset}`);
  try {
    // Create dist directory if it doesn't exist
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
      console.log(`${colors.green}✅ dist directory removed${colors.reset}\n`);
    }

    fs.mkdirSync('dist');
    console.log(`${colors.green}✅ dist directory recreated${colors.reset}\n`);
  } catch (error) {
    throw new Error(`Failed to remove dist directory: ${error.message}`);
  }
}

/**
 * Generate a trial license key
 */
function generateLicenseKey() {
  console.log(
    `${colors.magenta}🔑 Generating trial license key...${colors.reset}`
  );

  try {
    // Generate a cryptographically strong license key
    const licenseKey = crypto.randomBytes(24).toString('hex');

    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + config.trialDays);

    const licenseInfo = {
      key: licenseKey,
      createdAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      type: 'TRIAL',
      features: {
        analytics: true,
        userManagement: true,
        advancedReporting: false,
        notifications: true,
        apiAccess: true,
        fullAccess: false,
      },
    };

    // Save license info to file
    fs.writeFileSync(
      'trial-license.json',
      JSON.stringify(licenseInfo, null, 2)
    );

    console.log(`  - Trial license key: ${licenseKey}`);
    console.log(`  - Expires on: ${expiryDate.toISOString().split('T')[0]}`);
    console.log(`  - Details saved to: trial-license.json`);
    fs.copyFileSync('trial-license.json', 'dist/trial-license.json');
    fs.rmSync('trial-license.json');
    console.log(
      `${colors.green}✅ License key generation completed${colors.reset}\n`
    );
  } catch (error) {
    throw new Error(`Failed to generate license key: ${error.message}`);
  }
}

/**
 * Recursively get all files in a directory with a specific extension
 */
function getAllFiles(dir, ext = null) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      // Recursively get files in subdirectories
      results = results.concat(getAllFiles(fullPath, ext));
    } else {
      // Check if file has the desired extension
      if (ext === null || file.endsWith(ext)) {
        results.push(fullPath);
      }
    }
  });

  return results;
}

/**
 * Copy a file with its directory structure
 */
function copyFileWithStructure(sourceFile, baseDir, targetDir) {
  // Get relative path
  const relativePath = path.relative(baseDir, sourceFile);
  const targetFile = path.join(targetDir, relativePath);
  const targetFileDir = path.dirname(targetFile);

  // Create directory if it doesn't exist
  if (!fs.existsSync(targetFileDir)) {
    fs.mkdirSync(targetFileDir, { recursive: true });
  }

  // Copy file
  fs.copyFileSync(sourceFile, targetFile);

  return targetFile;
}

/**
 * Obfuscate JavaScript files
 */
function obfuscateJsFiles() {
  console.log(
    `${colors.magenta}🔒 Obfuscating JavaScript files...${colors.reset}`
  );

  try {
    // Get all JS files in src recursively
    const jsFiles = getAllFiles('src', '.js');

    // Obfuscate each JS file
    for (const file of jsFiles) {
      console.log(`  - Obfuscating: ${file}`);
      const distFile = path.join('dist', file);

      // Ensure the output directory exists
      const outputDir = path.dirname(distFile);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Obfuscate the file
      const obfuscationCommand = `javascript-obfuscator "${file}" --output "${distFile}" --compact true --control-flow-flattening true --dead-code-injection true --string-array true --self-defending true`;
      try {
        execSync(obfuscationCommand, { stdio: 'ignore' });
      } catch (error) {
        console.error(`    Error obfuscating ${file}: ${error.message}`);
        // Copy the file as is if obfuscation fails
        fs.copyFileSync(file, distFile);
      }
    }

    // Copy non-JS files using Node.js file system operations
    console.log(`  - Copying non-JS files...`);

    // Get all files in src directory
    const srcDir = 'src';
    const allFiles = getAllFiles(srcDir);

    // Copy non-JS files to dist
    for (const file of allFiles) {
      if (!file.endsWith('.js')) {
        const targetFile = copyFileWithStructure(file, '.', 'dist');
        console.log(`    - Copied: ${file} -> ${targetFile}`);
      }
    }

    console.log(
      `${colors.green}✅ JavaScript obfuscation completed${colors.reset}\n`
    );
  } catch (error) {
    throw new Error(`Failed to obfuscate JavaScript files: ${error.message}`);
  }
}

/**
 * Minify CSS files
 */
function minifyCssFiles() {
  console.log(`${colors.magenta}📝 Minifying CSS files...${colors.reset}`);

  try {
    // Create dist directory if it doesn't exist
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }

    // Get all CSS files using Node.js fs functions
    const srcDir = 'src';
    const cssFiles = getAllFiles(srcDir, '.css');

    // Minify each CSS file
    for (const file of cssFiles) {
      console.log(`  - Minifying: ${file}`);

      const distFile = path.join('dist', file);

      // Ensure the output directory exists
      const outputDir = path.dirname(distFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Minify the CSS file
      try {
        execSync(`csso "${file}" --output "${distFile}"`, { stdio: 'ignore' }); // switched from cleancss to csso
      } catch (error) {
        console.error(`    Error minifying ${file}: ${error.message}`);
        // Copy the file as is if minification fails
        fs.copyFileSync(file, distFile);
      }
    }

    console.log(
      `${colors.green}✅ CSS minification completed${colors.reset}\n`
    );
  } catch (error) {
    throw new Error(`Failed to minify CSS files: ${error.message}`);
  }
}

/**
 * Build Docker image
 */
function buildDockerImage() {
  console.log(`${colors.magenta}🐳 Building Docker image...${colors.reset}`);

  try {
    // Check if Docker is available
    if (!isDockerAvailable()) {
      console.log(
        `${colors.yellow}⚠️ Docker is not running or not installed. Skipping Docker build.${colors.reset}`
      );
      console.log(
        `${colors.yellow}  To build Docker image later, make sure Docker is running and execute:${colors.reset}`
      );
      console.log(`${colors.yellow}  > docker-compose build${colors.reset}`);

      return false;
    }

    // Build Docker image
    console.log(`  - Building Docker image...`);
    execSync('docker-compose build', {
      stdio: 'inherit',
    });

    console.log(
      `${colors.green}✅ Docker image build completed${colors.reset}\n`
    );
    return true;
  } catch (error) {
    console.log(
      `${colors.yellow}⚠️ Docker build failed, but deployment can continue.${colors.reset}`
    );
    console.log(`${colors.yellow}  Error: ${error.message}${colors.reset}`);
    console.log(
      `${colors.yellow}  To build Docker image later, make sure Docker is running and execute:${colors.reset}`
    );
    console.log(`${colors.yellow}  > docker-compose build${colors.reset}\n`);

    return false;
  }
}

// Helper function to recursively copy a directory
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Generate deployment instructions
 */
function generateInstructions() {
  console.log(
    `${colors.magenta}📋 Generating deployment instructions...${colors.reset}`
  );

  try {
    // Check if Docker is available
    const dockerAvailable = isDockerAvailable();

    // Read the template file or create instructions from scratch
    const instructions = `# ${config.projectName} - Customer Deployment Instructions

## Overview

This document provides instructions for deploying the ${config.projectName} application for customer testing.

## Deployment Options

${
  dockerAvailable
    ? `### Option 1: Docker Deployment (Recommended)

1. Install Docker and Docker Compose on the target machine
2. Copy the entire project directory to the target machine
3. Start the application:
   \`\`\`
   docker-compose up -d
   \`\`\`
4. Access the application at http://localhost

### Option 2: Manual Deployment
`
    : `### Manual Deployment
`
}
1. Install Node.js (v18 or later) and npm
2. Copy the 'dist' directory to the target machine
3. Navigate to the dist directory and run the helper script:
   \`\`\`
   cd dist
   node start.js
   \`\`\`
   This will:
   - Create necessary directories
   - Install dependencies if needed
   - Start the application
4. Access the application at http://localhost:5000

   Alternatively, you can manually install and start:
   \`\`\`
   cd dist
   npm install --production
   npm start
   \`\`\`

## Trial License Information

- The application includes a ${config.trialDays}-day trial license
- After the trial period, a license key must be purchased
- To activate a license, use the License Management section in the admin panel

## Security Measures

- The application code is obfuscated and protected
${dockerAvailable ? '- The Docker deployment includes additional security hardening' : ''}
- Do NOT modify any application files as this will invalidate the license

## Support

For any technical issues or questions, please contact support at:
- Email: knkmam05@gmail.com
- Phone: +201273481309
`;

    // Write instructions to file
    fs.writeFileSync('DEPLOYMENT.md', instructions);

    if (fs.existsSync('DEPLOYMENT.md')) {
      fs.copyFileSync('DEPLOYMENT.md', 'dist/DEPLOYMENT.md');
    }

    // Also copy package.json to the dist directory
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }

    if (fs.existsSync('package.json')) {
      fs.copyFileSync('package.json', 'dist/package.json');
      console.log(`  - Copied package.json to dist directory`);
    }

    if (fs.existsSync('package-lock.json')) {
      fs.copyFileSync('package-lock.json', 'dist/package-lock.json');
      console.log(`  - Copied package-lock.json to dist directory`);
    }

    // Copy node_modules to dist/node_modules if it exists
    // This is not recommended for production, but it's useful for development
    if (config.copyNodeModules && fs.existsSync('node_modules')) {
      console.log(
        '  - Copying node_modules to dist/node_modules (this may take a while)...'
      );
      copyDirectory('node_modules', path.join('dist', 'node_modules'));
      console.log('  - Copied node_modules to dist directory');
    }

    // Copy data to dist/data if it exists
    if (fs.existsSync('data')) {
      console.log('  - Copying data to dist/data');
      copyDirectory('data', path.join('dist', 'data'));
      console.log('  - Copied data to dist directory');
    }

    // Create a basic .env file in the dist directory
    if (fs.existsSync('.env.example')) {
      const envContent = fs.readFileSync('.env.example', 'utf8');
      fs.writeFileSync('dist/.env', envContent);
      fs.copyFileSync('.env.example', 'dist/.env.example');
      console.log(`  - Created .env file in dist directory`);
    }

    // Copy Vite Config to dist/vite if it exists
    if (fs.existsSync('vite.config.js')) {
      fs.copyFileSync('vite.config.js', 'dist/vite.config.js');
      console.log('  - Copied vite.config.js to dist directory');
    }

    // Copy the start script to dist if it exists
    if (fs.existsSync('texts/start.js')) {
      fs.copyFileSync('texts/start.js', 'dist/start.js');
      // Make it executable
      try {
        fs.chmodSync('dist/start.js', '755');
        console.log(`  - Made start.js executable`);
      } catch (error) {
        console.log(
          `  - Note: Could not make start.js executable. You may need to run it with 'node start.js'`
        );
      }
    } else {
      console.log(
        `${colors.yellow}⚠️  No start.js found. Skipping start.js copy.${colors.reset}`
      );
    }

    console.log(`  - Deployment instructions saved to DEPLOYMENT.md`);
    console.log(
      `${colors.green}✅ Deployment instructions generated${colors.reset}\n`
    );
  } catch (error) {
    throw new Error(
      `Failed to generate deployment instructions: ${error.message}`
    );
  }
}

/**
 * Pack dist directory into dist.rar
 */
async function packDistToRar() {
  console.log(
    `${colors.magenta}📦 Packing dist directory to dist.rar...${colors.reset}`
  );
  const distPath = path.resolve(__dirname, 'dist');
  // Get current time in Cairo/Egypt timezone (UTC+2)
  const now = new Date();
  const cairoTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // UTC+2 for Cairo

  // Format to 12-hour format with AM/PM
  const year = cairoTime.getUTCFullYear();
  const month = String(cairoTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cairoTime.getUTCDate()).padStart(2, '0');
  const hours = cairoTime.getUTCHours();
  const minutes = String(cairoTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(cairoTime.getUTCSeconds()).padStart(2, '0');

  // Convert to 12-hour format
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  const formattedTime = `${year}-${month}-${day}_${String(hour12).padStart(2, '0')}-${minutes}-${seconds}-${ampm}`;

  const rarPath = path.resolve(
    __dirname,
    `dist/Alaa-Project-Obfuscated-${formattedTime}.rar`
  );
  try {
    // Try to use 'rar' or 'winrar' if available
    let packed = false;
    if (process.platform === 'win32') {
      try {
        execSync(`where.exe winrar`, { stdio: 'ignore' });
        // execSync(`winrar a -r "${rarPath}" "${distPath}/*"`, {
        //   stdio: 'inherit',
        // });
        execSync(`winrar a -r "${rarPath}" "*.*"`, {
          cwd: distPath, // 👈 tells Node to run the command *from* inside dist/
          stdio: 'inherit',
        });
        packed = true;
      } catch (e1) {
        try {
          execSync(`where.exe rar`, { stdio: 'ignore' });
          execSync(`rar a -r "${rarPath}" "${distPath}/*"`, {
            stdio: 'inherit',
          });
          packed = true;
        } catch (e2) {
          console.log('Error 1:', e1);
          console.log('Error 2:', e2);
        }
      }
    } else {
      try {
        execSync(`which rar`, { stdio: 'ignore' });
        execSync(`rar a -r "${rarPath}" "${distPath}/*"`, { stdio: 'inherit' });
        packed = true;
      } catch (e3) {
        console.log('Error 3:', e3);
      }
    }
    if (!packed) {
      console.log(
        `${colors.yellow}⚠️  RAR utility not found. Skipping dist.rar creation.${colors.reset}`
      );
    } else {
      console.log(
        `${colors.green}✅ dist.rar created successfully${colors.reset}`
      );
      console.log(`${colors.magenta}📦 Opening dist.rar...${colors.reset}`);
      // Assume this is the full path to your RAR/ZIP file
      // Open File Explorer and select the archive
      if (fs.existsSync(rarPath)) {
        // execSync(`explorer.exe /select,"${rarPath}"`);
        spawn('explorer.exe', ['/select,', rarPath.replace(/\//g, '\\')], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      } else {
        console.log(
          `${colors.yellow}⚠️  dist.rar not found. Skipping opening.${colors.reset}`
        );
      }
      console.log(
        `${colors.green}✅ dist.rar opened successfully${colors.reset}`
      );
    }
  } catch (error) {
    // console.log(error);
    console.log(
      `${colors.red}❌ Failed to create dist.rar: ${error.message}${colors.reset}`
    );
  }
}

// Run the main function
main();
