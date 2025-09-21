#!/usr/bin/env bash
set -euo pipefail

# Usage: remote-update.sh [IMAGE_NAME] [CONTAINER_NAME] [HOST_PORT]
# Env: APP_DIR if you want to force a directory (defaults to current)

IMAGE_NAME=${1:-clainjo-horror:latest}
CONTAINER_NAME=${2:-clainjo-horror}
HOST_PORT=${3:-4000}

# Go to app directory if provided
if [[ -n "${APP_DIR:-}" ]]; then
  cd "$APP_DIR"
fi

echo "[remote-update] Working dir: $(pwd)"
echo "[remote-update] Pulling latest Git..."
# Try to pull the current branch; fallback to main
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
# Ensure remotes are up to date
(git fetch --all --prune || true)
# Pull with rebase/autostash when possible
(git pull --rebase --autostash || git pull) || true

echo "[remote-update] Building Docker image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

echo "[remote-update] Stopping old container: $CONTAINER_NAME"
(docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1) || true

echo "[remote-update] Starting new container: $CONTAINER_NAME (host:$HOST_PORT -> container:4000)"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$HOST_PORT":4000 \
  --restart unless-stopped \
  "$IMAGE_NAME"

echo "[remote-update] Done. Container \"$CONTAINER_NAME\" running on port $HOST_PORT"
