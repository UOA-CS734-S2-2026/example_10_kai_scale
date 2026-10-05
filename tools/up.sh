#!/usr/bin/env bash
# ./demo.sh run: bring the stack up as the current step describes it.
#
# Rebuilds the images (a step may have changed server code or nginx.conf),
# recreates every container from scratch, removes services this step no longer
# has, restarts web so nginx sees the current replicas, then follows the logs.
# Ctrl+C stops following; the containers keep running.
#
# Recreating everything means each run starts with full portions on the
# in-memory steps: the decay ticker empties the seed events in a few minutes.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env here. Copy .env.example to .env and set GOOGLE_APPLICATION_CREDENTIALS."
  exit 1
fi

docker compose up -d --build --force-recreate --remove-orphans
# nginx resolves "api" once, at startup. In the cloud, learning about new
# replicas automatically is called service discovery.
docker compose restart web
echo
docker compose ps
echo
echo "Dashboard on http://localhost:8080, and the api through it at /api/."
echo "Following logs. Ctrl+C stops following; the containers keep running."
echo
docker compose logs -f --tail=3
