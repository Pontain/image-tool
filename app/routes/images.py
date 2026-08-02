from fastapi import APIRouter, File, HTTPException, UploadFile

from app.image_tools.analyzer import analyze_image
from app.image_tools.converter import convert_to_webp

from fastapi.responses import Response


router = APIRouter(
    prefix="/api/images",
    tags=["images"],
)


@router.post("/analyze")
async def analyze_uploaded_image(
    file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Filen måste vara en bild.",
        )

    image_bytes = await file.read()

    try:
        image_info = analyze_image(image_bytes)

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Kunde inte läsa bilden.",
        )

    return {
        "filename": file.filename,
        "size": len(image_bytes),
        **image_info,
    }

@router.post("/convert/webp")
async def convert_uploaded_image_to_webp(
    file: UploadFile = File(...),
    quality: int = 85,
):
    if not 1 <= quality <= 100:
        raise HTTPException(
            status_code=400,
            detail="Kvaliteten måste vara mellan 1 och 100.",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Filen måste vara en bild.",
        )

    image_bytes = await file.read()

    try:
        webp_bytes = convert_to_webp(
            image_bytes=image_bytes,
            quality=quality,
            method=6,
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Kunde inte konvertera bilden.",
        )

    original_name = file.filename or "image"

    filename_without_extension = original_name.rsplit(".", 1)[0]

    output_filename = f"{filename_without_extension}.webp"

    return Response(
        content=webp_bytes,
        media_type="image/webp",
        headers={
            "Content-Disposition":
                f'attachment; filename="{output_filename}"'
        },
    )

@router.post("/convert/webp/preview")
async def preview_webp_conversion(
    file: UploadFile = File(...),
    quality: int = 85,
):
    if not 1 <= quality <= 100:
        raise HTTPException(
            status_code=400,
            detail="Kvaliteten måste vara mellan 1 och 100.",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Filen måste vara en bild.",
        )

    image_bytes = await file.read()

    try:
        webp_bytes = convert_to_webp(
            image_bytes=image_bytes,
            quality=quality,
            method=0,
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Kunde inte konvertera bilden.",
        )

    original_size = len(image_bytes)
    webp_size = len(webp_bytes)

    if original_size > 0:
        saving_percent = (
            (original_size - webp_size)
            / original_size
            * 100
        )
    else:
        saving_percent = 0

    return {
        "original_size": original_size,
        "webp_size": webp_size,
        "saving_percent": round(saving_percent, 1),
        "quality": quality,
    }