from io import BytesIO

from PIL import Image


def make_color_transparent(
    image_bytes: bytes,
    target_color: tuple[int, int, int],
    tolerance: int = 30,
) -> bytes:

    with Image.open(BytesIO(image_bytes)) as image:
        image = image.convert("RGBA")

        pixels = image.load()

        target_r, target_g, target_b = target_color

        for y in range(image.height):
            for x in range(image.width):

                r, g, b, a = pixels[x, y]

                distance = max(
                    abs(r - target_r),
                    abs(g - target_g),
                    abs(b - target_b),
                )

                if distance <= tolerance:
                    pixels[x, y] = (r, g, b, 0)

        output = BytesIO()

        image.save(
            output,
            format="PNG",
        )

        return output.getvalue()