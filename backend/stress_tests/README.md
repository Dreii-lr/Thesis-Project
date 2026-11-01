# Backend Stress & Capacity Limit Testing Suite

This suite uses **Locust** (100% free and open-source) to test the concurrency, database connection pool, and throughput limits of your backend on `localhost`.

---

## 1. Quick Start

### Step 1: Ensure Your Backend is Running
Ensure `document-processing-ms` is running on port `9090`:
```bash
# In your document-processing-ms repository:
uvicorn src.main:app --host 0.0.0.0 --port 9090
```

### Step 2: Install Locust
```bash
cd /home/paul/Desktop/Thesis-Project/stress_tests
pip install -r requirements.txt
```

### Step 3: Start the Locust Web Dashboard
```bash
# Make the script executable and run:
chmod +x run_stress_test.sh
./run_stress_test.sh

# Or directly:
locust -f locustfile.py --host=http://localhost:9090
```

### Step 4: Open the Web Dashboard
Open your browser to:
👉 **`http://localhost:8089`**

---

## 2. How to Find Your System's Limit (Step-by-Step)

The goal of stress testing is to identify your system's **saturation point** (maximum sustainable throughput) and **breaking point** (where latency degrades or errors appear).

### Phase 1: Baseline Sanity (10 Users)
- **Number of users**: `10`
- **Ramp up (users started/second)**: `2`
- **Host**: `http://localhost:9090`
- **Expected result**: 0% failures, median response time `< 20ms`, 95th percentile `< 50ms`.

### Phase 2: Moderate Load (50 Users)
- **Number of users**: `50`
- **Ramp up**: `5`
- Observe your CPU usage and RPS graph.

### Phase 3: Stress / Saturation Test (100 → 250 → 500 Users)
- **Number of users**: `200`
- **Ramp up**: `10`
- Watch for:
  1. **RPS Plateau**: If requests/sec stops rising while concurrent users double, you have hit the maximum throughput limit of your local server.
  2. **Latency Knee**: The point where 95th percentile response time suddenly spikes above 500ms or 1s.
  3. **Error Spike**: The onset of `HTTP 500` or connection timeouts.

---

## 3. What Endpoints Are Tested

The test simulates realistic read/browse traffic without draining external Gemini AI quotas:

| Task | Weight | Description |
| :--- | :---: | :--- |
| **List Materials** | `30%` | Paginated curriculum queries with status filtering |
| **List Documents** | `25%` | Document manifest and status polling |
| **Material & Lessons** | `20%` | Single material detail and associated generated lessons |
| **pgvector Search** | `15%` | Semantic cosine distance searches across lesson chunks |
| **Document Details** | `5%` | Ingested document metadata and child counts |
| **Baseline ASGI** | `5%` | Fast JSON serialization baseline (`/openapi.json`) |

---

## 4. Key Localhost Bottlenecks to Watch

When stress testing on `localhost`, watch these three key areas:

1. **SQLAlchemy Connection Pool Exhaustion**:
   - Error: `TimeoutError: QueuePool limit of size X overflow Y reached`.
   - Fix: Increase `pool_size` and `max_overflow` in `document_processing/database/connection.py`.
2. **CPU Core Saturation**:
   - Single-worker Uvicorn runs on 1 CPU core. If that core hits 100%, throughput will cap.
   - Fix in production: Run Uvicorn with multiple workers (`uvicorn ... --workers 4`).
3. **pgvector Search Latency**:
   - As dataset size grows, verify that vector index queries (`pgvector`) maintain sub-50ms latency.

---

## 5. Automated Headless Mode (Generates HTML Report)

You can also run automated 1-minute stress tests without the web UI and generate a shareable HTML report for your thesis documentation:

```bash
locust -f locustfile.py \
  --headless \
  --host=http://localhost:9090 \
  -u 100 \
  -r 10 \
  -t 1m \
  --html stress_test_report_100_users.html
```
This produces `stress_test_report_100_users.html` with charts, statistics, percentiles, and failure breakdowns.
