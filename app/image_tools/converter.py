from io import BytesIO

from PIL import Image


def convert_to_webp(
    image_bytes: bytes,
    quality: int = 85,
) -> bytes:

    with Image.open(BytesIO(image_bytes)) as image:

        output = BytesIO()

        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")

        image.save(
            output,
            format="WEBP",
            quality=quality,
            method=6,
        )

        return output.getvalue()