#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT="${PORT:-7890}"

if command -v xdg-open > /dev/null; then
  (sleep 1 && xdg-open "http://localhost:$PORT") &
elif command -v open > /dev/null; then
  (sleep 1 && open "http://localhost:$PORT") &
fi

PORT="$PORT" node server.js
