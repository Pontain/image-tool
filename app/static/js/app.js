let currentFile = null;

let originalImageUrl = null;
let transparentPreviewUrl = null;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const previewPanel = document.getElementById("previewPanel");
const previewImage = document.getElementById("previewImage");

const fileName = document.getElementById("fileName");
const fileType = document.getElementById("fileType");
const fileSize = document.getElementById("fileSize");
const imageDimensions = document.getElementById("imageDimensions");

const chooseNewImage = document.getElementById("chooseNewImage");

const colorMode = document.getElementById("colorMode");
const transparency = document.getElementById("transparency");

const maxWidth =
    document.getElementById("maxWidth");

const conversionResult =
    document.getElementById("conversionResult");

const originalSizeResult =
    document.getElementById("originalSizeResult");

const webpSizeResult =
    document.getElementById("webpSizeResult");

const savingResult =
    document.getElementById("savingResult");

const qualitySlider =
    document.getElementById("qualitySlider");

const qualityValue =
    document.getElementById("qualityValue");

const convertWebp =
    document.getElementById("convertWebp");

const resizePercent =
    document.getElementById("resizePercent");

const resizeModeInputs =
    document.querySelectorAll(
        'input[name="resizeMode"]'
    );

const transparentColor =
    document.getElementById("transparentColor");

const transparentColorValue =
    document.getElementById("transparentColorValue");

const toleranceSlider =
    document.getElementById("toleranceSlider");

const toleranceValue =
    document.getElementById("toleranceValue");

const previewTransparency =
    document.getElementById("previewTransparency");

const showOriginal =
    document.getElementById("showOriginal");

const downloadTransparent =
    document.getElementById("downloadTransparent");

dropZone.addEventListener("click", () => {
    fileInput.click();
});


fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];

    if (file) {
        handleImage(file);
    }

});


dropZone.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropZone.classList.add("drag-over");

});


dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("drag-over");

});


dropZone.addEventListener("drop", (event) => {

    event.preventDefault();

    dropZone.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];

    if (file) {
        handleImage(file);
    }

});


chooseNewImage.addEventListener("click", () => {
    fileInput.click();
});

qualitySlider.addEventListener("input", () => {

    qualityValue.textContent =
        qualitySlider.value;

});


qualitySlider.addEventListener("change", () => {

    if (currentFile) {
        previewWebp(currentFile);
    }

});


maxWidth.addEventListener("change", () => {

    if (currentFile) {
        previewWebp(currentFile);
    }

});

transparentColor.addEventListener(
    "input",
    () => {

        transparentColorValue.textContent =
            transparentColor.value.toUpperCase();

    }
);

previewTransparency.addEventListener(
    "click",
    async () => {

        if (!currentFile) {
            return;
        }

        const formData =
            new FormData();

        formData.append(
            "file",
            currentFile
        );


        const color =
            transparentColor.value.replace("#", "");

        const tolerance =
            toleranceSlider.value;


        previewTransparency.disabled = true;

        previewTransparency.textContent =
            "Bearbetar...";


        try {

            const response = await fetch(
                `/api/images/transparent/preview?color=${color}&tolerance=${tolerance}`,
                {
                    method: "POST",
                    body: formData,
                }
            );


            if (!response.ok) {
                throw new Error(
                    "Kunde inte skapa transparens-preview."
                );
            }


            const blob =
                await response.blob();


            if (transparentPreviewUrl) {
                URL.revokeObjectURL(
                    transparentPreviewUrl
                );
            }


            transparentPreviewUrl =
                URL.createObjectURL(blob);


            previewImage.src =
                transparentPreviewUrl;


            showOriginal.classList.remove(
                "hidden"
            );

        }

        catch (error) {

            console.error(error);

            alert(
                "Kunde inte skapa transparens-preview."
            );

        }

        finally {

            previewTransparency.disabled = false;

            previewTransparency.textContent =
                "Förhandsvisa transparens";

        }

    }
);

showOriginal.addEventListener(
    "click",
    () => {

        if (!originalImageUrl) {
            return;
        }

        previewImage.src =
            originalImageUrl;

        showOriginal.classList.add(
            "hidden"
        );

    }
);

downloadTransparent.addEventListener(
    "click",
    async () => {

        if (!currentFile) {
            return;
        }


        const formData =
            new FormData();

        formData.append(
            "file",
            currentFile
        );


        const color =
            transparentColor.value.replace("#", "");

        const tolerance =
            toleranceSlider.value;


        downloadTransparent.disabled = true;

        downloadTransparent.textContent =
            "Skapar PNG...";


        try {

            const response = await fetch(
                `/api/images/transparent?color=${color}&tolerance=${tolerance}`,
                {
                    method: "POST",
                    body: formData,
                }
            );


            if (!response.ok) {
                throw new Error(
                    "Kunde inte skapa transparent PNG."
                );
            }


            const blob =
                await response.blob();

            const downloadUrl =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");


            const filenameWithoutExtension =
                currentFile.name.replace(
                    /\.[^/.]+$/,
                    ""
                );


            link.href = downloadUrl;

            link.download =
                `${filenameWithoutExtension}-transparent.png`;


            document.body.appendChild(link);

            link.click();

            link.remove();


            URL.revokeObjectURL(
                downloadUrl
            );

        }

        catch (error) {

            console.error(error);

            alert(
                "Kunde inte skapa transparent PNG."
            );

        }

        finally {

            downloadTransparent.disabled = false;

            downloadTransparent.textContent =
                "Spara transparent PNG";

        }

    }
);

toleranceSlider.addEventListener(
    "input",
    () => {

        toleranceValue.textContent =
            toleranceSlider.value;

    }
);

convertWebp.addEventListener("click", async () => {

    if (!currentFile) {
        return;
    }


    const formData = new FormData();

    formData.append(
        "file",
        currentFile
    );


    const quality = qualitySlider.value;

    const resize =
        getResizeSettings();

    let convertUrl =
        `/api/images/convert/webp?quality=${quality}`;

    if (
        resize.mode === "width" &&
        resize.value
    ) {
        convertUrl +=
            `&max_width=${resize.value}`;
    }

    if (
        resize.mode === "percent" &&
        resize.value
    ) {
        convertUrl +=
            `&resize_percent=${resize.value}`;
    }


    convertWebp.disabled = true;

    convertWebp.textContent =
        "Konverterar...";


    try {

        const response = await fetch(
            convertUrl,
            {
                method: "POST",
                body: formData,
            }
        );


        if (!response.ok) {
            throw new Error(
                "Konverteringen misslyckades."
            );
        }


        const blob =
            await response.blob();


        const downloadUrl =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        const originalName =
            currentFile.name;


        const filenameWithoutExtension =
            originalName.replace(
                /\.[^/.]+$/,
                ""
            );


        link.href =
            downloadUrl;

        link.download =
            `${filenameWithoutExtension}.webp`;


        document.body.appendChild(link);

        link.click();

        link.remove();


        URL.revokeObjectURL(
            downloadUrl
        );

    }

    catch (error) {

        console.error(error);

        alert(
            "Kunde inte konvertera bilden."
        );

    }

    finally {

        convertWebp.disabled = false;

        convertWebp.textContent =
            "Konvertera till WebP";

    }

});

resizeModeInputs.forEach((input) => {

    input.addEventListener("change", () => {

        const mode = input.value;

        if (mode === "percent") {

            resizePercent.disabled = false;
            maxWidth.disabled = true;

        }

        else {

            resizePercent.disabled = true;
            maxWidth.disabled = false;

        }

        if (currentFile) {
            previewWebp(currentFile);
        }

    });

});

resizePercent.addEventListener("change", () => {

    if (currentFile) {
        previewWebp(currentFile);
    }

});

async function handleImage(file) {


    if (!file.type.startsWith("image/")) {
        alert("Filen måste vara en bild.");
        return;
    }

    currentFile = file;

    if (originalImageUrl) {
        URL.revokeObjectURL(originalImageUrl);
    }

    if (transparentPreviewUrl) {
        URL.revokeObjectURL(transparentPreviewUrl);
        transparentPreviewUrl = null;
    }

    originalImageUrl =
        URL.createObjectURL(file);

    previewImage.src =
        originalImageUrl;

    showOriginal.classList.add("hidden");

    fileName.textContent = file.name;
    fileType.textContent = getReadableFormat(file);
    fileSize.textContent = formatFileSize(file.size);

    colorMode.textContent = "Analyserar...";
    transparency.textContent = "Analyserar...";


    previewImage.onload = () => {

        imageDimensions.textContent =
            `${previewImage.naturalWidth} × ${previewImage.naturalHeight} px`;

    };


    dropZone.classList.add("hidden");

    previewPanel.classList.remove("hidden");


    await analyzeImage(file);
    await previewWebp(file);
}


function getReadableFormat(file) {

    switch (file.type) {

        case "image/png":
            return "PNG";

        case "image/jpeg":
            return "JPEG";

        case "image/webp":
            return "WebP";

        default:
            return file.type;
    }

}


function formatFileSize(bytes) {

    if (bytes < 1024) {
        return `${bytes} B`;
    }


    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }


    const megabytes = kilobytes / 1024;

    return `${megabytes.toFixed(2)} MB`;
}

async function analyzeImage(file) {

    const formData = new FormData();

    formData.append("file", file);


    try {

        const response = await fetch(
            "/api/images/analyze",
            {
                method: "POST",
                body: formData,
            }
        );


        if (!response.ok) {
            throw new Error("Kunde inte analysera bilden.");
        }


        const data = await response.json();


        fileType.textContent = data.format;

        imageDimensions.textContent =
            `${data.width} × ${data.height} px`;

        fileSize.textContent =
            formatFileSize(data.size);

        colorMode.textContent =
            data.mode;

        transparency.textContent =
            data.has_transparency ? "Ja" : "Nej";

    }

    catch (error) {

        console.error(error);

        colorMode.textContent = "Fel";
        transparency.textContent = "Fel";

    }

}

function getResizeSettings() {

    const resizeMode =
        document.querySelector(
            'input[name="resizeMode"]:checked'
        ).value;


    if (resizeMode === "percent") {

        return {
            mode: "percent",
            value: resizePercent.value,
        };

    }


    return {
        mode: "width",
        value: maxWidth.value,
    };

}

async function previewWebp(file) {

    const formData = new FormData();

    formData.append(
        "file",
        file
    );

    const quality = qualitySlider.value;
    const resize =
        getResizeSettings();


    let previewUrl =
        `/api/images/convert/webp/preview?quality=${quality}`;


    if (
        resize.mode === "width" &&
        resize.value
    ) {

        previewUrl +=
            `&max_width=${resize.value}`;

    }


    if (
        resize.mode === "percent" &&
        resize.value
    ) {

        previewUrl +=
            `&resize_percent=${resize.value}`;

    }

    try {

        const response = await fetch(
            previewUrl,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(
                "Kunde inte skapa WebP-preview."
            );
        }

        const data = await response.json();

        originalSizeResult.textContent =
            formatFileSize(
                data.original_size
            );

        webpSizeResult.textContent =
            formatFileSize(
                data.webp_size
            );

        savingResult.textContent =
            `${data.saving_percent} %`;

        conversionResult.classList.remove(
            "hidden"
        );

    }

    catch (error) {

        console.error(error);

    }

}

