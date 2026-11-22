from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Snack Overflow API",
    version="1.0.0",
    description="Snack Overflow - Office Pantry Inventory & Snack Tracking API",
)

# CORS configuration allowing strictly CORS_ORIGIN
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend status."""
    return {"status": "ok", "service": "Snack Overflow API"}
