"""Helper so unimplemented endpoints answer 501 instead of crashing."""
from fastapi import HTTPException


def not_implemented(part: int, what: str) -> HTTPException:
    return HTTPException(status_code=501, detail=f"Part {part} not implemented yet: {what}")
