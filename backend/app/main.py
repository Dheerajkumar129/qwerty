"""WindView FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import logging

from app.routers import actuals, forecasts, analytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WindView API",
    description=(
        "Backend API for WindView — UK Wind Power Procurement Intelligence Portal. "
        "Provides actual wind generation and forecast data from Elexon BMRS, "
        "plus forecast accuracy analytics for January 2026."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS — allow Vercel frontend + local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.(vercel\.app|railway\.app)",
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(actuals.router, prefix="/api/v1")
app.include_router(forecasts.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")


@app.get("/docs", include_in_schema=False)
async def docs_redirect():
    return RedirectResponse(url="/api/docs")


@app.get("/api")
@app.get("/")
async def root():
    return {
        "service": "WindView API",
        "version": "1.0.0",
        "description": "UK Wind Power Procurement Intelligence — Elexon BMRS data",
        "docs": "/api/docs",
    }


@app.get("/api/health")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "windview-api"}
