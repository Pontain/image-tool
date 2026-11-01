from io import BytesIO
from urllib.parse import quote
import warnings

from fastapi import HTTPException
from PIL import Image

MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_PIXELS = 16_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
warnings.filterwarnings("error", category=Image.DecompressionBombWarning)


async def read_image(file):
    data = await file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "Bilden får vara högst 20 MB.")
    try:
        with Image.open(BytesIO(data)) as image:
            if image.width * image.height > MAX_PIXELS:
                raise ValueError("För många pixlar")
            if image.format not in ("PNG", "JPEG", "WEBP"):
                raise ValueError("Ogiltigt format")
            image.verify()
    except Exception:
        raise HTTPException(400, "Välj en giltig PNG-, JPG- eller WebP-bild på högst 16 megapixlar.") from None
    return data


def download_header(filename):
    # Encode Unicode and control characters; never interpolate raw uploaded names.
    return "attachment; filename=download; filename*=UTF-8''" + quote(filename, safe="")
