@echo off
setlocal enabledelayedexpansion

REM CI-compatible batch script for ThinkPal UI testing
REM This script starts the frontend, waits for it to be ready, runs tests, and exits cleanly

REM Configuration
set FRONTEND_URL=http://localhost:3000
set TEST_TIMEOUT=120
set STARTUP_TIMEOUT=60
set TEST_RESULTS_DIR=test-results

REM Colors for output (Windows compatible)
set RED=[91m
set GREEN=[92m
set YELLOW=[93m
set BLUE=[94m
set NC=[0m

REM Function to print colored output
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM Function to check if port is in use
:check_port
netstat -an | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

REM Function to wait for frontend to be ready
:wait_for_frontend
call :print_status "Waiting for frontend to be ready at %FRONTEND_URL%..."

set /a start_time=%time:~0,2%*3600 + %time:~3,2%*60 + %time:~6,2%
set /a timeout=%STARTUP_TIMEOUT%

:wait_loop
curl -s -f "%FRONTEND_URL%" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "Frontend is ready!"
    exit /b 0
)

call :print_status "Frontend not ready yet, waiting..."
timeout /t 2 /nobreak >nul

set /a current_time=%time:~0,2%*3600 + %time:~3,2%*60 + %time:~6,2%
set /a elapsed=!current_time! - !start_time!

if !elapsed! lss !timeout! goto wait_loop

call :print_error "Frontend failed to start within %timeout% seconds"
exit /b 1

REM Function to install dependencies if needed
:install_dependencies
call :print_status "Checking dependencies..."

if not exist "node_modules" (
    call :print_status "Installing npm dependencies..."
    npm install
)

if not exist "node_modules\.cache\ms-playwright" (
    call :print_status "Installing Playwright browsers..."
    npx playwright install --with-deps
)

call :print_success "Dependencies ready"
goto :eof

REM Function to run tests
:run_tests
call :print_status "Running Playwright tests..."

if not exist "%TEST_RESULTS_DIR%" mkdir "%TEST_RESULTS_DIR%"

npx playwright test tests/decision-ui.spec.ts --reporter=list
if %errorlevel% neq 0 (
    call :print_error "Tests failed with exit code %errorlevel%"
    exit /b %errorlevel%
)

call :print_success "Tests completed successfully"
exit /b 0

REM Function to cleanup background processes
:cleanup
call :print_status "Cleaning up background processes..."

if defined FRONTEND_PID (
    call :print_status "Stopping frontend server (PID: !FRONTEND_PID!)"
    taskkill /PID !FRONTEND_PID! /F >nul 2>&1
)

REM Kill any remaining node processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

call :print_status "Cleanup complete"
goto :eof

REM Main execution
call :print_status "Starting ThinkPal UI testing pipeline..."

REM Check if we're in the right directory
if not exist "package.json" (
    call :print_error "package.json not found. Please run this script from the project root."
    exit /b 1
)

REM Install dependencies
call :install_dependencies

REM Check if frontend is already running
call :check_port
if %errorlevel% equ 0 (
    call :print_warning "Port 3000 is already in use. Using existing frontend server."
) else (
    call :print_status "Starting frontend server..."
    
    REM Start frontend in background
    start /b npm run dev > frontend.log 2>&1
    
    REM Get the PID of the npm process
    for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "node.exe"') do (
        set FRONTEND_PID=%%a
        goto :found_pid
    )
    :found_pid
    
    call :print_status "Frontend server started with PID: !FRONTEND_PID!"
    
    REM Wait for frontend to be ready
    call :wait_for_frontend
    if %errorlevel% neq 0 (
        call :print_error "Failed to start frontend server"
        call :cleanup
        exit /b 1
    )
)

REM Run tests
call :run_tests
if %errorlevel% equ 0 (
    call :print_success "UI testing pipeline completed successfully!"
    call :cleanup
    exit /b 0
) else (
    call :print_error "UI testing pipeline failed!"
    call :cleanup
    exit /b %errorlevel%
) 