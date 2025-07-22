#!/bin/bash

set -e
set -o pipefail

FRONTEND_DIR="gpttutor-frontend"
BUILD_DIR="$FRONTEND_DIR/dist"
PORT=3000
SERVER_URL="http://127.0.0.1:$PORT"
WAIT_TIMEOUT=60
SERVER_PID=""

print_info()    { echo -e "[INFO] $1"; }
print_success() { echo -e "[SUCCESS] $1"; }
print_error()   { echo -e "[ERROR] $1"; }
print_debug()   { echo -e "[DEBUG] $1"; }

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

# 2. Print build directory contents
print_info "Listing contents of build directory ($BUILD_DIR):"
if [ -d "$BUILD_DIR" ]; then
  ls -l "$BUILD_DIR"
else
  print_error "Build directory '$BUILD_DIR' not found!"
  exit 1
fi

# 3. Serve the build folder (bind to localhost, log output)
print_info "Starting static server for production build on localhost..."
npx serve -s "$BUILD_DIR" -l tcp://127.0.0.1:$PORT > serve.log 2>&1 &
SERVER_PID=$!
print_info "Server started with PID $SERVER_PID. Waiting for readiness..."

# 4. Wait for server to be ready
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
  print_info "--- serve.log contents ---"
  cat serve.log || print_error "Could not read serve.log"
  exit 1
fi
print_success "Frontend is ready at $SERVER_URL."

# 5. Run Playwright tests
print_info "Running Playwright tests..."
if npx playwright test; then
  print_success "Playwright tests completed successfully."
else
  print_error "Playwright tests failed."
  exit 1
fi

# 6. Cleanup handled by trap 