@echo off
echo ======================================
echo     DOCKER BUILD HELPER SCRIPT
echo ======================================
echo.

REM Check if Docker is running
docker info > nul 2>&1
if %errorlevel% neq 0 (
  echo Docker is not running. Please start Docker Desktop and try again.
  exit /b 1
)

echo Docker is running. Proceeding with build...
echo.

REM Build the Docker images
echo Building Docker images...
docker-compose build --no-cache

if %errorlevel% neq 0 (
  echo.
  echo Error: Docker build failed. Please check the error messages above.
  exit /b 1
) else (
  echo.
  echo ======================================
  echo Docker images built successfully!
  echo.
  echo You can now run the application with:
  echo docker-compose up -d
  echo ======================================
  echo.
)

pause 