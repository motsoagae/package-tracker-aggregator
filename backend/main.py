from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os

from api.models import (
    PackageCreate, PackageUpdate, TrackingResponse, 
    StatsResponse, CarrierType, Package
)
from api.tracker import PackageTracker

# Initialize tracker
tracker = PackageTracker()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Package Tracker API...")
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title="Package Tracker Aggregator API",
    description="Universal package tracking API supporting USPS, UPS, FedEx, DHL, and Amazon",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://your-frontend-domain.vercel.app"  # Update with your domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Package Tracker Aggregator API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "track": "/api/track/{tracking_number}",
            "carriers": "/api/carriers",
            "detect": "/api/detect/{tracking_number}"
        }
    }

@app.get("/api/track/{tracking_number}", response_model=TrackingResponse)
async def track_package(
    tracking_number: str,
    carrier: CarrierType = None
):
    """
    Track a package by tracking number.
    Carrier is auto-detected if not provided.
    """
    result = await tracker.track_package(tracking_number, carrier)
    
    if not result.success:
        raise HTTPException(status_code=404, detail=result.error)
    
    return result

@app.post("/api/track/batch")
async def track_batch(tracking_numbers: list[str]):
    """
    Track multiple packages in one request
    """
    results = await tracker.track_multiple(tracking_numbers)
    return {
        "results": results,
        "successful": sum(1 for r in results if r.success),
        "failed": sum(1 for r in results if not r.success)
    }

@app.get("/api/detect/{tracking_number}")
async def detect_carrier_endpoint(tracking_number: str):
    """
    Detect carrier from tracking number format
    """
    from api.carriers import detect_carrier
    carrier = detect_carrier(tracking_number)
    return {
        "tracking_number": tracking_number,
        "detected_carrier": carrier,
        "confidence": "high" if carrier != CarrierType.UNKNOWN else "none"
    }

@app.get("/api/carriers")
async def get_carriers():
    """Get list of supported carriers and their patterns"""
    carriers = []
    for carrier_type, carrier in tracker.get_supported_carriers():
        carriers.append({
            "type": carrier_type,
            "name": carrier_type.value.upper(),
            "patterns": carrier.tracking_patterns,
            "tracking_url_template": carrier.tracking_url_template
        })
    return carriers

@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get tracking statistics (placeholder - would integrate with DB in production)
    """
    return StatsResponse(
        total_packages=0,
        active_packages=0,
        delivered_packages=0,
        in_transit_packages=0,
        carrier_breakdown={},
        recent_deliveries=[]
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
