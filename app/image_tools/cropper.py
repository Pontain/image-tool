from io import BytesIO

from PIL import Image


def crop_image(
    image_bytes: bytes,
    x: int,
    y: int,
    width: int,
    height: int,
) -> tuple[bytes, str]:

    with Image.open(BytesIO(image_bytes)) as image:

        if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > image.width or y + height > image.height:
            raise ValueError("Crop must stay inside the image")
        original_format = image.format or "PNG"

        left = x
        top = y
        right = x + width
        bottom = y + height

        cropped = image.crop(
            (
                left,
                top,
                right,
                bottom,
            )
        )

        output = BytesIO()

        if original_format == "WEBP":
            cropped.save(
                output,
                format="WEBP",
                quality=90,
                method=6,
            )

        elif original_format == "JPEG":
            if cropped.mode not in ("RGB", "L"):
                cropped = cropped.convert("RGB")

            cropped.save(
                output,
                format="JPEG",
                quality=95,
            )

        else:
            cropped.save(
                output,
                format="PNG",
            )

        return output.getvalue(), original_format