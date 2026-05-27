#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "[1/6] Pull latest changes..."
git pull --ff-only

echo "[2/6] Show compose file and resolved config..."
ls -la docker-compose.yml
podman compose config >/tmp/vdg-compose-resolved.yaml
echo "Resolved compose written to /tmp/vdg-compose-resolved.yaml"

echo "[3/6] Stop existing stack..."
podman compose down

echo "[4/6] Rebuild and recreate containers..."
podman compose up -d --build --force-recreate

echo "[5/6] Service status..."
podman compose ps

echo "[6/6] Health check..."
if curl -fsS http://127.0.0.1:3000/health >/dev/null; then
  echo "Gateway health: OK"
else
  echo "Gateway health: FAILED"
fi

echo
echo "Useful commands:"
echo "  podman compose logs -f telegram-gateway"
echo "  podman compose logs -f rss-watcher"
echo "  podman exec -it telegram-gateway sh -lc 'pwd; ls -la data; cat data/latest-audio.json'"
echo "  podman exec -it rss-watcher sh -lc 'pwd; ls -la data; cat data/processed-items.json'"
