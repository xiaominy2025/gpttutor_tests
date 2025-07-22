#!/bin/bash

# CI-compatible shell script for ThinkPal UI testing
# This script starts the frontend, waits for it to be ready, runs tests, and exits cleanly

set -e  # Exit on any error
set -o pipefail  # Exit if any command in a pipe fails

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:3000"
TEST_TIMEOUT=120  # 2 minutes timeout for tests
STARTUP_TIMEOUT=60  # 1 minute timeout for frontend startup
TEST_RESULTS_DIR="test-results"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup background processes
cleanup() {
    print_status "Cleaning up background processes..."
    
    # Kill any background processes
    if [ ! -z "$FRONTEND_PID" ]; then
        print_status "Stopping frontend server (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining node processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    print_status "Cleanup complete"
}

# Set up trap to cleanup on script exit
trap cleanup EXIT

# Function to check if port is in use
check_port() {
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to wait for frontend to be ready
wait_for_frontend() {
    print_status "Waiting for frontend to be ready at $FRONTEND_URL..."
    
    local start_time=$(date +%s)
    local timeout=$STARTUP_TIMEOUT
    
    while [ $(($(date +%s) - start_time)) -lt $timeout ]; do
        if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
            print_success "Frontend is ready!"
            return 0
        fi
        
        print_status "Frontend not ready yet, waiting..."
        sleep 2
    done
    
    print_error "Frontend failed to start within $timeout seconds"
    return 1
}

# Function to install dependencies if needed
install_dependencies() {
    print_status "Checking dependencies..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
    fi
    
    # Check if Playwright browsers are installed
    if [ ! -d "node_modules/.cache/ms-playwright" ]; then
        print_status "Installing Playwright browsers..."
        npx playwright install --with-deps
    fi
    
    print_success "Dependencies ready"
}

# Function to run tests
run_tests() {
    print_status "Running Playwright tests..."
    
    # Create test results directory if it doesn't exist
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Run tests with timeout
    timeout $TEST_TIMEOUT npx playwright test tests/decision-ui.spec.ts --reporter=list || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            print_error "Tests timed out after $TEST_TIMEOUT seconds"
        else
            print_error "Tests failed with exit code $exit_code"
        fi
        return $exit_code
    }
    
    print_success "Tests completed successfully"
    return 0
}

# Main execution
main() {
    print_status "Starting ThinkPal UI testing pipeline..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Install dependencies
    install_dependencies
    
    # Check if frontend is already running
    if check_port; then
        print_warning "Port 3000 is already in use. Using existing frontend server."
    else
        print_status "Starting frontend server..."
        
        # Start frontend in background
        npm run dev > frontend.log 2>&1 &
        FRONTEND_PID=$!
        
        print_status "Frontend server started with PID: $FRONTEND_PID"
        
        # Wait for frontend to be ready
        if ! wait_for_frontend; then
            print_error "Failed to start frontend server"
            exit 1
        fi
    fi
    
    # Run tests
    if run_tests; then
        print_success "UI testing pipeline completed successfully!"
        exit 0
    else
        print_error "UI testing pipeline failed!"
        exit 1
    fi
}

# Run main function
main "$@" 