from io import BytesIO

from PIL import Image


def convert_to_webp(
    image_bytes: bytes,
    quality: int = 85,
    method: int = 6,
    max_width: int | None = None,
    resize_percent: int | None = None,
) -> bytes:

    with Image.open(BytesIO(image_bytes)) as image:

        output = BytesIO()


        if resize_percent is not None:

            scale = resize_percent / 100

            new_width = round(
                image.width * scale
            )

            new_height = round(
                image.height * scale
            )

            image = image.resize(
                (new_width, new_height),
                Image.Resampling.LANCZOS,
            )


        elif max_width and image.width > max_width:

            ratio = max_width / image.width

            new_height = round(
                image.height * ratio
            )

            image = image.resize(
                (max_width, new_height),
                Image.Resampling.LANCZOS,
            )


        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")


        image.save(
            output,
            format="WEBP",
            quality=quality,
            method=method,
        )

        return output.getvalue()


def convert_to_ico(
    image_bytes: bytes,
) -> bytes:

    with Image.open(BytesIO(image_bytes)) as image:

        output = BytesIO()

        image = image.convert("RGBA")

        image.save(
            output,
            format="ICO",
            sizes=[
                (16, 16),
                (32, 32),
                (48, 48),
                (64, 64),
                (128, 128),
                (256, 256),
            ],
        )

        return output.getvalue()