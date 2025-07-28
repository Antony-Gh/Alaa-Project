# Scheduling System - Customer Deployment Instructions

## Overview

This document provides instructions for deploying the Scheduling System application for customer testing.

## Deployment Options

### Manual Deployment

1. Install Node.js (v18 or later) and npm
2. Copy the 'dist' directory to the target machine
3. Navigate to the dist directory and run the helper script:
   ```
   cd dist
   node start.js
   ```
   This will:
   - Create necessary directories
   - Install dependencies if needed
   - Start the application
4. Access the application at http://localhost:5000

   Alternatively, you can manually install and start:
   ```
   cd dist
   npm install --production
   npm start
   ```

## Trial License Information

- The application includes a 14-day trial license
- After the trial period, a license key must be purchased
- To activate a license, use the License Management section in the admin panel

## Security Measures

- The application code is obfuscated and protected

- Do NOT modify any application files as this will invalidate the license

## Support

For any technical issues or questions, please contact support at:
- Email: knkmam05@gmail.com
- Phone: +201273481309
