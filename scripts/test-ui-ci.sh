#!/bin/bash

set -e
set -o pipefail

FRONTEND_DIR="gpttutor-frontend"
BUILD_DIR="$FRONTEND_DIR/build"
PORT=3000
SERVER_URL="http://localhost:$PORT"
WAIT_TIMEOUT=60
SERVER_PID=""

print_info()    { echo -e "[INFO] $1"; }
print_success() { echo -e "[SUCCESS] $1"; }
print_error()   { echo -e "[ERROR] $1"; }

cleanup() {
  print_info "Cleaning up background processes..."
  if [ -n "$SERVER_PID" ] && kill -0 $SERVER_PID 2>/dev/null; then
    print_info "Killing server process (PID: $SERVER_PID)"
    kill $SERVER_PID
  fi
}
trap cleanup EXIT

# 1. Build the frontend
print_info "Building frontend in $FRONTEND_DIR..."
if [ ! -d "$FRONTEND_DIR" ]; then
  print_error "Frontend directory '$FRONTEND_DIR' not found!"
  exit 1
fi
cd "$FRONTEND_DIR"
npm install
npm run build
cd - > /dev/null
print_success "Frontend build complete."

# 2. Serve the build folder
print_info "Starting static server for production build..."
npx serve -s "$BUILD_DIR" -l $PORT > /dev/null 2>&1 &
SERVER_PID=$!
print_info "Server started with PID $SERVER_PID. Waiting for readiness..."

# 3. Wait for server to be ready
READY=0
for i in $(seq 1 $WAIT_TIMEOUT); do
  if curl -s -f "$SERVER_URL" > /dev/null; then
    READY=1
    break
  fi
  sleep 1
done
if [ $READY -eq 0 ]; then
  print_error "Frontend failed to start at $SERVER_URL after $WAIT_TIMEOUT seconds."
  exit 1
fi
print_success "Frontend is ready at $SERVER_URL."

# 4. Run Playwright tests
print_info "Running Playwright tests..."
if npx playwright test; then
  print_success "Playwright tests completed successfully."
else
  print_error "Playwright tests failed."
  exit 1
fi

# 5. Cleanup handled by trap 