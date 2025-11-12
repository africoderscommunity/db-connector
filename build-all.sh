#!/usr/bin/env bash
set -e  # Exit immediately on error
echo "🔧 Starting cross-build for wireguard-go"

# Location of source
SRC_DIR="wireguard-go"             # assuming you cloned into this
OUT_DIR="../wireguard"             # relative path from src to output dir

# Platforms and architectures to build
declare -a TARGETS=(
  "darwin amd64 macos/x64"
  "darwin arm64 macos/arm64"
  "linux amd64 linux/x64"
  "linux arm64 linux/arm64"
  "windows amd64 windows/x64"
  "windows arm64 windows/arm64"
)

# Build each target
for t in "${TARGETS[@]}"; do
  read -r GOOS GOARCH SUBDIR <<< "$t"
  BIN_NAME="wireguard-go"
  EXT=""
  if [ "$GOOS" = "windows" ]; then
    EXT=".exe"
  fi
  TARGET_DIR="$OUT_DIR/$SUBDIR"
  mkdir -p "$TARGET_DIR"
  echo "📦 Building for $GOOS/$GOARCH → $TARGET_DIR/$BIN_NAME$EXT"
  GOOS=$GOOS GOARCH=$GOARCH CGO_ENABLED=0 go build -o "$TARGET_DIR/$BIN_NAME$EXT" ./...
done

echo "✅ All builds done. Output in $OUT_DIR"
