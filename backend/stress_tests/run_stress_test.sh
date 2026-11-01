#!/usr/bin/env bash
# run_stress_test.sh
# Launches Locust on localhost targeting Document Processing Microservice (:9090)

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Check if locust is installed
if ! command -v locust &> /dev/null; then
    echo "[!] Locust is not installed in the active environment."
    echo "[*] Installing requirements from requirements.txt..."
    pip install -r requirements.txt
fi

TARGET_HOST="${1:-http://localhost:9090}"

echo "=========================================================="
echo " Starting Locust Stress & Limit Testing Suite"
echo " Target Host: $TARGET_HOST"
echo " Web UI URL:  http://localhost:8089"
echo "=========================================================="
echo "Open http://localhost:8089 in your browser to configure:"
echo " - Number of Users (e.g., 50 -> 100 -> 250 -> 500)"
echo " - Ramp-up rate (e.g., 5 users/sec)"
echo "Press Ctrl+C to stop the test."
echo "=========================================================="

locust -f locustfile.py --host="$TARGET_HOST"
