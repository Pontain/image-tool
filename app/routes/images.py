from starlette.concurrency import run_in_threadpool
from app.image_tools.validation import read_image, download_header
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.image_tools.analyzer import analyze_image
from app.image_tools.converter import convert_to_webp, convert_to_ico
from app.image_tools.transparency import make_color_transparent
from app.image_tools.cropper import crop_image

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

    image_bytes = await read_image(file)

    try:
        image_info = await run_in_threadpool(analyze_image, image_bytes)

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
    max_width: int | None = None,
    resize_percent: int | None = None,
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

    image_bytes = await read_image(file)

    try:
        webp_bytes = await run_in_threadpool(convert_to_webp, 
            image_bytes=image_bytes,
            quality=quality,
            method=6,
            max_width=max_width,
            resize_percent=resize_percent,
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
                download_header(output_filename)
        },
    )

@router.post("/convert/webp/preview")
async def preview_webp_conversion(
    file: UploadFile = File(...),
    quality: int = 85,
    max_width: int | None = None,
    resize_percent: int | None = None,
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

    image_bytes = await read_image(file)

    try:
        webp_bytes = await run_in_threadpool(convert_to_webp, 
            image_bytes=image_bytes,
            quality=quality,
            method=0,
            max_width=max_width,
            resize_percent=resize_percent,
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


@router.post("/convert/ico")
async def convert_uploaded_image_to_ico(
    file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Filen måste vara en bild.",
        )

    image_bytes = await read_image(file)

    try:
        ico_bytes = await run_in_threadpool(convert_to_ico, 
            image_bytes=image_bytes,
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Kunde inte konvertera bilden till ICO.",
        )

    original_name = file.filename or "image"

    filename_without_extension = (
        original_name.rsplit(".", 1)[0]
    )

    output_filename = (
        f"{filename_without_extension}.ico"
    )

    return Response(
        content=ico_bytes,
        media_type="image/x-icon",
        headers={
            "Content-Disposition":
                download_header(output_filename)
        },
    )

@router.post("/transparent")
async def make_uploaded_image_transparent(
    file: UploadFile = File(...),
    color: str = "ffffff",
    tolerance: int = 30,
):
    if not 0 <= tolerance <= 255:
        raise HTTPException(
            status_code=400,
            detail="Toleransen måste vara mellan 0 och 255.",
        )

    try:
        color = color.lstrip("#")

        if len(color) != 6:
            raise ValueError

        target_color = (
            int(color[0:2], 16),
            int(color[2:4], 16),
            int(color[4:6], 16),
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Ogiltig färg.",
        )

    image_bytes = await read_image(file)

    try:
        result_bytes = await run_in_threadpool(make_color_transparent, 
            image_bytes=image_bytes,
            target_color=target_color,
            tolerance=tolerance,
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Kunde inte bearbeta bilden.",
        )

    original_name = file.filename or "image"

    filename_without_extension = (
        original_name.rsplit(".", 1)[0]
    )

    output_filename = (
        f"{filename_without_extension}-transparent.png"
    )

    return Response(
        content=result_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition":
                download_header(output_filename)
        },
    )

@router.post("/transparent/preview")
async def preview_transparent_image(
    file: UploadFile = File(...),
    color: str = "ffffff",
    tolerance: int = 30,
):
    if not 0 <= tolerance <= 255:
        raise HTTPException(
            status_code=400,
            detail="Toleransen måste vara mellan 0 och 255.",
        )

    try:
        color = color.lstrip("#")

        if len(color) != 6:
            raise ValueError

        target_color = (
            int(color[0:2], 16),
            int(color[2:4], 16),
            int(color[4:6], 16),
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Ogiltig färg.",
        )

    image_bytes = await read_image(file)

    try:
        result_bytes = await run_in_threadpool(make_color_transparent, 
            image_bytes=image_bytes,
            target_color=target_color,
            tolerance=tolerance,
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Kunde inte skapa förhandsvisning.",
        )

    return Response(
        content=result_bytes,
        media_type="image/png",
    )

@router.post("/crop")
async def crop_uploaded_image(
    file: UploadFile = File(...),
    x: int = 0,
    y: int = 0,
    width: int = 100,
    height: int = 100,
):
    if width <= 0 or height <= 0:
        raise HTTPException(
            status_code=400,
            detail="Bredd och höjd måste vara större än 0.",
        )

    image_bytes = await read_image(file)

    try:
        cropped_bytes, output_format = await run_in_threadpool(crop_image, 
            image_bytes=image_bytes,
            x=x,
            y=y,
            width=width,
            height=height,
            )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Kunde inte beskära bilden.",
        )

    original_name = file.filename or "image"

    filename_without_extension = (
        original_name.rsplit(".", 1)[0]
    )

    if output_format == "WEBP":
        extension = "webp"
        media_type = "image/webp"

    elif output_format == "JPEG":
        extension = "jpg"
        media_type = "image/jpeg"

    else:
        extension = "png"
        media_type = "image/png"


    filename = (
        f"{filename_without_extension}-cropped.{extension}"
    )


    return Response(
        content=cropped_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition":
                download_header(filename)
        },
    )