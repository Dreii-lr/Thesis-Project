"""
Locust Stress & Limit Testing Suite for Backend APIs
Target default: http://localhost:9090 (Document Processing Microservice)
Alternative target: http://localhost:8989 (Thesis Primary Backend)

Run command:
    locust -f locustfile.py
Web UI:
    http://localhost:8089
"""

import random
from locust import task, between, events
from locust.contrib.fasthttp import FastHttpUser

# Search queries simulating real learner / teacher searches against pgvector
SAMPLE_SEARCH_QUERIES = [
    "basic literacy mathematics addition and subtraction",
    "communication skills in english reading comprehension",
    "scientific literacy living things and ecosystem",
    "digital citizenship online safety and information literacy",
    "life and career skills self developmentALS curriculum",
    "fractions decimals and percentage elementary",
    "sustainable development and community participation",
    "health nutrition and disease prevention",
]


class DocumentProcessingMicroserviceUser(FastHttpUser):
    """
    Simulates high-concurrency teacher and system read traffic against:
    - PostgreSQL database queries (documents, materials, lessons)
    - pgvector semantic vector search
    - Pagination, status filters, and detail retrievals
    """
    # Wait between 0.3 and 1.2 seconds between tasks per simulated user
    wait_time = between(0.3, 1.2)

    def on_start(self):
        """Initialize per-user cached IDs so detail views hit real database rows."""
        self.cached_material_ids = []
        self.cached_document_ids = []
        # Pre-seed by requesting the first page of materials
        self.warmup_ids()

    def warmup_ids(self):
        with self.client.get(
            "/api/v1/document-processor/materials/?page=1&page_size=10",
            name="/api/v1/document-processor/materials/ [Warmup]",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        self.cached_material_ids = [m["id"] for m in data if "id" in m]
                except Exception:
                    pass

    @task(30)
    def list_materials_paginated(self):
        """Simulates teachers browsing through the module library list."""
        page = random.randint(1, 3)
        page_size = random.choice([10, 12, 20])
        status = random.choice(["DRAFT", "PUBLISHED", "ARCHIVED", None])
        
        url = f"/api/v1/document-processor/materials/?page={page}&page_size={page_size}"
        if status:
            url += f"&status={status}"
            
        with self.client.get(url, name="/api/v1/document-processor/materials/ [Paginated List]", catch_response=True) as resp:
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if isinstance(data, list) and data:
                        for item in data:
                            if "id" in item and item["id"] not in self.cached_material_ids:
                                self.cached_material_ids.append(item["id"])
                        resp.success()
                except Exception as err:
                    resp.failure(f"Failed to parse JSON response: {err}")
            elif resp.status_code >= 500:
                resp.failure(f"Server error: {resp.status_code}")

    @task(25)
    def list_documents_paginated(self):
        """Simulates fetching uploaded document manifests and processing statuses."""
        page = random.randint(1, 3)
        page_size = random.choice([10, 20])
        url = f"/api/v1/document-processor/documents/?page={page}&page_size={page_size}"
        
        with self.client.get(url, name="/api/v1/document-processor/documents/ [Paginated List]", catch_response=True) as resp:
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    items = data.get("items", []) if isinstance(data, dict) else data
                    if isinstance(items, list):
                        for item in items:
                            if "id" in item and item["id"] not in self.cached_document_ids:
                                self.cached_document_ids.append(item["id"])
                    resp.success()
                except Exception as err:
                    resp.failure(f"Failed to parse JSON: {err}")
            elif resp.status_code >= 500:
                resp.failure(f"Server error: {resp.status_code}")

    @task(20)
    def get_material_and_lessons(self):
        """Simulates opening a module in the lesson editor to view its structured content and generated lessons."""
        if not self.cached_material_ids:
            self.warmup_ids()
            if not self.cached_material_ids:
                return

        material_id = random.choice(self.cached_material_ids)
        
        # 1. Fetch material metadata
        self.client.get(
            f"/api/v1/document-processor/materials/{material_id}",
            name="/api/v1/document-processor/materials/[id] [Detail]",
        )
        
        # 2. Fetch associated generated lessons
        self.client.get(
            f"/api/v1/document-processor/lessons/by-material/{material_id}",
            name="/api/v1/document-processor/lessons/by-material/[id] [Lessons]",
        )

    @task(15)
    def semantic_vector_search(self):
        """
        Simulates RAG / vector similarity search across lesson chunks.
        Stresses pgvector cosine distance calculations and index traversal.
        """
        query = random.choice(SAMPLE_SEARCH_QUERIES)
        payload = {
            "query": query,
            "top_k": 5,
            "threshold": 0.4,
        }
        with self.client.post(
            "/api/v1/document-parser/search/modules",
            json=payload,
            name="/api/v1/document-parser/search/modules [pgvector Search]",
            catch_response=True,
        ) as resp:
            if resp.status_code in [200, 404]:
                # 404 is valid if no chunks match threshold
                resp.success()
            elif resp.status_code >= 500:
                resp.failure(f"Search endpoint returned server error {resp.status_code}")

    @task(5)
    def get_document_details(self):
        """Simulates viewing document details and child material summaries."""
        if not self.cached_document_ids:
            return
        doc_id = random.choice(self.cached_document_ids)
        self.client.get(
            f"/api/v1/document-processor/documents/{doc_id}",
            name="/api/v1/document-processor/documents/[id] [Detail]",
        )

    @task(5)
    def raw_asgi_health(self):
        """Baseline endpoint to measure raw ASGI framework throughput without heavy DB work."""
        self.client.get("/openapi.json", name="/openapi.json [Baseline]")
