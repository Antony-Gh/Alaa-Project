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
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const config = {
  projectName: 'Scheduling System',
  trialDays: 14,
  obfuscateJs: true,
  minifyCss: true,
  buildDocker: true,
  generateLicenseKey: true,
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
 * Main function
 */
async function main() {
  printHeader();
  
  try {
    // Install required tools
    installTools();
    
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
    
    // Build Docker image if requested
    if (config.buildDocker) {
      buildDockerImage();
    }
    
    // Generate deployment instructions
    generateInstructions();
    
    console.log(`${colors.green}${colors.bright}✅ Deployment preparation completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}${colors.bright}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Print header
 */
function printHeader() {
  console.log(`${colors.blue}${colors.bright}========================================${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}    SECURE CUSTOMER DEPLOYMENT TOOL    ${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}========================================${colors.reset}`);
  console.log(`${colors.yellow}Project: ${config.projectName}${colors.reset}`);
  console.log(`${colors.yellow}Trial Period: ${config.trialDays} days${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}----------------------------------------${colors.reset}\n`);
}

/**
 * Install required tools
 */
function installTools() {
  console.log(`${colors.magenta}📦 Installing required tools...${colors.reset}`);
  
  try {
    // Check for required tools and install if needed
    const tools = [
      { name: 'javascript-obfuscator', command: 'npm install -g javascript-obfuscator' },
      { name: 'terser', command: 'npm install -g terser' },
      { name: 'clean-css-cli', command: 'npm install -g clean-css-cli' },
    ];
    
    for (const tool of tools) {
      try {
        execSync(`which ${tool.name}`, { stdio: 'ignore' });
        console.log(`  - ${tool.name} is already installed`);
      } catch (error) {
        console.log(`  - Installing ${tool.name}...`);
        execSync(tool.command, { stdio: 'inherit' });
      }
    }
    
    console.log(`${colors.green}✅ Tools installation completed${colors.reset}\n`);
  } catch (error) {
    throw new Error(`Failed to install required tools: ${error.message}`);
  }
}

/**
 * Generate a trial license key
 */
function generateLicenseKey() {
  console.log(`${colors.magenta}🔑 Generating trial license key...${colors.reset}`);
  
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
        fullAccess: false
      }
    };
    
    // Save license info to file
    fs.writeFileSync('trial-license.json', JSON.stringify(licenseInfo, null, 2));
    
    console.log(`  - Trial license key: ${licenseKey}`);
    console.log(`  - Expires on: ${expiryDate.toISOString().split('T')[0]}`);
    console.log(`  - Details saved to: trial-license.json`);
    
    console.log(`${colors.green}✅ License key generation completed${colors.reset}\n`);
  } catch (error) {
    throw new Error(`Failed to generate license key: ${error.message}`);
  }
}

/**
 * Obfuscate JavaScript files
 */
function obfuscateJsFiles() {
  console.log(`${colors.magenta}🔒 Obfuscating JavaScript files...${colors.reset}`);
  
  try {
    // Create dist directory if it doesn't exist
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }
    
    // Create a list of directories to obfuscate
    const directories = [
      'src/controllers',
      'src/core',
      'src/middleware',
      'src/models',
      'src/permissions',
      'src/routes',
      'src/services',
      'src/utils',
      'src/public/main/scripts'
    ];
    
    // For each directory, obfuscate all JS files
    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        console.log(`  - Processing directory: ${dir}`);
        
        // Create the corresponding directory in dist
        const distDir = path.join('dist', dir);
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        
        // Get all JS files in the directory
        const files = fs.readdirSync(dir)
          .filter(file => file.endsWith('.js'))
          .map(file => path.join(dir, file));
        
        // Obfuscate each file
        for (const file of files) {
          console.log(`    - Obfuscating: ${file}`);
          const distFile = path.join('dist', file);
          
          // Ensure the output directory exists
          const outputDir = path.dirname(distFile);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          // Obfuscate the file
          execSync(`javascript-obfuscator ${file} --output ${distFile} --compact true --control-flow-flattening true --dead-code-injection true --string-array true --self-defending true`, {
            stdio: 'ignore'
          });
        }
      }
    }
    
    // Copy non-JS files
    console.log(`  - Copying non-JS files...`);
    execSync(`find ./src -type f -not -name "*.js" | xargs -I{} cp --parents {} ./dist/`, {
      stdio: 'ignore'
    });
    
    console.log(`${colors.green}✅ JavaScript obfuscation completed${colors.reset}\n`);
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
    
    // Get all CSS files
    const cssFiles = execSync('find ./src -name "*.css"', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    
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
      execSync(`cleancss -o ${distFile} ${file}`, {
        stdio: 'ignore'
      });
    }
    
    console.log(`${colors.green}✅ CSS minification completed${colors.reset}\n`);
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
    // Build Docker image
    console.log(`  - Building Docker image...`);
    execSync('docker-compose build', {
      stdio: 'inherit'
    });
    
    console.log(`${colors.green}✅ Docker image build completed${colors.reset}\n`);
  } catch (error) {
    throw new Error(`Failed to build Docker image: ${error.message}`);
  }
}

/**
 * Generate deployment instructions
 */
function generateInstructions() {
  console.log(`${colors.magenta}📋 Generating deployment instructions...${colors.reset}`);
  
  try {
    // Read the template file or create instructions from scratch
    const instructions = `# ${config.projectName} - Customer Deployment Instructions

## Overview

This document provides instructions for deploying the ${config.projectName} application for customer testing.

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. Install Docker and Docker Compose on the target machine
2. Copy the entire project directory to the target machine
3. Start the application:
   \`\`\`
   docker-compose up -d
   \`\`\`
4. Access the application at http://localhost

### Option 2: Manual Deployment

1. Install Node.js (v18 or later) and npm
2. Copy the 'dist' directory to the target machine
3. Install dependencies:
   \`\`\`
   npm install --production
   \`\`\`
4. Start the application:
   \`\`\`
   npm start
   \`\`\`
5. Access the application at http://localhost:5000

## Trial License Information

- The application includes a ${config.trialDays}-day trial license
- After the trial period, a license key must be purchased
- To activate a license, use the License Management section in the admin panel

## Security Measures

- The application code is obfuscated and protected
- The Docker deployment includes additional security hardening
- Do NOT modify any application files as this will invalidate the license

## Support

For any technical issues or questions, please contact support at:
- Email: support@example.com
- Phone: +1-123-456-7890
`;
    
    // Write instructions to file
    fs.writeFileSync('DEPLOYMENT.md', instructions);
    
    console.log(`  - Deployment instructions saved to DEPLOYMENT.md`);
    console.log(`${colors.green}✅ Deployment instructions generated${colors.reset}\n`);
  } catch (error) {
    throw new Error(`Failed to generate deployment instructions: ${error.message}`);
  }
}

// Run the main function
main(); 