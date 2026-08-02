from io import BytesIO # detta importeras för att kunna läsa in bytes som en fil-liknande objekt

from PIL import Image # detta importeras för att kunna analysera bilder


def analyze_image(image_bytes: bytes) -> dict: # definierar en funktion som tar emot en parameter image_bytes av typen bytes och returnerar en dictionary
    with Image.open(BytesIO(image_bytes)) as image:
        has_transparency = False

        if image.mode in ("RGBA", "LA"):
            has_transparency = True

        elif image.mode == "P" and "transparency" in image.info:
            has_transparency = True

        return {
            "format": image.format,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "has_transparency": has_transparency,
        }