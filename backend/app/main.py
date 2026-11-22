from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers.auth import router as auth_router
from app.routers.snacks import router as snacks_router

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


# Global Exception Handlers ensuring {"error": {"code": "...", "message": "..."}} contract
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "; ".join(error_messages) if error_messages else "Request validation failed.",
            }
        },
    )


# Register routers
app.include_router(auth_router)
app.include_router(snacks_router)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend status."""
    return {"status": "ok", "service": "Snack Overflow API"}
