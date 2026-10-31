"""FastAPI app wiring and CORS (Part 5).

Run from the backend/ folder:  uvicorn app:app --reload --port 8000
"""
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import api_assign, api_craft, api_experiments, api_geometry, api_pipeline, api_route

app = FastAPI(title="Shadow Citadel Raid Optimizer")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Drop 'input' from each error detail to prevent JSON serialization crashes on non-finite floats (NaN, Infinity)
    clean_errors = [{k: v for k, v in err.items() if k != "input"} for err in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(clean_errors)})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (api_geometry, api_route, api_assign, api_craft, api_pipeline, api_experiments):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"ok": "true"}
