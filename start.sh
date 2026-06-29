#!/usr/bin/env bash
# start.sh — launches backend and frontend together
# Usage: bash start.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🇮🇳  India Option Pricing Engine v2.0"
echo "======================================="
echo ""

# ── Backend ──────────────────────────────
echo "▶  Starting backend (FastAPI on :8000)..."
cd "$ROOT/backend"

if [ ! -d "venv" ]; then
  echo "   Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "   Installing Python dependencies..."
pip install -r requirements.txt -q

echo "   Backend starting..."
python run.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "   Waiting for backend..."
for i in {1..20}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✓ Backend ready at http://localhost:8000"
    break
  fi
  sleep 0.5
done

# ── Frontend ─────────────────────────────
echo ""
echo "▶  Starting frontend (Vite on :5173)..."
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "   Installing npm packages..."
  npm install -q
fi

npm run dev &
FRONTEND_PID=$!

echo ""
echo "======================================="
echo "✓ Both servers running"
echo ""
echo "  Frontend  →  http://localhost:5173"
echo "  API Docs  →  http://localhost:8000/api/docs"
echo ""
echo "  Press Ctrl+C to stop both"
echo "======================================="
echo ""

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
